-- 0053 · Puesta a punto del socio completa (sigue a 0052; ESTADO §6 entrada 75).
-- La 0052 abrió al socio la carta, secciones, local, plano, QR, traducciones y tickets.
-- Faltaban cuatro políticas de la carta que seguían solo para el dueño: banners
-- (promociones), combos, mesas del plano y la lectura de los módulos contratados
-- (para que el panel muestre las mismas pestañas). Se cambian SOLO por dk.gestiona()
-- y se conservan sus condiciones (admin, plano_mesas, estado de acceso).
-- Reservas, llamadas, cuentas, camareros, IA, escaneos y pagos siguen siendo del dueño.

BEGIN;

DROP POLICY IF EXISTS promocion_del_propietario ON public.promociones;
CREATE POLICY promocion_del_propietario ON public.promociones FOR ALL TO dk_auth
  USING (dk.gestiona(restaurante_id)) WITH CHECK (dk.gestiona(restaurante_id));

DROP POLICY IF EXISTS combo_del_propietario ON public.menu_combo_items;
CREATE POLICY combo_del_propietario ON public.menu_combo_items FOR ALL TO dk_auth
  USING (EXISTS (SELECT 1 FROM public.menu_items m WHERE m.id = menu_combo_items.combo_id AND dk.gestiona(m.restaurante_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_items m JOIN public.restaurantes r ON r.id = m.restaurante_id
                      WHERE m.id = menu_combo_items.combo_id AND dk.gestiona(m.restaurante_id)
                        AND r.estado_acceso IN ('activo', 'gracia')));

DROP POLICY IF EXISTS mesa_del_propietario ON public.mesas;
CREATE POLICY mesa_del_propietario ON public.mesas FOR ALL TO dk_auth
  USING (dk.gestiona(restaurante_id) OR dk.es_admin())
  WITH CHECK (dk.gestiona(restaurante_id) AND dk.tiene_servicio(restaurante_id, 'plano_mesas'));

DROP POLICY IF EXISTS servicio_del_propietario ON public.servicios_contratados;
CREATE POLICY servicio_del_propietario ON public.servicios_contratados FOR SELECT TO dk_auth
  USING (dk.gestiona(restaurante_id) OR dk.es_admin());

COMMIT;
