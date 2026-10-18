-- 0091 (18/10/2026, karc0): «Notas enviadas» pasa a ser «Comunicación» con un ciclo completo:
-- karc0 escribe → Claude responde con resultado (listo / falta decidir / falta corregir) → karc0 aprueba
-- y pasa a Resuelta; solo karc0 puede reabrirla (Reabierta). Y la Ruta deja de estancarse: cada tarea puede
-- ligarse a un hito (los hitos «tareas» cuentan las ligadas hechas) y a una capacidad de la matriz de
-- productos, que cambia de estado sola al cerrar la tarea. MRR de Fundador a 49 € (decisión del 18/10).
BEGIN;

ALTER TABLE public.tareas_karc0
  ADD COLUMN IF NOT EXISTS com_estado text CHECK (com_estado IS NULL OR com_estado IN ('abierta', 'respondida', 'resuelta', 'reabierta')),
  ADD COLUMN IF NOT EXISTS com_resultado text CHECK (com_resultado IS NULL OR com_resultado IN ('listo', 'falta_decidir', 'falta_corregir')),
  ADD COLUMN IF NOT EXISTS respuesta_en timestamptz,
  ADD COLUMN IF NOT EXISTS resuelta_en timestamptz,
  ADD COLUMN IF NOT EXISTS hito_id uuid REFERENCES public.ruta_hitos (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacidad_id uuid REFERENCES public.ruta_productos (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacidad_estado text CHECK (capacidad_estado IS NULL OR capacidad_estado IN ('auto', 'parcial', 'manual', 'falta'));

-- Lo ya enviado entra en Comunicación: abierta si la tarea sigue viva, resuelta si ya se cerró.
UPDATE public.tareas_karc0
   SET com_estado = CASE WHEN estado = 'hecha' THEN 'resuelta' ELSE 'abierta' END,
       resuelta_en = CASE WHEN estado = 'hecha' THEN coalesce(hecha_en, now()) END
 WHERE nota_enviada_en IS NOT NULL AND com_estado IS NULL;

ALTER TABLE public.ruta_hitos DROP CONSTRAINT IF EXISTS ruta_hitos_metrica_check;
ALTER TABLE public.ruta_hitos ADD CONSTRAINT ruta_hitos_metrica_check CHECK (metrica IS NULL OR metrica IN ('clientes_pago', 'mrr_euros',
  'propuestas_enviadas', 'propuestas_vistas', 'locales_visitados', 'contactos_web', 'leads', 'ventas_proyectos', 'ventas_alto_valor', 'tareas'));

-- La nota nueva abre (o reabre) la comunicación y borra el resultado anterior de Claude.
CREATE OR REPLACE FUNCTION dk.admin_tarea_guardar(p_id uuid, p_estado text, p_nota text, p_modo text DEFAULT 'abierta'::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('pendiente', 'hecha', 'bloqueada') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  IF p_modo NOT IN ('abierta', 'cerrar', 'traspasar', 'estado') THEN RAISE EXCEPTION 'modo no válido' USING ERRCODE = '22023'; END IF;
  IF char_length(coalesce(p_nota, '')) > 3000 THEN RAISE EXCEPTION 'nota demasiado larga' USING ERRCODE = '22023'; END IF;
  UPDATE public.tareas_karc0 t
     SET estado = CASE p_modo WHEN 'cerrar' THEN 'hecha' WHEN 'traspasar' THEN 'pendiente' ELSE p_estado END,
         responsable = CASE WHEN p_modo = 'traspasar' THEN 'claude' ELSE t.responsable END,
         traspasada_en = CASE WHEN p_modo = 'traspasar' THEN now() ELSE t.traspasada_en END,
         nota_karc0 = coalesce(v_nota, t.nota_karc0),
         nota_enviada_en = CASE WHEN v_nota IS NOT NULL AND v_nota IS DISTINCT FROM t.nota_karc0 THEN now() ELSE t.nota_enviada_en END,
         com_estado = CASE WHEN v_nota IS NOT NULL AND v_nota IS DISTINCT FROM t.nota_karc0
                           THEN CASE WHEN t.com_estado IN ('resuelta', 'reabierta') THEN 'reabierta' ELSE 'abierta' END
                           ELSE t.com_estado END,
         com_resultado = CASE WHEN v_nota IS NOT NULL AND v_nota IS DISTINCT FROM t.nota_karc0 THEN NULL ELSE t.com_resultado END,
         resuelta_en = CASE WHEN v_nota IS NOT NULL AND v_nota IS DISTINCT FROM t.nota_karc0 THEN NULL ELSE t.resuelta_en END,
         hecha_en = CASE WHEN (CASE p_modo WHEN 'cerrar' THEN 'hecha' WHEN 'traspasar' THEN 'pendiente' ELSE p_estado END) = 'hecha'
                         THEN coalesce(t.hecha_en, now()) ELSE NULL END,
         cambiado_en = now()
   WHERE t.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'tarea no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

-- karc0 aprueba la respuesta de Claude (resuelta; si era «listo», la tarea se cierra) o reabre la comunicación.
CREATE OR REPLACE FUNCTION dk.admin_comunicacion(p_id uuid, p_accion text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_accion = 'aprobar' THEN
    UPDATE public.tareas_karc0 t
       SET com_estado = 'resuelta', resuelta_en = now(),
           estado = CASE WHEN t.com_resultado = 'listo' THEN 'hecha' ELSE t.estado END,
           hecha_en = CASE WHEN t.com_resultado = 'listo' THEN coalesce(t.hecha_en, now()) ELSE t.hecha_en END,
           cambiado_en = now()
     WHERE t.id = p_id AND t.com_estado = 'respondida';
  ELSIF p_accion = 'reabrir' THEN
    UPDATE public.tareas_karc0 t
       SET com_estado = 'reabierta', resuelta_en = NULL,
           estado = CASE WHEN t.estado = 'hecha' THEN 'pendiente' ELSE t.estado END,
           hecha_en = CASE WHEN t.estado = 'hecha' THEN NULL ELSE t.hecha_en END,
           cambiado_en = now()
     WHERE t.id = p_id AND t.com_estado IN ('respondida', 'resuelta');
  ELSE
    RAISE EXCEPTION 'acción no válida' USING ERRCODE = '22023';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'comunicación no encontrada o en otro estado' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

-- Al cerrar una tarea ligada a una capacidad, la matriz de la Ruta cambia sola.
CREATE OR REPLACE FUNCTION dk.tarea_mueve_capacidad()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NEW.estado = 'hecha' AND OLD.estado IS DISTINCT FROM 'hecha' AND NEW.capacidad_id IS NOT NULL AND NEW.capacidad_estado IS NOT NULL THEN
    UPDATE public.ruta_productos SET estado = NEW.capacidad_estado, cambiado_en = now() WHERE id = NEW.capacidad_id;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS tareas_karc0_capacidad ON public.tareas_karc0;
CREATE TRIGGER tareas_karc0_capacidad AFTER UPDATE OF estado ON public.tareas_karc0
  FOR EACH ROW EXECUTE FUNCTION dk.tarea_mueve_capacidad();

DROP FUNCTION IF EXISTS dk.admin_tareas();
CREATE FUNCTION dk.admin_tareas()
 RETURNS TABLE(id uuid, orden integer, bloque text, titulo text, detalle text, enlace text, para_cuando date, estado text, nota_karc0 text, nota_claude text, cambiado_en timestamptz, leido_claude boolean, responsable text, estimado text, urgencia text, doc_escritorio text, doc_central text, nota_enviada_en timestamptz, traspasada_en timestamptz, hecha_en timestamptz,
               com_estado text, com_resultado text, respuesta_en timestamptz, resuelta_en timestamptz, hito text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT t.id, t.orden, t.bloque, t.titulo, t.detalle, t.enlace, t.para_cuando, t.estado, t.nota_karc0, t.nota_claude, t.cambiado_en,
         coalesce(t.cambiado_en IS NULL OR t.leido_claude_en >= t.cambiado_en, false), t.responsable, t.estimado,
         t.urgencia, t.doc_escritorio, t.doc_central, t.nota_enviada_en, t.traspasada_en, t.hecha_en,
         t.com_estado, t.com_resultado, t.respuesta_en, t.resuelta_en, h.codigo || ' · ' || h.titulo
    FROM public.tareas_karc0 t LEFT JOIN public.ruta_hitos h ON h.id = t.hito_id
   ORDER BY (t.estado = 'hecha'), CASE t.urgencia WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, t.orden, t.creado_en;
END;
$function$;

-- Ruta: hitos «tareas» cuentan sus tareas hechas; cada hito y cada capacidad enseñan sus tareas ligadas.
CREATE OR REPLACE FUNCTION dk.admin_ruta()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE k jsonb;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  k := dk.ruta_kpis();
  RETURN jsonb_build_object(
    'hoy', (now() AT TIME ZONE 'Europe/Madrid')::date,
    'kpis', k,
    'hitos', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', h.id, 'orden', h.orden, 'codigo', h.codigo, 'fase', h.fase, 'titulo', h.titulo, 'detalle', h.detalle,
        'fecha', h.fecha_objetivo, 'meta', h.meta, 'unidad', h.unidad, 'metrica', h.metrica, 'responsable', h.responsable,
        'valor', CASE WHEN h.metrica IS NULL THEN h.valor_manual
                      WHEN h.metrica = 'tareas' THEN (SELECT count(*) FROM public.tareas_karc0 t WHERE t.hito_id = h.id AND t.estado = 'hecha')
                      ELSE coalesce((k ->> h.metrica)::numeric, 0) END,
        'tareas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'estado', t.estado, 'responsable', t.responsable)
                              ORDER BY (t.estado = 'hecha'), t.orden) FROM public.tareas_karc0 t WHERE t.hito_id = h.id), '[]'::jsonb))
        ORDER BY h.fecha_objetivo, h.orden) FROM public.ruta_hitos h), '[]'::jsonb),
    'productos', coalesce((SELECT jsonb_agg((to_jsonb(p) - 'id') || jsonb_build_object(
        'tareas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'estado', t.estado, 'pasa_a', t.capacidad_estado) ORDER BY t.orden)
                              FROM public.tareas_karc0 t WHERE t.capacidad_id = p.id AND t.estado <> 'hecha'), '[]'::jsonb))
        ORDER BY p.orden, p.producto, p.capacidad) FROM public.ruta_productos p), '[]'::jsonb)
  );
END;
$$;

-- MRR: Fundador a 49 €/mes (decisión del 18/10; sustituye 41,40 €).
CREATE OR REPLACE FUNCTION dk.ruta_kpis()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH c AS (
    SELECT r.plan, r.fundador_desde IS NOT NULL AND r.fundador_perdido_en IS NULL AS fundador
      FROM public.restaurantes r
     WHERE r.activo AND NOT coalesce(r.demo_interna, false) AND r.archivado_en IS NULL
       AND r.stripe_subscription_id IS NOT NULL AND r.slug NOT IN ('seven-food-fries')
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

REVOKE ALL ON FUNCTION dk.admin_tarea_guardar(uuid, text, text, text), dk.admin_tareas(), dk.admin_comunicacion(uuid, text), dk.admin_ruta(), dk.ruta_kpis(), dk.tarea_mueve_capacidad() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_tarea_guardar(uuid, text, text, text), dk.admin_tareas(), dk.admin_comunicacion(uuid, text), dk.admin_ruta() TO dk_auth;

COMMIT;
