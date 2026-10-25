-- 0016 · Dark Kitchen Ruta B — marcas virtuales sobre una cocina existente (Parte 3, Parte 8 Seccion 5)
--
-- MOTIVO: auditoria del 22/09/2026 (Parte 15) encontro que Dark Kitchen no
-- tenia NINGUNA pieza construida -- ni tabla, ni funcion, ni checkout. Esta
-- migracion cubre la Ruta B (autoservicio: "ya tengo cocina, quiero sumar
-- marca", Parte 8 Seccion 5) -- la Ruta A (consultivo, 3.000-10.000 euros,
-- puerta de admision) sigue sin automatizar a proposito, es venta 1 a 1.
--
-- Precio de desarrollo por marca (Parte 3 Seccion 3.3, DARK_KITCHEN.rutaB en
-- pricing-config.ts): 1a marca 1.200E, 2a 960E (-20%), 3a en adelante 840E
-- (-30%). Se recalcula SIEMPRE aqui dentro, por orden real de marcas del
-- restaurante -- nunca se confia en un precio que llegue del frontend o del
-- checkout (mismo principio que dk.aprovisionar_cliente_qr).
--
-- marketing_centimos (200E fijo, Parte 3) se mantiene integro por marca, sin
-- descuento -- "cada marca prueba su propia traccion" (pricing-config.ts).

CREATE TABLE marcas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id        uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  nombre                text NOT NULL,
  orden                 int NOT NULL,
  precio_desarrollo_centimos int NOT NULL,
  marketing_centimos    int NOT NULL DEFAULT 20000,
  referencia_pago       text NOT NULL UNIQUE,
  estado                text NOT NULL DEFAULT 'pagada'
    CHECK (estado IN ('pagada', 'confirmada_por_alex', 'en_produccion', 'activa')),
  creado_en             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas FORCE ROW LEVEL SECURITY;
-- Sin GRANT directo a ningun rol de aplicacion -- mismo criterio que
-- pedidos_nivel_b (0013): todo pasa por las funciones de abajo.

-- ---------------------------------------------------------------------------
-- Lectura del recuento actual -- la necesita el checkout (dk_auth, cliente ya
-- logueado con sesion Neon Auth real) para saber que precio mostrar ANTES de
-- pagar, y el webhook (dk_aprovisionamiento) para el mismo calculo al
-- confirmar el pago.
-- ---------------------------------------------------------------------------
CREATE FUNCTION dk.contar_marcas_activas(p_restaurante_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  SELECT count(*)::integer FROM marcas WHERE restaurante_id = p_restaurante_id;
$$;

GRANT EXECUTE ON FUNCTION dk.contar_marcas_activas(uuid) TO dk_auth, dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Alta de marca -- solo la llama el webhook, tras payment.succeeded de la pasarela.
-- Recalcula orden y precio de desarrollo por su cuenta; el importe que
-- pudiera venir en metadata del webhook es solo para el registro de
-- pedidos_nivel_b/log, nunca la fuente de verdad de lo que se guarda aqui.
-- ---------------------------------------------------------------------------
CREATE FUNCTION dk.crear_marca_ruta_b(p_restaurante_id uuid, p_nombre text, p_referencia_pago text)
RETURNS marcas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_orden  integer;
  v_precio integer;
  v_fila   marcas;
BEGIN
  v_orden := (SELECT count(*) FROM marcas WHERE restaurante_id = p_restaurante_id) + 1;
  v_precio := CASE
                WHEN v_orden = 1 THEN 120000
                WHEN v_orden = 2 THEN 96000
                ELSE 84000
              END;

  INSERT INTO marcas (restaurante_id, nombre, orden, precio_desarrollo_centimos, referencia_pago)
  VALUES (p_restaurante_id, p_nombre, v_orden, v_precio, p_referencia_pago)
  ON CONFLICT (referencia_pago) DO NOTHING
  RETURNING * INTO v_fila;

  IF v_fila.id IS NULL THEN
    SELECT * INTO v_fila FROM marcas WHERE referencia_pago = p_referencia_pago;
  END IF;

  RETURN v_fila;
END;
$$;

GRANT EXECUTE ON FUNCTION dk.crear_marca_ruta_b(uuid, text, text) TO dk_aprovisionamiento;
