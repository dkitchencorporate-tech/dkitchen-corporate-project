-- 0075 (13/10/2026): las llamadas al camarero también se ven y se atienden en el
-- modo soporte de Central (super admin con 2FA de ESTA sesión), igual que mesas
-- y camareros desde 0027. Antes salían vacías sin error y no se podía auditar.
BEGIN;

DROP POLICY IF EXISTS llamada_del_propietario ON public.llamadas_camarero;
CREATE POLICY llamada_del_propietario ON public.llamadas_camarero FOR SELECT TO dk_auth
  USING (EXISTS (SELECT 1 FROM public.restaurantes r WHERE r.id = restaurante_id
                 AND r.propietario = dk.identidad_actual())
         OR coalesce(dk.es_admin(), false));

DROP POLICY IF EXISTS llamada_atender_propia ON public.llamadas_camarero;
CREATE POLICY llamada_atender_propia ON public.llamadas_camarero FOR UPDATE TO dk_auth
  USING (EXISTS (SELECT 1 FROM public.restaurantes r WHERE r.id = restaurante_id
                 AND r.propietario = dk.identidad_actual())
         OR coalesce(dk.es_admin(), false));

COMMIT;
