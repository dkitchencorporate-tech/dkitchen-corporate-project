-- 0114 · Prospección física + canales (tarea c9dd34dc; spec B / P7 7.1 en
-- 01 VENTAS/ACADEMIA_COMERCIAL_Y_PROSPECCION_ESPEC_2026-10-31.md). Decisión 12 de karc0: mapa + tablero.
-- · Cada contacto queda registrado con canal (físico, teléfono, Instagram, Facebook, TikTok, WhatsApp, email),
--   resultado, nivel y texto de la objeción, producto, palanca, material (flyer con su código, tarjeta, demo),
--   plantilla usada (digital) y siguiente paso. El comercial lo impone la identidad de la sesión.
-- · Email solo con consentimiento o relación previa (LSSI, decisión #167): lo valida el servidor.
-- · Coordenadas del local (OSM, GPS del móvil en la puerta o a mano) para la ruta del día en el mapa.
-- · Seguimiento automático: digital → 48 h; «no estaba» → mañana; «perdido» exige fecha de reintento.
-- · Embudo de dirección por canal, por comercial, por nivel de objeción y por palanca.
-- · Seguridad: un comercial (rol_admin = 'comercial') ya no ve todas las carteras, solo la suya
--   (antes dk.prosp_rol lo trataba como super admin). Dirección sigue viéndolo todo.

BEGIN;

ALTER TABLE public.prospectos
  ADD COLUMN IF NOT EXISTS canal            text CHECK (canal IN ('fisico','telefono','instagram','facebook','tiktok','whatsapp','email')),
  ADD COLUMN IF NOT EXISTS consentimiento   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS relacion_previa  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentimiento_en timestamptz,
  ADD COLUMN IF NOT EXISTS preparacion      text CHECK (char_length(preparacion) <= 1000),
  ADD COLUMN IF NOT EXISTS lat              numeric(9,6) CHECK (lat IS NULL OR lat BETWEEN 27 AND 44.5),
  ADD COLUMN IF NOT EXISTS lng              numeric(9,6) CHECK (lng IS NULL OR lng BETWEEN -18.5 AND 5),
  ADD COLUMN IF NOT EXISTS geo_fuente       text CHECK (geo_fuente IN ('osm','gps','manual')),
  ADD COLUMN IF NOT EXISTS ultimo_resultado text;

CREATE TABLE IF NOT EXISTS public.prospecto_contactos (
  id              bigserial PRIMARY KEY,
  prospecto_id    uuid NOT NULL REFERENCES public.prospectos(id) ON DELETE CASCADE,
  identidad       uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  canal           text NOT NULL CHECK (canal IN ('fisico','telefono','instagram','facebook','tiktok','whatsapp','email')),
  resultado       text NOT NULL CHECK (resultado IN ('no_estaba','hablo_encargado','demo','propuesta','cerrado','descartado','perdido')),
  motivo          text CHECK (motivo IN ('precio','ya_tiene','no_interesa','cerrado','otro')),
  objecion_nivel  text CHECK (objecion_nivel IN ('facil','intermedio','dificil')),
  objecion        text CHECK (char_length(objecion) <= 300),
  producto        text CHECK (producto IN ('carta','local','sala','fundador','signature','experience','auditoria')),
  palanca         text CHECK (palanca IN ('ninguna','publica','descuento_5','descuento_6_10','montaje_gratis','piloto_experience','signature_fraccionado')),
  material        text[] NOT NULL DEFAULT '{}' CHECK (material <@ ARRAY['flyer','tarjeta','demo']::text[]),
  flyer_codigo    text CHECK (flyer_codigo ~ '^[a-z0-9-]{2,40}$'),
  plantilla       text CHECK (char_length(plantilla) <= 80),
  texto           text CHECK (char_length(texto) <= 1000),
  siguiente       text CHECK (char_length(siguiente) <= 200),
  siguiente_fecha date,
  lat             numeric(9,6),
  lng             numeric(9,6),
  creado_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospecto_contactos_idx ON public.prospecto_contactos (prospecto_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS prospecto_contactos_canal_idx ON public.prospecto_contactos (canal, resultado);
ALTER TABLE public.prospecto_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_contactos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.prospecto_contactos FROM PUBLIC;

-- Quién pregunta: dirección (todo) o comercial/socio con 2FA (lo suyo). Nadie más.
CREATE OR REPLACE FUNCTION dk.prosp_rol()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF dk.es_direccion() THEN RETURN 'admin'; END IF;
  IF dk.es_admin() OR dk.es_socio() THEN RETURN 'socio'; END IF;
  RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
END;
$$;

-- Registro de un contacto en 3 toques (móvil en la puerta, teléfono o redes).
CREATE OR REPLACE FUNCTION dk.prosp_registrar(p_id uuid, p_datos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  d jsonb := coalesce(p_datos, '{}'::jsonb);
  p public.prospectos%ROWTYPE;
  v_canal text := d ->> 'canal';
  v_res text := d ->> 'resultado';
  v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  v_sig text := left(nullif(trim(d ->> 'siguiente'), ''), 200);
  v_fecha date := nullif(d ->> 'siguiente_fecha', '')::date;
  v_mat text[] := coalesce(ARRAY(SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(d -> 'material') = 'array' THEN d -> 'material' ELSE '[]'::jsonb END)), '{}');
  v_lat numeric := nullif(d ->> 'lat', '')::numeric;
  v_lng numeric := nullif(d ->> 'lng', '')::numeric;
  v_consent boolean := coalesce((d ->> 'consentimiento')::boolean, false);
  v_relacion boolean := coalesce((d ->> 'relacion_previa')::boolean, false);
  v_rango int; v_nuevo text; v_tipo text;
  orden constant text[] := ARRAY['por_revisar','por_visitar','muestra','visitado','demo','interesado','cliente'];
BEGIN
  PERFORM dk.prosp_exigir(p_id);
  SELECT * INTO p FROM public.prospectos WHERE id = p_id FOR UPDATE;
  IF v_canal IS NULL OR v_canal NOT IN ('fisico','telefono','instagram','facebook','tiktok','whatsapp','email') THEN
    RAISE EXCEPTION 'canal no válido' USING ERRCODE = '22023';
  END IF;
  IF v_res IS NULL OR v_res NOT IN ('no_estaba','hablo_encargado','demo','propuesta','cerrado','descartado','perdido') THEN
    RAISE EXCEPTION 'resultado no válido' USING ERRCODE = '22023';
  END IF;
  IF p.no_contactar THEN RAISE EXCEPTION 'no contactar: el local pidió que no le contactemos' USING ERRCODE = '42501'; END IF;
  -- LSSI: nada de correo en frío. Solo con consentimiento o relación previa (puede marcarse en este registro).
  IF v_canal = 'email' AND NOT (p.consentimiento OR p.relacion_previa OR v_consent OR v_relacion) THEN
    RAISE EXCEPTION 'sin consentimiento: el correo solo con consentimiento o relación previa' USING ERRCODE = '42501';
  END IF;
  IF v_res = 'descartado' AND coalesce(d ->> 'motivo', '') NOT IN ('precio','ya_tiene','no_interesa','cerrado','otro') THEN
    RAISE EXCEPTION 'falta el motivo' USING ERRCODE = '22023';
  END IF;
  IF v_res = 'perdido' AND (v_fecha IS NULL OR v_fecha <= v_hoy) THEN
    RAISE EXCEPTION 'falta la fecha de reintento' USING ERRCODE = '22023';
  END IF;
  IF v_fecha IS NOT NULL AND (v_fecha < v_hoy OR v_fecha > v_hoy + 365) THEN
    RAISE EXCEPTION 'fecha no válida' USING ERRCODE = '22023';
  END IF;
  IF (v_lat IS NULL) <> (v_lng IS NULL) OR (v_lat IS NOT NULL AND NOT (v_lat BETWEEN 27 AND 44.5 AND v_lng BETWEEN -18.5 AND 5)) THEN
    v_lat := NULL; v_lng := NULL; -- posición fuera de España o incompleta: se ignora, no bloquea el registro
  END IF;

  -- Siguiente paso por defecto (si el comercial no puso uno)
  IF v_fecha IS NULL AND v_res NOT IN ('cerrado','descartado') THEN
    IF v_res = 'no_estaba' THEN v_fecha := v_hoy + 1; v_sig := coalesce(v_sig, 'Volver: no estaba el encargado');
    ELSIF v_canal <> 'fisico' THEN v_fecha := v_hoy + 2; v_sig := coalesce(v_sig, 'Seguimiento a 48 h');
    END IF;
  END IF;
  IF v_res = 'perdido' THEN v_sig := coalesce(v_sig, 'Reintentar'); END IF;

  -- El estado solo avanza (nunca retrocede); descartar y cerrar son explícitos.
  v_rango := array_position(orden, p.estado);
  v_nuevo := CASE v_res
    WHEN 'descartado' THEN 'descartado'
    WHEN 'cerrado' THEN 'cliente'
    WHEN 'propuesta' THEN 'interesado'
    WHEN 'demo' THEN 'demo'
    WHEN 'hablo_encargado' THEN 'visitado'
    WHEN 'perdido' THEN 'visitado'
    ELSE 'por_visitar' END;
  IF v_nuevo <> 'descartado' AND p.estado <> 'descartado' AND coalesce(array_position(orden, v_nuevo), 0) < coalesce(v_rango, 0) THEN
    v_nuevo := p.estado;
  END IF;

  INSERT INTO public.prospecto_contactos (prospecto_id, identidad, canal, resultado, motivo, objecion_nivel, objecion, producto,
    palanca, material, flyer_codigo, plantilla, texto, siguiente, siguiente_fecha, lat, lng)
  VALUES (p_id, dk.identidad_actual(), v_canal, v_res, CASE WHEN v_res = 'descartado' THEN d ->> 'motivo' END,
    nullif(d ->> 'objecion_nivel', ''), left(nullif(trim(d ->> 'objecion'), ''), 300), nullif(d ->> 'producto', ''),
    nullif(d ->> 'palanca', ''), v_mat, CASE WHEN 'flyer' = ANY (v_mat) THEN nullif(lower(trim(d ->> 'flyer_codigo')), '') END,
    left(nullif(trim(d ->> 'plantilla'), ''), 80), left(nullif(trim(d ->> 'texto'), ''), 1000), v_sig, v_fecha, v_lat, v_lng);

  UPDATE public.prospectos SET
    canal = v_canal, ultimo_resultado = v_res, estado = v_nuevo,
    motivo_descarte = CASE WHEN v_nuevo = 'descartado' THEN coalesce(d ->> 'motivo', motivo_descarte) ELSE NULL END,
    consentimiento = consentimiento OR v_consent, relacion_previa = relacion_previa OR v_relacion,
    consentimiento_en = CASE WHEN (v_consent OR v_relacion) AND consentimiento_en IS NULL THEN now() ELSE consentimiento_en END,
    siguiente_accion = CASE WHEN v_res IN ('cerrado','descartado') THEN NULL ELSE v_sig END,
    siguiente_fecha = CASE WHEN v_res IN ('cerrado','descartado') THEN NULL ELSE v_fecha END,
    ruta_fecha = CASE WHEN v_canal = 'fisico' THEN NULL ELSE ruta_fecha END,
    ruta_orden = CASE WHEN v_canal = 'fisico' THEN NULL ELSE ruta_orden END,
    lat = CASE WHEN lat IS NULL AND v_lat IS NOT NULL AND v_canal = 'fisico' THEN v_lat ELSE lat END,
    lng = CASE WHEN lat IS NULL AND v_lat IS NOT NULL AND v_canal = 'fisico' THEN v_lng ELSE lng END,
    geo_fuente = CASE WHEN lat IS NULL AND v_lat IS NOT NULL AND v_canal = 'fisico' THEN 'gps' ELSE geo_fuente END,
    actualizado_en = now()
  WHERE id = p_id;

  v_tipo := CASE v_canal WHEN 'fisico' THEN 'visita' WHEN 'telefono' THEN 'llamada' WHEN 'whatsapp' THEN 'whatsapp' WHEN 'email' THEN 'correo' ELSE 'dm' END;
  INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
  VALUES (p_id, dk.identidad_actual(), v_tipo, left(concat_ws(' · ', v_canal, v_res,
    nullif(d ->> 'objecion_nivel', ''), left(nullif(trim(d ->> 'objecion'), ''), 120), nullif(trim(d ->> 'texto'), '')), 1000));

  RETURN jsonb_build_object('estado', v_nuevo, 'siguiente', v_sig, 'siguiente_fecha', v_fecha);
END;
$$;

-- Datos de canal fuera de un contacto (alta rápida y ficha): canal, consentimiento, relación previa, preparación.
CREATE OR REPLACE FUNCTION dk.prosp_canal(p_id uuid, p_datos jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE d jsonb := coalesce(p_datos, '{}'::jsonb);
BEGIN
  PERFORM dk.prosp_exigir(p_id);
  UPDATE public.prospectos SET
    canal = CASE WHEN d ? 'canal' THEN nullif(d ->> 'canal', '') ELSE canal END,
    consentimiento = CASE WHEN d ? 'consentimiento' THEN (d ->> 'consentimiento')::boolean ELSE consentimiento END,
    relacion_previa = CASE WHEN d ? 'relacion_previa' THEN (d ->> 'relacion_previa')::boolean ELSE relacion_previa END,
    consentimiento_en = CASE WHEN coalesce((d ->> 'consentimiento')::boolean, false) OR coalesce((d ->> 'relacion_previa')::boolean, false)
                             THEN coalesce(consentimiento_en, now()) ELSE consentimiento_en END,
    preparacion = CASE WHEN d ? 'preparacion' THEN left(nullif(trim(d ->> 'preparacion'), ''), 1000) ELSE preparacion END,
    actualizado_en = now()
  WHERE id = p_id;
END;
$$;

-- Situar un local en el mapa (OSM, GPS o a mano). Solo coordenadas dentro de España.
CREATE OR REPLACE FUNCTION dk.prosp_situar(p_id uuid, p_lat numeric, p_lng numeric, p_fuente text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.prosp_exigir(p_id);
  IF p_fuente NOT IN ('osm','gps','manual') THEN RAISE EXCEPTION 'fuente no válida' USING ERRCODE = '22023'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR NOT (p_lat BETWEEN 27 AND 44.5 AND p_lng BETWEEN -18.5 AND 5) THEN
    RAISE EXCEPTION 'posición fuera de España' USING ERRCODE = '22023';
  END IF;
  UPDATE public.prospectos SET lat = round(p_lat, 6), lng = round(p_lng, 6), geo_fuente = p_fuente, actualizado_en = now() WHERE id = p_id;
END;
$$;

-- Apunte libre (0058) con la misma regla del correo.
CREATE OR REPLACE FUNCTION dk.prosp_anotar(p_id uuid, p_tipo text, p_texto text, p_siguiente text, p_fecha date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.prosp_exigir(p_id);
  IF p_tipo NOT IN ('visita','llamada','dm','whatsapp','correo','nota') THEN RAISE EXCEPTION 'tipo no válido' USING ERRCODE = '22023'; END IF;
  IF p_tipo = 'correo' AND NOT EXISTS (SELECT 1 FROM public.prospectos WHERE id = p_id AND (consentimiento OR relacion_previa)) THEN
    RAISE EXCEPTION 'sin consentimiento: el correo solo con consentimiento o relación previa' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
  VALUES (p_id, dk.identidad_actual(), p_tipo, left(nullif(trim(p_texto), ''), 1000));
  UPDATE public.prospectos SET
    siguiente_accion = left(nullif(trim(p_siguiente), ''), 200),
    siguiente_fecha = p_fecha,
    estado = CASE WHEN p_tipo = 'visita' AND estado IN ('por_revisar','por_visitar','muestra') THEN 'visitado' ELSE estado END,
    ruta_fecha = CASE WHEN p_tipo = 'visita' THEN NULL ELSE ruta_fecha END,
    actualizado_en = now()
   WHERE id = p_id;
END;
$$;

-- Lista (ligera) con canal, posición y último resultado.
CREATE OR REPLACE FUNCTION dk.prosp_lista(p_zona text, p_comercial uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rol text := dk.prosp_rol();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'nombre', p.nombre, 'tipo', p.tipo, 'zona', p.zona, 'barrio', p.barrio, 'direccion', p.direccion,
      'telefono', p.telefono, 'estado', p.estado, 'motivo_descarte', p.motivo_descarte, 'puntuacion', p.puntuacion,
      'siguiente_accion', p.siguiente_accion, 'siguiente_fecha', p.siguiente_fecha, 'apertura_prevista', p.apertura_prevista,
      'fuente', p.fuente, 'muestra', p.muestra_url IS NOT NULL, 'propuesta_vistas', p.propuesta_vistas,
      'no_contactar', p.no_contactar, 'ruta_fecha', p.ruta_fecha, 'ruta_orden', p.ruta_orden,
      'comercial_id', p.comercial_id, 'mio', p.comercial_id = dk.identidad_actual(),
      'comercial', coalesce(s.nombre, c.nombre_publico, i.nombre, 'DKitchen'), 'nota_guia', p.nota_guia IS NOT NULL,
      'canal', p.canal, 'ultimo_resultado', p.ultimo_resultado, 'lat', p.lat, 'lng', p.lng,
      'consentimiento', p.consentimiento OR p.relacion_previa, 'instagram', p.instagram, 'plataformas', p.plataformas,
      'actualizado_en', p.actualizado_en)
      ORDER BY p.siguiente_fecha NULLS LAST, p.puntuacion DESC NULLS LAST, p.nombre)
    FROM public.prospectos p
    LEFT JOIN public.socios s ON s.id = p.comercial_id
    LEFT JOIN public.comerciales_contacto c ON c.identidad = p.comercial_id
    LEFT JOIN public.identidades i ON i.id = p.comercial_id
    WHERE (v_rol = 'admin' OR p.comercial_id = dk.identidad_actual())
      AND (p_comercial IS NULL OR p.comercial_id = p_comercial)
      AND (nullif(p_zona, '') IS NULL OR p.zona = p_zona)), '[]'::jsonb);
END;
$$;

-- Ficha completa + historial + contactos registrados + posibles duplicados.
CREATE OR REPLACE FUNCTION dk.prosp_ficha(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rol text := dk.prosp_exigir(p_id); p public.prospectos%ROWTYPE; v_tel text;
BEGIN
  SELECT * INTO p FROM public.prospectos WHERE id = p_id;
  v_tel := nullif(regexp_replace(coalesce(p.telefono, ''), '[^0-9]', '', 'g'), '');
  RETURN to_jsonb(p) || jsonb_build_object(
    'rol', v_rol, 'mio', p.comercial_id = dk.identidad_actual(),
    'comercial', (SELECT coalesce(s.nombre, c.nombre_publico, i.nombre, 'DKitchen') FROM public.identidades i
                    LEFT JOIN public.socios s ON s.id = i.id LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
                   WHERE i.id = p.comercial_id),
    'cliente_slug', (SELECT r.slug FROM public.restaurantes r WHERE r.id = p.restaurante_id),
    'eventos', coalesce((SELECT jsonb_agg(jsonb_build_object('tipo', e.tipo, 'texto', e.texto, 'creado_en', e.creado_en,
                   'quien', coalesce(s.nombre, c.nombre_publico, i.nombre, 'DKitchen')) ORDER BY e.creado_en DESC)
                 FROM public.prospecto_eventos e LEFT JOIN public.socios s ON s.id = e.identidad
                 LEFT JOIN public.comerciales_contacto c ON c.identidad = e.identidad
                 LEFT JOIN public.identidades i ON i.id = e.identidad
                WHERE e.prospecto_id = p_id), '[]'::jsonb),
    'contactos', coalesce((SELECT jsonb_agg(jsonb_build_object('canal', k.canal, 'resultado', k.resultado, 'motivo', k.motivo,
                   'objecion_nivel', k.objecion_nivel, 'objecion', k.objecion, 'producto', k.producto, 'palanca', k.palanca,
                   'material', k.material, 'flyer_codigo', k.flyer_codigo, 'plantilla', k.plantilla, 'texto', k.texto,
                   'siguiente', k.siguiente, 'siguiente_fecha', k.siguiente_fecha, 'creado_en', k.creado_en,
                   'quien', coalesce(s.nombre, c.nombre_publico, i.nombre, 'DKitchen')) ORDER BY k.creado_en DESC)
                 FROM (SELECT * FROM public.prospecto_contactos WHERE prospecto_id = p_id ORDER BY creado_en DESC LIMIT 30) k
                 LEFT JOIN public.socios s ON s.id = k.identidad
                 LEFT JOIN public.comerciales_contacto c ON c.identidad = k.identidad
                 LEFT JOIN public.identidades i ON i.id = k.identidad), '[]'::jsonb),
    'duplicados', coalesce((SELECT jsonb_agg(jsonb_build_object('id', CASE WHEN v_rol = 'admin' OR o.comercial_id = dk.identidad_actual() THEN o.id END,
                   'nombre', o.nombre, 'zona', o.zona, 'estado', o.estado,
                   'comercial', coalesce(s.nombre, c.nombre_publico, 'DKitchen')))
                 FROM public.prospectos o LEFT JOIN public.socios s ON s.id = o.comercial_id
                 LEFT JOIN public.comerciales_contacto c ON c.identidad = o.comercial_id
                WHERE o.id <> p.id AND (
                      (lower(o.nombre) = lower(p.nombre) AND o.zona = p.zona)
                   OR (v_tel IS NOT NULL AND regexp_replace(coalesce(o.telefono, ''), '[^0-9]', '', 'g') = v_tel)
                   OR (p.instagram IS NOT NULL AND lower(o.instagram) = lower(p.instagram))
                   OR (p.place_id IS NOT NULL AND o.place_id = p.place_id))), '[]'::jsonb));
END;
$$;

-- Comerciales a los que dirección puede asignar: yo + socios activos + comerciales de Central (0110/0112).
CREATE OR REPLACE FUNCTION dk.admin_prosp_comerciales()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN jsonb_build_array(jsonb_build_object('id', dk.identidad_actual(), 'nombre',
           coalesce((SELECT nombre_publico FROM public.comerciales_contacto WHERE identidad = dk.identidad_actual()), 'Yo (karc0)')))
    || coalesce((SELECT jsonb_agg(x ORDER BY x ->> 'nombre') FROM (
         SELECT jsonb_build_object('id', s.id, 'nombre', s.nombre) x FROM public.socios s WHERE s.activo AND s.id <> dk.identidad_actual()
         UNION ALL
         SELECT jsonb_build_object('id', i.id, 'nombre', coalesce(c.nombre_publico, i.nombre, i.email))
           FROM public.identidades i LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
          WHERE i.rol = 'admin' AND i.rol_admin = 'comercial' AND i.activo AND i.id <> dk.identidad_actual()
            AND NOT EXISTS (SELECT 1 FROM public.socios s2 WHERE s2.id = i.id)) t), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_prosp_reasignar(p_id uuid, p_comercial uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  IF p_comercial <> dk.identidad_actual()
     AND NOT EXISTS (SELECT 1 FROM public.socios WHERE id = p_comercial AND activo)
     AND NOT EXISTS (SELECT 1 FROM public.identidades WHERE id = p_comercial AND rol = 'admin' AND rol_admin = 'comercial' AND activo) THEN
    RAISE EXCEPTION 'comercial no válido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.prospectos SET comercial_id = p_comercial, ruta_fecha = NULL, ruta_orden = NULL, actualizado_en = now() WHERE id = p_id;
  INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
  VALUES (p_id, dk.identidad_actual(), 'reasignado', (SELECT coalesce(s.nombre, i.nombre, 'karc0') FROM public.identidades i LEFT JOIN public.socios s ON s.id = i.id WHERE i.id = p_comercial));
END;
$$;

-- Embudo de dirección: por canal, por comercial, por nivel de objeción y por palanca (desde una fecha).
CREATE OR REPLACE FUNCTION dk.admin_prosp_embudo(p_desde date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_desde timestamptz := coalesce(p_desde, '2000-01-01'::date)::timestamptz;
BEGIN
  PERFORM dk.exigir_direccion();
  RETURN jsonb_build_object(
    'canales', coalesce((SELECT jsonb_agg(x ORDER BY (x ->> 'locales')::int DESC) FROM (
      SELECT jsonb_build_object('canal', k.canal, 'contactos', count(*), 'locales', count(DISTINCT k.prospecto_id),
        'hablo', count(DISTINCT k.prospecto_id) FILTER (WHERE k.resultado <> 'no_estaba'),
        'demo', count(DISTINCT k.prospecto_id) FILTER (WHERE k.resultado IN ('demo','propuesta','cerrado')),
        'propuesta', count(DISTINCT k.prospecto_id) FILTER (WHERE k.resultado IN ('propuesta','cerrado')),
        'cerrado', count(DISTINCT k.prospecto_id) FILTER (WHERE k.resultado = 'cerrado'),
        'descartado', count(DISTINCT k.prospecto_id) FILTER (WHERE k.resultado = 'descartado')) x
      FROM public.prospecto_contactos k WHERE k.creado_en >= v_desde GROUP BY k.canal) t), '[]'::jsonb),
    'comerciales', coalesce((SELECT jsonb_agg(x ORDER BY (x ->> 'locales')::int DESC) FROM (
      SELECT jsonb_build_object('comercial', coalesce(s.nombre, c.nombre_publico, i.nombre, 'DKitchen'), 'contactos', count(*),
        'locales', count(DISTINCT k.prospecto_id),
        'demo', count(DISTINCT k.prospecto_id) FILTER (WHERE k.resultado IN ('demo','propuesta','cerrado')),
        'cerrado', count(DISTINCT k.prospecto_id) FILTER (WHERE k.resultado = 'cerrado')) x
      FROM public.prospecto_contactos k
      LEFT JOIN public.identidades i ON i.id = k.identidad LEFT JOIN public.socios s ON s.id = k.identidad
      LEFT JOIN public.comerciales_contacto c ON c.identidad = k.identidad
      WHERE k.creado_en >= v_desde GROUP BY k.identidad, s.nombre, c.nombre_publico, i.nombre) t), '[]'::jsonb),
    'objeciones', coalesce((SELECT jsonb_agg(x) FROM (
      SELECT jsonb_build_object('nivel', k.objecion_nivel, 'n', count(*),
        'cerrado', count(*) FILTER (WHERE k.resultado = 'cerrado'),
        'perdido', count(*) FILTER (WHERE k.resultado IN ('descartado','perdido'))) x
      FROM public.prospecto_contactos k WHERE k.creado_en >= v_desde AND k.objecion_nivel IS NOT NULL GROUP BY k.objecion_nivel) t), '[]'::jsonb),
    'frenan', coalesce((SELECT jsonb_agg(x) FROM (
      SELECT jsonb_build_object('objecion', lower(k.objecion), 'n', count(*)) x
      FROM public.prospecto_contactos k WHERE k.creado_en >= v_desde AND k.objecion IS NOT NULL AND k.resultado <> 'cerrado'
      GROUP BY lower(k.objecion) ORDER BY count(*) DESC LIMIT 6) t), '[]'::jsonb),
    'palancas', coalesce((SELECT jsonb_agg(x) FROM (
      SELECT jsonb_build_object('palanca', k.palanca, 'n', count(*), 'cerrado', count(*) FILTER (WHERE k.resultado = 'cerrado')) x
      FROM public.prospecto_contactos k WHERE k.creado_en >= v_desde AND k.palanca IS NOT NULL AND k.palanca <> 'ninguna' GROUP BY k.palanca) t), '[]'::jsonb),
    'material', coalesce((SELECT jsonb_agg(x) FROM (
      SELECT jsonb_build_object('material', m, 'n', count(*), 'cerrado', count(*) FILTER (WHERE k.resultado = 'cerrado')) x
      FROM public.prospecto_contactos k, unnest(k.material) m WHERE k.creado_en >= v_desde GROUP BY m) t), '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION dk.prosp_registrar(uuid, jsonb), dk.prosp_canal(uuid, jsonb), dk.prosp_situar(uuid, numeric, numeric, text),
  dk.admin_prosp_embudo(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.prosp_registrar(uuid, jsonb), dk.prosp_canal(uuid, jsonb), dk.prosp_situar(uuid, numeric, numeric, text),
  dk.admin_prosp_embudo(date) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0114_prospeccion_canales.sql') ON CONFLICT DO NOTHING;
COMMIT;
