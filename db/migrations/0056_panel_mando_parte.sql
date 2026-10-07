-- 0056 · Panel de mando en Central + parte diario (punto 8 de las prioridades de karc0, 07/10;
-- ESTADO §6 entrada 81). Decisiones de karc0 (AskUserQuestion): el panel es la portada de Central
-- (Inicio); el parte se genera cada mañana por cron (08:30 Madrid), se guarda aquí y se envía por
-- correo; alertas de pagos, locales atascados, tickets sin respuesta y topes técnicos. Claude Code
-- lee el último parte con un script local cuando karc0 se lo pide (sin IA externa).
-- Solo karc0 (super admin) lo ve: regla de acceso a Central. El socio nunca.

BEGIN;

-- 1. Registro de cobros y avisos de Stripe (hasta hoy las renovaciones no quedaban en la base,
--    así que «pasos a pago» no se podía medir). Lo escribe solo el webhook vía dk.cobro_anotar.
CREATE TABLE IF NOT EXISTS public.eventos_cobro (
  id               bigserial PRIMARY KEY,
  restaurante_id   uuid REFERENCES public.restaurantes(id) ON DELETE SET NULL,
  cliente_stripe   text,
  tipo             text NOT NULL CHECK (tipo IN ('alta', 'renovacion', 'fallido', 'baja', 'reembolso', 'disputa', 'error_webhook')),
  importe_centimos integer NOT NULL DEFAULT 0,
  referencia       text,
  detalle          text CHECK (detalle IS NULL OR char_length(detalle) <= 300),
  creado_en        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS eventos_cobro_ref ON public.eventos_cobro (tipo, referencia) WHERE referencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS eventos_cobro_fecha ON public.eventos_cobro (creado_en DESC);
ALTER TABLE public.eventos_cobro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_cobro FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.eventos_cobro FROM PUBLIC;

CREATE OR REPLACE FUNCTION dk.cobro_anotar(p_cliente text, p_tipo text, p_importe integer, p_referencia text, p_detalle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_id uuid;
BEGIN
  IF p_cliente IS NOT NULL AND p_cliente <> '' THEN
    SELECT id INTO v_id FROM public.restaurantes WHERE stripe_customer_id = p_cliente LIMIT 1;
  END IF;
  INSERT INTO public.eventos_cobro (restaurante_id, cliente_stripe, tipo, importe_centimos, referencia, detalle)
  VALUES (v_id, nullif(p_cliente, ''), p_tipo, coalesce(p_importe, 0), nullif(p_referencia, ''), left(p_detalle, 300))
  ON CONFLICT (tipo, referencia) WHERE referencia IS NOT NULL DO NOTHING;
END;
$$;

-- 2. Partes diarios (uno por día de Madrid; el cron lo rehace si se dispara dos veces)
CREATE TABLE IF NOT EXISTS public.partes_diarios (
  fecha       date PRIMARY KEY,
  datos       jsonb NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now(),
  enviado_en  timestamptz
);
ALTER TABLE public.partes_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partes_diarios FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.partes_diarios FROM PUBLIC;

-- 3. Los datos del panel. Interna: NO se concede a nadie; la llaman admin_mando y parte_generar.
--    Umbrales (decididos por karc0): montaje sin terminar > 48 h, 14 días sin escaneos, ticket
--    abierto > 24 h (urgente > 72 h), prueba que vence en ≤ 3 días, IA > 70 % del tope
--    (urgente > 90 %), Neon > 60 % de 512 MB (plan Free; cambiar al subir de plan, punto 10).
CREATE OR REPLACE FUNCTION dk.mando_datos()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  v_ini timestamptz := (v_hoy::timestamp AT TIME ZONE 'Europe/Madrid');
  v_alertas jsonb := '[]'::jsonb;
  v_ia numeric; v_tope numeric; v_bytes bigint;
  v jsonb;
BEGIN
  -- Pagos: impago en curso (gracia, solo lectura, suspendido sin baja voluntaria)
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'pago', 'gravedad', 'urgente', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', CASE r.estado_acceso WHEN 'gracia' THEN 'Cobro fallido: en periodo de gracia'
                                    WHEN 'solo_lectura' THEN 'Impago: panel en solo lectura'
                                    ELSE 'Suspendido por impago' END
        || coalesce(' desde el ' || to_char(r.pago_fallido_desde AT TIME ZONE 'Europe/Madrid', 'DD/MM'), '')))
    FROM public.restaurantes r
    WHERE r.estado_acceso IN ('gracia', 'solo_lectura', 'suspendido') AND r.baja_desde IS NULL), '[]'::jsonb);

  -- Pagos: prueba que vence en 3 días o menos
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'prueba', 'gravedad', 'aviso', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', 'La prueba vence ' || CASE WHEN r.prueba_hasta = v_hoy THEN 'hoy' ELSE 'el ' || to_char(r.prueba_hasta, 'DD/MM') END))
    FROM public.restaurantes r
    WHERE r.activo AND r.baja_desde IS NULL AND r.prueba_hasta BETWEEN v_hoy AND v_hoy + 3), '[]'::jsonb);

  -- Pagos: reembolsos y disputas de los últimos 7 días
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', e.tipo, 'gravedad', 'urgente', 'restaurante_id', e.restaurante_id, 'nombre', r.nombre,
      'texto', CASE e.tipo WHEN 'disputa' THEN 'Disputa (contracargo) de ' ELSE 'Reembolso de ' END
        || replace(to_char(e.importe_centimos / 100.0, 'FM9999990.00'), '.', ',') || ' € el ' || to_char(e.creado_en AT TIME ZONE 'Europe/Madrid', 'DD/MM')))
    FROM public.eventos_cobro e LEFT JOIN public.restaurantes r ON r.id = e.restaurante_id
    WHERE e.tipo IN ('reembolso', 'disputa') AND e.creado_en > now() - interval '7 days'), '[]'::jsonb);

  -- Locales atascados: montaje guiado sin terminar 48 h después del alta
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'montaje', 'gravedad', 'aviso', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', 'Montaje sin terminar (paso ' || coalesce(r.tutorial_paso, 0) || ') desde hace '
        || floor(extract(epoch FROM now() - r.creado_en) / 86400)::int || ' días'))
    FROM public.restaurantes r
    WHERE r.activo AND r.baja_desde IS NULL AND r.tutorial_completado_en IS NULL
      AND r.creado_en < now() - interval '48 hours'), '[]'::jsonb);

  -- Locales atascados: 14 días sin escaneos (con más de 14 días de vida)
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'dormido', 'gravedad', 'aviso', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', 'Sin escaneos en 14 días'))
    FROM public.restaurantes r
    WHERE r.activo AND r.baja_desde IS NULL AND r.estado_acceso = 'activo'
      AND r.creado_en < now() - interval '14 days'
      AND NOT EXISTS (SELECT 1 FROM public.escaneos s JOIN public.codigos_qr q ON q.codigo = s.codigo
                      WHERE q.restaurante_id = r.id AND s.ocurrido_en > now() - interval '14 days')), '[]'::jsonb);

  -- Tickets abiertos más de 24 h
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'ticket', 'gravedad', CASE WHEN t.creado_en < now() - interval '72 hours' THEN 'urgente' ELSE 'aviso' END,
      'restaurante_id', t.restaurante_id, 'nombre', r.nombre, 'ticket_id', t.id,
      'texto', 'Ticket sin responder (' || coalesce('N' || t.nivel, 'sin nivel') || ') hace '
        || floor(extract(epoch FROM now() - t.creado_en) / 3600)::int || ' h: ' || left(t.asunto, 60)))
    FROM public.tickets_soporte t JOIN public.restaurantes r ON r.id = t.restaurante_id
    WHERE t.estado = 'abierto' AND t.creado_en < now() - interval '24 hours'), '[]'::jsonb);

  -- Topes técnicos: gasto de IA del mes, espacio de Neon y errores del webhook en 24 h
  v_ia := dk.ia_gasto_mes_usd(); v_tope := dk.ia_tope_mensual_usd();
  IF v_tope > 0 AND v_ia / v_tope > 0.7 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object('tipo', 'ia', 'gravedad', CASE WHEN v_ia / v_tope > 0.9 THEN 'urgente' ELSE 'aviso' END,
      'texto', 'IA al ' || round(100 * v_ia / v_tope) || ' % del tope mensual (' || round(v_ia, 2) || ' de ' || v_tope || ' $)'));
  END IF;
  v_bytes := pg_database_size(current_database());
  IF v_bytes > 0.6 * 512 * 1024 * 1024 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object('tipo', 'neon', 'gravedad', CASE WHEN v_bytes > 0.8 * 512 * 1024 * 1024 THEN 'urgente' ELSE 'aviso' END,
      'texto', 'Base de datos al ' || round(100.0 * v_bytes / (512 * 1024 * 1024)) || ' % del plan Free de Neon'));
  END IF;
  v_alertas := v_alertas || coalesce((SELECT jsonb_build_array(jsonb_build_object('tipo', 'webhook', 'gravedad', 'urgente',
      'texto', count(*) || ' error(es) del webhook de Stripe en 24 h; el último: ' || coalesce(max(detalle), '?')))
    FROM public.eventos_cobro WHERE tipo = 'error_webhook' AND creado_en > now() - interval '24 hours' HAVING count(*) > 0), '[]'::jsonb);

  SELECT jsonb_build_object(
    'fecha', v_hoy,
    'generado_en', now(),
    'altas', jsonb_build_object(
      'hoy', count(*) FILTER (WHERE r.creado_en >= v_ini),
      'd7',  count(*) FILTER (WHERE r.creado_en >= v_ini - interval '6 days'),
      'd30', count(*) FILTER (WHERE r.creado_en >= v_ini - interval '29 days')),
    'bajas', jsonb_build_object(
      'hoy', count(*) FILTER (WHERE r.baja_desde = v_hoy),
      'd7',  count(*) FILTER (WHERE r.baja_desde > v_hoy - 7),
      'd30', count(*) FILTER (WHERE r.baja_desde > v_hoy - 30)),
    'activos', count(*) FILTER (WHERE r.activo AND r.estado_acceso = 'activo' AND r.baja_desde IS NULL),
    'en_prueba', count(*) FILTER (WHERE r.activo AND r.baja_desde IS NULL AND r.prueba_hasta >= v_hoy),
    'fundadores', count(*) FILTER (WHERE r.fundador_desde IS NOT NULL AND r.fundador_perdido_en IS NULL),
    'por_plan', (SELECT coalesce(jsonb_object_agg(plan, n), '{}'::jsonb) FROM (
        SELECT plan, count(*) n FROM public.restaurantes WHERE activo AND estado_acceso = 'activo' AND baja_desde IS NULL GROUP BY plan) x),
    'por_socio', (SELECT coalesce(jsonb_object_agg(s.codigo, x.n), '{}'::jsonb) FROM (
        SELECT socio_id, count(*) n FROM public.restaurantes WHERE socio_id IS NOT NULL AND creado_en >= v_ini - interval '29 days' GROUP BY socio_id) x
        JOIN public.socios s ON s.id = x.socio_id),
    -- Paso a pago = PRIMERA renovación cobrada (> 0 €) de un local tras su alta
    'pasos_pago', (SELECT jsonb_build_object(
        'hoy', count(*) FILTER (WHERE primera >= v_ini),
        'd7',  count(*) FILTER (WHERE primera >= v_ini - interval '6 days'),
        'd30', count(*) FILTER (WHERE primera >= v_ini - interval '29 days'))
      FROM (SELECT restaurante_id, min(creado_en) primera FROM public.eventos_cobro
            WHERE tipo = 'renovacion' AND importe_centimos > 0 AND restaurante_id IS NOT NULL GROUP BY restaurante_id) p),
    'cobrado_centimos', (SELECT jsonb_build_object(
        'hoy', coalesce(sum(importe_centimos) FILTER (WHERE creado_en >= v_ini), 0),
        'd30', coalesce(sum(importe_centimos) FILTER (WHERE creado_en >= v_ini - interval '29 days'), 0))
      FROM public.eventos_cobro WHERE tipo IN ('alta', 'renovacion')),
    'fallidos_7d', (SELECT count(*) FROM public.eventos_cobro WHERE tipo = 'fallido' AND creado_en > now() - interval '7 days'),
    'tickets', (SELECT jsonb_build_object(
        'abiertos', count(*) FILTER (WHERE estado = 'abierto'),
        'abiertos_24h', count(*) FILTER (WHERE estado = 'abierto' AND creado_en < now() - interval '24 hours'),
        'n1', count(*) FILTER (WHERE estado = 'abierto' AND (nivel = 1 OR (nivel IS NULL AND origen = 'chat'))),
        'n2', count(*) FILTER (WHERE estado = 'abierto' AND nivel = 2),
        'n3', count(*) FILTER (WHERE estado = 'abierto' AND nivel = 3),
        'sin_nivel', count(*) FILTER (WHERE estado = 'abierto' AND nivel IS NULL AND origen IS DISTINCT FROM 'chat'),
        'hoy', count(*) FILTER (WHERE creado_en >= v_ini),
        'resueltos_n2', count(*) FILTER (WHERE resuelto_en IS NOT NULL AND categoria IS NOT NULL))
      FROM public.tickets_soporte),
    'ia', jsonb_build_object('gasto_usd', round(v_ia, 2), 'tope_usd', v_tope),
    'neon_mb', round(v_bytes / 1048576.0),
    'alertas', v_alertas,
    'urgentes', (SELECT count(*) FROM jsonb_array_elements(v_alertas) a WHERE a ->> 'gravedad' = 'urgente'),
    'necesita_humano', jsonb_array_length(v_alertas))
  INTO v
  FROM public.restaurantes r;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION dk.mando_datos() FROM PUBLIC;

-- 4. Para Central (solo super admin con 2FA)
CREATE OR REPLACE FUNCTION dk.admin_mando()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN dk.mando_datos() || jsonb_build_object('ultimo_parte',
    (SELECT jsonb_build_object('fecha', fecha, 'enviado_en', enviado_en, 'necesita_humano', datos -> 'necesita_humano', 'urgentes', datos -> 'urgentes')
       FROM public.partes_diarios ORDER BY fecha DESC LIMIT 1));
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_partes(p_limite integer)
RETURNS TABLE(fecha date, datos jsonb, enviado_en timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY SELECT p.fecha, p.datos, p.enviado_en FROM public.partes_diarios p
    ORDER BY p.fecha DESC LIMIT least(greatest(coalesce(p_limite, 14), 1), 90);
END;
$$;

-- 5. Para el cron (rol del webhook/aprovisionamiento): genera y guarda; marca el envío
CREATE OR REPLACE FUNCTION dk.parte_generar()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v jsonb := dk.mando_datos();
BEGIN
  INSERT INTO public.partes_diarios (fecha, datos) VALUES ((v ->> 'fecha')::date, v)
  ON CONFLICT (fecha) DO UPDATE SET datos = EXCLUDED.datos, creado_en = now();
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION dk.parte_enviado(p_fecha date)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  UPDATE public.partes_diarios SET enviado_en = now() WHERE fecha = p_fecha;
$$;

REVOKE ALL ON FUNCTION dk.cobro_anotar(text, text, integer, text, text), dk.admin_mando(), dk.admin_partes(integer),
  dk.parte_generar(), dk.parte_enviado(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_mando(), dk.admin_partes(integer) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.cobro_anotar(text, text, integer, text, text), dk.parte_generar(), dk.parte_enviado(date) TO dk_aprovisionamiento;

COMMIT;
