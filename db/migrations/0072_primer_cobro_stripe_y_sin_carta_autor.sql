-- 0072 · (1) El alta por Stripe guarda la fecha del primer cobro (fin de la prueba de la suscripción) para que el
-- panel muestre «Próximo cobro» (hasta ahora salía «—» porque primer_cobro solo lo rellenaba el flujo antiguo de prueba).
-- (2) La Carta de Autor (setup_experto, 199 €) sale de la venta: los estilos premium van incluidos en todos los planes
-- (karc0, 12/10; ESTADO §6 entrada 143).

BEGIN;

CREATE OR REPLACE FUNCTION dk.fijar_primer_cobro(p_cliente_stripe text, p_fecha date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  IF p_fecha IS NULL OR p_fecha < current_date - 1 OR p_fecha > current_date + 120 THEN RETURN; END IF;
  UPDATE public.restaurantes SET primer_cobro = p_fecha
   WHERE stripe_customer_id = p_cliente_stripe AND primer_cobro IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION dk.fijar_primer_cobro(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.fijar_primer_cobro(text, date) TO dk_aprovisionamiento;

-- Alta real del 12/10 (Seven food fríes, plan Local): primer cobro el 12/11 según Stripe.
UPDATE public.restaurantes SET primer_cobro = DATE '2026-11-12'
 WHERE slug = 'seven-food-fries' AND primer_cobro IS NULL AND creado_en::date = DATE '2026-10-12';

UPDATE public.catalogo_servicios SET en_venta = false WHERE servicio = 'setup_experto';

COMMIT;
