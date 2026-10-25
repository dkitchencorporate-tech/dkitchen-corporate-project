-- 0014 · Separa contrato/factura del estado de ejecución en pedidos_nivel_b
--
-- MOTIVO: 0013 metía "contrato_pendiente/contrato_firmado/factura_pendiente/
-- facturado" en la misma columna `estado` que ya usa el intake
-- (pagado → intake_recibido → en_ejecucion → completado). Son dos pistas
-- independientes en la práctica — el contrato se envía a firmar
-- inmediatamente tras el pago, sin esperar al intake, así que forzarlas a
-- un único valor lineal hacía que avanzar una rompiera el punto de partida
-- de la otra (el guard de `dk.guardar_intake` asume que `estado = 'pagado'`
-- para pasar a `intake_recibido`, y eso deja de cumplirse si el estado ya
-- se movió a `contrato_pendiente` por el otro lado). Dos columnas de fecha,
-- NULL = pendiente, son un modelo más simple y correcto que un enum
-- compartido para algo que no es realmente una secuencia única.
--
-- Ningún dato real depende todavía de la forma anterior (0013 se aplicó en
-- esta misma sesión, sin clientes reales de por medio), así que se corrige
-- hacia delante en vez de reescribir 0013.

ALTER TABLE pedidos_nivel_b
  ADD COLUMN contrato_enviado_en timestamptz,
  ADD COLUMN factura_emitida_en  timestamptz;

ALTER TABLE pedidos_nivel_b DROP CONSTRAINT pedidos_nivel_b_estado_check;
ALTER TABLE pedidos_nivel_b
  ADD CONSTRAINT pedidos_nivel_b_estado_check
  CHECK (estado IN ('pagado', 'intake_recibido', 'en_ejecucion', 'completado'));

CREATE FUNCTION dk.marcar_contrato_enviado(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  UPDATE pedidos_nivel_b SET contrato_enviado_en = now() WHERE id = p_id AND contrato_enviado_en IS NULL;
$$;

REVOKE ALL ON FUNCTION dk.marcar_contrato_enviado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.marcar_contrato_enviado(uuid) TO dk_aprovisionamiento;

CREATE FUNCTION dk.marcar_factura_emitida(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  UPDATE pedidos_nivel_b SET factura_emitida_en = now() WHERE id = p_id AND factura_emitida_en IS NULL;
$$;

REVOKE ALL ON FUNCTION dk.marcar_factura_emitida(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.marcar_factura_emitida(uuid) TO dk_aprovisionamiento;
