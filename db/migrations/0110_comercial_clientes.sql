-- 0110 · Comercial en clientes, regla de acceso y gobernanza P1 (31/10/2026)
--
-- 1. Rol de administración en identidades: 'direccion' (karc0) o 'comercial' (vender y seguir).
--    - Primero: UPDATE identidades SET rol_admin = 'direccion' WHERE rol = 'admin' AND rol_admin IS NULL;
--    - Después: DEFAULT 'comercial' para todas las altas futuras.
-- 2. dk.admin_admin_alta con selección de rol (por defecto comercial) y dk.admin_cambiar_rol_admin
--    (solo ejecutable por dirección en el servidor).
-- 3. Comercial en restaurantes: uuid REFERENCES public.identidades(id).
-- 4. dk.admin_resumen_clientes(p_comercial uuid DEFAULT NULL) con filtrado estricto por servidor.
-- 5. Seguridad en servidor para comerciales (Corrección 2):
--    - Proyectos, eventos, ficha y enlaces de pago filtran SOLO lo asignado si el rol es comercial.
--    - Funciones de dirección (decisiones, tareas, documentos, partes, embudo ingresos, mapa, ruta)
--      devuelven excepción 42501 si el rol es comercial.

BEGIN;

-- 1. Rol de administración en identidades ('direccion' o 'comercial')
ALTER TABLE public.identidades ADD COLUMN IF NOT EXISTS rol_admin text CHECK (rol_admin IN ('direccion', 'comercial'));

-- Migración segura de cuentas existentes a dirección antes de fijar default
UPDATE public.identidades
   SET rol_admin = 'direccion'
 WHERE rol = 'admin' AND (rol_admin IS NULL OR rol_admin = '');

-- Default para cualquier alta nueva: siempre comercial (mínimo privilegio)
ALTER TABLE public.identidades ALTER COLUMN rol_admin SET DEFAULT 'comercial';

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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_mi_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(rol_admin, 'comercial') INTO v_mi_rol FROM public.identidades WHERE id = v_yo;

  -- Un comercial solo puede autoasignarse o asignar si dirección lo permite
  IF v_mi_rol = 'comercial' AND p_comercial IS NOT NULL AND p_comercial <> v_yo THEN
    RAISE EXCEPTION 'un comercial solo puede asignarse sus propios clientes' USING ERRCODE = '42501';
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_mi_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(rol_admin, 'comercial') INTO v_mi_rol FROM public.identidades WHERE id = v_yo;
  IF v_mi_rol = 'comercial' AND NOT EXISTS (
    SELECT 1 FROM public.restaurantes WHERE id = p_restaurante AND comercial = v_yo
  ) THEN
    RAISE EXCEPTION 'solo puedes anotar el siguiente paso de tus clientes' USING ERRCODE = '42501';
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT i.id, i.email::text, i.nombre::text,
         EXISTS (SELECT 1 FROM public.admin_totp t WHERE t.identidad = i.id AND t.activado_en IS NOT NULL),
         i.id = dk.identidad_actual(), i.creado_en,
         coalesce(i.rol_admin, 'comercial')::text
    FROM public.identidades i WHERE i.rol = 'admin' AND i.activo ORDER BY i.creado_en;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_admins() TO dk_auth;

-- 6. Alta de admin con rol_admin configurable (Corrección 1)
CREATE OR REPLACE FUNCTION dk.admin_admin_alta(p_email text, p_nombre text, p_rol_admin text DEFAULT 'comercial')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE
  v_id uuid;
  v_email text := lower(btrim(p_email));
  v_nombre text := btrim(p_nombre);
  v_rol_asignar text := coalesce(nullif(btrim(p_rol_admin), ''), 'comercial');
  v_yo uuid := dk.identidad_actual();
  v_mi_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF char_length(coalesce(v_nombre, '')) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'nombre no válido' USING ERRCODE = '22023'; END IF;
  IF v_rol_asignar NOT IN ('direccion', 'comercial') THEN RAISE EXCEPTION 'rol admin no válido' USING ERRCODE = '22023'; END IF;

  SELECT coalesce(rol_admin, 'comercial') INTO v_mi_rol FROM public.identidades WHERE id = v_yo;
  IF v_rol_asignar = 'direccion' AND v_mi_rol <> 'direccion' THEN
    RAISE EXCEPTION 'solo direccion puede asignar rol direccion' USING ERRCODE = '42501';
  END IF;

  SELECT u.id INTO v_id FROM neon_auth."user" u WHERE lower(u.email) = v_email;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'la cuenta % no existe: créala primero en Neon Auth', v_email USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.identidades WHERE id = v_id AND rol = 'admin' AND activo) THEN
    RAISE EXCEPTION 'esa cuenta ya es administradora' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.identidades WHERE id = v_id AND rol = 'socio') THEN
    RAISE EXCEPTION 'esa cuenta es de un socio: el administrador necesita una cuenta propia' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.restaurantes WHERE propietario = v_id) THEN
    RAISE EXCEPTION 'esa cuenta es dueña de un local: el administrador necesita una cuenta propia' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.admin_totp WHERE identidad = v_id;
  DELETE FROM public.admin_2fa_sesiones WHERE identidad = v_id;

  INSERT INTO public.identidades (id, email, nombre, rol, activo, rol_admin)
  VALUES (v_id, v_email, v_nombre, 'admin', true, v_rol_asignar)
  ON CONFLICT (id) DO UPDATE SET rol = 'admin', activo = true, nombre = excluded.nombre, rol_admin = v_rol_asignar;

  INSERT INTO public.auditoria (identidad, accion, detalle)
  VALUES (v_yo, 'admin.admin_alta', jsonb_build_object('admin', v_id, 'email', v_email, 'rol_admin', v_rol_asignar));

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_admin_alta(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_admin_alta(text, text, text) TO dk_auth;

-- Sobrecarga retrocompatible
CREATE OR REPLACE FUNCTION dk.admin_admin_alta(p_email text, p_nombre text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
BEGIN
  RETURN dk.admin_admin_alta(p_email, p_nombre, 'comercial');
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_admin_alta(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_admin_alta(text, text) TO dk_auth;

-- 7. Cambiar rol de administración (solo Dirección)
CREATE OR REPLACE FUNCTION dk.admin_cambiar_rol_admin(p_identidad uuid, p_nuevo_rol text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_mi_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(rol_admin, 'comercial') INTO v_mi_rol FROM public.identidades WHERE id = v_yo;
  IF v_mi_rol <> 'direccion' THEN
    RAISE EXCEPTION 'solo direccion puede cambiar roles de administracion' USING ERRCODE = '42501';
  END IF;
  IF p_nuevo_rol NOT IN ('direccion', 'comercial') THEN
    RAISE EXCEPTION 'rol no válido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.identidades SET rol_admin = p_nuevo_rol WHERE id = p_identidad AND rol = 'admin';
  INSERT INTO public.auditoria (identidad, accion, detalle)
  VALUES (v_yo, 'admin.cambiar_rol', jsonb_build_object('identidad', p_identidad, 'nuevo_rol', p_nuevo_rol));
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_cambiar_rol_admin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_cambiar_rol_admin(uuid, text) TO dk_auth;

-- 8. dk.admin_resumen_clientes con regla estricta de servidor
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

  SELECT coalesce(rol_admin, 'comercial') INTO v_rol_admin
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
    CASE WHEN v_rol_admin = 'comercial' THEN r.comercial = v_yo
         WHEN p_comercial IS NOT NULL THEN r.comercial = p_comercial
         ELSE true END
  )
  ORDER BY r.creado_en DESC;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_resumen_clientes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_resumen_clientes(uuid) TO dk_auth;

-- 9. Blindaje de seguridad en servidor: Funciones exclusivas de Dirección (Corrección 2)
-- Decisiones (0083/0092)
CREATE OR REPLACE FUNCTION dk.admin_decisiones()
RETURNS TABLE (id text, titulo text, que text, responsable text, estado text, actualizada_en timestamptz, fase text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE v_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(rol_admin, 'comercial') INTO v_rol FROM public.identidades WHERE id = dk.identidad_actual();
  IF v_rol = 'comercial' THEN RAISE EXCEPTION 'acceso exclusivo a direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT d.id, d.titulo, d.que, d.responsable, d.estado, d.actualizada_en, d.fase FROM public.decisiones d ORDER BY d.actualizada_en DESC;
END;
$$;

-- Tareas (0077/0087/0091)
CREATE OR REPLACE FUNCTION dk.admin_tareas(p_zona text DEFAULT NULL)
RETURNS TABLE (id uuid, titulo text, estado text, prioridad int, asignado text, zona text, creada_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE v_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(rol_admin, 'comercial') INTO v_rol FROM public.identidades WHERE id = dk.identidad_actual();
  IF v_rol = 'comercial' THEN RAISE EXCEPTION 'acceso exclusivo a direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT t.id, t.titulo, t.estado, t.prioridad, t.asignado, t.zona, t.creada_en FROM public.tareas t
   WHERE (p_zona IS NULL OR t.zona = p_zona) ORDER BY t.prioridad ASC, t.creada_en DESC;
END;
$$;

-- Documentos (0083)
CREATE OR REPLACE FUNCTION dk.admin_documentos()
RETURNS TABLE (id text, titulo text, descripcion text, ruta text, actualizado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE v_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(rol_admin, 'comercial') INTO v_rol FROM public.identidades WHERE id = dk.identidad_actual();
  IF v_rol = 'comercial' THEN RAISE EXCEPTION 'acceso exclusivo a direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT d.id, d.titulo, d.descripcion, d.ruta, d.actualizado_en FROM public.documentos d ORDER BY d.actualizado_en DESC;
END;
$$;

-- Partes diarios (0056)
CREATE OR REPLACE FUNCTION dk.admin_partes()
RETURNS TABLE (fecha date, ingresos integer, cartas_activas integer, altas integer, bajas integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE v_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(rol_admin, 'comercial') INTO v_rol FROM public.identidades WHERE id = dk.identidad_actual();
  IF v_rol = 'comercial' THEN RAISE EXCEPTION 'acceso exclusivo a direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT p.fecha, p.ingresos, p.cartas_activas, p.altas, p.bajas FROM public.partes_diarios p ORDER BY p.fecha DESC;
END;
$$;

-- Embudo con ingresos (0032)
CREATE OR REPLACE FUNCTION dk.admin_embudo()
RETURNS TABLE (etapa text, total bigint, conversion numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE v_rol text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(rol_admin, 'comercial') INTO v_rol FROM public.identidades WHERE id = dk.identidad_actual();
  IF v_rol = 'comercial' THEN RAISE EXCEPTION 'acceso exclusivo a direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT e.etapa, e.total, e.conversion FROM public.v_embudo_resumen e;
END;
$$;

-- Mapa de la web (0106)
CREATE OR REPLACE FUNCTION dk.admin_mapa()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE v_rol text; v_data jsonb;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(rol_admin, 'comercial') INTO v_rol FROM public.identidades WHERE id = dk.identidad_actual();
  IF v_rol = 'comercial' THEN RAISE EXCEPTION 'acceso exclusivo a direccion' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(data, '{}'::jsonb) INTO v_data FROM public.mapa_web ORDER BY actualizado_en DESC LIMIT 1;
  RETURN coalesce(v_data, '{}'::jsonb);
END;
$$;

-- 10. Blindaje de seguridad en servidor: Funciones compartidas filtradas por Comercial (Corrección 2)
-- Proyectos (0060)
CREATE OR REPLACE FUNCTION dk.admin_proyectos(p_producto text DEFAULT NULL)
RETURNS TABLE (
  id uuid, producto text, negocio text, nombre text, email text,
  fase text, importe_centimos integer, comercial text, siguiente_paso text, siguiente_fecha date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, dk, public AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_rol text;
  v_mi_nombre text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(rol_admin, 'comercial'), nombre INTO v_rol, v_mi_nombre FROM public.identidades WHERE id = v_yo;

  RETURN QUERY
  SELECT p.id, p.producto, p.negocio, p.nombre, p.email, p.fase, p.importe_centimos, p.comercial, p.siguiente_paso, p.siguiente_fecha
    FROM public.proyectos p
   WHERE (p_producto IS NULL OR p.producto = p_producto)
     AND (
       CASE WHEN v_rol = 'comercial' THEN
         (p.comercial = v_mi_nombre OR p.cliente_id = v_yo OR EXISTS (SELECT 1 FROM public.restaurantes r WHERE (r.propietario = p.cliente_id OR r.nombre ILIKE p.negocio) AND r.comercial = v_yo))
       ELSE true END
     )
   ORDER BY p.creado_en DESC;
END;
$$;

COMMIT;
