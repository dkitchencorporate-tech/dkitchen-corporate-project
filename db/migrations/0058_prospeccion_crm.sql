-- 0058 · Punto 9c: CRM de prospección por zona y ruta (decisiones de karc0, 07/10; ESTADO §6 entradas 85–88
-- y PROSPECCION_200_LEADS_2026-10-07.md). Empieza en Baza (Granada).
-- Cada comercial (karc0 = super admin, o un socio) ve y trabaja SU cartera; el super admin ve todas, filtra,
-- reasigna y deja una nota de guía. Estados: por revisar (lotes del script) → por visitar → muestra hecha →
-- visitado → demo hecha → interesado → cliente | descartado (con motivo). Historial de cada contacto.
-- Propuesta personalizada «Hola, [local]»: enlace privado con token (imprimible) que apunta cuándo se abre.
-- Quien pide «no contactar» deja de recibir propuesta (el enlace deja de funcionar).

BEGIN;

CREATE TABLE IF NOT EXISTS public.prospectos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comercial_id      uuid NOT NULL REFERENCES public.identidades(id) ON DELETE RESTRICT,
  creado_por        uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  zona              text NOT NULL DEFAULT 'Baza' CHECK (char_length(zona) BETWEEN 2 AND 60),
  barrio            text CHECK (char_length(barrio) <= 60),
  nombre            text NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 120),
  tipo              text NOT NULL DEFAULT 'otro' CHECK (tipo IN ('pizzeria','asador','restaurante','hamburgueseria','kebab','bar','cafeteria','heladeria','panaderia','otro')),
  direccion         text CHECK (char_length(direccion) <= 200),
  telefono          text CHECK (char_length(telefono) <= 30),
  instagram         text CHECK (char_length(instagram) <= 120),
  web               text CHECK (char_length(web) <= 200),
  contacto          text CHECK (char_length(contacto) <= 120),
  plataformas       text CHECK (char_length(plataformas) <= 200),
  ticket_medio      numeric(7,2) CHECK (ticket_medio IS NULL OR ticket_medio BETWEEN 0 AND 10000),
  mesas             smallint CHECK (mesas IS NULL OR mesas BETWEEN 0 AND 500),
  competidores      text CHECK (char_length(competidores) <= 300),
  notas             text CHECK (char_length(notas) <= 2000),
  fuente            text NOT NULL DEFAULT 'visita' CHECK (fuente IN ('visita','digital','red_socio','referido','script')),
  referido_por      text CHECK (char_length(referido_por) <= 120),
  place_id          text CHECK (char_length(place_id) <= 300),
  puntuacion        smallint CHECK (puntuacion IS NULL OR puntuacion BETWEEN 0 AND 100),
  estado            text NOT NULL DEFAULT 'por_visitar' CHECK (estado IN ('por_revisar','por_visitar','muestra','visitado','demo','interesado','cliente','descartado')),
  motivo_descarte   text CHECK (motivo_descarte IN ('precio','ya_tiene','no_interesa','cerrado','otro')),
  siguiente_accion  text CHECK (char_length(siguiente_accion) <= 200),
  siguiente_fecha   date,
  apertura_prevista date,
  muestra_url       text CHECK (muestra_url IS NULL OR (muestra_url ~ '^https://' AND char_length(muestra_url) <= 300)),
  oferta            text NOT NULL DEFAULT 'qr_1' CHECK (oferta IN ('qr_1','fundador','signature','experience','dark_kitchen')),
  propuesta_texto   text CHECK (char_length(propuesta_texto) <= 1500),
  propuesta_token   text UNIQUE CHECK (propuesta_token ~ '^[0-9a-f]{32}$'),
  propuesta_vistas  integer NOT NULL DEFAULT 0,
  propuesta_vista_en timestamptz,
  no_contactar      boolean NOT NULL DEFAULT false,
  nota_guia         text CHECK (char_length(nota_guia) <= 1000),
  ruta_fecha        date,
  ruta_orden        smallint,
  restaurante_id    uuid REFERENCES public.restaurantes(id) ON DELETE SET NULL,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospectos_comercial_idx ON public.prospectos (comercial_id, estado);
CREATE INDEX IF NOT EXISTS prospectos_zona_idx ON public.prospectos (zona, barrio);
CREATE INDEX IF NOT EXISTS prospectos_ruta_idx ON public.prospectos (comercial_id, ruta_fecha) WHERE ruta_fecha IS NOT NULL;
ALTER TABLE public.prospectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospectos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.prospectos FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.prospecto_eventos (
  id           bigserial PRIMARY KEY,
  prospecto_id uuid NOT NULL REFERENCES public.prospectos(id) ON DELETE CASCADE,
  identidad    uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  tipo         text NOT NULL CHECK (tipo IN ('alta','visita','llamada','dm','whatsapp','correo','nota','estado','propuesta_vista','reasignado')),
  texto        text CHECK (char_length(texto) <= 1000),
  creado_en    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospecto_eventos_idx ON public.prospecto_eventos (prospecto_id, creado_en DESC);
ALTER TABLE public.prospecto_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_eventos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.prospecto_eventos FROM PUBLIC;

-- Datos de contacto que salen en la propuesta (cada comercial edita los suyos)
CREATE TABLE IF NOT EXISTS public.comerciales_contacto (
  identidad      uuid PRIMARY KEY REFERENCES public.identidades(id) ON DELETE CASCADE,
  nombre_publico text NOT NULL CHECK (char_length(nombre_publico) BETWEEN 2 AND 80),
  telefono       text CHECK (telefono ~ '^\+?[0-9 ]{9,16}$'),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comerciales_contacto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comerciales_contacto FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.comerciales_contacto FROM PUBLIC;

-- Quién pregunta: super admin (todo) o socio con 2FA (lo suyo). Nadie más.
CREATE OR REPLACE FUNCTION dk.prosp_rol()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF dk.es_admin() THEN RETURN 'admin'; END IF;
  IF dk.es_socio() THEN RETURN 'socio'; END IF;
  RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION dk.prosp_exigir(p_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rol text := dk.prosp_rol();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.prospectos p WHERE p.id = p_id
                  AND (v_rol = 'admin' OR p.comercial_id = dk.identidad_actual())) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;
  RETURN v_rol;
END;
$$;

-- Alta o edición. Solo cambia las claves presentes en p_datos; '' borra el valor.
CREATE OR REPLACE FUNCTION dk.prosp_guardar(p_id uuid, p_datos jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rol text; v_id uuid; v_com uuid := dk.identidad_actual(); d jsonb := coalesce(p_datos, '{}'::jsonb);
BEGIN
  IF p_id IS NULL THEN
    v_rol := dk.prosp_rol();
    IF v_rol = 'admin' AND nullif(d ->> 'comercial_id', '') IS NOT NULL THEN v_com := (d ->> 'comercial_id')::uuid; END IF;
    INSERT INTO public.prospectos (comercial_id, creado_por, zona, nombre)
    VALUES (v_com, dk.identidad_actual(), coalesce(nullif(trim(d ->> 'zona'), ''), 'Baza'), trim(coalesce(d ->> 'nombre', '')))
    RETURNING id INTO v_id;
    INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto) VALUES (v_id, dk.identidad_actual(), 'alta', d ->> 'fuente');
  ELSE
    v_rol := dk.prosp_exigir(p_id); v_id := p_id;
  END IF;

  UPDATE public.prospectos p SET
    zona             = coalesce(nullif(trim(d ->> 'zona'), ''), p.zona),
    nombre           = coalesce(nullif(trim(d ->> 'nombre'), ''), p.nombre),
    tipo             = coalesce(nullif(d ->> 'tipo', ''), p.tipo),
    fuente           = coalesce(nullif(d ->> 'fuente', ''), p.fuente),
    oferta           = coalesce(nullif(d ->> 'oferta', ''), p.oferta),
    barrio           = CASE WHEN d ? 'barrio' THEN nullif(trim(d ->> 'barrio'), '') ELSE p.barrio END,
    direccion        = CASE WHEN d ? 'direccion' THEN nullif(trim(d ->> 'direccion'), '') ELSE p.direccion END,
    telefono         = CASE WHEN d ? 'telefono' THEN nullif(trim(d ->> 'telefono'), '') ELSE p.telefono END,
    instagram        = CASE WHEN d ? 'instagram' THEN nullif(trim(d ->> 'instagram'), '') ELSE p.instagram END,
    web              = CASE WHEN d ? 'web' THEN nullif(trim(d ->> 'web'), '') ELSE p.web END,
    contacto         = CASE WHEN d ? 'contacto' THEN nullif(trim(d ->> 'contacto'), '') ELSE p.contacto END,
    plataformas      = CASE WHEN d ? 'plataformas' THEN nullif(trim(d ->> 'plataformas'), '') ELSE p.plataformas END,
    competidores     = CASE WHEN d ? 'competidores' THEN nullif(trim(d ->> 'competidores'), '') ELSE p.competidores END,
    notas            = CASE WHEN d ? 'notas' THEN nullif(trim(d ->> 'notas'), '') ELSE p.notas END,
    referido_por     = CASE WHEN d ? 'referido_por' THEN nullif(trim(d ->> 'referido_por'), '') ELSE p.referido_por END,
    place_id         = CASE WHEN d ? 'place_id' THEN nullif(trim(d ->> 'place_id'), '') ELSE p.place_id END,
    muestra_url      = CASE WHEN d ? 'muestra_url' THEN nullif(trim(d ->> 'muestra_url'), '') ELSE p.muestra_url END,
    propuesta_texto  = CASE WHEN d ? 'propuesta_texto' THEN nullif(trim(d ->> 'propuesta_texto'), '') ELSE p.propuesta_texto END,
    siguiente_accion = CASE WHEN d ? 'siguiente_accion' THEN nullif(trim(d ->> 'siguiente_accion'), '') ELSE p.siguiente_accion END,
    ticket_medio     = CASE WHEN d ? 'ticket_medio' THEN nullif(replace(d ->> 'ticket_medio', ',', '.'), '')::numeric ELSE p.ticket_medio END,
    mesas            = CASE WHEN d ? 'mesas' THEN nullif(d ->> 'mesas', '')::smallint ELSE p.mesas END,
    puntuacion       = CASE WHEN d ? 'puntuacion' THEN nullif(d ->> 'puntuacion', '')::smallint ELSE p.puntuacion END,
    siguiente_fecha  = CASE WHEN d ? 'siguiente_fecha' THEN nullif(d ->> 'siguiente_fecha', '')::date ELSE p.siguiente_fecha END,
    apertura_prevista = CASE WHEN d ? 'apertura_prevista' THEN nullif(d ->> 'apertura_prevista', '')::date ELSE p.apertura_prevista END,
    no_contactar     = CASE WHEN d ? 'no_contactar' THEN (d ->> 'no_contactar')::boolean ELSE p.no_contactar END,
    nota_guia        = CASE WHEN v_rol = 'admin' AND d ? 'nota_guia' THEN nullif(trim(d ->> 'nota_guia'), '') ELSE p.nota_guia END,
    -- un muestrario hecho en un lead sin visitar lo pasa a «muestra hecha»
    estado           = CASE WHEN p.estado IN ('por_revisar', 'por_visitar') AND nullif(trim(d ->> 'muestra_url'), '') IS NOT NULL THEN 'muestra' ELSE p.estado END,
    actualizado_en   = now()
  WHERE p.id = v_id;
  RETURN v_id;
END;
$$;

-- Cambio de estado (con motivo si se descarta). Cliente puede vincularse al alta por slug.
CREATE OR REPLACE FUNCTION dk.prosp_estado(p_id uuid, p_estado text, p_motivo text, p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rol text := dk.prosp_exigir(p_id); v_rest uuid;
BEGIN
  IF p_estado NOT IN ('por_revisar','por_visitar','muestra','visitado','demo','interesado','cliente','descartado') THEN
    RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023';
  END IF;
  IF p_estado = 'descartado' AND coalesce(p_motivo, '') NOT IN ('precio','ya_tiene','no_interesa','cerrado','otro') THEN
    RAISE EXCEPTION 'falta el motivo' USING ERRCODE = '22023';
  END IF;
  IF nullif(trim(p_slug), '') IS NOT NULL THEN
    SELECT r.id INTO v_rest FROM public.restaurantes r
     WHERE r.slug = lower(trim(p_slug)) AND (v_rol = 'admin' OR r.socio_id = dk.identidad_actual());
    IF v_rest IS NULL THEN RAISE EXCEPTION 'local no encontrado o no es tuyo' USING ERRCODE = 'P0002'; END IF;
  END IF;
  UPDATE public.prospectos SET estado = p_estado,
         motivo_descarte = CASE WHEN p_estado = 'descartado' THEN p_motivo END,
         restaurante_id = coalesce(v_rest, restaurante_id), actualizado_en = now()
   WHERE id = p_id;
  INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
  VALUES (p_id, dk.identidad_actual(), 'estado', p_estado || coalesce(' · ' || p_motivo, '') || coalesce(' · ' || nullif(trim(p_slug), ''), ''));
END;
$$;

-- Apunte de un contacto (visita, llamada, DM…) + siguiente acción. Una visita avanza a «visitado».
CREATE OR REPLACE FUNCTION dk.prosp_anotar(p_id uuid, p_tipo text, p_texto text, p_siguiente text, p_fecha date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.prosp_exigir(p_id);
  IF p_tipo NOT IN ('visita','llamada','dm','whatsapp','correo','nota') THEN RAISE EXCEPTION 'tipo no válido' USING ERRCODE = '22023'; END IF;
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

-- Lista (ligera). Super admin: todas, o las de un comercial; socio: las suyas.
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
      'comercial', coalesce(s.nombre, c.nombre_publico, 'DKitchen'), 'nota_guia', p.nota_guia IS NOT NULL,
      'actualizado_en', p.actualizado_en)
      ORDER BY p.siguiente_fecha NULLS LAST, p.puntuacion DESC NULLS LAST, p.nombre)
    FROM public.prospectos p
    LEFT JOIN public.socios s ON s.id = p.comercial_id
    LEFT JOIN public.comerciales_contacto c ON c.identidad = p.comercial_id
    WHERE (v_rol = 'admin' OR p.comercial_id = dk.identidad_actual())
      AND (p_comercial IS NULL OR p.comercial_id = p_comercial)
      AND (nullif(p_zona, '') IS NULL OR p.zona = p_zona)), '[]'::jsonb);
END;
$$;

-- Ficha completa + historial + posibles duplicados (también de otros comerciales, sin sus datos)
CREATE OR REPLACE FUNCTION dk.prosp_ficha(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rol text := dk.prosp_exigir(p_id); p public.prospectos%ROWTYPE; v_tel text;
BEGIN
  SELECT * INTO p FROM public.prospectos WHERE id = p_id;
  v_tel := nullif(regexp_replace(coalesce(p.telefono, ''), '[^0-9]', '', 'g'), '');
  RETURN to_jsonb(p) || jsonb_build_object(
    'rol', v_rol, 'mio', p.comercial_id = dk.identidad_actual(),
    'comercial', (SELECT coalesce(s.nombre, c.nombre_publico, 'DKitchen') FROM public.identidades i
                    LEFT JOIN public.socios s ON s.id = i.id LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
                   WHERE i.id = p.comercial_id),
    'cliente_slug', (SELECT r.slug FROM public.restaurantes r WHERE r.id = p.restaurante_id),
    'eventos', coalesce((SELECT jsonb_agg(jsonb_build_object('tipo', e.tipo, 'texto', e.texto, 'creado_en', e.creado_en,
                   'quien', coalesce(s.nombre, c.nombre_publico, 'DKitchen')) ORDER BY e.creado_en DESC)
                 FROM public.prospecto_eventos e LEFT JOIN public.socios s ON s.id = e.identidad
                 LEFT JOIN public.comerciales_contacto c ON c.identidad = e.identidad
                WHERE e.prospecto_id = p_id), '[]'::jsonb),
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

-- Ruta del día: la lista ordenada de SUS locales para esa fecha (sustituye la anterior)
CREATE OR REPLACE FUNCTION dk.prosp_ruta(p_fecha date, p_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rol text := dk.prosp_rol(); n integer;
BEGIN
  UPDATE public.prospectos SET ruta_fecha = NULL, ruta_orden = NULL
   WHERE comercial_id = dk.identidad_actual() AND ruta_fecha = p_fecha;
  UPDATE public.prospectos p SET ruta_fecha = p_fecha, ruta_orden = x.orden
    FROM unnest(p_ids) WITH ORDINALITY AS x(id, orden)
   WHERE p.id = x.id AND (p.comercial_id = dk.identidad_actual() OR v_rol = 'admin');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Enlace privado de la propuesta (se crea la primera vez)
CREATE OR REPLACE FUNCTION dk.prosp_propuesta_token(p_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v text;
BEGIN
  PERFORM dk.prosp_exigir(p_id);
  UPDATE public.prospectos SET propuesta_token = coalesce(propuesta_token,
           replace(gen_random_uuid()::text, '-', ''))
   WHERE id = p_id RETURNING propuesta_token INTO v;
  RETURN v;
END;
$$;

-- Mis datos de contacto para la propuesta
CREATE OR REPLACE FUNCTION dk.prosp_mi_contacto()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.prosp_rol();
  RETURN (SELECT jsonb_build_object('nombre_publico', c.nombre_publico, 'telefono', c.telefono)
            FROM public.comerciales_contacto c WHERE c.identidad = dk.identidad_actual());
END;
$$;

CREATE OR REPLACE FUNCTION dk.prosp_mi_contacto_guardar(p_nombre text, p_telefono text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.prosp_rol();
  INSERT INTO public.comerciales_contacto (identidad, nombre_publico, telefono)
  VALUES (dk.identidad_actual(), trim(p_nombre), nullif(trim(p_telefono), ''))
  ON CONFLICT (identidad) DO UPDATE SET nombre_publico = EXCLUDED.nombre_publico, telefono = EXCLUDED.telefono, actualizado_en = now();
END;
$$;

-- Propuesta pública (visitante anónimo con el token). Apunta la apertura (como mucho 1 cada 30 min).
CREATE OR REPLACE FUNCTION dk.propuesta_ver(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE p public.prospectos%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{32}$' THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.prospectos WHERE propuesta_token = p_token;
  IF NOT FOUND OR p.no_contactar THEN RETURN NULL; END IF;
  IF p.propuesta_vista_en IS NULL OR p.propuesta_vista_en < now() - interval '30 minutes' THEN
    UPDATE public.prospectos SET propuesta_vistas = propuesta_vistas + 1, propuesta_vista_en = now() WHERE id = p.id;
    INSERT INTO public.prospecto_eventos (prospecto_id, tipo) VALUES (p.id, 'propuesta_vista');
  END IF;
  RETURN jsonb_build_object('nombre', p.nombre, 'tipo', p.tipo, 'zona', p.zona, 'texto', p.propuesta_texto,
    'muestra_url', p.muestra_url, 'oferta', p.oferta,
    'comercial', (SELECT coalesce(c.nombre_publico, s.nombre, 'DKitchen') FROM public.identidades i
                    LEFT JOIN public.socios s ON s.id = i.id LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
                   WHERE i.id = p.comercial_id),
    'telefono', (SELECT c.telefono FROM public.comerciales_contacto c WHERE c.identidad = p.comercial_id),
    'codigo', (SELECT s.codigo FROM public.socios s WHERE s.id = p.comercial_id AND s.activo));
END;
$$;

-- Central: comerciales (para filtrar y reasignar), reasignar y métricas
CREATE OR REPLACE FUNCTION dk.admin_prosp_comerciales()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN jsonb_build_array(jsonb_build_object('id', dk.identidad_actual(), 'nombre',
           coalesce((SELECT nombre_publico FROM public.comerciales_contacto WHERE identidad = dk.identidad_actual()), 'Yo (karc0)')))
    || coalesce((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre) ORDER BY s.nombre)
                   FROM public.socios s WHERE s.activo), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_prosp_reasignar(p_id uuid, p_comercial uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_comercial <> dk.identidad_actual() AND NOT EXISTS (SELECT 1 FROM public.socios WHERE id = p_comercial AND activo) THEN
    RAISE EXCEPTION 'comercial no válido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.prospectos SET comercial_id = p_comercial, ruta_fecha = NULL, ruta_orden = NULL, actualizado_en = now() WHERE id = p_id;
  INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
  VALUES (p_id, dk.identidad_actual(), 'reasignado', (SELECT coalesce(s.nombre, 'karc0') FROM public.identidades i LEFT JOIN public.socios s ON s.id = i.id WHERE i.id = p_comercial));
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_prosp_metricas()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x ->> 'comercial') FROM (
    SELECT jsonb_build_object('comercial', coalesce(s.nombre, c.nombre_publico, 'karc0'),
      'total', count(*),
      'contactados', count(*) FILTER (WHERE p.estado IN ('visitado','demo','interesado','cliente','descartado')),
      'demos', count(*) FILTER (WHERE p.estado IN ('demo','interesado','cliente')),
      'clientes', count(*) FILTER (WHERE p.estado = 'cliente'),
      'descartados', count(*) FILTER (WHERE p.estado = 'descartado'),
      'motivos', (SELECT coalesce(jsonb_object_agg(m.motivo_descarte, m.n), '{}'::jsonb) FROM (
                    SELECT q.motivo_descarte, count(*) n FROM public.prospectos q
                     WHERE q.comercial_id = p.comercial_id AND q.estado = 'descartado' GROUP BY 1) m)) AS x
      FROM public.prospectos p LEFT JOIN public.socios s ON s.id = p.comercial_id
      LEFT JOIN public.comerciales_contacto c ON c.identidad = p.comercial_id
     GROUP BY p.comercial_id, s.nombre, c.nombre_publico) t), '[]'::jsonb);
END;
$$;

-- Permisos
REVOKE ALL ON FUNCTION dk.prosp_rol(), dk.prosp_exigir(uuid), dk.prosp_guardar(uuid, jsonb), dk.prosp_estado(uuid, text, text, text),
  dk.prosp_anotar(uuid, text, text, text, date), dk.prosp_lista(text, uuid), dk.prosp_ficha(uuid), dk.prosp_ruta(date, uuid[]),
  dk.prosp_propuesta_token(uuid), dk.prosp_mi_contacto(), dk.prosp_mi_contacto_guardar(text, text), dk.propuesta_ver(text),
  dk.admin_prosp_comerciales(), dk.admin_prosp_reasignar(uuid, uuid), dk.admin_prosp_metricas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.prosp_guardar(uuid, jsonb), dk.prosp_estado(uuid, text, text, text),
  dk.prosp_anotar(uuid, text, text, text, date), dk.prosp_lista(text, uuid), dk.prosp_ficha(uuid), dk.prosp_ruta(date, uuid[]),
  dk.prosp_propuesta_token(uuid), dk.prosp_mi_contacto(), dk.prosp_mi_contacto_guardar(text, text),
  dk.admin_prosp_comerciales(), dk.admin_prosp_reasignar(uuid, uuid), dk.admin_prosp_metricas() TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.propuesta_ver(text) TO dk_anon;

COMMIT;
