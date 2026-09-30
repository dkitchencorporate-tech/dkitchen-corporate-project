-- 0034 · Prueba «todo incluido» por tiempo y día de cobro común (30/09/2026)
-- · «Darle todo gratis» admite ahora una duración (15/30 días o hasta una fecha).
--   Sin duración se comporta como antes (cortesía indefinida).
-- · Al acabar la prueba sin pagar, la cuenta pasa a solo lectura (cron diario).
-- · Todos los cobros recurrentes se alinean al día 12 (dk.dia_cobro): quien paga
--   durante la prueba no paga nada hasta el primer día 12 posterior al fin de
--   la prueba; quien paga tarde abona hoy la parte proporcional hasta ese día 12.
-- · El precio de «Quedarme con todo» se calcula AQUÍ (catálogo + plan), nunca
--   en el navegador (regla P0001).

ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS prueba_hasta date,
  ADD COLUMN IF NOT EXISTS primer_cobro date;

ALTER TABLE public.enlaces_pago
  ADD COLUMN IF NOT EXISTS dias_gratis int NOT NULL DEFAULT 0 CHECK (dias_gratis BETWEEN 0 AND 62),
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'admin' CHECK (origen IN ('admin', 'prueba'));

-- El primer cobro puede ser 0 € cuando hay días gratis hasta el día de cobro.
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.enlaces_pago'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%primer_cobro_centimos%'
  LOOP
    EXECUTE format('ALTER TABLE public.enlaces_pago DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.enlaces_pago ADD CONSTRAINT enlaces_pago_primer_cobro_check
  CHECK (primer_cobro_centimos BETWEEN 0 AND 1000000 AND (primer_cobro_centimos >= 100 OR dias_gratis > 0));

-- Día del mes en que se cobra a todos los clientes. Un solo sitio para cambiarlo.
CREATE OR REPLACE FUNCTION dk.dia_cobro() RETURNS int
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$ SELECT 12 $$;

-- Primer día de cobro en o después de p_desde.
CREATE OR REPLACE FUNCTION dk.fecha_cobro(p_desde date) RETURNS date
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT CASE WHEN extract(day FROM p_desde) <= dk.dia_cobro()
              THEN date_trunc('month', p_desde)::date + (dk.dia_cobro() - 1)
              ELSE (date_trunc('month', p_desde) + interval '1 month')::date + (dk.dia_cobro() - 1) END
$$;

-- Cuota mensual de cada plan (espejo de src/lib/pricing-config.ts · QR_MENU.planes).
CREATE OR REPLACE FUNCTION dk.precio_plan(p_plan text) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT CASE p_plan WHEN 'ampliado' THEN 2500 WHEN 'basico' THEN 900 ELSE 0 END
$$;

-- «Darle todo gratis» con duración. p_dias NULL = sin fecha de fin (cortesía).
CREATE OR REPLACE FUNCTION dk.admin_regalar_todo(p_restaurante uuid, p_dias int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE s text;
BEGIN
  PERFORM dk.exigir_admin();
  IF p_dias IS NOT NULL AND (p_dias < 1 OR p_dias > 120) THEN
    RAISE EXCEPTION 'la prueba debe durar entre 1 y 120 días' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes
     SET plan = 'ampliado', nivel_diseno = 'autor', estado_acceso = 'activo', pago_fallido_desde = NULL,
         prueba_hasta = CASE WHEN p_dias IS NULL THEN NULL ELSE current_date + p_dias END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  FOREACH s IN ARRAY ARRAY['setup_experto', 'idiomas', 'pack_sala'] LOOP
    INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen)
    VALUES (p_restaurante, s, 'regalo') ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.regalar_todo', jsonb_build_object('dias', p_dias), p_restaurante);
END;
$$;

-- La versión antigua (sin duración) sigue funcionando igual.
CREATE OR REPLACE FUNCTION dk.admin_regalar_todo(p_restaurante uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$ SELECT dk.admin_regalar_todo(p_restaurante, NULL::int) $$;

-- Resumen de cobro: qué tiene, cuánto vale, cuánto paga y desde cuándo.
-- Lo leen Central (admin) y el panel (propietario).
CREATE OR REPLACE FUNCTION dk.resumen_cobro(p_restaurante uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE x public.restaurantes; v_items jsonb; v_valor int; v_paga int; v_prox date;
BEGIN
  SELECT * INTO x FROM public.restaurantes WHERE id = p_restaurante;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT (dk.es_admin() OR x.propietario = dk.identidad_actual()) THEN
    RAISE EXCEPTION 'sin permiso' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('servicio', s.servicio, 'nombre', k.nombre, 'tipo', k.tipo,
                                               'precio', k.precio_centimos, 'origen', s.origen) ORDER BY k.tipo DESC, k.precio_centimos DESC), '[]')
    INTO v_items
    FROM public.servicios_contratados s JOIN public.catalogo_servicios k ON k.servicio = s.servicio
   WHERE s.restaurante_id = x.id AND s.estado <> 'cancelado';
  SELECT dk.precio_plan(x.plan) + coalesce(sum(k.precio_centimos), 0)::int INTO v_valor
    FROM public.servicios_contratados s JOIN public.catalogo_servicios k ON k.servicio = s.servicio
   WHERE s.restaurante_id = x.id AND s.estado <> 'cancelado' AND k.tipo = 'mensual';
  SELECT coalesce(sum(e.mensual_centimos), 0)::int INTO v_paga
    FROM public.enlaces_pago e WHERE e.restaurante_id = x.id AND e.estado = 'pagado';
  IF x.primer_cobro IS NOT NULL THEN
    v_prox := CASE WHEN x.primer_cobro >= current_date THEN x.primer_cobro
                   ELSE x.primer_cobro + 30 * ceil((current_date - x.primer_cobro) / 30.0)::int END;
  END IF;
  RETURN jsonb_build_object(
    'plan', x.plan, 'precio_plan', dk.precio_plan(x.plan), 'items', v_items,
    'valor_mensual', v_valor, 'paga_mensual', v_paga,
    'prueba_hasta', x.prueba_hasta, 'primer_cobro', x.primer_cobro, 'proximo_cobro', v_prox,
    'dia_cobro', dk.dia_cobro(), 'estado_acceso', x.estado_acceso,
    'cobro_si_paga_hoy', dk.fecha_cobro(greatest(current_date, coalesce(x.prueba_hasta, current_date))));
END;
$$;

-- «Quedarme con todo»: el propietario convierte su prueba. Crea el enlace con el
-- precio de catálogo (plan + módulos mensuales). Lo único (Carta de Autor,
-- idiomas) entregado en la prueba se queda como regalo.
CREATE OR REPLACE FUNCTION dk.prueba_quedarme(p_restaurante uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE x public.restaurantes; v_serv text[]; v_mensual int; v_cobro date; v_dias int; v_primer int; v_id uuid;
BEGIN
  SELECT * INTO x FROM public.restaurantes WHERE id = p_restaurante FOR UPDATE;
  IF NOT FOUND OR x.propietario IS DISTINCT FROM dk.identidad_actual() THEN
    RAISE EXCEPTION 'sin permiso' USING ERRCODE = '42501';
  END IF;
  IF x.prueba_hasta IS NULL THEN RAISE EXCEPTION 'no tienes una prueba activa' USING ERRCODE = '22023'; END IF;
  SELECT coalesce(array_agg(s.servicio), '{}') INTO v_serv
    FROM public.servicios_contratados s JOIN public.catalogo_servicios k ON k.servicio = s.servicio
   WHERE s.restaurante_id = x.id AND s.estado <> 'cancelado' AND k.tipo = 'mensual' AND s.origen <> 'pago';
  SELECT dk.precio_plan('ampliado') + coalesce(sum(k.precio_centimos), 0)::int INTO v_mensual
    FROM public.catalogo_servicios k WHERE k.servicio = ANY (v_serv);
  -- Durante la prueba: gratis hasta el primer día de cobro tras el fin. Si ya acabó: proporcional hasta ese día.
  v_cobro := dk.fecha_cobro(greatest(current_date + 1, x.prueba_hasta));
  v_dias := v_cobro - current_date;
  v_primer := CASE WHEN x.prueba_hasta >= current_date THEN 0
                   ELSE greatest(100, round(v_mensual * v_dias / 30.0)::int) END;
  UPDATE public.enlaces_pago SET estado = 'anulado'
   WHERE restaurante_id = x.id AND origen = 'prueba' AND estado = 'pendiente';
  INSERT INTO public.enlaces_pago (restaurante_id, creado_por, plan, servicios, primer_cobro_centimos, mensual_centimos, nota, dias_gratis, origen)
  VALUES (x.id, dk.identidad_actual(), 'ampliado', v_serv, v_primer, v_mensual, 'Quedarme con todo (fin de prueba)', v_dias, 'prueba')
  RETURNING id INTO v_id;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'prueba.quedarme', jsonb_build_object('enlace', v_id, 'mensual', v_mensual, 'primer', v_primer, 'cobro', v_cobro), x.id);
  RETURN jsonb_build_object('enlace', v_id, 'mensual', v_mensual, 'primer', v_primer, 'dias', v_dias, 'cobro', v_cobro, 'servicios', v_serv);
END;
$$;

CREATE OR REPLACE FUNCTION dk.prueba_enlace_url(p_enlace uuid, p_url text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  IF p_url !~ '^https://' THEN RAISE EXCEPTION 'url no válida' USING ERRCODE = '22023'; END IF;
  UPDATE public.enlaces_pago e SET url = p_url
   WHERE e.id = p_enlace AND e.origen = 'prueba' AND e.estado = 'pendiente'
     AND e.restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual());
  IF NOT FOUND THEN RAISE EXCEPTION 'enlace no encontrado' USING ERRCODE = 'P0002'; END IF;
END;
$$;

-- Al pagar un enlace: además de lo de 0030, cierra la prueba y fija el primer cobro.
CREATE OR REPLACE FUNCTION dk.aplicar_enlace_pago(p_enlace uuid, p_referencia text, p_miembro text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE e public.enlaces_pago; s text;
BEGIN
  SELECT * INTO e FROM public.enlaces_pago WHERE id = p_enlace FOR UPDATE;
  IF NOT FOUND THEN RETURN 'desconocido'; END IF;
  IF e.estado = 'pagado' THEN
    -- Si el alta llegó como activación de membresía sin miembro, el primer cobro real lo enlaza.
    IF e.mensual_centimos > 0 AND p_miembro IS NOT NULL THEN
      UPDATE public.restaurantes SET stripe_customer_id = coalesce(stripe_customer_id, p_miembro) WHERE id = e.restaurante_id;
    END IF;
    RETURN 'renovacion';
  END IF;
  IF e.estado = 'anulado' THEN RETURN 'anulado'; END IF;
  UPDATE public.enlaces_pago SET estado = 'pagado', pagado_en = now(), referencia_pago = p_referencia WHERE id = e.id;
  UPDATE public.restaurantes
     SET plan = coalesce(e.plan, plan), estado_acceso = 'activo', pago_fallido_desde = NULL,
         prueba_hasta = CASE WHEN e.plan IS NOT NULL THEN NULL ELSE prueba_hasta END,
         primer_cobro = CASE WHEN e.mensual_centimos > 0 THEN current_date + e.dias_gratis ELSE primer_cobro END,
         -- el cobro recurrente queda ligado a este miembro de Whop (gracia/impago)
         stripe_customer_id = CASE WHEN e.mensual_centimos > 0 AND p_miembro IS NOT NULL THEN p_miembro ELSE stripe_customer_id END
   WHERE id = e.restaurante_id;
  FOREACH s IN ARRAY e.servicios LOOP
    -- si ya lo tenía en demo o regalo, pasa a ser de pago
    UPDATE public.servicios_contratados SET origen = 'pago', precio_centimos = coalesce(dk.precio_servicio(s), 0), referencia_pago = p_referencia || ':' || s
     WHERE restaurante_id = e.restaurante_id AND servicio = s AND estado <> 'cancelado';
    IF NOT FOUND THEN
      INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen, precio_centimos, referencia_pago)
      VALUES (e.restaurante_id, s, 'pago', coalesce(dk.precio_servicio(s), 0), p_referencia || ':' || s);
    END IF;
    IF s = 'pack_sala' THEN
      UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
       WHERE restaurante_id = e.restaurante_id AND servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv') AND estado <> 'cancelado';
    END IF;
  END LOOP;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (NULL, 'pago.enlace_admin', jsonb_build_object('enlace', e.id, 'primer', e.primer_cobro_centimos, 'mensual', e.mensual_centimos, 'dias_gratis', e.dias_gratis), e.restaurante_id);
  RETURN 'ok';
END;
$$;

-- Cron diario: prueba vencida sin pagar → solo lectura (la carta pública sigue visible).
CREATE OR REPLACE FUNCTION dk.avanzar_pruebas()
RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
  WITH vencidas AS (
    UPDATE public.restaurantes SET estado_acceso = 'solo_lectura'
     WHERE prueba_hasta IS NOT NULL AND prueba_hasta < current_date
       AND estado_acceso = 'activo' AND pago_fallido_desde IS NULL
    RETURNING id
  ), registro AS (
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    SELECT NULL, 'prueba.vencida', '{}'::jsonb, id FROM vencidas
  )
  SELECT count(*)::int FROM vencidas;
$$;

-- Pruebas que terminan pronto (avisos por correo del cron: 3 días y 1 día antes).
CREATE OR REPLACE FUNCTION dk.pruebas_por_avisar()
RETURNS TABLE (restaurante_id uuid, nombre text, email text, contacto text, prueba_hasta date, dias int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
  SELECT r.id, r.nombre, u.email, u.name, r.prueba_hasta, (r.prueba_hasta - current_date)::int
    FROM public.restaurantes r JOIN neon_auth."user" u ON u.id = r.propietario
   WHERE r.prueba_hasta - current_date IN (3, 1) AND r.estado_acceso = 'activo';
$$;

REVOKE ALL ON FUNCTION dk.admin_regalar_todo(uuid, int), dk.resumen_cobro(uuid), dk.prueba_quedarme(uuid),
  dk.prueba_enlace_url(uuid, text), dk.avanzar_pruebas(), dk.pruebas_por_avisar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_regalar_todo(uuid, int), dk.resumen_cobro(uuid), dk.prueba_quedarme(uuid),
  dk.prueba_enlace_url(uuid, text) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.avanzar_pruebas(), dk.pruebas_por_avisar() TO dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.dia_cobro(), dk.fecha_cobro(date), dk.precio_plan(text) TO dk_auth, dk_aprovisionamiento;
