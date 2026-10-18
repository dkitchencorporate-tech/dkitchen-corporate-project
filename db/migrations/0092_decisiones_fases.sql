-- 0092 (18/10/2026, karc0): Decisiones con el mismo ciclo que Comunicación y fecha y hora en cada paso.
-- Fases: por_decidir (karc0) → comunicacion (karc0 matizó o eligió «otra»: le toca a Claude responder)
-- → decidida (cerrada, pendiente de aplicar) → resuelta (Claude la aplicó; dice dónde). Y las tareas
-- devuelven su fecha de creación para enseñar fecha y hora de todo.
BEGIN;

ALTER TABLE public.decisiones
  ADD COLUMN IF NOT EXISTS fase text NOT NULL DEFAULT 'por_decidir' CHECK (fase IN ('por_decidir', 'comunicacion', 'decidida', 'resuelta')),
  ADD COLUMN IF NOT EXISTS respuesta_claude_en timestamptz,
  ADD COLUMN IF NOT EXISTS resuelta_en timestamptz;

-- Lo existente: con nota de Claude = resuelta (la nota dice dónde se aplicó); decidida sin nota = decidida.
UPDATE public.decisiones
   SET fase = CASE WHEN estado <> 'decidida' THEN 'por_decidir' WHEN nota_claude IS NOT NULL THEN 'resuelta' ELSE 'decidida' END,
       resuelta_en = CASE WHEN estado = 'decidida' AND nota_claude IS NOT NULL THEN coalesce(cambiado_en, decidido_en, creado_en) END,
       respuesta_claude_en = CASE WHEN nota_claude IS NOT NULL THEN coalesce(cambiado_en, decidido_en, creado_en) END
 WHERE fase = 'por_decidir';

CREATE OR REPLACE FUNCTION dk.admin_decidir(p_id uuid, p_eleccion text, p_respuesta text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_ops jsonb; r text := nullif(btrim(coalesce(p_respuesta, '')), '');
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF char_length(coalesce(r, '')) > 4000 THEN RAISE EXCEPTION 'respuesta demasiado larga' USING ERRCODE = '22023'; END IF;
  SELECT opciones INTO v_ops FROM public.decisiones WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'decisión no encontrada' USING ERRCODE = 'P0002'; END IF;
  IF p_eleccion = 'aplazar' THEN
    UPDATE public.decisiones SET estado = 'aplazada', fase = 'por_decidir', respuesta_karc0 = coalesce(r, respuesta_karc0), cambiado_en = now() WHERE id = p_id;
  ELSIF p_eleccion = 'otra' THEN
    IF r IS NULL THEN RAISE EXCEPTION 'escribe tu respuesta' USING ERRCODE = '22023'; END IF;
    UPDATE public.decisiones SET estado = 'decidida', fase = 'comunicacion', eleccion = 'otra', respuesta_karc0 = r, decidido_en = now(), cambiado_en = now() WHERE id = p_id;
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_ops) o WHERE o->>'id' = p_eleccion) THEN
    -- Con matiz, Claude responde antes de cerrarla; sin matiz, queda decidida.
    UPDATE public.decisiones SET estado = 'decidida', fase = CASE WHEN r IS NULL THEN 'decidida' ELSE 'comunicacion' END,
           eleccion = p_eleccion, respuesta_karc0 = r, decidido_en = now(), cambiado_en = now() WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'opción no válida' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- karc0 reabre una decisión ya cerrada: vuelve a «Por decidir».
CREATE OR REPLACE FUNCTION dk.admin_decision_reabrir(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.decisiones SET estado = 'pendiente', fase = 'por_decidir', resuelta_en = NULL, cambiado_en = now() WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'decisión no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$$;

DROP FUNCTION IF EXISTS dk.admin_tareas();
CREATE FUNCTION dk.admin_tareas()
 RETURNS TABLE(id uuid, orden integer, bloque text, titulo text, detalle text, enlace text, para_cuando date, estado text, nota_karc0 text, nota_claude text, cambiado_en timestamptz, leido_claude boolean, responsable text, estimado text, urgencia text, doc_escritorio text, doc_central text, nota_enviada_en timestamptz, traspasada_en timestamptz, hecha_en timestamptz,
               com_estado text, com_resultado text, respuesta_en timestamptz, resuelta_en timestamptz, hito text, creado_en timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT t.id, t.orden, t.bloque, t.titulo, t.detalle, t.enlace, t.para_cuando, t.estado, t.nota_karc0, t.nota_claude, t.cambiado_en,
         coalesce(t.cambiado_en IS NULL OR t.leido_claude_en >= t.cambiado_en, false), t.responsable, t.estimado,
         t.urgencia, t.doc_escritorio, t.doc_central, t.nota_enviada_en, t.traspasada_en, t.hecha_en,
         t.com_estado, t.com_resultado, t.respuesta_en, t.resuelta_en, h.codigo || ' · ' || h.titulo, t.creado_en
    FROM public.tareas_karc0 t LEFT JOIN public.ruta_hitos h ON h.id = t.hito_id
   ORDER BY (t.estado = 'hecha'), CASE t.urgencia WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, t.orden, t.creado_en;
END;
$function$;

REVOKE ALL ON FUNCTION dk.admin_decidir(uuid, text, text), dk.admin_decision_reabrir(uuid), dk.admin_tareas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_decidir(uuid, text, text), dk.admin_decision_reabrir(uuid), dk.admin_tareas() TO dk_auth;

COMMIT;
