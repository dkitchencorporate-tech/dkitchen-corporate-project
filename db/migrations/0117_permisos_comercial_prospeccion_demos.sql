-- 0117 · Permisos granulares por comercial, aislamiento en Central, conexión Prospección ↔ Alta Única
-- y generador de Demo Completa (Carta + Panel Admin con comandas) desde Prospección (03/11/2026, Alex / Argón Antigravity).

BEGIN;

-- 1. Configuración granular por comercial en identidades (incluye topes de IA para demos)
ALTER TABLE public.identidades
  ADD COLUMN IF NOT EXISTS config_comercial jsonb NOT NULL DEFAULT '{
    "servicios": ["qr", "signature", "experience", "auditoria"],
    "zonas": ["inicio", "clientes", "servicios", "prospeccion", "oportunidades", "propuestas", "academia", "soporte", "buzon"],
    "puede_crear_demos": true,
    "tope_demos": 10,
    "tope_imagenes_demo": 10
  }'::jsonb;

-- Contador de aperturas de demo en prospectos (recomendación 3 aprobada por Alex)
ALTER TABLE public.prospectos
  ADD COLUMN IF NOT EXISTS demo_vistas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demo_vista_en timestamptz;

-- Activar Vercel AI Gateway en N1 (chat del panel) y N2 (borrador de tickets) inmediatamente
UPDATE public.ia_soporte_ajustes
   SET n1 = 'gateway',
       n2 = 'gateway',
       modelo = 'google/gemini-2.5-flash-lite',
       cambiado_en = now()
 WHERE id = 1;

-- Solo Dirección puede cambiar el interruptor global de IA de soporte en Central
CREATE OR REPLACE FUNCTION dk.admin_ia_soporte_guardar(p_n1 text, p_n2 text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  UPDATE public.ia_soporte_ajustes
     SET n1 = p_n1, n2 = p_n2, cambiado_en = now(), cambiado_por = dk.identidad_actual()
   WHERE id = 1;
END;
$$;

-- 2. Leer la configuración del usuario actual en Central (falla cerrado)
CREATE OR REPLACE FUNCTION dk.mi_config_comercial()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_id uuid := dk.identidad_actual();
  v_rol text := dk.rol_admin_actual();
  v_cfg jsonb;
BEGIN
  IF NOT coalesce(dk.es_admin_academia(), false) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;
  IF v_rol = 'direccion' THEN
    RETURN jsonb_build_object(
      'rol_admin', 'direccion',
      'es_comercial', false,
      'servicios', jsonb_build_array('qr', 'signature', 'experience', 'auditoria'),
      'zonas', jsonb_build_array('inicio', 'clientes', 'servicios', 'prospeccion', 'oportunidades', 'propuestas', 'academia', 'soporte', 'buzon'),
      'puede_crear_demos', true,
      'tope_demos', 9999,
      'tope_imagenes_demo', 9999,
      'ia_sin_limite', true
    );
  END IF;
  SELECT coalesce(config_comercial, '{}'::jsonb) INTO v_cfg FROM public.identidades WHERE id = v_id;
  RETURN jsonb_build_object(
    'rol_admin', v_rol,
    'es_comercial', true,
    'servicios', coalesce(v_cfg -> 'servicios', '["qr","signature","experience","auditoria"]'::jsonb),
    'zonas', coalesce(v_cfg -> 'zonas', '["inicio","clientes","servicios","prospeccion","oportunidades","propuestas","academia","soporte","buzon"]'::jsonb),
    'puede_crear_demos', coalesce((v_cfg ->> 'puede_crear_demos')::boolean, true),
    'tope_demos', coalesce((v_cfg ->> 'tope_demos')::int, 10),
    'tope_imagenes_demo', coalesce((v_cfg ->> 'tope_imagenes_demo')::int, 10),
    'ia_sin_limite', false
  );
END;
$$;

-- 3. Guardar configuración de un comercial desde Dirección (con validación de lista blanca y topes IA)
CREATE OR REPLACE FUNCTION dk.admin_config_comercial_guardar(p_identidad uuid, p_config jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_servicios text[];
  v_zonas text[];
  v_demos boolean;
  v_tope_demos int;
  v_tope_img int;
  v_limpio jsonb;
BEGIN
  PERFORM dk.exigir_direccion();
  IF p_identidad IS NULL OR NOT EXISTS (SELECT 1 FROM public.identidades WHERE id = p_identidad AND rol = 'admin') THEN
    RAISE EXCEPTION 'comercial no encontrado' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(array_agg(DISTINCT x), '{}')
    INTO v_servicios
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_config -> 'servicios') = 'array' THEN p_config -> 'servicios' ELSE '[]'::jsonb END) x
   WHERE x IN ('qr', 'signature', 'experience', 'auditoria');

  IF coalesce(array_length(v_servicios, 1), 0) = 0 THEN
    RAISE EXCEPTION 'elige al menos un servicio permitido para el comercial' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(array_agg(DISTINCT x), '{}')
    INTO v_zonas
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_config -> 'zonas') = 'array' THEN p_config -> 'zonas' ELSE '[]'::jsonb END) x
   WHERE x IN ('inicio', 'clientes', 'servicios', 'prospeccion', 'oportunidades', 'propuestas', 'academia', 'soporte', 'buzon');

  IF NOT ('inicio' = ANY(v_zonas)) THEN
    v_zonas := array_prepend('inicio', v_zonas);
  END IF;

  v_demos := coalesce((p_config ->> 'puede_crear_demos')::boolean, true);
  v_tope_demos := greatest(1, least(coalesce((p_config ->> 'tope_demos')::int, 10), 100));
  v_tope_img := greatest(1, least(coalesce((p_config ->> 'tope_imagenes_demo')::int, 10), 50));

  v_limpio := jsonb_build_object(
    'servicios', to_jsonb(v_servicios),
    'zonas', to_jsonb(v_zonas),
    'puede_crear_demos', v_demos,
    'tope_demos', v_tope_demos,
    'tope_imagenes_demo', v_tope_img
  );

  UPDATE public.identidades
     SET config_comercial = v_limpio
   WHERE id = p_identidad AND rol = 'admin';

  INSERT INTO public.auditoria (identidad, accion, detalle)
  VALUES (dk.identidad_actual(), 'admin.config_comercial', jsonb_build_object('comercial', p_identidad, 'config', v_limpio));
END;
$$;

-- 4. Aislamiento en dk.admin_admins(), dk.buzon_ver() y dk.admin_buzon_estado()
-- Un comercial solo se ve a sí mismo en admin_admins y solo ve sus propios mensajes en el Buzón Agentes IA.
CREATE OR REPLACE FUNCTION dk.admin_admins()
RETURNS TABLE (id uuid, email text, nombre text, dos_fa boolean, yo boolean, creado_en timestamptz, rol_equipo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_es_dir boolean := coalesce(dk.es_direccion(), false);
  v_yo uuid := dk.identidad_actual();
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT i.id, i.email::text, i.nombre::text,
         EXISTS (SELECT 1 FROM public.admin_totp t WHERE t.identidad = i.id AND t.activado_en IS NOT NULL),
         i.id = v_yo, i.creado_en, coalesce(i.rol_admin, 'comercial')::text
    FROM public.identidades i
   WHERE i.rol = 'admin' AND i.activo AND (v_es_dir OR i.id = v_yo)
   ORDER BY i.creado_en;
END;
$$;

CREATE OR REPLACE FUNCTION dk.buzon_ver(p_limite int)
RETURNS TABLE (id uuid, autor_nombre text, autor_tipo text, tipo text, mensaje text, pantalla text, estado text,
               respuesta text, creado_en timestamptz, respondido_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_admin boolean := coalesce(dk.es_admin(), false);
  v_dir boolean := coalesce(dk.es_direccion(), false);
BEGIN
  IF NOT (v_admin OR coalesce(dk.es_socio(), false)) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT b.id, coalesce(i.nombre, '(cuenta borrada)')::text, b.autor_tipo, b.tipo, b.mensaje, b.pantalla, b.estado,
         b.respuesta, b.creado_en, b.respondido_en
    FROM public.buzon_claude b LEFT JOIN public.identidades i ON i.id = b.autor
   WHERE v_dir OR b.autor = dk.identidad_actual()
   ORDER BY (b.estado IN ('hecho', 'descartado')), b.creado_en DESC
   LIMIT greatest(1, least(coalesce(p_limite, 50), 200));
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_buzon_estado(p_id uuid, p_estado text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('nuevo', 'leido', 'hecho', 'descartado') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  UPDATE public.buzon_claude
     SET estado = p_estado
   WHERE id = p_id AND (dk.es_direccion() OR autor = dk.identidad_actual());
  IF NOT FOUND THEN RAISE EXCEPTION 'mensaje no encontrado' USING ERRCODE = 'P0002'; END IF;
END;
$$;

-- 5. Contexto de Alta Única incluye los servicios permitidos del comercial
CREATE OR REPLACE FUNCTION dk.admin_alta_contexto()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_cfg jsonb := dk.mi_config_comercial();
BEGIN
  PERFORM dk.exigir_admin();
  RETURN jsonb_build_object(
    'rol_admin', dk.rol_admin_actual(),
    'cupo', dk.montajes_gratis_cupo(),
    'usados', (SELECT count(*) FROM public.montajes_gratis),
    'servicios_permitidos', coalesce(v_cfg -> 'servicios', '["qr","signature","experience","auditoria"]'::jsonb),
    'puede_crear_demos', coalesce((v_cfg ->> 'puede_crear_demos')::boolean, true)
  );
END;
$$;

-- 6. Equipo Academia/Comerciales incluye config_comercial para el Panel de Control Manual de Alex
CREATE OR REPLACE FUNCTION dk.admin_academia_equipo()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  RETURN coalesce((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'email', i.email::text,
        'nombre', i.nombre,
        'rol', i.rol_admin,
        'config_comercial', coalesce(i.config_comercial, '{"servicios":["qr","signature","experience","auditoria"],"zonas":["inicio","clientes","servicios","prospeccion","oportunidades","propuestas","academia","soporte","buzon"],"puede_crear_demos":true}'::jsonb)
      ) || dk.academia_resumen(i.id)
      ORDER BY i.creado_en
    )
    FROM public.identidades i WHERE i.rol = 'admin' AND i.activo
  ), '[]'::jsonb);
END;
$$;

-- 7. Conexión Prospección ↔ Alta Única: completar alta actualiza automáticamente el prospecto a cliente activo en curso
DROP FUNCTION IF EXISTS dk.admin_alta_completar(uuid, text, text, boolean, text);
CREATE OR REPLACE FUNCTION dk.admin_alta_completar(
  p_restaurante uuid,
  p_ciudad text,
  p_direccion text,
  p_montaje boolean,
  p_origen text,
  p_prospecto uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_nombre text;
  v_yo uuid := dk.identidad_actual();
  v_prosp uuid := p_prospecto;
  v_canal text;
BEGIN
  PERFORM dk.exigir_admin();
  SELECT nombre INTO v_nombre FROM public.restaurantes WHERE id = p_restaurante;
  IF v_nombre IS NULL THEN RAISE EXCEPTION 'no encontrado' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.restaurantes
     SET comercial_id = coalesce(comercial_id, v_yo),
         ciudad = nullif(left(btrim(coalesce(p_ciudad, '')), 80), ''),
         direccion = nullif(left(btrim(coalesce(p_direccion, '')), 200), ''),
         siguiente_paso = 'Alta tramitada · pendiente de activación'
   WHERE id = p_restaurante;

  IF coalesce(p_montaje, false) THEN
    IF dk.rol_admin_actual() <> 'direccion' THEN
      RAISE EXCEPTION 'no autorizado: el montaje gratis es de direccion' USING ERRCODE = '42501';
    END IF;
    IF coalesce(p_origen, '') NOT IN ('flyer', 'visita') THEN RAISE EXCEPTION 'datos: origen' USING ERRCODE = '22023'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('dk.montajes_gratis'));
    IF EXISTS (SELECT 1 FROM public.montajes_gratis WHERE restaurante_id = p_restaurante) THEN
      RAISE EXCEPTION 'ya marcado' USING ERRCODE = '23505';
    END IF;
    IF (SELECT count(*) FROM public.montajes_gratis) >= dk.montajes_gratis_cupo() THEN
      RAISE EXCEPTION 'cupo completo' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.montajes_gratis (restaurante_id, nombre, origen, nota, creado_por)
    VALUES (p_restaurante, left(v_nombre, 160), p_origen, 'Montaje gratis alta única Central', v_yo);
  END IF;

  -- Si no se pasó p_prospecto explícito, comprobar si algún prospecto ya apuntaba a este restaurante (demo previa)
  IF v_prosp IS NULL THEN
    SELECT id INTO v_prosp FROM public.prospectos WHERE restaurante_id = p_restaurante LIMIT 1;
  END IF;

  IF v_prosp IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.prospectos p
     WHERE p.id = v_prosp AND (dk.es_direccion() OR p.comercial_id = v_yo)
  ) THEN
    SELECT coalesce(canal, 'telefono') INTO v_canal FROM public.prospectos WHERE id = v_prosp;
    UPDATE public.prospectos
       SET estado = 'cliente',
           restaurante_id = p_restaurante,
           ultimo_resultado = 'cerrado',
           siguiente_accion = NULL,
           siguiente_fecha = NULL,
           actualizado_en = now()
     WHERE id = v_prosp;

    INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
    VALUES (v_prosp, v_yo, 'estado', 'cliente · Alta tramitada desde Central');

    INSERT INTO public.prospecto_contactos (prospecto_id, identidad, canal, resultado, texto)
    VALUES (v_prosp, v_yo, v_canal, 'cerrado', 'Convertido en cliente activo en curso desde Alta Única');
  END IF;
END;
$$;

-- Reutilizar el restaurante de una demo existente de Prospección al tramitar el alta definitiva
CREATE OR REPLACE FUNCTION dk.admin_reutilizar_demo_prospecto(
  p_prospecto uuid,
  p_identidad uuid,
  p_email citext,
  p_nombre text,
  p_plan text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_rest uuid;
  v_yo uuid := dk.identidad_actual();
BEGIN
  PERFORM dk.exigir_admin();
  SELECT p.restaurante_id INTO v_rest
    FROM public.prospectos p
    JOIN public.restaurantes r ON r.id = p.restaurante_id
   WHERE p.id = p_prospecto
     AND r.demo_interna = true
     AND (dk.es_direccion() OR p.comercial_id = v_yo);

  IF v_rest IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.identidades (id, email, nombre)
  VALUES (p_identidad, p_email, p_nombre)
  ON CONFLICT (id) DO UPDATE SET email = excluded.email, nombre = coalesce(nullif(excluded.nombre, ''), public.identidades.nombre);

  UPDATE public.restaurantes
     SET propietario = p_identidad,
         plan = CASE WHEN p_plan IN ('basico', 'ampliado', 'sala') THEN p_plan ELSE plan END,
         comercial_id = coalesce(comercial_id, v_yo),
         archivado_en = NULL
   WHERE id = v_rest;

  IF NOT EXISTS (SELECT 1 FROM public.codigos_qr WHERE restaurante_id = v_rest AND activo) THEN
    INSERT INTO public.codigos_qr (codigo, restaurante_id)
    VALUES (left(replace(gen_random_uuid()::text, '-', ''), 12), v_rest);
  END IF;

  RETURN v_rest;
END;
$$;

-- Corregir dk.prosp_estado para que también reconozca r.comercial_id del comercial en Central
CREATE OR REPLACE FUNCTION dk.prosp_estado(p_id uuid, p_estado text, p_motivo text, p_slug text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
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
     WHERE r.slug = lower(trim(p_slug))
       AND (v_rol = 'admin' OR r.socio_id = dk.identidad_actual() OR r.comercial_id = dk.identidad_actual());
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

-- 8. Actualizar dk.prosp_lista, dk.prosp_ficha y dk.admin_prosp_demos para incluir contacto, restaurante_id y demo_vistas
CREATE OR REPLACE FUNCTION dk.prosp_lista(p_zona text, p_comercial uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE v_rol text := dk.prosp_rol();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'nombre', p.nombre, 'tipo', p.tipo, 'zona', p.zona, 'barrio', p.barrio, 'direccion', p.direccion,
      'telefono', p.telefono, 'contacto', p.contacto, 'estado', p.estado, 'motivo_descarte', p.motivo_descarte, 'puntuacion', p.puntuacion,
      'siguiente_accion', p.siguiente_accion, 'siguiente_fecha', p.siguiente_fecha, 'apertura_prevista', p.apertura_prevista,
      'fuente', p.fuente, 'muestra', p.muestra_url IS NOT NULL, 'propuesta_vistas', p.propuesta_vistas,
      'demo_vistas', coalesce(p.demo_vistas, 0), 'restaurante_id', p.restaurante_id,
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

-- Cuota de IA y Demos para el usuario actual en Prospección (Dirección = sin límite, Comercial = 10 demos / 10 imágenes IA por demo)
CREATE OR REPLACE FUNCTION dk.prosp_cuota_ia()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_rol_admin text := dk.rol_admin_actual();
  v_cfg jsonb;
  v_usadas int := 0;
  v_tope_demos int := 10;
  v_tope_img int := 10;
BEGIN
  SELECT count(*)::int INTO v_usadas
    FROM public.prospectos
   WHERE comercial_id = v_yo AND restaurante_id IS NOT NULL;

  IF v_rol_admin = 'direccion' THEN
    RETURN jsonb_build_object(
      'rol', 'direccion',
      'sin_limite', true,
      'demos_usadas', v_usadas,
      'demos_tope', 9999,
      'imagenes_tope_demo', 9999
    );
  END IF;

  SELECT coalesce(config_comercial, '{}'::jsonb) INTO v_cfg
    FROM public.identidades WHERE id = v_yo;

  v_tope_demos := coalesce((v_cfg ->> 'tope_demos')::int, 10);
  v_tope_img := coalesce((v_cfg ->> 'tope_imagenes_demo')::int, 10);

  RETURN jsonb_build_object(
    'rol', coalesce(v_rol_admin, 'comercial'),
    'sin_limite', false,
    'demos_usadas', v_usadas,
    'demos_tope', v_tope_demos,
    'imagenes_tope_demo', v_tope_img
  );
END;
$$;

CREATE OR REPLACE FUNCTION dk.prosp_ficha(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE v_rol text := dk.prosp_exigir(p_id); p public.prospectos%ROWTYPE; v_tel text;
BEGIN
  SELECT * INTO p FROM public.prospectos WHERE id = p_id;
  v_tel := nullif(regexp_replace(coalesce(p.telefono, ''), '[^0-9]', '', 'g'), '');
  RETURN to_jsonb(p) || jsonb_build_object(
    'rol', v_rol, 'mio', p.comercial_id = dk.identidad_actual(),
    'cuota_ia', dk.prosp_cuota_ia(),
    'comercial', (SELECT coalesce(s.nombre, c.nombre_publico, i.nombre, 'DKitchen') FROM public.identidades i
                    LEFT JOIN public.socios s ON s.id = i.id LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
                   WHERE i.id = p.comercial_id),
    'cliente_slug', (SELECT r.slug FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'demo_interna', (SELECT r.demo_interna FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'demo_color', (SELECT r.color_marca FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'demo_plantilla', (SELECT r.plantilla FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'demo_fondo', (SELECT r.estilo_fondo FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'demo_logo', (SELECT r.logo_url FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'demo_portada', (SELECT r.portada_url FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
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

CREATE OR REPLACE FUNCTION dk.admin_prosp_demos()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_dir boolean := coalesce(dk.es_direccion(), false);
  v_yo uuid := dk.identidad_actual();
BEGIN
  PERFORM dk.exigir_admin();
  RETURN coalesce((
    SELECT jsonb_object_agg(p.id, jsonb_build_object(
             'slug', r.slug, 'color', r.color_marca, 'plantilla', r.plantilla, 'fondo', r.estilo_fondo,
             'platos', (SELECT count(*) FROM public.menu_items i WHERE i.restaurante_id = r.id),
             'vistas', coalesce(p.demo_vistas, 0)))
      FROM public.prospectos p
      JOIN public.restaurantes r ON r.id = p.restaurante_id AND r.archivado_en IS NULL
     WHERE v_dir OR p.comercial_id = v_yo
  ), '{}'::jsonb);
END;
$$;

-- 9. Reasignación por lotes desde Central (6, 12 o selección manual) + asignación a Ruta a pie o Prospección Digital
CREATE OR REPLACE FUNCTION dk.admin_prosp_reasignar_lote(
  p_ids uuid[],
  p_comercial uuid,
  p_canal text DEFAULT NULL,
  p_en_ruta boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_nombre_com text;
  v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  v_id uuid;
  v_orden int := 0;
  v_total int := 0;
  v_canal text := nullif(btrim(coalesce(p_canal, '')), '');
BEGIN
  PERFORM dk.exigir_direccion();
  IF p_comercial IS NULL OR (
     p_comercial <> dk.identidad_actual()
     AND NOT EXISTS (SELECT 1 FROM public.socios WHERE id = p_comercial AND activo)
     AND NOT EXISTS (SELECT 1 FROM public.identidades WHERE id = p_comercial AND rol = 'admin' AND rol_admin = 'comercial' AND activo)
  ) THEN
    RAISE EXCEPTION 'comercial no válido' USING ERRCODE = '22023';
  END IF;

  IF v_canal IS NOT NULL AND v_canal NOT IN ('fisico', 'telefono', 'instagram', 'facebook', 'tiktok', 'whatsapp', 'email') THEN
    RAISE EXCEPTION 'canal no válido' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(s.nombre, c.nombre_publico, i.nombre, 'DKitchen')
    INTO v_nombre_com
    FROM public.identidades i
    LEFT JOIN public.socios s ON s.id = i.id
    LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
   WHERE i.id = p_comercial;

  IF coalesce(p_en_ruta, false) THEN
    SELECT coalesce(max(ruta_orden), 0) INTO v_orden
      FROM public.prospectos
     WHERE comercial_id = p_comercial AND ruta_fecha = v_hoy;
  END IF;

  FOREACH v_id IN ARRAY coalesce(p_ids, '{}'::uuid[]) LOOP
    IF EXISTS (SELECT 1 FROM public.prospectos WHERE id = v_id) THEN
      v_total := v_total + 1;
      IF coalesce(p_en_ruta, false) THEN
        v_orden := v_orden + 1;
      END IF;

      UPDATE public.prospectos
         SET comercial_id = p_comercial,
             canal = coalesce(v_canal, canal),
             fuente = CASE WHEN v_canal IS NOT NULL AND v_canal <> 'fisico' AND fuente = 'script' THEN 'digital' ELSE fuente END,
             ruta_fecha = CASE WHEN coalesce(p_en_ruta, false) THEN v_hoy ELSE NULL END,
             ruta_orden = CASE WHEN coalesce(p_en_ruta, false) THEN v_orden ELSE NULL END,
             actualizado_en = now()
       WHERE id = v_id;

      INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
      VALUES (
        v_id,
        dk.identidad_actual(),
        'reasignado',
        coalesce(v_nombre_com, 'comercial')
          || CASE WHEN v_canal IS NOT NULL THEN ' · canal: ' || v_canal ELSE '' END
          || CASE WHEN coalesce(p_en_ruta, false) THEN ' · en ruta de hoy' ELSE '' END
      );
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;

-- Guardar propuesta con plantilla + generar token en un solo paso y actualizar dk.propuesta_ver
CREATE OR REPLACE FUNCTION dk.prosp_guardar_propuesta_completa(
  p_id uuid,
  p_texto text,
  p_oferta text,
  p_muestra_url text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  v_rol text := dk.prosp_exigir(p_id);
  v_token text;
  v_oferta text := CASE WHEN p_oferta IN ('qr_1', 'fundador', 'signature', 'experience', 'dark_kitchen') THEN p_oferta ELSE 'qr_1' END;
  v_muestra text := nullif(btrim(coalesce(p_muestra_url, '')), '');
BEGIN
  UPDATE public.prospectos
     SET propuesta_texto = nullif(left(btrim(coalesce(p_texto, '')), 1500), ''),
         oferta = v_oferta,
         muestra_url = coalesce(v_muestra, muestra_url),
         propuesta_token = coalesce(propuesta_token, replace(gen_random_uuid()::text, '-', '')),
         actualizado_en = now()
   WHERE id = p_id
   RETURNING propuesta_token INTO v_token;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION dk.propuesta_ver(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE p public.prospectos%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{32}$' THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.prospectos WHERE propuesta_token = p_token;
  IF NOT FOUND OR p.no_contactar THEN RETURN NULL; END IF;
  IF p.propuesta_vista_en IS NULL OR p.propuesta_vista_en < now() - interval '30 minutes' THEN
    UPDATE public.prospectos SET propuesta_vistas = propuesta_vistas + 1, propuesta_vista_en = now() WHERE id = p.id;
    INSERT INTO public.prospecto_eventos (prospecto_id, tipo) VALUES (p.id, 'propuesta_vista');
  END IF;
  RETURN jsonb_build_object(
    'nombre', p.nombre, 'tipo', p.tipo, 'zona', p.zona, 'texto', p.propuesta_texto,
    'muestra_url', p.muestra_url, 'oferta', p.oferta,
    'comercial', (SELECT coalesce(c.nombre_publico, s.nombre, i.nombre, 'DKitchen') FROM public.identidades i
                    LEFT JOIN public.socios s ON s.id = i.id LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
                   WHERE i.id = p.comercial_id),
    'telefono', (SELECT c.telefono FROM public.comerciales_contacto c WHERE c.identidad = p.comercial_id),
    'codigo', (SELECT s.codigo FROM public.socios s WHERE s.id = p.comercial_id AND s.activo),
    'demo_slug', (SELECT r.slug FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'pago_url', (SELECT e.url FROM public.enlaces_pago e WHERE e.restaurante_id = p.restaurante_id AND e.estado = 'pendiente' AND e.url IS NOT NULL
                  ORDER BY e.creado_en DESC LIMIT 1)
  );
END;
$$;

-- Permitir que dk.gestiona reconozca también al comercial dueño de una demo (en Central o en /socio)
CREATE OR REPLACE FUNCTION dk.gestiona(p_restaurante uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurantes r
                  WHERE r.id = p_restaurante
                    AND (r.propietario = dk.identidad_actual()
                         OR (r.socio_id = dk.identidad_actual() AND r.socio_puede_editar AND dk.es_socio())
                         OR (r.demo_interna AND r.comercial_id = dk.identidad_actual())))
         OR coalesce(dk.es_admin(), false);
$$;

DROP POLICY IF EXISTS restaurante_edita_lo_suyo ON public.restaurantes;
CREATE POLICY restaurante_edita_lo_suyo ON public.restaurantes FOR UPDATE TO dk_auth
  USING (propietario = dk.identidad_actual()
         OR (socio_id = dk.identidad_actual() AND socio_puede_editar AND dk.es_socio())
         OR (demo_interna AND comercial_id = dk.identidad_actual())
         OR coalesce(dk.es_admin(), false))
  WITH CHECK (propietario = dk.identidad_actual()
         OR (socio_id = dk.identidad_actual() AND socio_puede_editar AND dk.es_socio())
         OR (demo_interna AND comercial_id = dk.identidad_actual())
         OR coalesce(dk.es_admin(), false));

-- Permitir edición manual completa del estilo y firma tanto a Dirección/Comerciales como al dueño que ya ha pagado
CREATE OR REPLACE FUNCTION dk.control_diseno_cliente()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF dk.es_admin() OR dk.prosp_rol() IS NOT NULL OR dk.identidad_actual() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.nivel_diseno IS DISTINCT FROM OLD.nivel_diseno THEN
    RAISE EXCEPTION 'El nivel de diseño lo asigna DKitchen.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- Cuotas diferenciadas en dk.ia_mi_saldo, dk.ia_reservar, dk.ia_devolver y dk.ayuda_ia_reservar:
-- · Dirección (Alex): SIN RESTRICCIÓN (9999 restantes, sin tope diario ni freno para él)
-- · Comercial en demo: tope de 10 imágenes IA por demo (config_comercial.tope_imagenes_demo)
-- · Cliente de negocio que ha pagado: saldo normal del local (3 gratis + bonos de 50)
CREATE OR REPLACE FUNCTION dk.ia_mi_saldo(p_restaurante uuid)
RETURNS TABLE(restantes integer, gratis_restantes integer, compradas integer, usadas integer, hoy integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  s record;
  v_rol_admin text := dk.rol_admin_actual();
  v_es_demo boolean := false;
  v_tope_img int := 10;
BEGIN
  SELECT r.demo_interna INTO v_es_demo
    FROM public.restaurantes r
   WHERE r.id = p_restaurante AND dk.gestiona(r.id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO s FROM dk.ia_saldo(p_restaurante);

  IF v_rol_admin = 'direccion' THEN
    RETURN QUERY SELECT 9999, 9999, 9999, s.usadas, s.hoy;
    RETURN;
  END IF;

  IF v_es_demo AND (v_rol_admin = 'comercial' OR dk.prosp_rol() = 'socio') THEN
    SELECT coalesce((config_comercial ->> 'tope_imagenes_demo')::int, 10)
      INTO v_tope_img
      FROM public.identidades WHERE id = dk.identidad_actual();
    v_tope_img := coalesce(v_tope_img, 10);
    RETURN QUERY SELECT
      least(s.restantes, greatest(0, v_tope_img - s.usadas))::integer,
      s.gratis_restantes,
      s.compradas,
      s.usadas,
      s.hoy;
    RETURN;
  END IF;

  RETURN QUERY SELECT s.restantes, s.gratis_restantes, s.compradas, s.usadas, s.hoy;
END;
$$;

CREATE OR REPLACE FUNCTION dk.ia_reservar(p_restaurante uuid, p_detalle text)
RETURNS TABLE(movimiento uuid, aviso_80 boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  s record;
  v_gasto numeric;
  v_id uuid;
  v_rol_admin text := dk.rol_admin_actual();
  v_es_demo boolean := false;
  v_tope_img int := 10;
BEGIN
  SELECT r.demo_interna INTO v_es_demo
    FROM public.restaurantes r
   WHERE r.id = p_restaurante AND dk.gestiona(r.id) AND r.estado_acceso IN ('activo', 'gracia')
   FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado o sin acceso' USING ERRCODE = '42501'; END IF;

  SELECT * INTO s FROM dk.ia_saldo(p_restaurante);

  IF v_rol_admin <> 'direccion' THEN
    IF v_es_demo AND (v_rol_admin = 'comercial' OR dk.prosp_rol() = 'socio') THEN
      SELECT coalesce((config_comercial ->> 'tope_imagenes_demo')::int, 10)
        INTO v_tope_img
        FROM public.identidades WHERE id = dk.identidad_actual();
      v_tope_img := coalesce(v_tope_img, 10);
      IF s.usadas >= v_tope_img THEN
        RAISE EXCEPTION 'ia_sin_saldo' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    IF s.restantes <= 0 THEN RAISE EXCEPTION 'ia_sin_saldo' USING ERRCODE = 'P0001'; END IF;
    IF s.hoy >= dk.ia_limite_diario() THEN RAISE EXCEPTION 'ia_limite_diario' USING ERRCODE = 'P0001'; END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('dk.ia_tope'));
  v_gasto := dk.ia_gasto_mes_usd();
  IF v_rol_admin <> 'direccion' AND v_gasto + dk.ia_coste_imagen_usd() > dk.ia_tope_mensual_usd() THEN
    RAISE EXCEPTION 'ia_tope_global' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.ia_movimientos (restaurante_id, tipo, cantidad, coste_usd, detalle)
  VALUES (p_restaurante, 'uso', 1, dk.ia_coste_imagen_usd(), left(p_detalle, 200)) RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id,
    (v_gasto < dk.ia_tope_mensual_usd() * 0.8 AND v_gasto + dk.ia_coste_imagen_usd() >= dk.ia_tope_mensual_usd() * 0.8);
END;
$$;

CREATE OR REPLACE FUNCTION dk.ia_devolver(p_movimiento uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE m public.ia_movimientos;
BEGIN
  SELECT * INTO m FROM public.ia_movimientos WHERE id = p_movimiento AND tipo = 'uso';
  IF NOT FOUND OR NOT dk.gestiona(m.restaurante_id) THEN
    RAISE EXCEPTION 'movimiento no encontrado' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.ia_movimientos (restaurante_id, tipo, cantidad, coste_usd, referencia, detalle)
  VALUES (m.restaurante_id, 'devolucion', 1, m.coste_usd, 'dev-' || m.id, 'La IA no devolvió imagen')
  ON CONFLICT (referencia) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION dk.ayuda_ia_reservar(p_restaurante uuid)
RETURNS TABLE (uso uuid, quedan int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE
  v_hoy int;
  v_id uuid;
  v_rol_admin text := dk.rol_admin_actual();
BEGIN
  IF NOT dk.gestiona(p_restaurante) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.restaurantes WHERE id = p_restaurante FOR UPDATE;
  SELECT count(*)::int INTO v_hoy FROM public.ayuda_ia_uso
   WHERE restaurante_id = p_restaurante
     AND creado_en >= date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';
  IF v_rol_admin <> 'direccion' THEN
    IF v_hoy >= dk.ayuda_ia_tope_diario() THEN RAISE EXCEPTION 'ayuda_tope_diario' USING ERRCODE = 'P0001'; END IF;
    IF dk.ia_gasto_mes_usd() + dk.ayuda_ia_reserva_usd() > dk.ia_tope_mensual_usd() THEN
      RAISE EXCEPTION 'ia_tope_global' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  INSERT INTO public.ayuda_ia_uso (restaurante_id, identidad, coste_usd)
  VALUES (p_restaurante, dk.identidad_actual(), dk.ayuda_ia_reserva_usd()) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id,
    CASE WHEN v_rol_admin = 'direccion' THEN 999 ELSE greatest(0, dk.ayuda_ia_tope_diario() - v_hoy - 1) END;
END;
$$;

-- 10. Generador Autoservicio de Demo Completa (Carta de Autor + Panel Admin con Sala y Fotos) desde Prospección
-- Tope para comerciales: máximo 10 demos por comercial y hasta 10 imágenes IA por demo (Dirección sin restricción).
CREATE OR REPLACE FUNCTION dk.prosp_crear_demo(
  p_prospecto uuid,
  p_plantilla text DEFAULT 'taberna',
  p_color text DEFAULT '#6E0C2B',
  p_fondo text DEFAULT 'papel'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO dk, public, pg_catalog
AS $$
DECLARE
  v_rol text := dk.prosp_exigir(p_prospecto);
  v_rol_admin text := dk.rol_admin_actual();
  v_cfg jsonb;
  v_tope_demos int := 10;
  v_tope_img int := 10;
  v_demos_usadas int := 0;
  p public.prospectos%ROWTYPE;
  v_plantilla text := CASE WHEN p_plantilla IN ('clasica', 'visual', 'express', 'editorial', 'premium', 'gastro', 'taberna', 'urbano') THEN p_plantilla ELSE 'taberna' END;
  v_color text := CASE WHEN p_color ~ '^#[0-9a-fA-F]{6}$' THEN upper(p_color) ELSE '#6E0C2B' END;
  v_fondo text := CASE WHEN p_fondo IN ('papel', 'blanco', 'oscuro') THEN p_fondo ELSE 'papel' END;
  v_slug_base text;
  v_slug text;
  v_idn uuid;
  v_rest uuid;
  v_socio uuid;
  v_token text;
  v_firma jsonb;
  v_sec uuid;
  v_s jsonb;
  v_p jsonb;
  v_orden int := 0;
  v_op int;
BEGIN
  IF coalesce(dk.es_admin_academia(), false) THEN
    v_cfg := dk.mi_config_comercial();
    IF NOT coalesce((v_cfg ->> 'puede_crear_demos')::boolean, true) THEN
      RAISE EXCEPTION 'no autorizado: creacion de demos desactivada en tu perfil' USING ERRCODE = '42501';
    END IF;
    v_tope_demos := coalesce((v_cfg ->> 'tope_demos')::int, 10);
    v_tope_img := coalesce((v_cfg ->> 'tope_imagenes_demo')::int, 10);
  END IF;

  SELECT * INTO p FROM public.prospectos WHERE id = p_prospecto FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'prospecto no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF p.restaurante_id IS NOT NULL THEN
    SELECT id, slug INTO v_rest, v_slug FROM public.restaurantes WHERE id = p.restaurante_id;
  END IF;

  -- Si es una demo nueva y no es Dirección, verificar el tope de 10 demos del comercial
  IF v_rest IS NULL AND v_rol_admin <> 'direccion' THEN
    SELECT count(*)::int INTO v_demos_usadas
      FROM public.prospectos
     WHERE comercial_id = dk.identidad_actual() AND restaurante_id IS NOT NULL;
    IF v_demos_usadas >= v_tope_demos THEN
      RAISE EXCEPTION 'tope_demos_comercial' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT id INTO v_socio FROM public.socios WHERE id = p.comercial_id AND activo;

  v_firma := jsonb_build_object(
    'lema', coalesce('Cocina con identidad propia en ' || p.zona, 'Nuestra carta digital'),
    'nota', 'Elaboramos cada plato al momento con producto seleccionado. Pregunta a nuestro equipo por las sugerencias de hoy.',
    'autor', p.nombre,
    'adorno', CASE WHEN v_plantilla = 'gastro' THEN 'rombo' WHEN v_plantilla = 'urbano' THEN 'sello' ELSE 'estrella' END,
    'destacados', 'Recomendados de la casa'
  );

  IF v_rest IS NULL THEN
    v_slug_base := coalesce(nullif(left(regexp_replace(lower(translate(p.nombre, 'áéíóúàèìòùäëïöüñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ', 'aeiouaeiouaeiounAEIOUAEIOUAEIOUN')), '[^a-z0-9]+', '-', 'g'), 34), ''), 'local');
    v_slug_base := trim(both '-' from v_slug_base);
    IF v_slug_base = '' THEN v_slug_base := 'local'; END IF;
    v_slug := dk.slug_disponible(v_slug_base);

    INSERT INTO public.identidades (id, email, nombre, rol)
    VALUES (gen_random_uuid(), 'demo+' || v_slug || '@dkitchencorporate.es', 'Demo · ' || left(p.nombre, 80), 'cliente')
    RETURNING id INTO v_idn;

    INSERT INTO public.restaurantes (
      propietario, slug, nombre, plan, plantilla, nivel_diseno, estilo_fondo, color_marca, firma,
      demo_interna, comercial_id, socio_id, socio_puede_editar, ciudad, direccion, telefono, instagram, idiomas, estado_acceso, activo,
      descripcion, horario
    )
    VALUES (
      v_idn, v_slug, p.nombre, 'sala', v_plantilla, 'autor', v_fondo, v_color, v_firma,
      true, p.comercial_id, v_socio, true, p.zona, p.direccion, p.telefono, p.instagram, '{en}', 'activo', true,
      coalesce('Cocina y especialidad en ' || p.zona, 'Cocina de temporada'),
      'Martes a domingo · 13:00–16:30 y 20:00–23:30'
    )
    RETURNING id INTO v_rest;

    INSERT INTO public.codigos_qr (codigo, restaurante_id)
    VALUES (left(replace(gen_random_uuid()::text, '-', ''), 12), v_rest);
  ELSE
    UPDATE public.restaurantes
       SET plantilla = v_plantilla,
           nivel_diseno = 'autor',
           estilo_fondo = v_fondo,
           color_marca = v_color,
           firma = coalesce(firma, v_firma),
           comercial_id = coalesce(comercial_id, p.comercial_id),
           socio_id = coalesce(socio_id, v_socio),
           socio_puede_editar = true,
           plan = 'sala',
           estado_acceso = 'activo',
           activo = true,
           archivado_en = NULL
     WHERE id = v_rest;
  END IF;

  -- Activar servicios de demostración (Sala, Plano de mesas, Idiomas, Carta de Autor) y bono IA para editar la demo
  INSERT INTO public.servicios_contratados (restaurante_id, servicio, estado, origen)
  SELECT v_rest, s, 'activo', 'regalo'
    FROM unnest(ARRAY['plano_mesas', 'app_sala', 'conexion_tpv', 'pack_sala', 'idiomas', 'setup_experto']) AS s
  ON CONFLICT (restaurante_id, servicio) DO UPDATE SET estado = 'activo';

  -- Otorgar créditos IA iniciales a la demo (3 gratis base + 7 bono = 10 para comercial; 100 para Dirección)
  INSERT INTO public.ia_movimientos (restaurante_id, tipo, cantidad, coste_usd, referencia, detalle)
  VALUES (
    v_rest,
    'compra',
    CASE WHEN v_rol_admin = 'direccion' THEN 100 ELSE greatest(1, v_tope_img - dk.ia_gratis()) END,
    0,
    'demo-' || v_rest::text,
    'Créditos IA incluidos para personalizar la demo comercial'
  )
  ON CONFLICT (referencia) DO NOTHING;

  -- Crear 4 mesas de muestra en el plano de sala si aún no tiene mesas
  IF NOT EXISTS (SELECT 1 FROM public.mesas WHERE restaurante_id = v_rest) THEN
    INSERT INTO public.mesas (restaurante_id, numero, zona, capacidad, forma, x, y, ancho, alto)
    VALUES
      (v_rest, '1', 'Sala', 4, 'cuadrada', 18, 22, 12, 12),
      (v_rest, '2', 'Sala', 4, 'cuadrada', 42, 22, 12, 12),
      (v_rest, '3', 'Sala', 6, 'rectangular', 68, 22, 16, 12),
      (v_rest, '4', 'Terraza', 4, 'redonda', 30, 58, 12, 12);
  END IF;

  -- Cargar carta de demostración con fotos si aún no tiene platos
  IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE restaurante_id = v_rest) THEN
    FOR v_s IN SELECT * FROM jsonb_array_elements($j$[
      {"s":"Para compartir","p":[
        ["Croquetas de jamón ibérico","Cremosas, de receta de la casa. Seis unidades.",9.5,["GL","LE","HU"],"https://dkitchencorporate.es/images/demo/s5.png","estrella"],
        ["Tartar de atún rojo","Con aguacate, lima y sésamo tostado.",16.0,["PE","SE"],"https://dkitchencorporate.es/images/demo/s1.png","nuevo"],
        ["Patatas bravas ahumadas","Con nuestra salsa brava casera y alioli suave.",6.5,["HU"],"https://dkitchencorporate.es/images/demo/t1.jpeg",null],
        ["Tabla de quesos artesanos","Selección nacional con membrillo y nueces.",14.0,["LE","FR"],"https://dkitchencorporate.es/images/demo/t4.jpeg",null]]},
      {"s":"Principales","p":[
        ["Presa ibérica a la brasa","Con patata asada al romero y pimientos confitados.",19.5,[],"https://dkitchencorporate.es/images/demo/s18.jpeg","estrella"],
        ["Bacalao negro glaseado","Lomo confitado a baja temperatura con emulsión suave.",22.0,["PE","SO"],"https://dkitchencorporate.es/images/demo/s17.png",null],
        ["Arroz meloso de marisco","Con gamba roja y mejillones de roca.",18.5,["CR","MU","PE"],"https://dkitchencorporate.es/images/demo/s12.png",null],
        ["Brioche de costilla asada","Cocinada 12 horas en su jugo con queso fundido.",15.0,["GL","LE","HU","SE"],"https://dkitchencorporate.es/images/demo/t7.jpeg","nuevo"]]},
      {"s":"Postres caseros","p":[
        ["Tarta de queso al horno","Cremosa por dentro, con base de galleta artesana.",6.5,["LE","HU","GL"],"https://dkitchencorporate.es/images/demo/s22.jpeg","estrella"],
        ["Coulant de chocolate 70%","Recién horneado con helado de vainilla Bourbon.",7.0,["GL","LE","HU"],"https://dkitchencorporate.es/images/demo/s21.png",null]]},
      {"s":"Bodega y bebidas","p":[
        ["Copa de vino tinto Crianza","Selección de la casa.",3.8,["SU"],"https://dkitchencorporate.es/images/demo/s25.jpeg",null],
        ["Cerveza de barril bien fría","Tirada maestra.",2.6,["GL"],"https://dkitchencorporate.es/images/demo/s26.jpeg",null],
        ["Agua mineral natural","50 cl.",2.2,[],null,null]]}
    ]$j$::jsonb) LOOP
      v_orden := v_orden + 1; v_op := 0;
      INSERT INTO public.menu_secciones (restaurante_id, nombre, orden)
      VALUES (v_rest, v_s->>'s', v_orden)
      RETURNING id INTO v_sec;
      FOR v_p IN SELECT * FROM jsonb_array_elements(v_s->'p') LOOP
        v_op := v_op + 1;
        INSERT INTO public.menu_items (restaurante_id, seccion_id, nombre, descripcion, precio, alergenos, foto_url, etiqueta, orden)
        VALUES (
          v_rest, v_sec, v_p->>0, nullif(v_p->>1, ''), (v_p->>2)::numeric,
          ARRAY(SELECT jsonb_array_elements_text(v_p->3)), nullif(v_p->>4, ''), nullif(v_p->>5, ''), v_op
        );
      END LOOP;
    END LOOP;
  END IF;

  v_token := coalesce(p.propuesta_token, replace(gen_random_uuid()::text, '-', ''));

  UPDATE public.prospectos
     SET restaurante_id = v_rest,
         propuesta_token = v_token,
         muestra_url = NULL,
         estado = CASE WHEN estado IN ('por_revisar', 'por_visitar', 'muestra', 'visitado') THEN 'demo' ELSE estado END,
         actualizado_en = now()
   WHERE id = p_prospecto;

  INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
  VALUES (p_prospecto, dk.identidad_actual(), 'nota', 'Demo de autor lista (Carta + Panel Admin): /m/' || v_slug);

  RETURN jsonb_build_object(
    'restaurante_id', v_rest,
    'slug', v_slug,
    'propuesta_token', v_token
  );
END;
$$;

-- 10. Datos públicos de una demo para /demo/panel?local=<slug> + contador de «Demo vista» (recomendación 3)
CREATE OR REPLACE FUNCTION dk.demo_panel_datos(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $$
DECLARE
  r public.restaurantes%ROWTYPE;
  v_prosp uuid;
BEGIN
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN RETURN NULL; END IF;
  SELECT * INTO r
    FROM public.restaurantes
   WHERE slug = lower(btrim(p_slug))
     AND demo_interna = true
     AND archivado_en IS NULL
   LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Si está vinculada a un prospecto, anotar la apertura de la demo (máx. 1 cada 30 min)
  SELECT id INTO v_prosp FROM public.prospectos WHERE restaurante_id = r.id LIMIT 1;
  IF v_prosp IS NOT NULL THEN
    UPDATE public.prospectos
       SET demo_vistas = coalesce(demo_vistas, 0) + 1,
           demo_vista_en = now()
     WHERE id = v_prosp
       AND (demo_vista_en IS NULL OR demo_vista_en < now() - interval '30 minutes');
  END IF;

  RETURN jsonb_build_object(
    'id', r.id,
    'slug', r.slug,
    'nombre', r.nombre,
    'colorMarca', coalesce(r.color_marca, '#6E0C2B'),
    'plantilla', coalesce(r.plantilla, 'clasica'),
    'estiloFondo', coalesce(r.estilo_fondo, 'papel'),
    'estiloLetra', coalesce(r.estilo_letra, 'sans'),
    'descripcion', coalesce(r.descripcion, 'Cocina de temporada'),
    'telefono', coalesce(r.telefono, '+34 600 000 000'),
    'direccion', coalesce(r.direccion, 'España'),
    'horario', coalesce(r.horario, 'Martes a domingo · 13:00–16:30 y 20:00–23:30'),
    'instagram', r.instagram,
    'secciones', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', s.id::text, 'nombre', s.nombre, 'orden', s.orden) ORDER BY s.orden)
        FROM public.menu_secciones s WHERE s.restaurante_id = r.id
    ), '[]'::jsonb),
    'platos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id::text,
        'seccionId', i.seccion_id::text,
        'nombre', i.nombre,
        'descripcion', coalesce(i.descripcion, ''),
        'precio', to_char(i.precio, 'FM999990.00'),
        'fotoUrl', i.foto_url,
        'alergenos', coalesce(to_jsonb(i.alergenos), '[]'::jsonb),
        'disponible', i.disponible,
        'orden', i.orden
      ) ORDER BY i.orden)
        FROM public.menu_items i WHERE i.restaurante_id = r.id
    ), '[]'::jsonb)
  );
END;
$$;

-- Permisos
REVOKE ALL ON FUNCTION
  dk.mi_config_comercial(),
  dk.admin_config_comercial_guardar(uuid, jsonb),
  dk.admin_ia_soporte_guardar(text, text),
  dk.admin_admins(),
  dk.buzon_ver(int),
  dk.admin_buzon_estado(uuid, text),
  dk.admin_alta_contexto(),
  dk.admin_academia_equipo(),
  dk.admin_alta_completar(uuid, text, text, boolean, text, uuid),
  dk.admin_reutilizar_demo_prospecto(uuid, uuid, citext, text, text),
  dk.prosp_estado(uuid, text, text, text),
  dk.prosp_lista(text, uuid),
  dk.prosp_cuota_ia(),
  dk.prosp_ficha(uuid),
  dk.admin_prosp_demos(),
  dk.admin_prosp_reasignar_lote(uuid[], uuid, text, boolean),
  dk.prosp_guardar_propuesta_completa(uuid, text, text, text),
  dk.propuesta_ver(text),
  dk.gestiona(uuid),
  dk.ia_mi_saldo(uuid),
  dk.ia_reservar(uuid, text),
  dk.ia_devolver(uuid),
  dk.ayuda_ia_reservar(uuid),
  dk.prosp_crear_demo(uuid, text, text, text),
  dk.demo_panel_datos(text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  dk.mi_config_comercial(),
  dk.admin_config_comercial_guardar(uuid, jsonb),
  dk.admin_ia_soporte_guardar(text, text),
  dk.admin_admins(),
  dk.buzon_ver(int),
  dk.admin_buzon_estado(uuid, text),
  dk.admin_alta_contexto(),
  dk.admin_academia_equipo(),
  dk.admin_alta_completar(uuid, text, text, boolean, text, uuid),
  dk.admin_reutilizar_demo_prospecto(uuid, uuid, citext, text, text),
  dk.prosp_estado(uuid, text, text, text),
  dk.prosp_lista(text, uuid),
  dk.prosp_cuota_ia(),
  dk.prosp_ficha(uuid),
  dk.admin_prosp_demos(),
  dk.admin_prosp_reasignar_lote(uuid[], uuid, text, boolean),
  dk.prosp_guardar_propuesta_completa(uuid, text, text, text),
  dk.propuesta_ver(text),
  dk.gestiona(uuid),
  dk.ia_mi_saldo(uuid),
  dk.ia_reservar(uuid, text),
  dk.ia_devolver(uuid),
  dk.ayuda_ia_reservar(uuid),
  dk.prosp_crear_demo(uuid, text, text, text),
  dk.demo_panel_datos(text)
TO dk_auth;

GRANT EXECUTE ON FUNCTION dk.demo_panel_datos(text), dk.propuesta_ver(text) TO dk_anon;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0117_permisos_comercial_prospeccion_demos.sql') ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. Tarea pendiente (auditoría Signature): Generador de demos pre-pago para Signature
-- ----------------------------------------------------------------------------
INSERT INTO public.tareas_karc0 (
  orden, bloque, titulo, detalle, enlace, estado, responsable, urgencia, nota_claude
)
SELECT
  COALESCE((SELECT MAX(orden) + 1 FROM public.tareas_karc0), 900),
  'producto',
  'Signature · Habilitar generador de demos interactivas antes del pago (como en Carta QR) y reutilizarla al contratar',
  'Auditoría de solo lectura (03/11): actualmente MarcaSignature.tsx bloquea «Crear su web y su panel» hasta que fase != solicitud (tras el pago) y dispara un repositorio dedicado en dkitchen-marcas. Falta definir y construir una demo interactiva ligera de Signature desde Prospección (con pedidos a domicilio/recogida simulados y editor de fotos) que se reutilice cuando el cliente pague.',
  '/admin-dkitchen/signature',
  'pendiente',
  'ambos',
  'alta',
  '[03/11 · Antigravity] Auditado en solo lectura por indicación de Alex. Carta QR ya tiene el flujo completo de demo de Autor + editor de fotos + reutilización al comprar; queda pendiente diseñar e implementar el equivalente pre-pago para Signature.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.tareas_karc0 WHERE titulo LIKE 'Signature · Habilitar generador de demos interactivas%'
);

COMMIT;
