-- 0095 (18/10/2026, karc0): «si están en curso, quien debe implementarlo eres tú: un botón de implementar ya».
-- «▶ Implementar ya» en una tarea de Claude (o en la revisión ligada): la pone en Hoy como urgente y la primera
-- del arranque de Claude, en el orden en que karc0 la pidió (implementar_ya_en).
BEGIN;

ALTER TABLE public.tareas_karc0 ADD COLUMN IF NOT EXISTS implementar_ya_en timestamptz;

CREATE OR REPLACE FUNCTION dk.admin_implementar_ya(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.tareas_karc0
     SET implementar_ya_en = coalesce(implementar_ya_en, now()), urgencia = 'urgente',
         para_cuando = LEAST(coalesce(para_cuando, (now() AT TIME ZONE 'Europe/Madrid')::date), (now() AT TIME ZONE 'Europe/Madrid')::date),
         cambiado_en = now()
   WHERE id = p_id AND estado <> 'hecha';
  IF NOT FOUND THEN RAISE EXCEPTION 'tarea no encontrada o ya hecha' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

DROP FUNCTION IF EXISTS dk.admin_tareas();
CREATE FUNCTION dk.admin_tareas()
 RETURNS TABLE(id uuid, orden integer, bloque text, titulo text, detalle text, enlace text, para_cuando date, estado text, nota_karc0 text, nota_claude text, cambiado_en timestamptz, leido_claude boolean, responsable text, estimado text, urgencia text, doc_escritorio text, doc_central text, nota_enviada_en timestamptz, traspasada_en timestamptz, hecha_en timestamptz,
               com_estado text, com_resultado text, respuesta_en timestamptz, resuelta_en timestamptz, hito text, creado_en timestamptz, implementar_ya_en timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT t.id, t.orden, t.bloque, t.titulo, t.detalle, t.enlace, t.para_cuando, t.estado, t.nota_karc0, t.nota_claude, t.cambiado_en,
         coalesce(t.cambiado_en IS NULL OR t.leido_claude_en >= t.cambiado_en, false), t.responsable, t.estimado,
         t.urgencia, t.doc_escritorio, t.doc_central, t.nota_enviada_en, t.traspasada_en, t.hecha_en,
         t.com_estado, t.com_resultado, t.respuesta_en, t.resuelta_en, h.codigo || ' · ' || h.titulo, t.creado_en, t.implementar_ya_en
    FROM public.tareas_karc0 t LEFT JOIN public.ruta_hitos h ON h.id = t.hito_id
   ORDER BY (t.estado = 'hecha'), (t.implementar_ya_en IS NULL), t.implementar_ya_en,
            CASE t.urgencia WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, t.orden, t.creado_en;
END;
$function$;

REVOKE ALL ON FUNCTION dk.admin_implementar_ya(uuid), dk.admin_tareas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_implementar_ya(uuid), dk.admin_tareas() TO dk_auth;

COMMIT;
