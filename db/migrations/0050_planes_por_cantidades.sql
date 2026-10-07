-- 0050 · Planes por cantidades (decisión A de karc0, 07/10; ESTADO §6 entradas 61 y 72).
-- Ids internos se mantienen: 'basico' = Carta 9 €, 'ampliado' = Local 29 €, y se añade 'sala' = Sala 69 €.
-- Cada plan trae «de todo un poco» con topes (+10 % de cortesía antes de bloquear). Local incluye el
-- plano y la app de sala; Sala incluye además TPV, Comandero Pro e idiomas. El Pack Sala y los módulos
-- sueltos de plano/app dejan de venderse (los ya contratados siguen funcionando).
-- Fase 1: al llegar al tope se bloquea con un mensaje que invita a subir de plan (los paquetes extra,
-- más adelante). La llamada al camarero nunca se corta.

BEGIN;

-- 1. Plan 'sala' permitido
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_plan_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_plan_check CHECK (plan = ANY (ARRAY['basico', 'ampliado', 'sala']));

ALTER TABLE public.enlaces_pago DROP CONSTRAINT IF EXISTS enlaces_pago_plan_check;
ALTER TABLE public.enlaces_pago ADD CONSTRAINT enlaces_pago_plan_check CHECK (plan = ANY (ARRAY['basico', 'ampliado', 'sala']));

-- 2. Nivel, precio y topes de cada plan (espejo de src/lib/pricing-config.ts · QR_MENU.planes)
CREATE OR REPLACE FUNCTION dk.plan_nivel(p_plan text) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT CASE p_plan WHEN 'sala' THEN 3 WHEN 'ampliado' THEN 2 WHEN 'basico' THEN 1 ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION dk.plan_nombre(p_plan text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT CASE p_plan WHEN 'sala' THEN 'Sala' WHEN 'ampliado' THEN 'Local' ELSE 'Carta' END
$$;

CREATE OR REPLACE FUNCTION dk.precio_plan(p_plan text) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT CASE p_plan WHEN 'sala' THEN 6900 WHEN 'ampliado' THEN 2900 WHEN 'basico' THEN 900 ELSE 0 END
$$;

-- Tope publicado del plan.
CREATE OR REPLACE FUNCTION dk.plan_tope(p_plan text, p_que text) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT CASE p_que
    WHEN 'productos'    THEN CASE p_plan WHEN 'sala' THEN 300 WHEN 'ampliado' THEN 150 ELSE 50 END
    WHEN 'mesas'        THEN CASE p_plan WHEN 'sala' THEN 40  WHEN 'ampliado' THEN 15  ELSE 4 END
    WHEN 'camareros'    THEN CASE p_plan WHEN 'sala' THEN 10  WHEN 'ampliado' THEN 3   ELSE 0 END
    WHEN 'reservas_mes' THEN CASE p_plan WHEN 'sala' THEN 500 WHEN 'ampliado' THEN 150 ELSE 10 END
    WHEN 'banners'      THEN CASE p_plan WHEN 'basico' THEN 1 ELSE 3 END
  END
$$;

-- Tope real: el publicado + 10 % de cortesía (banners sin cortesía).
CREATE OR REPLACE FUNCTION dk.plan_tope_max(p_plan text, p_que text) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT CASE WHEN p_que = 'banners' THEN dk.plan_tope(p_plan, p_que)
              ELSE ceil(dk.plan_tope(p_plan, p_que) * 1.1)::int END
$$;

-- Uso actual frente al tope (para el panel: avisar antes de llegar).
CREATE OR REPLACE FUNCTION dk.mi_uso_plan()
RETURNS TABLE (que text, usados int, tope int, tope_max int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE r public.restaurantes; v_mes timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';
BEGIN
  SELECT * INTO r FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT q.que, q.n::int, dk.plan_tope(r.plan, q.que), dk.plan_tope_max(r.plan, q.que)
  FROM (VALUES
    ('productos',    (SELECT count(*) FROM public.menu_items WHERE restaurante_id = r.id)),
    ('mesas',        (SELECT count(*) FROM public.mesas WHERE restaurante_id = r.id)),
    ('camareros',    (SELECT count(*) FROM public.camareros WHERE restaurante_id = r.id AND activo)),
    ('reservas_mes', (SELECT count(*) FROM public.reservas WHERE restaurante_id = r.id AND creada_en >= v_mes)),
    ('banners',      (SELECT count(*) FROM public.promociones WHERE restaurante_id = r.id AND activa))
  ) AS q(que, n);
END;
$$;

-- 3. Qué incluye cada plan
CREATE OR REPLACE FUNCTION dk.tiene_servicio(p_restaurante uuid, p_servicio text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servicios_contratados s
    WHERE s.restaurante_id = p_restaurante AND s.estado <> 'cancelado'
      AND (s.servicio = p_servicio
           OR (s.servicio = 'pack_sala' AND p_servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv'))))
  OR EXISTS (
    SELECT 1 FROM public.restaurantes r WHERE r.id = p_restaurante AND (
         (dk.plan_nivel(r.plan) >= 2 AND p_servicio IN ('plano_mesas', 'app_sala'))
      OR (dk.plan_nivel(r.plan) >= 3 AND p_servicio IN ('conexion_tpv', 'comandero_pro', 'idiomas'))
      OR (r.nivel_diseno = 'signature' AND p_servicio = 'comandero_pro')));
$$;

-- 4. Catálogo: TPV 19 € y Comandero Pro 9 € como extras de Local; lo incluido en el plan sale de la venta
ALTER TABLE public.catalogo_servicios ADD COLUMN IF NOT EXISTS en_venta boolean NOT NULL DEFAULT true;
UPDATE public.catalogo_servicios SET precio_centimos = 1900, precio_ancla_centimos = NULL WHERE servicio = 'conexion_tpv';
UPDATE public.catalogo_servicios SET precio_centimos = 900,  precio_ancla_centimos = NULL WHERE servicio = 'comandero_pro';
UPDATE public.catalogo_servicios SET en_venta = false WHERE servicio IN ('plano_mesas', 'app_sala', 'pack_sala');

-- 5. Topes
CREATE OR REPLACE FUNCTION dk.comprobar_tope_productos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'dk', 'public', 'pg_catalog' AS $$
DECLARE v_plan text; v_max int;
BEGIN
  SELECT plan INTO v_plan FROM restaurantes WHERE id = NEW.restaurante_id;
  v_max := dk.plan_tope_max(v_plan, 'productos');
  IF (SELECT count(*) FROM menu_items WHERE restaurante_id = NEW.restaurante_id) >= v_max THEN
    RAISE EXCEPTION 'Tu plan % admite % productos y ya los tienes. Pasa a un plan superior desde Mi plan para añadir más.',
      dk.plan_nombre(v_plan), dk.plan_tope(v_plan, 'productos') USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dk.comprobar_tope_mesas() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_plan text;
BEGIN
  SELECT plan INTO v_plan FROM public.restaurantes WHERE id = NEW.restaurante_id;
  IF (SELECT count(*) FROM public.mesas WHERE restaurante_id = NEW.restaurante_id) >= dk.plan_tope_max(v_plan, 'mesas') THEN
    RAISE EXCEPTION 'Tu plan % admite % mesas y ya las tienes. Pasa a un plan superior desde Mi plan para añadir más.',
      dk.plan_nombre(v_plan), dk.plan_tope(v_plan, 'mesas') USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION dk.comprobar_tope_mesas() FROM PUBLIC;
DROP TRIGGER IF EXISTS mesas_tope ON public.mesas;
CREATE TRIGGER mesas_tope BEFORE INSERT ON public.mesas FOR EACH ROW EXECUTE FUNCTION dk.comprobar_tope_mesas();

CREATE OR REPLACE FUNCTION dk.equipo_comprobar_tope(p_rest uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_plan text; v_max int;
BEGIN
  SELECT plan INTO v_plan FROM public.restaurantes WHERE id = p_rest;
  v_max := least(20, dk.plan_tope_max(v_plan, 'camareros'));
  IF (SELECT count(*) FROM public.camareros WHERE restaurante_id = p_rest AND activo) >= v_max THEN
    RAISE EXCEPTION 'Tu plan % admite % personas en el equipo. Pasa a un plan superior desde Mi plan para añadir más.',
      dk.plan_nombre(v_plan), dk.plan_tope(v_plan, 'camareros') USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION dk.tope_promociones() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_plan text; v_tope int; v_activas int;
BEGIN
  IF NOT NEW.activa THEN RETURN NEW; END IF;
  SELECT plan INTO v_plan FROM public.restaurantes WHERE id = NEW.restaurante_id;
  v_tope := dk.plan_tope(v_plan, 'banners');
  SELECT count(*) INTO v_activas FROM public.promociones
   WHERE restaurante_id = NEW.restaurante_id AND activa AND id <> NEW.id;
  IF v_activas >= v_tope THEN
    RAISE EXCEPTION '%', CASE WHEN v_tope > 1
      THEN format('Puedes tener hasta %s banners activos a la vez. Pausa uno para activar otro.', v_tope)
      ELSE 'Tu plan Carta permite 1 banner activo. Pausa el actual o pasa al plan Local (hasta 3 en carrusel).' END
      USING ERRCODE = 'P0001';
  END IF;
  IF dk.plan_nivel(v_plan) < 2 AND (NEW.dias IS NOT NULL OR NEW.hora_inicio IS NOT NULL OR NEW.hora_fin IS NOT NULL) THEN
    RAISE EXCEPTION 'La programación por días y horas es del plan Local.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dk.banners_vigentes(p_slug text)
RETURNS TABLE(id uuid, titulo text, texto text, imagen_url text, boton_texto text, boton_seccion uuid, boton_destino text, boton_plato uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  WITH ahora AS (SELECT (now() AT TIME ZONE 'Europe/Madrid') t)
  SELECT p.id, p.titulo, p.texto, p.imagen_url, p.boton_texto, p.boton_seccion, p.boton_destino, p.boton_plato
  FROM public.promociones p
  JOIN public.restaurantes r ON r.id = p.restaurante_id, ahora
  WHERE r.slug = lower(p_slug) AND r.activo AND r.estado_acceso IN ('activo', 'gracia')
    AND p.activa
    AND (p.inicio IS NULL OR ahora.t::date >= p.inicio)
    AND (p.fin IS NULL OR ahora.t::date <= p.fin)
    AND (p.dias IS NULL OR extract(isodow FROM ahora.t)::smallint = ANY (p.dias))
    AND (p.hora_inicio IS NULL OR ahora.t::time >= p.hora_inicio)
    AND (p.hora_fin IS NULL OR ahora.t::time <= p.hora_fin)
  ORDER BY p.prioridad DESC, p.creado_en DESC
  LIMIT (SELECT dk.plan_tope(plan, 'banners') FROM public.restaurantes WHERE slug = lower(p_slug));
$$;

-- 6. Reservas y llamada al camarero: en todos los planes (Carta con 10 reservas al mes).
-- La llamada al camarero nunca se corta por tope.
CREATE OR REPLACE FUNCTION dk.crear_reserva(p_slug text, p_nombre text, p_telefono text, p_email text, p_fecha date, p_hora time without time zone, p_personas integer, p_notas text)
RETURNS TABLE(resultado text, reserva_id uuid, restaurante text, email_negocio text, whatsapp text, logo_url text, color_marca text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE r record; v_id uuid; v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
  SELECT x.id, x.nombre, x.whatsapp, x.propietario, x.logo_url, x.color_marca, x.plan INTO r
  FROM public.restaurantes x
  WHERE x.slug = lower(p_slug) AND x.activo AND x.estado_acceso IN ('activo', 'gracia');
  IF r.id IS NULL THEN RETURN QUERY SELECT 'no_disponible', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text; RETURN; END IF;
  IF p_fecha IS NULL OR p_fecha < v_hoy OR p_fecha > v_hoy + 180 THEN
    RETURN QUERY SELECT 'fecha_invalida', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservas
             WHERE restaurante_id = r.id AND telefono = btrim(p_telefono) AND creada_en > now() - interval '2 minutes') THEN
    RETURN QUERY SELECT 'duplicada', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  IF (SELECT count(*) FROM public.reservas WHERE restaurante_id = r.id
        AND creada_en >= date_trunc('month', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid')
     >= dk.plan_tope_max(r.plan, 'reservas_mes') THEN
    RETURN QUERY SELECT 'tope_plan', NULL::uuid, r.nombre, NULL::text, r.whatsapp, NULL::text, NULL::text; RETURN;
  END IF;
  INSERT INTO public.reservas (restaurante_id, nombre, telefono, email, fecha, hora, personas, notas)
  VALUES (r.id, btrim(p_nombre), btrim(p_telefono), nullif(lower(btrim(p_email)), ''), p_fecha, p_hora, p_personas, nullif(btrim(p_notas), ''))
  RETURNING id INTO v_id;
  RETURN QUERY SELECT 'ok', v_id, r.nombre,
    (SELECT u.email::text FROM neon_auth."user" u WHERE u.id = r.propietario), r.whatsapp, r.logo_url, r.color_marca;
EXCEPTION WHEN check_violation THEN
  RETURN QUERY SELECT 'datos_invalidos', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_reservas(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN NULL; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'id', r.id, 'nombre', r.nombre, 'fecha', to_char(r.fecha, 'YYYY-MM-DD'), 'hora', to_char(r.hora, 'HH24:MI'),
             'personas', r.personas, 'notas', r.notas, 'estado', r.estado, 'creada_en', r.creada_en)
           ORDER BY r.fecha, r.hora)
      FROM (SELECT * FROM public.reservas
             WHERE restaurante_id = v_e.restaurante_id AND fecha >= current_date AND estado <> 'cancelada'
             ORDER BY fecha, hora LIMIT 100) r
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION dk.llamar_camarero(p_slug text, p_mesa text, p_motivo text DEFAULT 'camarero'::text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'dk', 'public', 'pg_catalog' AS $$
DECLARE v_rest uuid; v_mesa text := left(btrim(p_mesa), 12);
BEGIN
  IF v_mesa IS NULL OR v_mesa = '' THEN RETURN 'mesa_invalida'; END IF;
  IF p_motivo NOT IN ('camarero', 'cuenta') THEN RETURN 'motivo_invalido'; END IF;
  SELECT id INTO v_rest FROM restaurantes
   WHERE slug = p_slug AND activo AND estado_acceso IN ('activo', 'gracia');
  IF v_rest IS NULL THEN RETURN 'no_disponible'; END IF;
  IF EXISTS (SELECT 1 FROM llamadas_camarero
              WHERE restaurante_id = v_rest AND mesa = v_mesa AND atendida_en IS NULL
                AND creada_en > now() - interval '45 seconds') THEN
    RETURN 'ya_avisado';
  END IF;
  INSERT INTO llamadas_camarero (restaurante_id, mesa, motivo) VALUES (v_rest, v_mesa, p_motivo);
  RETURN 'ok';
END;
$$;

-- 7. Ofertas del panel: Carta → Local por escaneos o al rozar topes; Local → Sala por volumen o topes;
-- TPV y Comandero Pro como extras de Local.
CREATE OR REPLACE FUNCTION dk.ofertas_para_mi()
RETURNS TABLE(oferta text, motivo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE r public.restaurantes%ROWTYPE; v_esc int; v_lleno boolean; cand text[] := '{}'; c text;
BEGIN
  SELECT * INTO r FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF NOT FOUND THEN RETURN; END IF;
  IF r.estado_acceso <> 'activo' THEN RETURN; END IF;
  v_esc := dk.escaneos_sostenidos(r.id);
  SELECT coalesce(bool_or(u.usados >= u.tope), false) INTO v_lleno FROM dk.mi_uso_plan() u WHERE u.que <> 'banners';

  IF r.plan = 'basico' THEN
    IF v_esc >= 150 OR v_lleno THEN cand := cand || 'plan_ampliado'::text; END IF;
  ELSIF r.plan = 'ampliado' THEN
    IF v_esc >= 600 OR v_lleno THEN cand := cand || 'plan_sala'::text; END IF;
    IF v_esc >= 250 THEN
      FOREACH c IN ARRAY ARRAY['comandero_pro', 'conexion_tpv'] LOOP
        IF NOT dk.tiene_servicio(r.id, c) THEN cand := cand || c; END IF;
      END LOOP;
    END IF;
  ELSE
    IF v_esc >= 600 THEN cand := cand || 'nucleo'::text; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.servicios_contratados s WHERE s.restaurante_id = r.id
                 AND s.servicio IN ('setup_esencial','setup_experto') AND s.estado <> 'cancelado')
     AND r.nivel_diseno = 'esencial' THEN
    cand := cand || 'setup_experto'::text;
  END IF;
  IF NOT dk.tiene_servicio(r.id, 'idiomas') THEN cand := cand || 'idiomas'::text; END IF;

  FOREACH c IN ARRAY cand LOOP
    CONTINUE WHEN c NOT IN ('plan_ampliado', 'plan_sala', 'nucleo') AND dk.tiene_servicio(r.id, c);
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.ofertas_eventos e WHERE e.restaurante_id = r.id AND e.oferta = c
                          AND e.tipo = 'cerrada' AND e.ocurrido_en > now() - interval '30 days');
    CONTINUE WHEN (SELECT count(*) FROM public.ofertas_eventos e WHERE e.restaurante_id = r.id AND e.oferta = c AND e.tipo = 'cerrada') >= 3;
    oferta := c;
    motivo := CASE c
      WHEN 'plan_ampliado' THEN CASE WHEN v_lleno THEN 'tope' ELSE 'escaneos' END
      WHEN 'plan_sala' THEN CASE WHEN v_lleno THEN 'tope' ELSE 'volumen' END
      WHEN 'nucleo' THEN 'volumen'
      WHEN 'setup_experto' THEN 'diseno'
      WHEN 'idiomas' THEN 'turismo'
      ELSE 'escaneos' END;
    RETURN NEXT;
    RETURN;
  END LOOP;
END;
$$;

-- 8. Alta, cambios de plan, prueba y regalo
CREATE OR REPLACE FUNCTION dk.aprovisionar_cliente_qr(p_evento_stripe text, p_identidad uuid, p_email citext, p_nombre text, p_plan text, p_restaurante_nombre text, p_slug_base text, p_stripe_customer_id text, p_stripe_subscription_id text)
RETURNS TABLE(restaurante_id uuid, slug text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'dk', 'public', 'pg_catalog' AS $$
DECLARE
  v_restaurante restaurantes;
BEGIN
  IF dk.plan_nivel(p_plan) = 0 THEN
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
  VALUES (p_identidad, dk.slug_disponible(p_slug_base), p_restaurante_nombre, p_plan, p_stripe_customer_id, p_stripe_subscription_id)
  RETURNING * INTO v_restaurante;
  INSERT INTO codigos_qr (codigo, restaurante_id)
  VALUES (left(replace(gen_random_uuid()::text, '-', ''), 12), v_restaurante.id);
  INSERT INTO auditoria (identidad, accion, detalle)
  VALUES (p_identidad, 'aprovisionamiento_stripe',
    jsonb_build_object('evento_stripe', p_evento_stripe, 'restaurante_id', v_restaurante.id, 'plan', p_plan));
  RETURN QUERY SELECT v_restaurante.id, v_restaurante.slug;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_cambiar_plan(p_restaurante uuid, p_plan text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF dk.plan_nivel(p_plan) = 0 THEN
    RAISE EXCEPTION 'plan no permitido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes SET plan = p_plan WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.cambiar_plan', jsonb_build_object('plan', p_plan), p_restaurante);
END;
$$;

-- Subida de plan pagada (webhook). Solo sube, nunca baja; idempotente.
CREATE OR REPLACE FUNCTION dk.aplicar_cambio_plan(p_restaurante uuid, p_plan text, p_membresia text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'dk', 'public', 'pg_catalog' AS $$
DECLARE n int;
BEGIN
  IF dk.plan_nivel(p_plan) < 2 THEN RAISE EXCEPTION 'plan no permitido' USING ERRCODE = '22023'; END IF;
  UPDATE restaurantes
     SET plan = p_plan, whop_membresia_ampliado = p_membresia
   WHERE id = p_restaurante AND dk.plan_nivel(plan) < dk.plan_nivel(p_plan);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 1 THEN
    INSERT INTO auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (NULL, 'plan.subida', jsonb_build_object('plan', p_plan, 'cobro', p_membresia), p_restaurante);
  END IF;
  RETURN n = 1;
END;
$$;
REVOKE ALL ON FUNCTION dk.aplicar_cambio_plan(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.aplicar_cambio_plan(uuid, text, text) TO dk_aprovisionamiento;

CREATE OR REPLACE FUNCTION dk.aplicar_upgrade_ampliado(p_restaurante uuid, p_membresia text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  SELECT dk.aplicar_cambio_plan(p_restaurante, 'ampliado', p_membresia)
$$;

-- «Quedarme con todo» al acabar la prueba: ahora es el plan Sala (todo incluido).
CREATE OR REPLACE FUNCTION dk.prueba_quedarme(p_restaurante uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE x public.restaurantes; v_serv text[] := '{}'; v_mensual int; v_cobro date; v_dias int; v_primer int; v_id uuid;
BEGIN
  SELECT * INTO x FROM public.restaurantes WHERE id = p_restaurante FOR UPDATE;
  IF NOT FOUND OR x.propietario IS DISTINCT FROM dk.identidad_actual() THEN
    RAISE EXCEPTION 'sin permiso' USING ERRCODE = '42501';
  END IF;
  IF x.prueba_hasta IS NULL THEN RAISE EXCEPTION 'no tienes una prueba activa' USING ERRCODE = '22023'; END IF;
  v_mensual := dk.precio_plan('sala');
  v_cobro := dk.fecha_cobro(greatest(current_date + 1, x.prueba_hasta));
  v_dias := v_cobro - current_date;
  v_primer := CASE WHEN x.prueba_hasta >= current_date THEN 0
                   ELSE greatest(100, round(v_mensual * v_dias / 30.0)::int) END;
  UPDATE public.enlaces_pago SET estado = 'anulado'
   WHERE restaurante_id = x.id AND origen = 'prueba' AND estado = 'pendiente';
  INSERT INTO public.enlaces_pago (restaurante_id, creado_por, plan, servicios, primer_cobro_centimos, mensual_centimos, nota, dias_gratis, origen)
  VALUES (x.id, dk.identidad_actual(), 'sala', v_serv, v_primer, v_mensual, 'Quedarme con todo: plan Sala (fin de prueba)', v_dias, 'prueba')
  RETURNING id INTO v_id;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'prueba.quedarme', jsonb_build_object('enlace', v_id, 'mensual', v_mensual, 'primer', v_primer, 'cobro', v_cobro), x.id);
  RETURN jsonb_build_object('enlace', v_id, 'mensual', v_mensual, 'primer', v_primer, 'dias', v_dias, 'cobro', v_cobro, 'servicios', v_serv);
END;
$$;

-- «Darle todo» desde Central = plan Sala (ya incluye plano, app, TPV, comandero e idiomas).
CREATE OR REPLACE FUNCTION dk.admin_regalar_todo(p_restaurante uuid, p_dias int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_dias IS NOT NULL AND (p_dias < 1 OR p_dias > 120) THEN
    RAISE EXCEPTION 'la prueba debe durar entre 1 y 120 días' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes
     SET plan = 'sala', nivel_diseno = 'autor', estado_acceso = 'activo', pago_fallido_desde = NULL,
         prueba_hasta = CASE WHEN p_dias IS NULL THEN NULL ELSE current_date + p_dias END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen)
  VALUES (p_restaurante, 'setup_experto', 'regalo') ON CONFLICT DO NOTHING;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.regalar_todo', jsonb_build_object('dias', p_dias), p_restaurante);
END;
$$;

-- 9. Permisos de lo nuevo
REVOKE ALL ON FUNCTION dk.plan_nivel(text), dk.plan_nombre(text), dk.plan_tope(text, text), dk.plan_tope_max(text, text), dk.mi_uso_plan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.plan_nivel(text), dk.plan_nombre(text), dk.plan_tope(text, text), dk.plan_tope_max(text, text) TO dk_auth, dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.mi_uso_plan() TO dk_auth;

-- 10. Los locales con todo regalado (Pack Sala de regalo) pasan a Sala, que ya lo incluye.
UPDATE public.restaurantes r SET plan = 'sala'
 WHERE r.plan = 'ampliado' AND EXISTS (SELECT 1 FROM public.servicios_contratados s
   WHERE s.restaurante_id = r.id AND s.servicio = 'pack_sala' AND s.origen = 'regalo' AND s.estado <> 'cancelado');

COMMIT;
