-- 0010 · Aprovisionamiento automático tras el pago (QR Menú)
--
-- MOTIVO: hasta ahora nada conecta un pago con una cuenta operativa. El
-- webhook de Stripe corre en Vercel, con la misma exposición pública que
-- cualquier otra función serverless: no puede recibir un rol que vea o toque
-- nada más que esto. Mismo patrón que dk_sync/dk_sincronizacion en 0007 —
-- credencial de conexión (NOLOGIN hasta que se le asigna contraseña aparte)
-- separada del rol con privilegios reales, unidas solo por GRANT.
--
-- La función es SECURITY DEFINER: igual que dk.auditar() o dk.resolver_codigo(),
-- corre con los privilegios de quien la crea (el propietario de la migración,
-- que tiene BYPASSRLS), así que puede insertar en `identidades` pese a que esa
-- tabla no concede INSERT a ningún rol de aplicación — la única puerta de
-- entrada a `identidades` es esta función, nunca un INSERT directo.

-- ---------------------------------------------------------------------------
-- Vínculo con Stripe
-- ---------------------------------------------------------------------------
ALTER TABLE restaurantes
  ADD COLUMN stripe_customer_id     text UNIQUE,
  ADD COLUMN stripe_subscription_id text UNIQUE;

-- Idempotencia: Stripe puede reintentar la entrega del mismo evento. Sin este
-- registro, un reintento crearía un segundo restaurante para el mismo pago.
CREATE TABLE stripe_eventos_procesados (
  id           text PRIMARY KEY,
  procesado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stripe_eventos_procesados ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_eventos_procesados FORCE ROW LEVEL SECURITY;
-- Ningún rol de aplicación recibe privilegio directo: se toca solo desde
-- dentro de dk.aprovisionar_cliente_qr(), igual que auditoria o escaneos.

-- ---------------------------------------------------------------------------
-- Rol dedicado del webhook — mismo patrón que dk_sync/dk_sincronizacion (0007)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dk_aprovisionamiento') THEN
    CREATE ROLE dk_aprovisionamiento NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dk_webhook') THEN
    -- Credencial de conexión del webhook de Stripe en Vercel. NOLOGIN de
    -- entrada; la contraseña se asigna aparte con
    -- db/crear-credencial-webhook.mjs, que tampoco la escribe en el repositorio.
    CREATE ROLE dk_webhook NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

GRANT USAGE ON SCHEMA dk TO dk_aprovisionamiento;
REVOKE CREATE ON SCHEMA public FROM dk_webhook;
REVOKE CREATE ON SCHEMA dk     FROM dk_webhook;

-- dk_webhook solo sabe convertirse en dk_aprovisionamiento. No hereda
-- dk_anon ni dk_auth: no los necesita y no debe poder adoptarlos.
GRANT dk_aprovisionamiento TO dk_webhook;

-- Para poder auditar y probar esta migración desde el propietario, igual que
-- en 0004 y 0007. No amplía lo que puede dk_app: no se le concede
-- dk_aprovisionamiento a dk_app en ningún sitio de este archivo.
GRANT dk_aprovisionamiento TO neondb_owner;

-- ---------------------------------------------------------------------------
-- Generador de slug único
-- ---------------------------------------------------------------------------
-- p_base ya llega normalizado (minúsculas, guiones) desde la aplicación; esta
-- función solo resuelve la colisión con lo que ya existe en `restaurantes`.
CREATE FUNCTION dk.slug_disponible(p_base text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_slug   text := left(p_base, 36);
  v_sufijo int := 1;
BEGIN
  IF v_slug !~ '^[a-z0-9-]{3,40}$' THEN
    v_slug := 'restaurante';
  END IF;

  WHILE EXISTS (SELECT 1 FROM restaurantes WHERE slug = v_slug) LOOP
    v_sufijo := v_sufijo + 1;
    v_slug := left(p_base, 33) || '-' || v_sufijo;
  END LOOP;

  RETURN v_slug;
END;
$$;

REVOKE ALL ON FUNCTION dk.slug_disponible(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.slug_disponible(text) TO dk_aprovisionamiento;

-- ---------------------------------------------------------------------------
-- Aprovisionamiento atómico
-- ---------------------------------------------------------------------------
-- p_evento_stripe es el id del evento de Stripe (evt_...), no el de la sesión
-- de checkout: es la clave de idempotencia real, porque Stripe reintenta
-- entregas del mismo evento con el mismo id.
CREATE FUNCTION dk.aprovisionar_cliente_qr(
  p_evento_stripe        text,
  p_identidad            uuid,
  p_email                citext,
  p_nombre               text,
  p_plan                 text,
  p_restaurante_nombre   text,
  p_slug_base            text,
  p_stripe_customer_id   text,
  p_stripe_subscription_id text
)
RETURNS TABLE (restaurante_id uuid, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_restaurante restaurantes;
BEGIN
  IF p_plan NOT IN ('basico', 'ampliado') THEN
    RAISE EXCEPTION 'Plan desconocido: %', p_plan USING ERRCODE = 'check_violation';
  END IF;

  -- Idempotencia: si este evento ya se procesó, se devuelve el resultado ya
  -- existente en vez de intentar crear un segundo restaurante para el mismo pago.
  BEGIN
    INSERT INTO stripe_eventos_procesados (id) VALUES (p_evento_stripe);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY
      SELECT r.id, r.slug FROM restaurantes r
       WHERE r.stripe_customer_id = p_stripe_customer_id
       LIMIT 1;
    RETURN;
  END;

  -- La identidad puede ya existir (reintento, o cliente que ya tenía cuenta
  -- por otro peldaño): no se sobrescribe email/nombre de una identidad viva.
  INSERT INTO identidades (id, email, nombre)
  VALUES (p_identidad, p_email, p_nombre)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO restaurantes (propietario, slug, nombre, plan, stripe_customer_id, stripe_subscription_id)
  VALUES (
    p_identidad,
    dk.slug_disponible(p_slug_base),
    p_restaurante_nombre,
    p_plan,
    p_stripe_customer_id,
    p_stripe_subscription_id
  )
  RETURNING * INTO v_restaurante;

  INSERT INTO codigos_qr (codigo, restaurante_id)
  VALUES (encode(gen_random_bytes(6), 'hex'), v_restaurante.id);

  INSERT INTO auditoria (identidad, accion, detalle)
  VALUES (
    p_identidad,
    'aprovisionamiento_stripe',
    jsonb_build_object(
      'evento_stripe', p_evento_stripe,
      'restaurante_id', v_restaurante.id,
      'plan', p_plan
    )
  );

  RETURN QUERY SELECT v_restaurante.id, v_restaurante.slug;
END;
$$;

REVOKE ALL ON FUNCTION dk.aprovisionar_cliente_qr(text, uuid, citext, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.aprovisionar_cliente_qr(text, uuid, citext, text, text, text, text, text, text)
  TO dk_aprovisionamiento;
