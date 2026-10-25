-- 0064 (08/10/2026, karc0): upsell de la puesta a punto en «Pago confirmado» (29 € + IVA solo desde allí).
-- El cliente aún no ha iniciado sesión: el servidor encuentra su local por el cliente de Stripe del pago ya hecho.
BEGIN;

CREATE OR REPLACE FUNCTION dk.restaurante_de_cliente_stripe(p_cliente text)
RETURNS TABLE (id uuid, nombre text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT r.id, r.nombre FROM public.restaurantes r
   WHERE r.stripe_customer_id = p_cliente AND r.archivado_en IS NULL
   ORDER BY r.creado_en DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION dk.restaurante_de_cliente_stripe(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.restaurante_de_cliente_stripe(text) TO dk_aprovisionamiento;

COMMIT;
