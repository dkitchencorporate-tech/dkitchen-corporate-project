-- =============================================================================
-- 0122 · Fix dk.control_diseno_cliente() (evitar excepción de dk.prosp_rol()) (20/11/2026)
-- En 0117 se incluyó dk.prosp_rol() en la condición de control_diseno_cliente(),
-- pero dk.prosp_rol() lanza 42501 ('no autorizado') antes de llegar a evaluar
-- dk.identidad_actual() IS NULL (owner/migraciones) o permitir al cliente
-- actualizar sus datos en /panel sin tocar nivel_diseno.
-- =============================================================================

CREATE OR REPLACE FUNCTION dk.control_diseno_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'dk', 'public', 'pg_catalog'
AS $function$
BEGIN
  IF dk.identidad_actual() IS NULL
     OR coalesce(dk.es_admin(), false)
     OR dk.es_socio()
     OR coalesce(dk.es_admin_academia(), false) THEN
    RETURN NEW;
  END IF;
  IF NEW.nivel_diseno IS DISTINCT FROM OLD.nivel_diseno THEN
    RAISE EXCEPTION 'El nivel de diseño lo asigna DKitchen.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
