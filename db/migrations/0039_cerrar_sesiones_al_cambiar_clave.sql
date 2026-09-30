-- 0039 · Regla 3 de seguridad (30/09/2026): al cambiar la contraseña se cierran todas las sesiones del usuario.
-- Neon Auth (Better Auth gestionado) no lo hace por defecto y no deja configurarlo. El disparador vive en el esquema
-- neon_auth, que gestiona Neon: comprobar en cada auditoría que sigue existiendo (ver PRUEBAS_ESTRES_Y_SEGURIDAD.md).
CREATE OR REPLACE FUNCTION dk.cerrar_sesiones_al_cambiar_clave() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NEW.password IS DISTINCT FROM OLD.password THEN
    DELETE FROM neon_auth.session WHERE "userId" = NEW."userId";
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS cerrar_sesiones_al_cambiar_clave ON neon_auth.account;
CREATE TRIGGER cerrar_sesiones_al_cambiar_clave AFTER UPDATE OF password ON neon_auth.account
  FOR EACH ROW EXECUTE FUNCTION dk.cerrar_sesiones_al_cambiar_clave();
