-- 0013 · Intake + tubería común de post-pago para el Nivel B (Parte 8)
--
-- MOTIVO: Auditoría, Experience, Núcleo Operativo y Dark Kitchen Ruta B
-- comparten el mismo patrón tras el pago (Parte 8, Sección 8): contrato,
-- factura, documento de "qué sigue" y ejecución interna. Hasta ahora solo
-- Auditoría tenía una reacción al pago (un correo, sin registro en base de
-- datos — Auditoría no necesita el resto de la tubería: es una sesión de
-- diagnóstico, no un servicio con formulario de intake ni activo que
-- entregar). Núcleo Operativo y Dark Kitchen Ruta B sí lo necesitan, y esta
-- migración construye la infraestructura compartida por los cuatro, aunque
-- de momento solo Núcleo Operativo la usa de verdad.
--
-- Reutiliza el rol dk_aprovisionamiento (0010) en vez de crear uno nuevo: es
-- exactamente el mismo perfil de confianza que el webhook de pago (una
-- función serverless pública, sin sesión de cliente detrás), y cada función
-- nueva sigue concediendo EXECUTE una por una, nunca acceso directo a tabla
-- — el mismo principio que ya sostiene dk.resolver_codigo() para visitantes
-- anónimos.

-- ---------------------------------------------------------------------------
-- Pedidos de Nivel B
-- ---------------------------------------------------------------------------
CREATE TABLE pedidos_nivel_b (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto           text NOT NULL CHECK (producto IN ('auditoria', 'experience', 'nucleo-operativo', 'dark-kitchen-ruta-b')),
  referencia_pago    text NOT NULL UNIQUE, -- id de pago de la pasarela — clave de idempotencia real
  email              citext NOT NULL,
  nombre_contacto    text NOT NULL,
  restaurante_nombre text,
  importe_centimos   int NOT NULL CHECK (importe_centimos > 0),
  -- Token opaco de acceso al formulario de intake — no hay cuenta de Neon
  -- Auth para estos clientes todavía (a diferencia de QR), así que el enlace
  -- por correo es, de forma deliberada, la única puerta de entrada. Dos
  -- UUID v4 concatenados en vez de gen_random_bytes(): pgcrypto no está
  -- instalado en esta base (mismo motivo que llevó a 0011 a evitarlo),
  -- gen_random_uuid() es nativo de Postgres y da entropía de sobra.
  token              text NOT NULL UNIQUE
    DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  estado             text NOT NULL DEFAULT 'pagado'
    CHECK (estado IN ('pagado', 'intake_recibido', 'contrato_pendiente', 'contrato_firmado',
                       'factura_pendiente', 'facturado', 'en_ejecucion', 'completado')),
  creado_en          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pedidos_nivel_b ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_nivel_b FORCE ROW LEVEL SECURITY;
-- Sin GRANT directo a ningún rol de aplicación: todo pasa por las funciones
-- de abajo, igual que `identidades` solo se toca desde
-- dk.aprovisionar_cliente_qr().

CREATE TABLE intake_formularios (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id  uuid NOT NULL UNIQUE REFERENCES pedidos_nivel_b(id) ON DELETE CASCADE,
  -- Estructura flexible a propósito (Parte 8, Sección 5-bis): datos del
  -- negocio, catálogo con alérgenos obligatorios, elección de rama de fotos
  -- (A: enlace propio / B: pide generación por IA + aceptación del aviso de
  -- riesgo), e integración operativa. Forzar columnas rígidas aquí
  -- acoplaría el esquema a un formulario que todavía puede cambiar de forma
  -- razonable entre Núcleo Operativo y Dark Kitchen Ruta B.
  datos      jsonb NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE intake_formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_formularios FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Crear el pedido — llamado por el webhook de pago al recibir payment.succeeded
-- ---------------------------------------------------------------------------
CREATE FUNCTION dk.crear_pedido_nivel_b(
  p_producto           text,
  p_referencia_pago    text,
  p_email              citext,
  p_nombre_contacto    text,
  p_restaurante_nombre text,
  p_importe_centimos   int
)
RETURNS TABLE (id uuid, token text, ya_existia boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_pedido pedidos_nivel_b;
BEGIN
  -- Idempotencia: la pasarela puede reintentar la entrega del mismo evento — un
  -- segundo intento con la misma referencia_pago devuelve el pedido ya
  -- creado en vez de fallar por la restricción UNIQUE o duplicar el aviso.
  SELECT * INTO v_pedido FROM pedidos_nivel_b WHERE referencia_pago = p_referencia_pago;
  IF FOUND THEN
    RETURN QUERY SELECT v_pedido.id, v_pedido.token, true;
    RETURN;
  END IF;

  INSERT INTO pedidos_nivel_b (producto, referencia_pago, email, nombre_contacto, restaurante_nombre, importe_centimos)
  VALUES (p_producto, p_referencia_pago, p_email, p_nombre_contacto, p_restaurante_nombre, p_importe_centimos)
  RETURNING * INTO v_pedido;

  RETURN QUERY SELECT v_pedido.id, v_pedido.token, false;
END;
$$;

REVOKE ALL ON FUNCTION dk.crear_pedido_nivel_b(text, text, citext, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.crear_pedido_nivel_b(text, text, citext, text, text, int) TO dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Leer un pedido por su token — para que la página de intake sepa a quién
-- le está mostrando el formulario, sin exponer la tabla completa.
-- ---------------------------------------------------------------------------
CREATE FUNCTION dk.pedido_por_token(p_token text)
RETURNS TABLE (id uuid, producto text, nombre_contacto text, restaurante_nombre text, estado text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  SELECT id, producto, nombre_contacto, restaurante_nombre, estado
    FROM pedidos_nivel_b
   WHERE token = p_token;
$$;

REVOKE ALL ON FUNCTION dk.pedido_por_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.pedido_por_token(text) TO dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Guardar el intake — el cliente puede reenviar el formulario (corregir un
-- dato) mientras no haya avanzado de fase, así que es un upsert, no un
-- INSERT de una sola vez.
-- ---------------------------------------------------------------------------
CREATE FUNCTION dk.guardar_intake(p_token text, p_datos jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_pedido_id uuid;
BEGIN
  SELECT id INTO v_pedido_id FROM pedidos_nivel_b WHERE token = p_token;
  IF v_pedido_id IS NULL THEN
    RAISE EXCEPTION 'Token de intake no válido' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO intake_formularios (pedido_id, datos)
  VALUES (v_pedido_id, p_datos)
  ON CONFLICT (pedido_id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_en = now();

  UPDATE pedidos_nivel_b SET estado = 'intake_recibido' WHERE id = v_pedido_id AND estado = 'pagado';
END;
$$;

REVOKE ALL ON FUNCTION dk.guardar_intake(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.guardar_intake(text, jsonb) TO dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Avanzar el estado del pedido a mano (contrato firmado, facturado, etc.) —
-- hasta que exista integración real con Signaturit y facturación
-- Verifactu, este es el punto donde ese avance se registra cuando Alex lo
-- hace fuera del sistema.
-- ---------------------------------------------------------------------------
CREATE FUNCTION dk.marcar_estado_pedido(p_id uuid, p_estado text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  UPDATE pedidos_nivel_b SET estado = p_estado WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION dk.marcar_estado_pedido(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.marcar_estado_pedido(uuid, text) TO dk_aprovisionamiento;
