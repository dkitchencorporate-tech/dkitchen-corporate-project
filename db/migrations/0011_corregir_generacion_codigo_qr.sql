-- 0011 · Corrige dk.aprovisionar_cliente_qr: gen_random_bytes() no existe
--
-- MOTIVO: 0010 generaba el código de QR con gen_random_bytes(6), que
-- pertenece a la extensión pgcrypto — nunca instalada en este proyecto (solo
-- citext y pg_session_jwt, ver 0001). La verificación de blindaje lo atrapó
-- en el primer intento real de ejecutar la función, antes de llegar a
-- producción. Se sustituye por gen_random_uuid(), nativo desde PostgreSQL 13
-- y ya en uso en todo el esquema (restaurantes.id, menu_items.id, etc.): se
-- despoja de guiones y se toman 12 caracteres hexadecimales, dentro del rango
-- 8-16 que exige la restricción `codigo_valido` de 0003.

CREATE OR REPLACE FUNCTION dk.aprovisionar_cliente_qr(
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

  BEGIN
    INSERT INTO stripe_eventos_procesados (id) VALUES (p_evento_stripe);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY
      SELECT r.id, r.slug FROM restaurantes r
       WHERE r.stripe_customer_id = p_stripe_customer_id
       LIMIT 1;
    RETURN;
  END;

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
  VALUES (left(replace(gen_random_uuid()::text, '-', ''), 12), v_restaurante.id);

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
