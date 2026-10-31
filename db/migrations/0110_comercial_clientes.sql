-- 0110 · Comercial en clientes y regla de acceso (P1.1 v2, 31/10/2026)
--
-- 1. Rol de administración en identidades: 'direccion' (karc0) o 'comercial' (vender y seguir).
-- 2. Comercial en restaurantes: uuid REFERENCES public.identidades(id).
-- 3. Ciudad y siguiente paso en restaurantes con índices.
-- 4. Regla estricta en el servidor en dk.admin_resumen_clientes(p_comercial uuid DEFAULT NULL):
--    - Si el admin conectado tiene rol 'comercial', la base devuelve SOLO sus restaurantes
--      y oculta la cuota real (devuelve 0), sin importar lo que pida la app.
--    - Dirección (karc0) ve todo y puede filtrar por cualquier comercial.
-- 5. dk.admin_asignar_comercial: asigna un comercial del Equipo (uuid de identidad validado).
-- 6. dk.admin_admins: devuelve rol_admin para la gestión de equipo y selectores.

BEGIN;

-- 1. Rol de administración en identidades ('direccion' o 'comercial')
ALTER TABLE public.identidades ADD COLUMN IF NOT EXISTS rol_admin text DEFAULT 'direccion' CHECK (rol_admin IN ('direccion', 'comercial'));

-- 2. Columna comercial en restaurantes (uuid referenciado a identidades)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'restaurantes' AND column_name = 'comercial' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.restaurantes DROP COLUMN comercial;
  END IF;
END $$;

ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS comercial uuid REFERENCES public.identidades(id) ON DELETE SET NULL;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS ciudad text CHECK (char_length(ciudad) <= 80);
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS siguiente_paso text CHECK (char_length(siguiente_paso) <= 200);

CREATE INDEX IF NOT EXISTS idx_restaurantes_comercial ON public.restaurantes (comercial) WHERE comercial IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurantes_ciudad ON public.restaurantes (lower(ciudad)) WHERE ciudad IS NOT NULL;

-- 3. Asignar comercial a un cliente desde Central (validando miembro del equipo)
CREATE OR REPLACE FUNCTION dk.admin_asignar_comercial(p_restaurante uuid, p_comercial uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_comercial IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.identidades WHERE id = p_comercial AND rol = 'admin' AND activo
  ) THEN
    RAISE EXCEPTION 'el comercial debe ser un miembro activo del equipo' USING ERRCODE = '22023';
  END IF;

  UPDATE public.restaurantes
     SET comercial = p_comercial
   WHERE id = p_restaurante;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_asignar_comercial(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_asignar_comercial(uuid, uuid) TO dk_auth;

-- 4. Asignar siguiente paso a un cliente desde Central
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

-- 5. Listar administradores con rol_admin
DROP FUNCTION IF EXISTS dk.admin_admins();
CREATE OR REPLACE FUNCTION dk.admin_admins()
RETURNS TABLE (id uuid, email text, nombre text, dos_fa boolean, yo boolean, creado_en timestamptz, rol_admin text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT i.id, i.email::text, i.nombre::text,
         EXISTS (SELECT 1 FROM public.admin_totp t WHERE t.identidad = i.id AND t.activado_en IS NOT NULL),
         i.id = dk.identidad_actual(), i.creado_en,
         coalesce(i.rol_admin, 'direccion')::text
    FROM public.identidades i WHERE i.rol = 'admin' AND i.activo ORDER BY i.creado_en;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_admins() TO dk_auth;

-- 6. dk.admin_resumen_clientes actualizado con regla estricta de comercial en servidor
DROP FUNCTION IF EXISTS dk.admin_resumen_clientes();
DROP FUNCTION IF EXISTS dk.admin_resumen_clientes(text);
DROP FUNCTION IF EXISTS dk.admin_resumen_clientes(uuid);

CREATE OR REPLACE FUNCTION dk.admin_resumen_clientes(p_comercial uuid DEFAULT NULL)
RETURNS TABLE (
  restaurante_id uuid, nombre text, slug text, plan text, estado_acceso text,
  activo boolean, creado_en timestamptz, email text, contacto text,
  codigo_qr text, platos bigint, escaneos_mes bigint, escaneos_total bigint,
  tickets_abiertos bigint, solicitudes_qr_pendientes bigint,
  escaneos_14d bigint, prueba_hasta date, demo_interna boolean, archivado_en timestamptz,
  baja_programada_en date, baja_desde date, pago_fallido_desde timestamptz, cuota_centimos integer,
  tutorial_paso smallint, tutorial_completado boolean,
  comercial_id uuid, comercial_nombre text, ciudad text, direccion text,
  tiene_signature boolean, tiene_experience boolean, siguiente_paso text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_rol_admin text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'solo admin' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(rol_admin, 'direccion') INTO v_rol_admin
    FROM public.identidades WHERE id = v_yo;

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
         -- El comercial no ve ingresos reales en el servidor (devuelve 0)
         CASE WHEN v_rol_admin = 'comercial' THEN 0 ELSE dk.cuota_real(r.id) END,
         r.tutorial_paso, r.tutorial_completado_en IS NOT NULL,
         r.comercial,
         coalesce(ic.nombre, (SELECT s.nombre FROM public.socios s WHERE s.id = r.socio_id), 'Sin asignar')::text,
         coalesce(r.ciudad, split_part(r.direccion, ',', 2), 'España')::text,
         r.direccion,
         EXISTS (SELECT 1 FROM public.proyectos p WHERE p.producto = 'signature' AND (p.cliente_id = r.propietario OR lower(p.email) = lower(i.email) OR p.negocio ILIKE r.nombre)),
         EXISTS (SELECT 1 FROM public.proyectos p WHERE p.producto = 'experience' AND (p.cliente_id = r.propietario OR lower(p.email) = lower(i.email) OR p.negocio ILIKE r.nombre)),
         coalesce(r.siguiente_paso, (SELECT p.siguiente_paso FROM public.proyectos p WHERE (p.cliente_id = r.propietario OR lower(p.email) = lower(i.email) OR p.negocio ILIKE r.nombre) AND p.siguiente_paso IS NOT NULL ORDER BY p.actualizado_en DESC LIMIT 1))::text
  FROM restaurantes r
  LEFT JOIN identidades i ON i.id = r.propietario
  LEFT JOIN identidades ic ON ic.id = r.comercial
  LEFT JOIN LATERAL (SELECT q.codigo FROM codigos_qr q WHERE q.restaurante_id = r.id AND q.activo
                     ORDER BY q.creado_en LIMIT 1) c ON true
  WHERE (
    -- Si es comercial, la base de datos restringe estrictamente a sus clientes asignados
    CASE WHEN v_rol_admin = 'comercial' THEN r.comercial = v_yo
         WHEN p_comercial IS NOT NULL THEN r.comercial = p_comercial
         ELSE true END
  )
  ORDER BY r.creado_en DESC;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_resumen_clientes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_resumen_clientes(uuid) TO dk_auth;

COMMIT;
