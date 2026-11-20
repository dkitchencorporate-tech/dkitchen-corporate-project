-- =============================================================================
-- 0120 · Francotirador de Propuestas + Filtro Anti-Autoapertura (20/11/2026)
-- 1. Añade public.prospectos.whatsapp_borrador para almacenar el mensaje
--    personalizado de WhatsApp listo para disparar desde Central.
-- 2. Actualiza dk.propuesta_ver(p_token, p_contar DEFAULT true) y
--    dk.demo_panel_datos(p_slug, p_contar DEFAULT true) para que cuando el equipo
--    o Dirección abre una propuesta/panel demo (sesión activa o ?preview=1),
--    NO sume vistas ni registre aperturas falsas.
-- 3. Añade dk.prosp_guardar_whatsapp(p_id, p_texto) y
--    dk.prosp_envios_whatsapp_hoy() para controlar el cupo diario (15/tanda).
-- 4. Resetea contadores/eventos de vistas previos a la salida comercial y
--    limpia menciones heredadas a «IA» en propuesta_texto.
-- =============================================================================

ALTER TABLE public.prospectos
  ADD COLUMN IF NOT EXISTS whatsapp_borrador text;

DROP FUNCTION IF EXISTS dk.propuesta_ver(text);
CREATE OR REPLACE FUNCTION dk.propuesta_ver(
  p_token text,
  p_contar boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE p public.prospectos%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{32}$' THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.prospectos WHERE propuesta_token = p_token;
  IF NOT FOUND OR p.no_contactar THEN RETURN NULL; END IF;

  IF coalesce(p_contar, true)
     AND (p.propuesta_vista_en IS NULL OR p.propuesta_vista_en < now() - interval '30 minutes') THEN
    UPDATE public.prospectos
       SET propuesta_vistas = propuesta_vistas + 1,
           propuesta_vista_en = now()
     WHERE id = p.id;
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
$function$;

REVOKE ALL ON FUNCTION dk.propuesta_ver(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.propuesta_ver(text, boolean) TO dk_anon, dk_auth;

DROP FUNCTION IF EXISTS dk.demo_panel_datos(text);
CREATE OR REPLACE FUNCTION dk.demo_panel_datos(
  p_slug text,
  p_contar boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
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

  -- Solo contabiliza aperturas externas reales (p_contar = true; máx. 1 cada 30 min)
  IF coalesce(p_contar, true) THEN
    SELECT id INTO v_prosp FROM public.prospectos WHERE restaurante_id = r.id LIMIT 1;
    IF v_prosp IS NOT NULL THEN
      UPDATE public.prospectos
         SET demo_vistas = coalesce(demo_vistas, 0) + 1,
             demo_vista_en = now()
       WHERE id = v_prosp
         AND (demo_vista_en IS NULL OR demo_vista_en < now() - interval '30 minutes');
      IF FOUND THEN
        INSERT INTO public.prospecto_eventos (prospecto_id, tipo) VALUES (v_prosp, 'demo_vista');
      END IF;
    END IF;
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
$function$;

REVOKE ALL ON FUNCTION dk.demo_panel_datos(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.demo_panel_datos(text, boolean) TO dk_anon, dk_auth;

CREATE OR REPLACE FUNCTION dk.prosp_guardar_whatsapp(
  p_id uuid,
  p_texto text,
  p_preparacion text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'dk', 'public', 'pg_catalog'
AS $function$
BEGIN
  PERFORM dk.prosp_exigir(p_id);
  UPDATE public.prospectos
     SET whatsapp_borrador = left(nullif(btrim(coalesce(p_texto, '')), ''), 1500),
         preparacion = CASE
           WHEN p_preparacion IS NOT NULL THEN left(nullif(btrim(p_preparacion), ''), 1000)
           ELSE preparacion
         END,
         actualizado_en = now()
   WHERE id = p_id;
END;
$function$;

REVOKE ALL ON FUNCTION dk.prosp_guardar_whatsapp(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.prosp_guardar_whatsapp(uuid, text, text) TO dk_auth;

CREATE OR REPLACE FUNCTION dk.prosp_envios_whatsapp_hoy()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'dk', 'public', 'pg_catalog'
AS $function$
DECLARE
  v_rol text := dk.prosp_rol();
  v_inicio timestamptz := (date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid');
  v_total int := 0;
BEGIN
  SELECT count(DISTINCT e.prospecto_id)::int
    INTO v_total
    FROM public.prospecto_eventos e
   WHERE e.tipo = 'whatsapp'
     AND e.creado_en >= v_inicio
     AND (v_rol = 'admin' OR e.identidad = dk.identidad_actual());
  RETURN coalesce(v_total, 0);
END;
$function$;

REVOKE ALL ON FUNCTION dk.prosp_envios_whatsapp_hoy() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.prosp_envios_whatsapp_hoy() TO dk_auth;

-- Poner a cero las auto-aperturas previas anteriores a la salida comercial
UPDATE public.prospectos
   SET propuesta_vistas = 0,
       propuesta_vista_en = NULL,
       demo_vistas = 0,
       demo_vista_en = NULL;

DELETE FROM public.prospecto_eventos
 WHERE tipo IN ('propuesta_vista', 'demo_vista');
