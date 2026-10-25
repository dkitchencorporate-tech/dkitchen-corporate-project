-- 0063 (08/10/2026, karc0, fallo 1 de la entrada 122): avisar ANTES de pagar si el correo ya tiene cuenta.
-- dk.correo_tiene_cuenta: true si el correo ya es un usuario de Neon Auth (cliente, socio o admin).
-- Solo la llama el servidor (rol de aprovisionamiento) desde /api/checkout/qr y /fundador, después del freno de altas.
BEGIN;

CREATE OR REPLACE FUNCTION dk.correo_tiene_cuenta(p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM neon_auth."user" u WHERE lower(u.email) = lower(btrim(p_email)));
$$;
REVOKE ALL ON FUNCTION dk.correo_tiene_cuenta(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.correo_tiene_cuenta(text) TO dk_aprovisionamiento;

COMMIT;
