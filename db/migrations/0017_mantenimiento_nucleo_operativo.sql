-- 0017 · Cuota de mantenimiento recurrente de Nucleo Operativo (Parte 8, Seccion 6 / pricing-config.ts BASE_OPERATIVA.mantenimiento)
--
-- MOTIVO: el pago unico de activacion (700E) ya se cobraba (0013), pero no
-- existia ningun mecanismo para la cuota mensual (69E/mes, 2 meses gratis,
-- arranca en el mes 3) -- la pasarela no tiene "N ciclos gratis, luego cobra" de
-- forma nativa (a diferencia de initial_price/renewal_price, que es un
-- unico primer cobro distinto, no varios).
--
-- Mecanismo elegido: en la activacion NO se crea ninguna suscripcion
-- recurrente. Un cron diario (/api/cron/mantenimiento-nucleo-operativo,
-- mismo patron que gracia-impago de 0012) revisa que pedidos de Nucleo
-- Operativo ya pagados cumplieron 60 dias desde el pago y no tienen el
-- disparo ya hecho -- para esos, crea el checkout recurrente en la pasarela y
-- envia el enlace por correo.
--
-- SIMPLIFICACION DEJADA POR ESCRITO A PROPOSITO: el contador de 60 dias
-- arranca desde el pago de los 700E (pedidos_nivel_b.creado_en), no desde
-- una fecha real de "puesta en marcha" del servicio -- esa fecha no existe
-- todavia en el modelo de datos porque el paso de onboarding completo
-- (intake -> contrato -> cocina realmente operando) no esta construido aun
-- (Parte 14, Fase 5). Revisar este punto cuando exista esa pieza.

ALTER TABLE pedidos_nivel_b ADD COLUMN mantenimiento_disparado_en timestamptz;

-- ---------------------------------------------------------------------------
-- Lectura del cron: pedidos de Nucleo Operativo con 60+ dias y sin disparar.
-- ---------------------------------------------------------------------------
CREATE FUNCTION dk.pedidos_pendientes_mantenimiento_nucleo_operativo()
RETURNS TABLE (id uuid, email citext, nombre_contacto text, restaurante_nombre text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  SELECT id, email, nombre_contacto, restaurante_nombre
  FROM pedidos_nivel_b
  WHERE producto = 'nucleo-operativo'
    AND mantenimiento_disparado_en IS NULL
    AND creado_en <= now() - interval '60 days';
$$;

GRANT EXECUTE ON FUNCTION dk.pedidos_pendientes_mantenimiento_nucleo_operativo() TO dk_aprovisionamiento;

CREATE FUNCTION dk.marcar_mantenimiento_disparado(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  UPDATE pedidos_nivel_b SET mantenimiento_disparado_en = now() WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION dk.marcar_mantenimiento_disparado(uuid) TO dk_aprovisionamiento;
