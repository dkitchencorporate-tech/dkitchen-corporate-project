-- 0004 · El rol con el que se conecta la aplicación
--
-- MOTIVO, porque no es evidente:
--
-- El rol que Neon crea por defecto (neondb_owner), y al que apunta el
-- DATABASE_URL que la integración inyecta en Vercel, tiene BYPASSRLS. Se salta
-- todas las políticas por fila. Si la aplicación se conectara con esa cadena,
-- cada política de este esquema sería decorativa: exactamente el papel que hacía
-- la clave de servicio de Supabase que se retiró del proyecto.
--
-- Por eso la aplicación se conecta con dk_app, que no puede saltarse nada. La
-- cadena del propietario queda reservada para migraciones.
--
-- La contraseña NO se fija aquí: este archivo está en el repositorio. Se asigna
-- fuera de banda con db/crear-credencial-app.mjs, que tampoco la escribe en disco
-- dentro del proyecto.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dk_app') THEN
    -- NOLOGIN de entrada: no existe forma de conectarse hasta que se le asigna
    -- credencial de forma explícita y consciente.
    CREATE ROLE dk_app NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

-- Se le concede pertenecer a los dos roles, pero NO los hereda: se creó con
-- NOINHERIT a propósito. Recién conectado, dk_app no puede leer ni una fila de
-- ninguna tabla. Para hacer algo tiene que declarar antes con qué sombrero, en
-- cada transacción:
--
--     BEGIN;
--     SET LOCAL ROLE dk_anon;      -- visitante que escanea un QR
--     ...
--
--     BEGIN;
--     SELECT auth.jwt_session_init($1);   -- Postgres verifica la firma
--     SET LOCAL ROLE dk_auth;      -- cliente con sesión demostrada
--     ...
--
-- Olvidar esa línea no abre nada: deja la consulta sin permisos y falla. El
-- fallo por omisión es denegar, que es la única forma segura de equivocarse.
GRANT dk_anon TO dk_app;
GRANT dk_auth TO dk_app;

-- Cinturón y tirantes: aunque alguien le concediera privilegios por error más
-- adelante, sigue sin poder saltarse las políticas.
ALTER ROLE dk_app NOBYPASSRLS;

-- No puede crear nada en ningún esquema.
REVOKE CREATE ON SCHEMA public FROM dk_app;
REVOKE CREATE ON SCHEMA dk     FROM dk_app;

-- El propietario necesita ser miembro de estos roles para poder adoptarlos con
-- SET ROLE. Es lo que permite auditar el blindaje desde dentro —comprobando qué
-- ve de verdad un anónimo— sin fabricar credenciales adicionales para la prueba.
-- No le añade poder: ya tenía BYPASSRLS. Al contrario, al adoptar el rol lo
-- pierde, porque BYPASSRLS es propiedad del rol vigente, y por eso la prueba
-- resulta representativa.
GRANT dk_anon, dk_auth TO neondb_owner;
