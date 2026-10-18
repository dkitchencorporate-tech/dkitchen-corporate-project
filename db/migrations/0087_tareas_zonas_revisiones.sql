-- 0087 (18/10/2026, karc0): Mis tareas sin confusión + Revisiones de Alex.
-- 1) La nota de karc0 queda «enviada» (nota_enviada_en) y bloqueada hasta que la
--    edite a propósito; al enviarla elige: cerrar la tarea, «cerrada para mí y
--    pendiente para Claude» (traspaso) o dejarla abierta.
-- 2) hecha_en para la zona «Resueltas» (ordenadas por fecha de cierre).
-- 3) public.revisiones: cada cambio de Claude que karc0 debe revisar; karc0 lo
--    aprueba o pide cambios con texto e imágenes (URL de Vercel Blob). Claude lo
--    lee con buzon.cjs (leido_claude_en < cambiado_en).

ALTER TABLE public.tareas_karc0
  ADD COLUMN IF NOT EXISTS nota_enviada_en timestamptz,
  ADD COLUMN IF NOT EXISTS traspasada_en timestamptz,
  ADD COLUMN IF NOT EXISTS hecha_en timestamptz;
UPDATE public.tareas_karc0 SET hecha_en = coalesce(cambiado_en, creado_en) WHERE estado = 'hecha' AND hecha_en IS NULL;
UPDATE public.tareas_karc0 SET nota_enviada_en = coalesce(cambiado_en, creado_en) WHERE nota_karc0 IS NOT NULL AND nota_enviada_en IS NULL;

CREATE TABLE IF NOT EXISTS public.revisiones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 200),
  que_cambio       text CHECK (que_cambio IS NULL OR char_length(que_cambio) <= 4000),
  enlace           text CHECK (enlace IS NULL OR char_length(enlace) <= 500),
  version          text CHECK (version IS NULL OR char_length(version) <= 60),
  tarea_id         uuid REFERENCES public.tareas_karc0(id) ON DELETE SET NULL,
  estado           text NOT NULL DEFAULT 'por_revisar' CHECK (estado IN ('por_revisar', 'cambios', 'aprobada')),
  comentario_karc0 text CHECK (comentario_karc0 IS NULL OR char_length(comentario_karc0) <= 6000),
  imagenes         jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(imagenes) = 'array' AND jsonb_array_length(imagenes) <= 12),
  creado_en        timestamptz NOT NULL DEFAULT now(),
  revisado_en      timestamptz,
  cambiado_en      timestamptz,
  leido_claude_en  timestamptz
);
CREATE INDEX IF NOT EXISTS revisiones_estado_idx ON public.revisiones (estado, creado_en DESC);
ALTER TABLE public.revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisiones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.revisiones FROM PUBLIC, dk_app, dk_auth, dk_anon;

DROP FUNCTION IF EXISTS dk.admin_tarea_guardar(uuid, text, text);
CREATE FUNCTION dk.admin_tarea_guardar(p_id uuid, p_estado text, p_nota text, p_modo text DEFAULT 'abierta')
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
         hecha_en = CASE WHEN (CASE p_modo WHEN 'cerrar' THEN 'hecha' WHEN 'traspasar' THEN 'pendiente' ELSE p_estado END) = 'hecha'
                         THEN coalesce(t.hecha_en, now()) ELSE NULL END,
         cambiado_en = now()
   WHERE t.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'tarea no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

DROP FUNCTION IF EXISTS dk.admin_tareas();
CREATE FUNCTION dk.admin_tareas()
 RETURNS TABLE(id uuid, orden integer, bloque text, titulo text, detalle text, enlace text, para_cuando date, estado text, nota_karc0 text, nota_claude text, cambiado_en timestamptz, leido_claude boolean, responsable text, estimado text, urgencia text, doc_escritorio text, doc_central text, nota_enviada_en timestamptz, traspasada_en timestamptz, hecha_en timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT t.id, t.orden, t.bloque, t.titulo, t.detalle, t.enlace, t.para_cuando, t.estado, t.nota_karc0, t.nota_claude, t.cambiado_en,
         coalesce(t.cambiado_en IS NULL OR t.leido_claude_en >= t.cambiado_en, false), t.responsable, t.estimado,
         t.urgencia, t.doc_escritorio, t.doc_central, t.nota_enviada_en, t.traspasada_en, t.hecha_en
    FROM public.tareas_karc0 t
   ORDER BY (t.estado = 'hecha'), CASE t.urgencia WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, t.orden, t.creado_en;
END;
$function$;

CREATE OR REPLACE FUNCTION dk.admin_revisiones()
 RETURNS SETOF public.revisiones LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM public.revisiones r
   ORDER BY CASE r.estado WHEN 'por_revisar' THEN 0 WHEN 'cambios' THEN 1 ELSE 2 END, r.creado_en DESC LIMIT 200;
END;
$function$;

CREATE OR REPLACE FUNCTION dk.admin_revision_guardar(p_id uuid, p_estado text, p_comentario text, p_imagenes jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE v_img jsonb := coalesce(p_imagenes, '[]'::jsonb);
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('cambios', 'aprobada', 'por_revisar') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  IF char_length(coalesce(p_comentario, '')) > 6000 THEN RAISE EXCEPTION 'comentario demasiado largo' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(v_img) <> 'array' OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_img) e
       WHERE jsonb_typeof(e) <> 'string' OR (e #>> '{}') !~ '^https://[a-z0-9.-]+\.public\.blob\.vercel-storage\.com/') THEN
    RAISE EXCEPTION 'imágenes no válidas' USING ERRCODE = '22023';
  END IF;
  UPDATE public.revisiones r
     SET estado = p_estado, comentario_karc0 = nullif(btrim(coalesce(p_comentario, '')), ''),
         imagenes = (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT DISTINCT x FROM jsonb_array_elements(r.imagenes || v_img) x LIMIT 12) s),
         revisado_en = now(), cambiado_en = now()
   WHERE r.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'revisión no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

REVOKE ALL ON FUNCTION dk.admin_tarea_guardar(uuid, text, text, text), dk.admin_tareas(), dk.admin_revisiones(), dk.admin_revision_guardar(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_tarea_guardar(uuid, text, text, text), dk.admin_tareas(), dk.admin_revisiones(), dk.admin_revision_guardar(uuid, text, text, jsonb) TO dk_auth;
