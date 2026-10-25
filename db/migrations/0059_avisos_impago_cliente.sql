-- 0059 · H16: correos AL CLIENTE durante el impago (hasta hoy solo había aviso interno).
-- Igual que dk.avanzar_calendario_gracia() (0012), que se conserva, pero devuelve a quién avisar:
--   · cambio a 'solo_lectura' (día 12) y a 'suspendido' (día 30);
--   · recordatorio los días 9 y 27 (3 días antes de cada corte).
-- El aviso del día 0 («no hemos podido cobrar») lo manda el webhook de Stripe al recibir invoice.payment_failed.
-- La llama solo el cron diario /api/cron/gracia-impago (rol dk_aprovisionamiento).

BEGIN;

CREATE OR REPLACE FUNCTION dk.avanzar_calendario_gracia_avisos()
RETURNS TABLE (restaurante_id uuid, nombre text, email text, contacto text, fase text, dias int)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
  WITH nuevo AS (
    SELECT r.id,
           CASE WHEN now() - r.pago_fallido_desde >= interval '30 days' THEN 'suspendido'
                WHEN now() - r.pago_fallido_desde >= interval '12 days' THEN 'solo_lectura'
                ELSE 'gracia' END AS estado,
           (current_date - r.pago_fallido_desde::date)::int AS dias
      FROM public.restaurantes r
     WHERE r.pago_fallido_desde IS NOT NULL
  ), act AS (
    UPDATE public.restaurantes r
       SET estado_acceso = n.estado
      FROM nuevo n
     WHERE r.id = n.id AND r.estado_acceso <> n.estado
    RETURNING r.id
  )
  SELECT r.id, r.nombre, u.email, u.name,
         CASE WHEN a.id IS NOT NULL THEN n.estado ELSE 'recordatorio' END,
         n.dias
    FROM nuevo n
    JOIN public.restaurantes r ON r.id = n.id
    JOIN neon_auth."user" u ON u.id = r.propietario
    LEFT JOIN act a ON a.id = n.id
   WHERE (a.id IS NOT NULL AND n.estado IN ('solo_lectura', 'suspendido'))
      OR (a.id IS NULL AND n.dias IN (9, 27));
$$;

REVOKE ALL ON FUNCTION dk.avanzar_calendario_gracia_avisos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.avanzar_calendario_gracia_avisos() TO dk_aprovisionamiento;

COMMIT;
