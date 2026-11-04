-- 0118 · Corrección de KPIs de ruta (clientes reales con suscripción Stripe sub_...)
-- y función de acciones en lote / unitarias para Central y Prospección (dk.admin_lote_accion).

BEGIN;

-- 1. CORRECCIÓN KPI RUTA: solo suscripciones reales (sub_...) y excluir cuentas PRUEBA
CREATE OR REPLACE FUNCTION dk.ruta_kpis()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH c AS (
    SELECT r.plan, r.fundador_desde IS NOT NULL AND r.fundador_perdido_en IS NULL AS fundador
      FROM public.restaurantes r
     WHERE r.activo AND NOT coalesce(r.demo_interna, false) AND r.archivado_en IS NULL
       AND r.stripe_subscription_id IS NOT NULL AND r.slug NOT IN ('seven-food-fries')
       AND r.stripe_subscription_id LIKE 'sub\_%'
       AND r.nombre !~* '^PRUEBA\s*·'
  ), contactados AS (
    SELECT DISTINCT e.prospecto_id FROM public.prospecto_eventos e WHERE e.tipo IN ('whatsapp', 'dm', 'correo', 'llamada', 'visita')
  )
  SELECT jsonb_build_object(
    'clientes_pago', (SELECT count(*) FROM c),
    'mrr_euros', (SELECT coalesce(sum(CASE WHEN fundador THEN 49 ELSE dk.precio_plan(plan) / 100.0 END), 0) FROM c),
    'propuestas_enviadas', (SELECT count(*) FROM contactados),
    'propuestas_vistas', (SELECT count(*) FROM public.prospectos p WHERE coalesce(p.propuesta_vistas, 0) > 0),
    'locales_visitados', (SELECT count(DISTINCT e.prospecto_id) FROM public.prospecto_eventos e WHERE e.tipo = 'visita'),
    'contactos_web', (SELECT count(*) FROM public.contactos_web w WHERE w.creado_en >= '2026-10-17'),
    'leads', (SELECT count(*) FROM public.prospectos p WHERE p.fuente = 'script'),
    'ventas_proyectos', (SELECT count(*) FROM public.proyectos pr WHERE pr.referencia_pago IS NOT NULL OR pr.stripe_factura IS NOT NULL),
    'ventas_alto_valor', (SELECT count(*) FROM public.proyectos pr WHERE (pr.referencia_pago IS NOT NULL OR pr.stripe_factura IS NOT NULL) AND coalesce(pr.importe_centimos, 0) >= 100000),
    'prospectos', (SELECT count(*) FROM public.prospectos),
    'fundadores', (SELECT count(*) FROM c WHERE fundador)
  );
$$;

-- 2. ACCIONES EN LOTE PARA CENTRAL (restaurantes) Y PROSPECCIÓN (prospectos)
CREATE OR REPLACE FUNCTION dk.admin_lote_accion(
  p_tabla text,
  p_ids uuid[],
  p_accion text,
  p_valor text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
DECLARE
  v_afectados integer := 0;
BEGIN
  PERFORM dk.exigir_direccion();

  IF p_ids IS NULL OR array_length(p_ids, 1) = 0 THEN
    RETURN 0;
  END IF;

  IF p_tabla = 'restaurantes' THEN
    CASE p_accion
      WHEN 'mover_estado' THEN
        IF p_valor = 'demo' THEN
          UPDATE public.restaurantes
             SET demo_interna = true
           WHERE id = ANY(p_ids);
        ELSIF p_valor = 'real' THEN
          UPDATE public.restaurantes
             SET demo_interna = false
           WHERE id = ANY(p_ids);
        ELSIF p_valor = 'activo' THEN
          UPDATE public.restaurantes
             SET activo = true,
                 estado_acceso = 'activo',
                 baja_programada_en = NULL,
                 archivado_en = NULL
           WHERE id = ANY(p_ids);
        ELSIF p_valor = 'prueba' THEN
          UPDATE public.restaurantes
             SET prueba_hasta = CURRENT_DATE + interval '14 days',
                 estado_acceso = 'activo',
                 archivado_en = NULL
           WHERE id = ANY(p_ids);
        ELSIF p_valor = 'riesgo' THEN
          UPDATE public.restaurantes
             SET estado_acceso = 'solo_lectura'
           WHERE id = ANY(p_ids);
        ELSIF p_valor IN ('baja', 'suspendido') THEN
          UPDATE public.restaurantes
             SET activo = false,
                 estado_acceso = 'suspendido',
                 baja_desde = CURRENT_DATE
           WHERE id = ANY(p_ids);
        ELSE
          RAISE EXCEPTION 'valor desconocido para mover_estado: %', p_valor;
        END IF;
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      WHEN 'archivar' THEN
        UPDATE public.restaurantes
           SET archivado_en = clock_timestamp()
         WHERE id = ANY(p_ids);
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      WHEN 'desarchivar' THEN
        UPDATE public.restaurantes
           SET archivado_en = NULL
         WHERE id = ANY(p_ids);
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      WHEN 'reasignar' THEN
        UPDATE public.restaurantes
           SET comercial_id = p_valor::uuid
         WHERE id = ANY(p_ids);
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      WHEN 'borrar' THEN
        -- Blindaje: NUNCA borrar clientes reales con suscripción Stripe activa
        DELETE FROM public.restaurantes
         WHERE id = ANY(p_ids)
           AND (coalesce(demo_interna, false) = true
                OR nombre ~* '^PRUEBA\s*·'
                OR slug LIKE 'prueba-%'
                OR archivado_en IS NOT NULL)
           AND coalesce(stripe_subscription_id, '') NOT LIKE 'sub\_%';
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      ELSE
        RAISE EXCEPTION 'accion no permitida para restaurantes: %', p_accion;
    END CASE;

  ELSIF p_tabla = 'prospectos' THEN
    CASE p_accion
      WHEN 'mover_estado' THEN
        IF p_valor NOT IN ('por_revisar', 'por_visitar', 'muestra', 'visitado', 'demo', 'interesado', 'cliente', 'descartado') THEN
          RAISE EXCEPTION 'estado no valido para prospectos: %', p_valor;
        END IF;
        UPDATE public.prospectos
           SET estado = p_valor,
               actualizado_en = clock_timestamp()
         WHERE id = ANY(p_ids);
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      WHEN 'archivar' THEN
        UPDATE public.prospectos
           SET estado = 'descartado',
               motivo_descarte = coalesce(p_valor, 'archivado_lote'),
               actualizado_en = clock_timestamp()
         WHERE id = ANY(p_ids);
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      WHEN 'desarchivar' THEN
        UPDATE public.prospectos
           SET estado = 'por_revisar',
               motivo_descarte = NULL,
               actualizado_en = clock_timestamp()
         WHERE id = ANY(p_ids);
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      WHEN 'reasignar' THEN
        UPDATE public.prospectos
           SET comercial_id = p_valor::uuid,
               actualizado_en = clock_timestamp()
         WHERE id = ANY(p_ids);
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      WHEN 'borrar' THEN
        DELETE FROM public.prospectos
         WHERE id = ANY(p_ids);
        GET DIAGNOSTICS v_afectados = ROW_COUNT;

      ELSE
        RAISE EXCEPTION 'accion no permitida para prospectos: %', p_accion;
    END CASE;

  ELSE
    RAISE EXCEPTION 'tabla no permitida: %', p_tabla;
  END IF;

  RETURN v_afectados;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_lote_accion(text, uuid[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_lote_accion(text, uuid[], text, text) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0118_ruta_y_lotes.sql') ON CONFLICT DO NOTHING;

COMMIT;
