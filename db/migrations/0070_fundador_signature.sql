-- 0070 · Fundador también en Signature (karc0, 12/10; ESTADO §6 entrada 132).
-- Signature Fundador: entrada de 500 € + IVA en pago único (sin cuotas) y mantenimiento a 69 €/mes
-- el primer año (cupón de Stripe); después, la tarifa normal de su tramo.
-- Las 100 plazas y los 90 días son COMPARTIDOS con el Fundador del QR: un solo contador.
-- Una plaza se ocupa con el primer pago y una baja NO la libera (igual que 0051).

BEGIN;

CREATE TABLE IF NOT EXISTS public.fundador_signature (
  stripe_customer_id text PRIMARY KEY,
  suscripcion text,
  email text,
  desde timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fundador_signature ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundador_signature FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.fundador_signature FROM PUBLIC, dk_anon, dk_auth, dk_app;

-- Estado público: cuenta las plazas de QR y de Signature juntas.
CREATE OR REPLACE FUNCTION dk.fundador_estado()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  WITH p AS (SELECT * FROM public.fundador_programa WHERE id = 1),
       o AS (SELECT ((SELECT count(*) FROM public.restaurantes WHERE fundador_desde IS NOT NULL)
                   + (SELECT count(*) FROM public.fundador_signature))::int n)
  SELECT jsonb_build_object(
    'abierto', p.abierto_en IS NOT NULL AND now() < p.abierto_en + make_interval(days => p.dias) AND o.n < p.plazas,
    'abierto_en', p.abierto_en,
    'cierra_en', p.abierto_en + make_interval(days => p.dias),
    'plazas', p.plazas,
    'ocupadas', least(o.n, p.plazas),
    'quedan', greatest(p.plazas - o.n, 0),
    'motivo', CASE WHEN p.abierto_en IS NULL THEN 'sin_abrir'
                   WHEN o.n >= p.plazas THEN 'plazas'
                   WHEN now() >= p.abierto_en + make_interval(days => p.dias) THEN 'plazo'
                   ELSE NULL END)
  FROM p, o
$$;

-- Webhook: el pago de la entrada de Signature Fundador ocupa la plaza. Idempotente.
-- Si el programa se cerró entre el checkout y el pago, se respeta (ya ha pagado) y devuelve false.
CREATE OR REPLACE FUNCTION dk.fundador_signature_marcar(p_cliente_stripe text, p_suscripcion text, p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_dentro boolean;
BEGIN
  IF coalesce(p_cliente_stripe, '') = '' THEN RAISE EXCEPTION 'cliente vacío' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM public.fundador_programa WHERE id = 1 FOR UPDATE;
  v_dentro := (dk.fundador_estado() ->> 'abierto')::boolean;
  INSERT INTO public.fundador_signature (stripe_customer_id, suscripcion, email)
  VALUES (p_cliente_stripe, p_suscripcion, left(p_email, 254))
  ON CONFLICT (stripe_customer_id) DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.auditoria (identidad, accion, detalle)
    VALUES (NULL, 'fundador.plaza_signature', jsonb_build_object('dentro_de_plazo', v_dentro, 'suscripcion', p_suscripcion));
  END IF;
  RETURN v_dentro;
END;
$$;

-- Central: fundadores de Signature.
CREATE OR REPLACE FUNCTION dk.admin_fundadores_signature()
RETURNS TABLE (stripe_customer_id text, suscripcion text, email text, desde timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY SELECT f.stripe_customer_id, f.suscripcion, f.email, f.desde FROM public.fundador_signature f ORDER BY f.desde;
END;
$$;

REVOKE ALL ON FUNCTION dk.fundador_estado(), dk.fundador_signature_marcar(text, text, text), dk.admin_fundadores_signature() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.fundador_estado() TO dk_anon, dk_auth, dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.fundador_signature_marcar(text, text, text) TO dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.admin_fundadores_signature() TO dk_auth;

COMMIT;
