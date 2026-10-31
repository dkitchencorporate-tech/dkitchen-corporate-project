-- 0109 (31/10/2026, P0.2): Idempotencia de correos de confirmación en webhook de Stripe.
-- Evita correos dobles si Stripe reintenta el webhook ante lentitud de red.
BEGIN;

CREATE TABLE IF NOT EXISTS public.stripe_correos_enviados (
  clave text PRIMARY KEY,
  creado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_correos_enviados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_correos_enviados FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_correos_enviados FROM PUBLIC;

CREATE OR REPLACE FUNCTION dk.marcar_correo_stripe(p_clave text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, dk, pg_catalog
AS $$
BEGIN
  IF p_clave IS NULL OR length(trim(p_clave)) = 0 THEN
    RETURN false;
  END IF;
  INSERT INTO public.stripe_correos_enviados (clave)
  VALUES (trim(p_clave))
  ON CONFLICT (clave) DO NOTHING;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION dk.marcar_correo_stripe(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.marcar_correo_stripe(text) TO dk_aprovisionamiento, dk_app;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0109_correos_enviados.sql') ON CONFLICT DO NOTHING;

COMMIT;
