-- 0088 (18/10/2026, karc0): zona del cliente de Experience (/mi-experience).
-- Al pagar se crea su usuario (Neon Auth) y entra a su zona: pasos, briefing y
-- la llamada de arranque que agenda él mismo. Sus proyectos se encuentran por el
-- correo verificado de su cuenta (vale también si ya tenía cuenta por la QR).
-- Central ve el briefing y la llamada en el proyecto (siguiente_paso/fecha).

ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS briefing jsonb,
  ADD COLUMN IF NOT EXISTS briefing_en timestamptz,
  ADD COLUMN IF NOT EXISTS llamada_en timestamptz;
DO $$ BEGIN
  ALTER TABLE public.proyectos ADD CONSTRAINT proyectos_briefing_tam CHECK (briefing IS NULL OR (jsonb_typeof(briefing) = 'object' AND pg_column_size(briefing) <= 16000));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS proyectos_llamada_unica ON public.proyectos (llamada_en) WHERE llamada_en IS NOT NULL;

-- Correo de la cuenta que ha iniciado sesión (o NULL).
CREATE OR REPLACE FUNCTION dk.mi_correo()
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
  SELECT lower(u.email) FROM neon_auth."user" u WHERE u.id = dk.identidad_actual()
$function$;

CREATE OR REPLACE FUNCTION dk.mi_experience()
 RETURNS TABLE(id uuid, fase text, origen text, negocio text, nombre text, importe_centimos integer, datos jsonb,
               briefing jsonb, briefing_en timestamptz, llamada_en timestamptz, siguiente_paso text, creado_en timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
  SELECT p.id, p.fase, p.origen, p.negocio, p.nombre, p.importe_centimos, p.datos, p.briefing, p.briefing_en, p.llamada_en, p.siguiente_paso, p.creado_en
    FROM public.proyectos p
   WHERE p.producto = 'experience' AND dk.mi_correo() IS NOT NULL AND lower(p.email) = dk.mi_correo()
   ORDER BY p.creado_en DESC
$function$;

CREATE OR REPLACE FUNCTION dk.mi_experience_briefing(p_id uuid, p_briefing jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF dk.mi_correo() IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_briefing IS NULL OR jsonb_typeof(p_briefing) <> 'object' OR pg_column_size(p_briefing) > 16000 THEN RAISE EXCEPTION 'briefing no válido' USING ERRCODE = '22023'; END IF;
  UPDATE public.proyectos p SET briefing = p_briefing, briefing_en = now(), actualizado_en = now(),
         siguiente_paso = CASE WHEN p.llamada_en IS NULL THEN 'Briefing recibido: esperar a que agende la llamada' ELSE p.siguiente_paso END
   WHERE p.id = p_id AND p.producto = 'experience' AND lower(p.email) = dk.mi_correo();
  IF NOT FOUND THEN RAISE EXCEPTION 'proyecto no encontrado' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

-- Huecos: lunes a viernes, 10:00–13:30 y 16:30–19:00 (hora de Madrid), cada 30 min,
-- desde 20 h vista hasta 21 días. Uno por hueco (índice único).
CREATE OR REPLACE FUNCTION dk.experience_hueco_valido(p_cuando timestamptz)
 RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'pg_catalog'
AS $function$
  SELECT p_cuando >= now() + interval '20 hours' AND p_cuando <= now() + interval '21 days'
     AND extract(isodow FROM p_cuando AT TIME ZONE 'Europe/Madrid') BETWEEN 1 AND 5
     AND extract(second FROM p_cuando AT TIME ZONE 'Europe/Madrid') = 0
     AND extract(minute FROM p_cuando AT TIME ZONE 'Europe/Madrid') IN (0, 30)
     AND ((p_cuando AT TIME ZONE 'Europe/Madrid')::time BETWEEN time '10:00' AND time '13:30'
       OR (p_cuando AT TIME ZONE 'Europe/Madrid')::time BETWEEN time '16:30' AND time '19:00')
$function$;

CREATE OR REPLACE FUNCTION dk.experience_huecos_ocupados()
 RETURNS SETOF timestamptz LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF dk.mi_correo() IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT p.llamada_en FROM public.proyectos p WHERE p.llamada_en BETWEEN now() AND now() + interval '22 days';
END;
$function$;

CREATE OR REPLACE FUNCTION dk.mi_experience_llamada(p_id uuid, p_cuando timestamptz)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF dk.mi_correo() IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF NOT dk.experience_hueco_valido(p_cuando) THEN RAISE EXCEPTION 'hueco no válido' USING ERRCODE = '22023'; END IF;
  BEGIN
    UPDATE public.proyectos p SET llamada_en = p_cuando, actualizado_en = now(),
           siguiente_paso = 'Llamada de arranque de Experience', siguiente_fecha = (p_cuando AT TIME ZONE 'Europe/Madrid')::date
     WHERE p.id = p_id AND p.producto = 'experience' AND lower(p.email) = dk.mi_correo();
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'hueco ocupado' USING ERRCODE = '23505';
  END;
  IF NOT FOUND THEN RAISE EXCEPTION 'proyecto no encontrado' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

REVOKE ALL ON FUNCTION dk.mi_correo(), dk.mi_experience(), dk.mi_experience_briefing(uuid, jsonb), dk.experience_huecos_ocupados(), dk.mi_experience_llamada(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.mi_correo(), dk.mi_experience(), dk.mi_experience_briefing(uuid, jsonb), dk.experience_huecos_ocupados(), dk.mi_experience_llamada(uuid, timestamptz) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.experience_hueco_valido(timestamptz) TO dk_auth;
