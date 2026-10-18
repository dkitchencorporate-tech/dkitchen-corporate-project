-- 0094 (18/10/2026, karc0): «lo he respondido dos veces y sigue sin salir de aquí hacia ti». Llegaba, pero cada
-- envío SUSTITUÍA al anterior y la revisión seguía con el formulario abierto. Ahora los comentarios de karc0 y
-- las respuestas de Claude son un HILO con fecha, hora y lo que se pidió: ningún envío borra el anterior.
BEGIN;

ALTER TABLE public.revisiones DROP CONSTRAINT IF EXISTS revisiones_comentario_karc0_check;
ALTER TABLE public.revisiones ADD CONSTRAINT revisiones_comentario_karc0_check CHECK (comentario_karc0 IS NULL OR char_length(comentario_karc0) <= 20000);
ALTER TABLE public.revisiones DROP CONSTRAINT IF EXISTS revisiones_imagenes_check;
ALTER TABLE public.revisiones ADD CONSTRAINT revisiones_imagenes_check CHECK (jsonb_typeof(imagenes) = 'array' AND jsonb_array_length(imagenes) <= 24);
ALTER TABLE public.revisiones DROP CONSTRAINT IF EXISTS revisiones_respuesta_claude_check;
ALTER TABLE public.revisiones ADD CONSTRAINT revisiones_respuesta_claude_check CHECK (respuesta_claude IS NULL OR char_length(respuesta_claude) <= 20000);

CREATE OR REPLACE FUNCTION dk.admin_revision_guardar(p_id uuid, p_estado text, p_comentario text, p_imagenes jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE v_img jsonb := coalesce(p_imagenes, '[]'::jsonb); v_com text := nullif(btrim(coalesce(p_comentario, '')), '');
  cab text := '— ' || to_char(now() AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' · '
              || CASE p_estado WHEN 'aprobada' THEN 'Aprobada' WHEN 'cambios' THEN 'Hay que cambiar' ELSE 'Por revisar' END || ' —';
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('cambios', 'aprobada', 'por_revisar') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  IF char_length(coalesce(p_comentario, '')) > 6000 THEN RAISE EXCEPTION 'comentario demasiado largo' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(v_img) <> 'array' OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_img) e WHERE jsonb_typeof(e) <> 'string'
       OR (e #>> '{}') !~ '^https://[a-z0-9.-]+\.public\.blob\.vercel-storage\.com/') THEN
    RAISE EXCEPTION 'imágenes no válidas' USING ERRCODE = '22023';
  END IF;
  UPDATE public.revisiones r
     SET estado = p_estado,
         -- El comentario nuevo se apila con su fecha; sin comentario, el hilo no cambia.
         comentario_karc0 = CASE WHEN v_com IS NULL THEN r.comentario_karc0
                                 ELSE right(coalesce(r.comentario_karc0 || E'\n\n', '') || cab || E'\n' || v_com, 20000) END,
         imagenes = (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT DISTINCT x FROM jsonb_array_elements(r.imagenes || v_img) x LIMIT 24) s),
         estado_claude = CASE WHEN p_estado = 'cambios' THEN NULL ELSE r.estado_claude END,
         revisado_en = now(), cambiado_en = now()
   WHERE r.id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'revisión no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

REVOKE ALL ON FUNCTION dk.admin_revision_guardar(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_revision_guardar(uuid, text, text, jsonb) TO dk_auth;

COMMIT;
