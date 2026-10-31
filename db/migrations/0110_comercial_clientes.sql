-- 0110 · Comercial en clientes y regla de acceso (P1.1, 31/10/2026)
--
-- 1. Añade comercial, ciudad y siguiente_paso a public.restaurantes.
-- 2. Índice para acelerar búsquedas y filtros por comercial.
-- 3. Regla en dk.admin_resumen_clientes:
--    - Permite filtrar por comercial (p_comercial text).
--    - Cada comercial ve solo sus clientes cuando se filtra por comercial o cuando no es super admin.
--    - Devuelve comercial, ciudad, direccion, tiene_signature, tiene_experience y siguiente_paso.
-- 4. dk.admin_asignar_comercial: permite asignar o reasignar el comercial de un restaurante.
-- 5. dk.admin_asignar_siguiente_paso: permite registrar la próxima acción comercial u operativa.
-- 6. RLS y permisos para dk_auth.

BEGIN;

-- 1. Columnas nuevas en restaurantes
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS comercial text CHECK (char_length(comercial) <= 60);
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS ciudad text CHECK (char_length(ciudad) <= 80);
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS siguiente_paso text CHECK (char_length(siguiente_paso) <= 200);

CREATE INDEX IF NOT EXISTS idx_restaurantes_comercial ON public.restaurantes (lower(comercial)) WHERE comercial IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurantes_ciudad ON public.restaurantes (lower(ciudad)) WHERE ciudad IS NOT NULL;

-- 2. Asignar comercial a un cliente desde Central
CREATE OR REPLACE FUNCTION dk.admin_asignar_comercial(p_restaurante uuid, p_comercial text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;
  UPDATE public.restaurantes
     SET comercial = nullif(btrim(p_comercial), '')
   WHERE id = p_restaurante;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_asignar_comercial(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_asignar_comercial(uuid, text) TO dk_auth;

-- 3. Asignar siguiente paso a un cliente desde Central
CREATE OR REPLACE FUNCTION dk.admin_asignar_siguiente_paso(p_restaurante uuid, p_siguiente_paso text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;
  UPDATE public.restaurantes
     SET siguiente_paso = nullif(btrim(p_siguiente_paso), '')
   WHERE id = p_restaurante;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_asignar_siguiente_paso(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_asignar_siguiente_paso(uuid, text) TO dk_auth;

-- 4. dk.admin_resumen_clientes actualizado con comercial, ciudad y servicios unificados
DROP FUNCTION IF EXISTS dk.admin_resumen_clientes();
DROP FUNCTION IF EXISTS dk.admin_resumen_clientes(text);

CREATE OR REPLACE FUNCTION dk.admin_resumen_clientes(p_comercial text DEFAULT NULL)
RETURNS TABLE (
  restaurante_id uuid, nombre text, slug text, plan text, estado_acceso text,
  activo boolean, creado_en timestamptz, email text, contacto text,
  codigo_qr text, platos bigint, escaneos_mes bigint, escaneos_total bigint,
  tickets_abiertos bigint, solicitudes_qr_pendientes bigint,
  escaneos_14d bigint, prueba_hasta date, demo_interna boolean, archivado_en timestamptz,
  baja_programada_en date, baja_desde date, pago_fallido_desde timestamptz, cuota_centimos integer,
  tutorial_paso smallint, tutorial_completado boolean,
  comercial text, ciudad text, direccion text,
  tiene_signature boolean, tiene_experience boolean, siguiente_paso text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'solo admin' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.nombre, r.slug, r.plan, r.estado_acceso, r.activo, r.creado_en,
         i.email::text, i.nombre,
         c.codigo,
         (SELECT count(*) FROM menu_items m WHERE m.restaurante_id = r.id),
         (SELECT count(*) FROM escaneos e WHERE e.codigo = c.codigo
            AND e.ocurrido_en >= date_trunc('month', now())),
         (SELECT count(*) FROM escaneos e WHERE e.codigo = c.codigo),
         (SELECT count(*) FROM tickets_soporte t WHERE t.restaurante_id = r.id AND t.estado <> 'cerrado'),
         (SELECT count(*) FROM solicitudes_qr_fisico s WHERE s.restaurante_id = r.id AND s.estado = 'solicitado'),
         (SELECT count(*) FROM escaneos e JOIN codigos_qr q ON q.codigo = e.codigo
            WHERE q.restaurante_id = r.id AND e.ocurrido_en > now() - interval '14 days'),
         r.prueba_hasta, r.demo_interna, r.archivado_en, r.baja_programada_en, r.baja_desde, r.pago_fallido_desde,
         dk.cuota_real(r.id), r.tutorial_paso, r.tutorial_completado_en IS NOT NULL,
         coalesce(r.comercial, (SELECT s.nombre FROM public.socios s WHERE s.id = r.socio_id), 'DKitchen')::text,
         coalesce(r.ciudad, split_part(r.direccion, ',', 2), 'España')::text,
         r.direccion,
         EXISTS (SELECT 1 FROM public.proyectos p WHERE p.producto = 'signature' AND (p.cliente_id = r.propietario OR lower(p.email) = lower(i.email) OR p.negocio ILIKE r.nombre)),
         EXISTS (SELECT 1 FROM public.proyectos p WHERE p.producto = 'experience' AND (p.cliente_id = r.propietario OR lower(p.email) = lower(i.email) OR p.negocio ILIKE r.nombre)),
         coalesce(r.siguiente_paso, (SELECT p.siguiente_paso FROM public.proyectos p WHERE (p.cliente_id = r.propietario OR lower(p.email) = lower(i.email) OR p.negocio ILIKE r.nombre) AND p.siguiente_paso IS NOT NULL ORDER BY p.actualizado_en DESC LIMIT 1))::text
  FROM restaurantes r
  LEFT JOIN identidades i ON i.id = r.propietario
  LEFT JOIN LATERAL (SELECT q.codigo FROM codigos_qr q WHERE q.restaurante_id = r.id AND q.activo
                     ORDER BY q.creado_en LIMIT 1) c ON true
  WHERE (
    p_comercial IS NULL
    OR lower(coalesce(r.comercial, '')) = lower(p_comercial)
    OR lower(coalesce((SELECT s.nombre FROM public.socios s WHERE s.id = r.socio_id), '')) = lower(p_comercial)
  )
  ORDER BY r.creado_en DESC;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_resumen_clientes(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_resumen_clientes(text) TO dk_auth;

COMMIT;
