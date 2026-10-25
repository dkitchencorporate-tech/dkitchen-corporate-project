-- 0007 · Rol y función para la sincronización de la caché de resiliencia
--
-- MOTIVO: la caché de resiliencia (Sección 8.9 y siguientes de
-- SEGURIDAD_Y_PERSISTENCIA_NEON.md) necesita enumerar TODOS los códigos de QR
-- activos de TODOS los restaurantes para poder servir /r/{codigo} cuando Neon
-- falla. Ningún rol existente puede hacer eso, y ninguno debe poder hacerlo
-- por accidente: dk_anon no tiene ningún privilegio sobre codigos_qr —así se
-- decidió en 0003, precisamente para que los códigos no se puedan recorrer—,
-- y dk_auth solo ve los suyos. Enumerar todos los códigos de todos los
-- restaurantes es una capacidad nueva y sensible, así que se le da un rol
-- propio en vez de ampliar uno existente.
--
-- Igual de importante: esta capacidad NUNCA llega al despliegue. dk_app —el
-- rol con el que se conecta la aplicación pública— no es miembro de
-- dk_sincronizacion y no puede llegar a serlo por herencia. Quien sincroniza
-- corre fuera de Vercel, en GitHub Actions, con su propia credencial
-- (dk_sync), que solo sabe convertirse en dk_sincronizacion y en nada más.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dk_sincronizacion') THEN
    CREATE ROLE dk_sincronizacion NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dk_sync') THEN
    -- El rol de conexión del flujo de sincronización. NOLOGIN de entrada,
    -- igual que dk_app en 0004: la credencial se asigna aparte, con
    -- db/crear-credencial-sincronizacion.mjs, y no vive en este repositorio.
    CREATE ROLE dk_sync NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

GRANT USAGE ON SCHEMA dk     TO dk_sincronizacion;
GRANT USAGE ON SCHEMA public TO dk_sincronizacion;
REVOKE CREATE ON SCHEMA public FROM dk_sync;
REVOKE CREATE ON SCHEMA dk     FROM dk_sync;

-- Las mismas tablas que ya puede ver cualquier visitante anónimo: nada nuevo.
GRANT SELECT ON restaurantes, menu_secciones, menu_items TO dk_sincronizacion;

-- Lo único nuevo de verdad: la lista de códigos activos, sin el escaneo que
-- dk.resolver_codigo() registraría como efecto colateral. Sincronizar la
-- caché diez veces por hora no puede contar como diez visitas de cliente.
CREATE FUNCTION dk.listar_qr_activos()
RETURNS TABLE (codigo text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  SELECT c.codigo, r.slug
    FROM codigos_qr c JOIN restaurantes r ON r.id = c.restaurante_id
   WHERE c.activo AND r.activo;
$$;

REVOKE ALL ON FUNCTION dk.listar_qr_activos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.listar_qr_activos() TO dk_sincronizacion;

-- dk_sync solo sabe convertirse en dk_sincronizacion. No se le concede
-- dk_anon ni dk_auth: no los necesita, y no debe poder adoptarlos.
GRANT dk_sincronizacion TO dk_sync;

-- Para poder auditar y probar esta migración desde el propietario, igual que
-- ya ocurre con dk_anon y dk_auth en 0004. No amplía lo que puede dk_app: no
-- se le concede dk_sincronizacion a dk_app en ningún sitio de este archivo.
GRANT dk_sincronizacion TO neondb_owner;
