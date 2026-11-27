-- 0127 (27/11, Alex): las aperturas de propuestas desde la red del equipo no cuentan.
-- Central anota la huella (sha256 en el servidor, nunca la IP en claro) de la conexión
-- de quien la abre; dk.propuesta_ver_red ignora las visitas desde esas redes durante 30 días.

CREATE TABLE IF NOT EXISTS public.ips_equipo (
  huella text PRIMARY KEY CHECK (huella ~ '^[0-9a-f]{64}$'),
  visto_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ips_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ips_equipo FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ips_equipo FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON public.ips_equipo FROM dk_app, dk_auth, dk_anon, dk_webhook';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION dk.equipo_red_anotar(p_huella text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  PERFORM dk.exigir_direccion();
  IF p_huella IS NULL OR p_huella !~ '^[0-9a-f]{64}$' THEN RETURN; END IF;
  INSERT INTO public.ips_equipo (huella, visto_en) VALUES (p_huella, now())
  ON CONFLICT (huella) DO UPDATE SET visto_en = now();
  DELETE FROM public.ips_equipo WHERE visto_en < now() - interval '90 days';
END;
$function$;
REVOKE ALL ON FUNCTION dk.equipo_red_anotar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.equipo_red_anotar(text) TO dk_auth;

-- Misma respuesta que dk.propuesta_ver; solo cuenta si la red no es del equipo.
CREATE OR REPLACE FUNCTION dk.propuesta_ver_red(p_token text, p_contar boolean, p_huella text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_contar boolean := COALESCE(p_contar, false);
BEGIN
  IF v_contar AND p_huella IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ips_equipo WHERE huella = p_huella AND visto_en > now() - interval '30 days'
  ) THEN
    v_contar := false;
  END IF;
  RETURN dk.propuesta_ver(p_token, v_contar);
END;
$function$;
REVOKE ALL ON FUNCTION dk.propuesta_ver_red(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.propuesta_ver_red(text, boolean, text) TO dk_anon, dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0127_ips_equipo.sql') ON CONFLICT DO NOTHING;
