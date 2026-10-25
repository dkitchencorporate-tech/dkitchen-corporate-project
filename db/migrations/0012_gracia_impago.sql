-- 0012 · Gracia e impago propios — la pasarela no decide el acceso
--
-- MOTIVO (Parte 12, Sección 5 del plan de migración a la pasarela): el ciclo nativo
-- de la pasarela ante un cobro recurrente fallido es de solo 5 días, tras los
-- cuales cancela la membresía él mismo. El calendario ya aprobado con el
-- cliente es de 30 días: reintentos día 0/3/7, acceso completo en gracia
-- días 7-12, modo solo lectura días 12-30, suspensión real día 30.
--
-- La única forma de sostener ese calendario es que DKitchen decida el
-- acceso, no la pasarela — la pasarela se usa solo como fuente de verdad de si el cobro
-- entró o no (los webhooks payment.failed/payment.succeeded), nunca como el
-- motor que activa o corta el acceso.

ALTER TABLE restaurantes
  ADD COLUMN estado_acceso text NOT NULL DEFAULT 'activo'
    CHECK (estado_acceso IN ('activo', 'gracia', 'solo_lectura', 'suspendido')),
  ADD COLUMN pago_fallido_desde timestamptz;

-- ---------------------------------------------------------------------------
-- Registrar un fallo de cobro
-- ---------------------------------------------------------------------------
-- Idempotente a propósito: si ya hay un ciclo de fallo abierto (columna ya
-- rellena), un segundo payment.failed del mismo ciclo de reintentos no debe
-- reiniciar el contador de días — eso alargaría la gracia indefinidamente
-- cada vez que la pasarela reintenta el cobro y vuelve a fallar.
CREATE FUNCTION dk.registrar_pago_fallido(p_stripe_customer_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  UPDATE restaurantes
     SET pago_fallido_desde = now()
   WHERE stripe_customer_id = p_stripe_customer_id
     AND pago_fallido_desde IS NULL;
$$;

REVOKE ALL ON FUNCTION dk.registrar_pago_fallido(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.registrar_pago_fallido(text) TO dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Un cobro que sí entra cierra el ciclo de fallo, sea cual sea el estado
-- ---------------------------------------------------------------------------
CREATE FUNCTION dk.registrar_pago_recuperado(p_stripe_customer_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  UPDATE restaurantes
     SET pago_fallido_desde = NULL,
         estado_acceso = 'activo'
   WHERE stripe_customer_id = p_stripe_customer_id
     AND pago_fallido_desde IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION dk.registrar_pago_recuperado(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.registrar_pago_recuperado(text) TO dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Avance diario del calendario — la llama un cron, nunca el webhook
-- ---------------------------------------------------------------------------
-- Separado de registrar_pago_fallido a propósito: el webhook solo marca
-- CUÁNDO empezó el fallo; cuánto tiempo lleva y a qué fase corresponde se
-- recalcula aquí, así un cron perdido o repetido nunca puede corromper el
-- contador (siempre deriva del mismo pago_fallido_desde, nunca acumula).
CREATE FUNCTION dk.avanzar_calendario_gracia()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  WITH actualizados AS (
    UPDATE restaurantes
       SET estado_acceso = CASE
             WHEN now() - pago_fallido_desde >= interval '30 days' THEN 'suspendido'
             WHEN now() - pago_fallido_desde >= interval '12 days' THEN 'solo_lectura'
             ELSE 'gracia'
           END
     WHERE pago_fallido_desde IS NOT NULL
       AND estado_acceso <> CASE
             WHEN now() - pago_fallido_desde >= interval '30 days' THEN 'suspendido'
             WHEN now() - pago_fallido_desde >= interval '12 days' THEN 'solo_lectura'
             ELSE 'gracia'
           END
    RETURNING 1
  )
  SELECT count(*)::int FROM actualizados;
$$;

REVOKE ALL ON FUNCTION dk.avanzar_calendario_gracia() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.avanzar_calendario_gracia() TO dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Distinguir primer pago de renovación
-- ---------------------------------------------------------------------------
-- El webhook de pago no puede saber por sí solo si un payment.succeeded es
-- el alta (aprovisionar todo) o el cobro del mes 4 de un cliente que ya
-- existe (solo cerrar un posible ciclo de gracia) — mirarlo aquí, antes de
-- intentar crear una cuenta de Neon Auth duplicada cada mes.
CREATE FUNCTION dk.es_cliente_existente(p_stripe_customer_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  SELECT EXISTS (SELECT 1 FROM restaurantes WHERE stripe_customer_id = p_stripe_customer_id);
$$;

REVOKE ALL ON FUNCTION dk.es_cliente_existente(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.es_cliente_existente(text) TO dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Aplicar el estado: bloquea escritura en solo_lectura/suspendido
-- ---------------------------------------------------------------------------
-- RESTRICTIVE, no reemplaza las políticas de 0003: una política PERMISSIVE
-- nueva se sumaría en OR a "seccion_del_propietario"/"item_del_propietario"
-- (que ya permiten todo al dueño) y no restringiría nada. RESTRICTIVE exige
-- que ambas se cumplan a la vez. Se define por comando, no con FOR ALL,
-- porque el propietario debe poder seguir LEYENDO su carta en solo_lectura
-- — solo se bloquea la escritura.
CREATE POLICY seccion_bloqueada_si_no_activo ON menu_secciones
  AS RESTRICTIVE FOR INSERT TO dk_auth
  WITH CHECK (EXISTS (SELECT 1 FROM restaurantes r
                      WHERE r.id = restaurante_id AND r.estado_acceso IN ('activo', 'gracia')));
CREATE POLICY seccion_bloqueada_si_no_activo_upd ON menu_secciones
  AS RESTRICTIVE FOR UPDATE TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r
                 WHERE r.id = restaurante_id AND r.estado_acceso IN ('activo', 'gracia')));
CREATE POLICY seccion_bloqueada_si_no_activo_del ON menu_secciones
  AS RESTRICTIVE FOR DELETE TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r
                 WHERE r.id = restaurante_id AND r.estado_acceso IN ('activo', 'gracia')));

CREATE POLICY item_bloqueado_si_no_activo ON menu_items
  AS RESTRICTIVE FOR INSERT TO dk_auth
  WITH CHECK (EXISTS (SELECT 1 FROM restaurantes r
                      WHERE r.id = restaurante_id AND r.estado_acceso IN ('activo', 'gracia')));
CREATE POLICY item_bloqueado_si_no_activo_upd ON menu_items
  AS RESTRICTIVE FOR UPDATE TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r
                 WHERE r.id = restaurante_id AND r.estado_acceso IN ('activo', 'gracia')));
CREATE POLICY item_bloqueado_si_no_activo_del ON menu_items
  AS RESTRICTIVE FOR DELETE TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r
                 WHERE r.id = restaurante_id AND r.estado_acceso IN ('activo', 'gracia')));

-- El propio restaurante (nombre/logo/color) también deja de editarse fuera
-- de activo/gracia — mismo criterio, misma técnica.
CREATE POLICY restaurante_bloqueado_si_no_activo ON restaurantes
  AS RESTRICTIVE FOR UPDATE TO dk_auth
  USING (estado_acceso IN ('activo', 'gracia'));

-- Deliberadamente NO se toca la política `restaurante_visible_si_activo`
-- (0003) que rige si el menú público sigue siendo visible para un visitante
-- anónimo: esa usa la columna `activo` (booleana, decide si el negocio está
-- operativo en absoluto), un concepto distinto de `estado_acceso` (decide si
-- el DUEÑO puede seguir editando). Qué le pasa a la carta pública en
-- "suspendido" es una decisión de producto que no está en los documentos
-- disponibles — no se asume aquí.
