-- 0020 — Identidad de cliente verificada por el servidor (Ruta A, 27/09/2026)
--
-- pg_session_jwt no es utilizable por dk_app en Neon: el esquema `auth` es de
-- cloud_admin, sin ACL, y nadie del proyecto puede conceder USAGE sobre él; la
-- extensión además se niega a correr dentro de SECURITY DEFINER. Diagnóstico
-- completo en SEGURIDAD_SESION_PANEL_RUTA_A_Y_B_2026-09-27.md.
--
-- Nuevo contrato (guía oficial de Neon, docs/guides/rls-query-execution):
--   1. El servidor verifica el JWT de Neon Auth (EdDSA + JWKS, exp, iss, aud).
--   2. Dentro de la transacción: set_config('dk.usuario_id', <sub>, true)
--      → el valor muere con la transacción; no viaja por el pool.
--   3. SET LOCAL ROLE dk_auth (sin BYPASSRLS); RLS forzado no cambia.
--   4. dk.identidad_actual() lee ese valor, valida el formato y exige que el
--      usuario exista en neon_auth.user y no esté baneado.

BEGIN;

-- Retirar los intentos fallidos del 27/09 (ya no tienen uso).
DROP FUNCTION IF EXISTS dk.iniciar_sesion_jwt(text);
REVOKE USAGE ON SCHEMA dk FROM dk_app;

CREATE OR REPLACE FUNCTION dk.identidad_actual()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
DECLARE
  v text := current_setting('dk.usuario_id', true);
  u uuid;
BEGIN
  IF v IS NULL
     OR v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  u := v::uuid;

  -- Un usuario borrado o baneado deja de tener identidad aunque su JWT siga
  -- vigente (dura 15 min): la base es la última palabra, no el token.
  IF NOT EXISTS (
    SELECT 1 FROM neon_auth."user" x
    WHERE x.id = u
      AND NOT (coalesce(x.banned, false)
               AND (x."banExpires" IS NULL OR x."banExpires" > now()))
  ) THEN
    RETURN NULL;
  END IF;

  RETURN u;
END;
$$;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0020_identidad_verificada_por_servidor.sql');

COMMIT;
