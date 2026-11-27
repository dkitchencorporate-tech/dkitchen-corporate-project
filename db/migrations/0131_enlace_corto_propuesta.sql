-- 0131 (27/11, Alex): enlace corto y legible de la propuesta para WhatsApp: /p/<nombre-del-local>-<palabra>.
-- El token largo sigue siendo la llave; el enlace corto solo redirige a /propuesta/<token> (route /p/[codigo], con límite de frecuencia).
BEGIN;
ALTER TABLE public.prospectos ADD COLUMN IF NOT EXISTS propuesta_corto text;
ALTER TABLE public.prospectos DROP CONSTRAINT IF EXISTS prospectos_propuesta_corto_check;
ALTER TABLE public.prospectos ADD CONSTRAINT prospectos_propuesta_corto_check CHECK (propuesta_corto IS NULL OR (propuesta_corto ~ '^[a-z0-9]+(-[a-z0-9]+){1,7}$' AND char_length(propuesta_corto) <= 60));
CREATE UNIQUE INDEX IF NOT EXISTS prospectos_propuesta_corto_uq ON public.prospectos (propuesta_corto) WHERE propuesta_corto IS NOT NULL;
CREATE OR REPLACE FUNCTION dk.propuesta_token_corto(p_corto text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT propuesta_token FROM public.prospectos
  WHERE propuesta_corto = lower(left(p_corto, 60)) AND propuesta_token IS NOT NULL AND NOT coalesce(no_contactar, false)
  LIMIT 1
$function$;
REVOKE ALL ON FUNCTION dk.propuesta_token_corto(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.propuesta_token_corto(text) TO dk_anon, dk_auth;
INSERT INTO public.dk_migraciones (nombre) VALUES ('0131_enlace_corto_propuesta.sql');
COMMIT;
