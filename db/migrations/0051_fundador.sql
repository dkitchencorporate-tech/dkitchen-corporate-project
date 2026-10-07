-- 0051 · Fundador (decisiones de karc0, 07/10; ESTADO §0 punto 4 y §6 entrada 72).
-- 40 % sobre el plan Sala (69 € → 41,40 €/mes), cobrado por trimestre: 124,20 € + IVA.
-- Plazas: 100. Plazo: 90 días desde que karc0 pulsa «Abrir Fundador» en Central. Cierra con lo
-- primero que ocurra. Una plaza se ocupa con el primer pago y una baja NO la libera.
-- Vitalicio: el precio se mantiene mientras la suscripción siga activa, sin impagos y en Sala;
-- se pierde con la baja o al bajar de Sala (fundador_perdido_en) y no es transferible.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fundador_programa (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  abierto_en timestamptz,
  plazas int NOT NULL DEFAULT 100 CHECK (plazas BETWEEN 1 AND 1000),
  dias int NOT NULL DEFAULT 90 CHECK (dias BETWEEN 1 AND 365)
);
INSERT INTO public.fundador_programa (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.fundador_programa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundador_programa FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.fundador_programa FROM PUBLIC, dk_anon, dk_auth, dk_app;

ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS fundador_desde timestamptz;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS fundador_perdido_en timestamptz;

-- Estado público del programa (web, landing y checkout). Sin datos de clientes.
CREATE OR REPLACE FUNCTION dk.fundador_estado()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  WITH p AS (SELECT * FROM public.fundador_programa WHERE id = 1),
       o AS (SELECT count(*)::int n FROM public.restaurantes WHERE fundador_desde IS NOT NULL)
  SELECT jsonb_build_object(
    'abierto', p.abierto_en IS NOT NULL AND now() < p.abierto_en + make_interval(days => p.dias) AND o.n < p.plazas,
    'abierto_en', p.abierto_en,
    'cierra_en', p.abierto_en + make_interval(days => p.dias),
    'plazas', p.plazas,
    'ocupadas', least(o.n, p.plazas),
    'quedan', greatest(p.plazas - o.n, 0),
    'motivo', CASE WHEN p.abierto_en IS NULL THEN 'sin_abrir'
                   WHEN o.n >= p.plazas THEN 'plazas'
                   WHEN now() >= p.abierto_en + make_interval(days => p.dias) THEN 'plazo'
                   ELSE NULL END)
  FROM p, o
$$;

-- Central: abrir el programa (una sola vez; la fecha no se puede mover desde la web).
CREATE OR REPLACE FUNCTION dk.admin_fundador_abrir()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.fundador_programa SET abierto_en = now() WHERE id = 1 AND abierto_en IS NULL;
  IF FOUND THEN
    INSERT INTO public.auditoria (identidad, accion, detalle)
    VALUES (dk.identidad_actual(), 'admin.fundador_abrir', dk.fundador_estado());
  END IF;
  RETURN dk.fundador_estado();
END;
$$;

-- Central: listado de fundadores.
CREATE OR REPLACE FUNCTION dk.admin_fundadores()
RETURNS TABLE (id uuid, nombre text, slug text, plan text, estado_acceso text, activo boolean, fundador_desde timestamptz, fundador_perdido_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
  SELECT r.id, r.nombre, r.slug, r.plan, r.estado_acceso, r.activo, r.fundador_desde, r.fundador_perdido_en
    FROM public.restaurantes r WHERE r.fundador_desde IS NOT NULL ORDER BY r.fundador_desde;
END;
$$;

-- Webhook: el primer pago de Fundador ocupa la plaza. Idempotente. Si el programa se cerró
-- entre el checkout y el pago, se respeta igual (ya ha pagado) y se avisa (devuelve false).
CREATE OR REPLACE FUNCTION dk.fundador_marcar(p_cliente_stripe text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_id uuid; v_dentro boolean;
BEGIN
  PERFORM 1 FROM public.fundador_programa WHERE id = 1 FOR UPDATE;
  v_dentro := (dk.fundador_estado() ->> 'abierto')::boolean;
  SELECT id INTO v_id FROM public.restaurantes WHERE stripe_customer_id = p_cliente_stripe LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.restaurantes SET fundador_desde = now(), plan = 'sala'
   WHERE id = v_id AND fundador_desde IS NULL;
  IF FOUND THEN
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (NULL, 'fundador.plaza', jsonb_build_object('dentro_de_plazo', v_dentro), v_id);
  END IF;
  RETURN v_dentro;
END;
$$;

-- Bajar de Sala hace perder el precio Fundador (la plaza sigue contada).
CREATE OR REPLACE FUNCTION dk.fundador_vigilar_plan() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  IF OLD.fundador_desde IS NOT NULL AND OLD.fundador_perdido_en IS NULL AND NEW.plan <> 'sala' THEN
    NEW.fundador_perdido_en := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION dk.fundador_vigilar_plan() FROM PUBLIC;
DROP TRIGGER IF EXISTS fundador_vigilar_plan ON public.restaurantes;
CREATE TRIGGER fundador_vigilar_plan BEFORE UPDATE OF plan ON public.restaurantes
  FOR EACH ROW EXECUTE FUNCTION dk.fundador_vigilar_plan();

-- Resumen de cobro del panel: precio Fundador si está vigente y sin sumar dos veces lo que ya incluye el plan (0050).
CREATE OR REPLACE FUNCTION dk.resumen_cobro(p_restaurante uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $
DECLARE x public.restaurantes; v_items jsonb; v_valor int; v_paga int; v_prox date; v_precio int; v_nivel int;
BEGIN
  SELECT * INTO x FROM public.restaurantes WHERE id = p_restaurante;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT (dk.es_admin() OR x.propietario = dk.identidad_actual()) THEN
    RAISE EXCEPTION 'sin permiso' USING ERRCODE = '42501';
  END IF;
  v_nivel := dk.plan_nivel(x.plan);
  v_precio := CASE WHEN x.fundador_desde IS NOT NULL AND x.fundador_perdido_en IS NULL AND x.plan = 'sala'
                   THEN round(dk.precio_plan('sala') * 0.6)::int ELSE dk.precio_plan(x.plan) END;
  SELECT coalesce(jsonb_agg(jsonb_build_object('servicio', s.servicio, 'nombre', k.nombre, 'tipo', k.tipo,
                                               'precio', k.precio_centimos, 'origen', s.origen) ORDER BY k.tipo DESC, k.precio_centimos DESC), '[]')
    INTO v_items
    FROM public.servicios_contratados s JOIN public.catalogo_servicios k ON k.servicio = s.servicio
   WHERE s.restaurante_id = x.id AND s.estado <> 'cancelado'
     AND NOT (v_nivel >= 2 AND s.servicio IN ('plano_mesas', 'app_sala', 'pack_sala'))
     AND NOT (v_nivel >= 3 AND s.servicio IN ('conexion_tpv', 'comandero_pro', 'idiomas'));
  SELECT v_precio + coalesce(sum(k.precio_centimos), 0)::int INTO v_valor
    FROM public.servicios_contratados s JOIN public.catalogo_servicios k ON k.servicio = s.servicio
   WHERE s.restaurante_id = x.id AND s.estado <> 'cancelado' AND k.tipo = 'mensual'
     AND NOT (v_nivel >= 2 AND s.servicio IN ('plano_mesas', 'app_sala', 'pack_sala'))
     AND NOT (v_nivel >= 3 AND s.servicio IN ('conexion_tpv', 'comandero_pro'));
  SELECT coalesce(sum(e.mensual_centimos), 0)::int INTO v_paga
    FROM public.enlaces_pago e WHERE e.restaurante_id = x.id AND e.estado = 'pagado';
  IF x.primer_cobro IS NOT NULL THEN
    v_prox := CASE WHEN x.primer_cobro >= current_date THEN x.primer_cobro
                   ELSE x.primer_cobro + 30 * ceil((current_date - x.primer_cobro) / 30.0)::int END;
  END IF;
  RETURN jsonb_build_object(
    'plan', x.plan, 'precio_plan', v_precio, 'fundador', x.fundador_desde IS NOT NULL AND x.fundador_perdido_en IS NULL,
    'items', v_items, 'valor_mensual', v_valor, 'paga_mensual', v_paga,
    'prueba_hasta', x.prueba_hasta, 'primer_cobro', x.primer_cobro, 'proximo_cobro', v_prox,
    'dia_cobro', dk.dia_cobro(), 'estado_acceso', x.estado_acceso,
    'cobro_si_paga_hoy', dk.fecha_cobro(greatest(current_date, coalesce(x.prueba_hasta, current_date))));
END;
$;

REVOKE ALL ON FUNCTION dk.fundador_estado(), dk.admin_fundador_abrir(), dk.admin_fundadores(), dk.fundador_marcar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.fundador_estado() TO dk_anon, dk_auth, dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.admin_fundador_abrir(), dk.admin_fundadores() TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.fundador_marcar(text) TO dk_aprovisionamiento;

COMMIT;
