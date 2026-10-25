-- 0090 (18/10/2026, karc0): «en Enviadas a Claude no me basta que digas que las leíste:
-- necesito la respuesta, la implementación o en qué estado está». Cada revisión con cambios
-- lleva el resultado que define Claude: por implementar, en preguntas a karc0, decisión,
-- implementada (y en qué versión) o descartada, con su texto.

ALTER TABLE public.revisiones
  ADD COLUMN IF NOT EXISTS estado_claude text CHECK (estado_claude IS NULL OR estado_claude IN ('por_implementar', 'en_preguntas', 'decision', 'implementada', 'descartada')),
  ADD COLUMN IF NOT EXISTS respuesta_claude text CHECK (respuesta_claude IS NULL OR char_length(respuesta_claude) <= 6000),
  ADD COLUMN IF NOT EXISTS respondida_en timestamptz;

-- dk.admin_revisiones devuelve SETOF revisiones: con las columnas nuevas se recrea igual
CREATE OR REPLACE FUNCTION dk.admin_revisiones()
 RETURNS SETOF public.revisiones LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM public.revisiones r
   ORDER BY CASE r.estado WHEN 'por_revisar' THEN 0 WHEN 'cambios' THEN 1 ELSE 2 END, coalesce(r.respondida_en, r.creado_en) DESC LIMIT 300;
END;
$function$;

-- Cuando karc0 vuelve a pedir cambios, la revisión vuelve a «Enviadas a Claude» (estado_claude = NULL).
-- Aplicado en producción el 18/10 con el mismo cuerpo que 0087 + esa línea en el UPDATE:
--   estado_claude = CASE WHEN p_estado = 'cambios' THEN NULL ELSE r.estado_claude END
