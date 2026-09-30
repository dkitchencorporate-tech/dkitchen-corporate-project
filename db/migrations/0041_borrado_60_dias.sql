-- 0041 · Borrado automático a los 60 días de la baja (karc0, 30/09/2026)
-- Lo que se promete en el correo de baja: «guardaremos tu carta 60 días por si quieres volver o pedirnos una copia».
-- La cuenta cuenta como «de baja» desde que pasa a 'suspendido' (por Central o por el calendario de impago).
-- Aviso por correo 7 días antes; a los 60 días se borra el restaurante y todo lo suyo (ON DELETE CASCADE).
-- La auditoría conserva solo el hecho del borrado, sin datos personales.

ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS baja_desde date;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS baja_avisada boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION dk.marcar_baja() RETURNS trigger
LANGUAGE plpgsql SET search_path TO pg_catalog AS $$
BEGIN
  IF NEW.estado_acceso = 'suspendido' AND OLD.estado_acceso IS DISTINCT FROM 'suspendido' THEN
    NEW.baja_desde := (now() AT TIME ZONE 'Europe/Madrid')::date;
    NEW.baja_avisada := false;
  ELSIF NEW.estado_acceso <> 'suspendido' THEN
    NEW.baja_desde := NULL;
    NEW.baja_avisada := false;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS marcar_baja ON public.restaurantes;
CREATE TRIGGER marcar_baja BEFORE UPDATE OF estado_acceso ON public.restaurantes
  FOR EACH ROW EXECUTE FUNCTION dk.marcar_baja();
-- Las cuentas ya suspendidas empiezan a contar hoy (no se borra nada de golpe).
UPDATE public.restaurantes SET baja_desde = (now() AT TIME ZONE 'Europe/Madrid')::date
 WHERE estado_acceso = 'suspendido' AND baja_desde IS NULL;

-- Avisos: 7 días antes del borrado (una sola vez).
CREATE OR REPLACE FUNCTION dk.bajas_por_avisar()
RETURNS TABLE (nombre text, email text, borrado_el date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  RETURN QUERY
    UPDATE public.restaurantes r SET baja_avisada = true
      FROM neon_auth."user" u
     WHERE u.id = r.propietario AND r.estado_acceso = 'suspendido' AND NOT r.baja_avisada
       AND r.baja_desde <= (now() AT TIME ZONE 'Europe/Madrid')::date - 53
    RETURNING r.nombre, u.email::text, r.baja_desde + 60;
END;
$$;

-- Borrado definitivo: devuelve los ids para limpiar también sus fotos del almacén.
CREATE OR REPLACE FUNCTION dk.purgar_bajas()
RETURNS TABLE (restaurante_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, baja_desde FROM public.restaurantes
            WHERE estado_acceso = 'suspendido' AND baja_desde <= (now() AT TIME ZONE 'Europe/Madrid')::date - 60
  LOOP
    DELETE FROM public.restaurantes WHERE id = r.id;
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (NULL, 'sistema.borrado_60_dias', jsonb_build_object('baja_desde', r.baja_desde), r.id);
    restaurante_id := r.id;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION dk.bajas_por_avisar(), dk.purgar_bajas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.bajas_por_avisar(), dk.purgar_bajas() TO dk_aprovisionamiento;
