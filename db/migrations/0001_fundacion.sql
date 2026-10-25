-- 0001 · Fundación de seguridad
--
-- Se ejecuta antes que cualquier tabla. El orden importa: si se crean datos
-- primero y se cierran los permisos después, existe una ventana en la que todo
-- está abierto.

-- ---------------------------------------------------------------------------
-- 1. Cerrar la puerta que Postgres deja abierta por defecto
-- ---------------------------------------------------------------------------
-- En Postgres, el pseudo-rol PUBLIC tiene USAGE sobre el esquema `public`. Si no
-- se retira, toda la arquitectura de políticas queda por encima de una puerta
-- que sigue abierta.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 2. Extensiones
-- ---------------------------------------------------------------------------
-- citext: los correos se comparan sin distinguir mayúsculas. Hacerlo en el tipo
-- evita que dos filas representen a la misma persona.
CREATE EXTENSION IF NOT EXISTS citext;

-- pg_session_jwt: permite que Postgres verifique el JWT por sí mismo, en vez de
-- confiar en que el despliegue diga la verdad sobre quién está conectado. Es la
-- pieza que sostiene la regla de que el despliegue no tenga autoridad.
CREATE EXTENSION IF NOT EXISTS pg_session_jwt;

-- ---------------------------------------------------------------------------
-- 3. Esquema propio para la lógica
-- ---------------------------------------------------------------------------
-- Las funciones no viven en `public`: así el search_path de las funciones
-- SECURITY DEFINER puede fijarse a un esquema que solo nosotros controlamos.
CREATE SCHEMA IF NOT EXISTS dk;
REVOKE ALL ON SCHEMA dk FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 4. Roles
-- ---------------------------------------------------------------------------
-- Son roles sin login: solo contienen privilegios. El rol con el que se conecta
-- la aplicación los hereda. Así se puede rotar la credencial de conexión sin
-- tocar ni una política.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dk_anon') THEN
    CREATE ROLE dk_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dk_auth') THEN
    CREATE ROLE dk_auth NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO dk_anon, dk_auth;
GRANT USAGE ON SCHEMA dk     TO dk_anon, dk_auth;

-- Que un rol pueda entrar al esquema no significa que pueda ver nada dentro:
-- cada tabla nace con RLS y sin política, y se le concede lo justo, una a una.

-- ---------------------------------------------------------------------------
-- 5. Ninguna tabla futura hereda permisos por accidente
-- ---------------------------------------------------------------------------
-- Sin esto, una tabla creada más adelante podría quedar accesible por olvido.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA dk     REVOKE ALL ON FUNCTIONS FROM PUBLIC;
