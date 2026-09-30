-- 0040 · Tablas antiguas sin RLS (30/09/2026). No se borran: tienen datos (productos, 2 pedidos, 1 perfil)
-- y karc0 decidió borrar solo si estaban vacías. Se cierran con RLS sin políticas: solo el propietario las lee.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dk_migraciones','categories','subcategories','products','kiosk_customers','store_settings','store_hours',
                           'upsells','profiles','orders','order_items','push_subscriptions','site_visits','pwa_installs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
  END LOOP;
END $$;
