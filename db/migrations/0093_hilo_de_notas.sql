-- 0093 (18/10/2026, karc0): «al reabrir no me deja poner notas nuevas, solo editar la que ya usé».
-- Cada tarea guarda un HILO de notas con fecha y hora: karc0 puede añadir notas hasta que se cierre la tarea
-- (también tras reabrir la comunicación). Límite de 3.000 a 12.000 caracteres (notas de karc0 y de Claude).
BEGIN;

ALTER TABLE public.tareas_karc0 DROP CONSTRAINT IF EXISTS tareas_karc0_nota_karc0_check;
ALTER TABLE public.tareas_karc0 ADD CONSTRAINT tareas_karc0_nota_karc0_check CHECK (nota_karc0 IS NULL OR char_length(nota_karc0) <= 12000);
ALTER TABLE public.tareas_karc0 DROP CONSTRAINT IF EXISTS tareas_karc0_nota_claude_check;
ALTER TABLE public.tareas_karc0 ADD CONSTRAINT tareas_karc0_nota_claude_check CHECK (nota_claude IS NULL OR char_length(nota_claude) <= 12000);

-- Editar el hilo entero («Editar nota») admite ahora hasta 12.000 caracteres; el resto, igual que en 0091.
CREATE OR REPLACE FUNCTION dk.admin_tarea_guardar(p_id uuid, p_estado text, p_nota text, p_modo text DEFAULT 'abierta'::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('pendiente', 'hecha', 'bloqueada') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  IF p_modo NOT IN ('abierta', 'cerrar', 'traspasar', 'estado') THEN RAISE EXCEPTION 'modo no válido' USING ERRCODE = '22023'; END IF;
  IF char_length(coalesce(p_nota, '')) > 12000 THEN RAISE EXCEPTION 'nota demasiado larga' USING ERRCODE = '22023'; END IF;
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

-- Añadir una nota al hilo: se apila con su fecha y hora (Madrid) y reabre la comunicación para Claude.
CREATE OR REPLACE FUNCTION dk.admin_tarea_anadir_nota(p_id uuid, p_nota text, p_modo text DEFAULT 'abierta'::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE v_nota text := nullif(btrim(coalesce(p_nota, '')), ''); t public.tareas_karc0; v_hilo text;
  cab text := '— ' || to_char(now() AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' —';
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF v_nota IS NULL OR char_length(v_nota) > 3000 THEN RAISE EXCEPTION 'nota vacía o demasiado larga' USING ERRCODE = '22023'; END IF;
  IF p_modo NOT IN ('abierta', 'cerrar', 'traspasar') THEN RAISE EXCEPTION 'modo no válido' USING ERRCODE = '22023'; END IF;
  SELECT * INTO t FROM public.tareas_karc0 WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tarea no encontrada' USING ERRCODE = 'P0002'; END IF;
  -- La primera nota sin cabecera recibe la suya (fecha en que se envió).
  v_hilo := CASE
    WHEN t.nota_karc0 IS NULL THEN cab || E'\n' || v_nota
    WHEN left(t.nota_karc0, 2) = '— ' THEN t.nota_karc0 || E'\n\n' || cab || E'\n' || v_nota
    ELSE '— ' || to_char(coalesce(t.nota_enviada_en, t.cambiado_en, now()) AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || E' —\n'
         || t.nota_karc0 || E'\n\n' || cab || E'\n' || v_nota END;
  -- Si el hilo crece demasiado, se recortan las notas más antiguas (se conserva el final).
  IF char_length(v_hilo) > 12000 THEN v_hilo := '…' || right(v_hilo, 11999); END IF;
  UPDATE public.tareas_karc0
     SET nota_karc0 = v_hilo, nota_enviada_en = now(),
         estado = CASE p_modo WHEN 'cerrar' THEN 'hecha' WHEN 'traspasar' THEN 'pendiente' ELSE CASE WHEN estado = 'hecha' THEN 'pendiente' ELSE estado END END,
         responsable = CASE WHEN p_modo = 'traspasar' THEN 'claude' ELSE responsable END,
         traspasada_en = CASE WHEN p_modo = 'traspasar' THEN now() ELSE traspasada_en END,
         hecha_en = CASE WHEN p_modo = 'cerrar' THEN coalesce(hecha_en, now()) ELSE NULL END,
         com_estado = CASE WHEN com_estado IN ('resuelta', 'reabierta') THEN 'reabierta' ELSE 'abierta' END,
         com_resultado = NULL, resuelta_en = NULL, cambiado_en = now()
   WHERE id = p_id;
END;
$function$;

REVOKE ALL ON FUNCTION dk.admin_tarea_guardar(uuid, text, text, text), dk.admin_tarea_anadir_nota(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_tarea_guardar(uuid, text, text, text), dk.admin_tarea_anadir_nota(uuid, text, text) TO dk_auth;

COMMIT;
