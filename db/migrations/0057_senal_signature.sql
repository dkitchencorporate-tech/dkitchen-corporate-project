-- 0057 · Punto 9a: señal de Signature en el panel (decisión de karc0, 07/10; ESTADO §6 entrada 83).
-- Un local QR o Fundador con tracción (≥600 escaneos, ≥40 reservas o ≥300 llamadas al camarero en 30 días)
-- ve en su Inicio una tarjeta con SU dato y «Quiero una llamada» → lead en Central (Oportunidades) y alerta
-- en el panel de mando y el parte. Si la descarta, vuelve a los 30 días; tras pedir llamada, no sale en 90.
-- Sustituye a la oferta 'nucleo' de dk.ofertas_para_mi (solo Sala con 600 escaneos sostenidos).

BEGIN;

CREATE TABLE IF NOT EXISTS public.leads_signature (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  datos          jsonb NOT NULL,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  atendido_en    timestamptz,
  nota           text CHECK (nota IS NULL OR char_length(nota) <= 500)
);
CREATE UNIQUE INDEX IF NOT EXISTS leads_signature_abierto ON public.leads_signature (restaurante_id) WHERE atendido_en IS NULL;
ALTER TABLE public.leads_signature ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_signature FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.leads_signature FROM PUBLIC;

-- Tracción de un local en los últimos 30 días (interna)
CREATE OR REPLACE FUNCTION dk.traccion_30d(p_restaurante uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  SELECT jsonb_build_object(
    'escaneos', (SELECT count(*) FROM public.escaneos s JOIN public.codigos_qr q ON q.codigo = s.codigo
                 WHERE q.restaurante_id = p_restaurante AND s.ocurrido_en > now() - interval '30 days'),
    'reservas', (SELECT count(*) FROM public.reservas WHERE restaurante_id = p_restaurante
                 AND creada_en > now() - interval '30 days' AND estado <> 'cancelada'),
    'llamadas', (SELECT count(*) FROM public.llamadas_camarero WHERE restaurante_id = p_restaurante
                 AND creada_en > now() - interval '30 days'));
$$;
REVOKE ALL ON FUNCTION dk.traccion_30d(uuid) FROM PUBLIC;

-- Para el panel del DUEÑO (el socio en puesta a punto no es propietario: nunca la ve)
CREATE OR REPLACE FUNCTION dk.senal_signature()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE r public.restaurantes%ROWTYPE; t jsonb; v_motivo text; v_pedida timestamptz;
BEGIN
  SELECT * INTO r FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF NOT FOUND OR r.estado_acceso <> 'activo' OR NOT r.activo THEN RETURN jsonb_build_object('mostrar', false); END IF;
  t := dk.traccion_30d(r.id);
  v_motivo := CASE WHEN (t ->> 'escaneos')::int >= 600 THEN 'escaneos'
                   WHEN (t ->> 'reservas')::int >= 40 THEN 'reservas'
                   WHEN (t ->> 'llamadas')::int >= 300 THEN 'llamadas' END;
  SELECT max(creado_en) INTO v_pedida FROM public.leads_signature WHERE restaurante_id = r.id;
  RETURN t || jsonb_build_object('motivo', v_motivo, 'pedida_en', v_pedida, 'mostrar',
    v_motivo IS NOT NULL
    AND (v_pedida IS NULL OR v_pedida < now() - interval '90 days')
    AND NOT EXISTS (SELECT 1 FROM public.ofertas_eventos e WHERE e.restaurante_id = r.id AND e.oferta = 'signature'
                    AND e.tipo = 'cerrada' AND e.ocurrido_en > now() - interval '30 days'));
END;
$$;

CREATE OR REPLACE FUNCTION dk.signature_pedir_llamada()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE r public.restaurantes%ROWTYPE; t jsonb;
BEGIN
  SELECT * INTO r FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF NOT FOUND THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  t := dk.traccion_30d(r.id) || jsonb_build_object('plan', r.plan, 'fundador', r.fundador_desde IS NOT NULL);
  INSERT INTO public.leads_signature (restaurante_id, datos) VALUES (r.id, t)
  ON CONFLICT (restaurante_id) WHERE atendido_en IS NULL DO NOTHING;
  INSERT INTO public.ofertas_eventos (restaurante_id, oferta, tipo) VALUES (r.id, 'signature', 'aceptada');
  RETURN t || jsonb_build_object('nombre', r.nombre, 'slug', r.slug, 'id', r.id);
END;
$$;

-- Central (solo super admin): Oportunidades
CREATE OR REPLACE FUNCTION dk.admin_leads_signature()
RETURNS TABLE(id uuid, restaurante_id uuid, nombre text, slug text, plan text, datos jsonb, creado_en timestamptz, atendido_en timestamptz, nota text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY SELECT l.id, l.restaurante_id, r.nombre, r.slug, r.plan, l.datos, l.creado_en, l.atendido_en, l.nota
    FROM public.leads_signature l JOIN public.restaurantes r ON r.id = l.restaurante_id
    WHERE l.atendido_en IS NULL OR l.atendido_en > now() - interval '60 days'
    ORDER BY l.atendido_en IS NULL DESC, l.creado_en DESC;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_lead_signature_atender(p_lead uuid, p_nota text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_rest uuid;
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.leads_signature SET atendido_en = now(), nota = left(nullif(trim(p_nota), ''), 500)
   WHERE id = p_lead AND atendido_en IS NULL RETURNING restaurante_id INTO v_rest;
  IF v_rest IS NOT NULL THEN
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (dk.identidad_actual(), 'admin.lead_signature', jsonb_build_object('lead', p_lead, 'nota', p_nota), v_rest);
  END IF;
END;
$$;

-- Ofertas: se quita 'nucleo' (ahora es la tarjeta de Signature)
CREATE OR REPLACE FUNCTION dk.ofertas_para_mi()
 RETURNS TABLE(oferta text, motivo text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
$function$;

-- Panel de mando: + alerta de Oportunidades
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

  -- Oportunidades (0057): locales que piden una llamada para Signature desde su panel
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'signature', 'gravedad', CASE WHEN l.creado_en < now() - interval '48 hours' THEN 'urgente' ELSE 'aviso' END,
      'restaurante_id', l.restaurante_id, 'nombre', r.nombre,
      'texto', 'Pide una llamada para Signature (' || coalesce(l.datos ->> 'escaneos', '0') || ' escaneos, '
        || coalesce(l.datos ->> 'reservas', '0') || ' reservas y ' || coalesce(l.datos ->> 'llamadas', '0') || ' llamadas en 30 días)'))
    FROM public.leads_signature l JOIN public.restaurantes r ON r.id = l.restaurante_id
    WHERE l.atendido_en IS NULL), '[]'::jsonb);

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

REVOKE ALL ON FUNCTION dk.senal_signature(), dk.signature_pedir_llamada(), dk.admin_leads_signature(), dk.admin_lead_signature_atender(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.senal_signature(), dk.signature_pedir_llamada(), dk.admin_leads_signature(), dk.admin_lead_signature_atender(uuid, text) TO dk_auth;

COMMIT;
