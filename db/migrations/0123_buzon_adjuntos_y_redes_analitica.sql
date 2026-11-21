-- =============================================================================
-- 0123 · Adjuntos en Buzón (capturas/vídeos) + Sección Analítica de Redes (21/11/2026)
-- 1. public.buzon_claude añade adjuntos jsonb (máx 6 URLs de Vercel Blob),
--    actualizando dk.buzon_escribir (retrocompatible con 3 argumentos) y dk.buzon_ver.
-- 2. public.redes_analitica (solo Dirección vía dk.exigir_direccion()): capturas de
--    Instagram, Facebook, TikTok o general + notas de Alex + análisis de Agente DK +
--    rumbo diario.
-- =============================================================================

BEGIN;

-- 0. Validador interno común de URLs de Vercel Blob (imágenes y opcionalmente vídeos)
CREATE OR REPLACE FUNCTION dk.validar_adjuntos_media(
  p_adjuntos jsonb,
  p_max integer,
  p_permitir_video boolean
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_res jsonb := '[]'::jsonb;
  v_item jsonb;
  v_url text;
  v_tipo text;
  v_nombre text;
BEGIN
  IF p_adjuntos IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  IF jsonb_typeof(p_adjuntos) <> 'array' THEN
    RAISE EXCEPTION 'adjuntos no válidos' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_adjuntos) > p_max THEN
    RAISE EXCEPTION 'demasiados adjuntos (máximo %)', p_max USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_adjuntos)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'formato de adjunto no válido' USING ERRCODE = '22023';
    END IF;
    v_url := btrim(coalesce(v_item ->> 'url', ''));
    v_tipo := btrim(coalesce(v_item ->> 'tipo', 'imagen'));
    v_nombre := nullif(left(btrim(coalesce(v_item ->> 'nombre', '')), 160), '');

    IF char_length(v_url) NOT BETWEEN 20 AND 500
       OR v_url !~ '^https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/[^[:space:]"<>]+$' THEN
      RAISE EXCEPTION 'url de adjunto no permitida' USING ERRCODE = '22023';
    END IF;
    IF v_tipo NOT IN ('imagen', 'video') OR (NOT p_permitir_video AND v_tipo <> 'imagen') THEN
      RAISE EXCEPTION 'tipo de adjunto no permitido' USING ERRCODE = '22023';
    END IF;

    v_res := v_res || jsonb_build_array(
      CASE
        WHEN v_nombre IS NULL THEN jsonb_build_object('url', v_url, 'tipo', v_tipo)
        ELSE jsonb_build_object('url', v_url, 'tipo', v_tipo, 'nombre', v_nombre)
      END
    );
  END LOOP;

  RETURN v_res;
END;
$$;

-- 1. Adjuntos en Buzón (public.buzon_claude)
ALTER TABLE public.buzon_claude
  ADD COLUMN IF NOT EXISTS adjuntos jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.buzon_claude'::regclass
       AND conname = 'buzon_claude_adjuntos_chk'
  ) THEN
    ALTER TABLE public.buzon_claude
      ADD CONSTRAINT buzon_claude_adjuntos_chk
      CHECK (jsonb_typeof(adjuntos) = 'array' AND jsonb_array_length(adjuntos) <= 6);
  END IF;
END $$;

DROP FUNCTION IF EXISTS dk.buzon_escribir(text, text, text);
DROP FUNCTION IF EXISTS dk.buzon_escribir(text, text, text, jsonb);

CREATE OR REPLACE FUNCTION dk.buzon_escribir(
  p_tipo text,
  p_mensaje text,
  p_pantalla text,
  p_adjuntos jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v uuid;
  v_yo uuid := dk.identidad_actual();
  v_tipo text;
  v_adj jsonb;
BEGIN
  IF coalesce(dk.es_admin(), false) THEN v_tipo := 'admin';
  ELSIF coalesce(dk.es_socio(), false) THEN v_tipo := 'socio';
  ELSE RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;

  IF p_tipo NOT IN ('encargo', 'idea', 'fallo', 'pregunta') THEN
    RAISE EXCEPTION 'tipo no válido' USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(coalesce(p_mensaje, ''))) NOT BETWEEN 3 AND 4000 THEN
    RAISE EXCEPTION 'mensaje no válido' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.buzon_claude WHERE autor = v_yo AND creado_en > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'demasiados mensajes en una hora' USING ERRCODE = '54000';
  END IF;

  v_adj := dk.validar_adjuntos_media(coalesce(p_adjuntos, '[]'::jsonb), 6, true);

  INSERT INTO public.buzon_claude (autor, autor_tipo, tipo, mensaje, pantalla, adjuntos)
  VALUES (v_yo, v_tipo, p_tipo, btrim(p_mensaje), left(nullif(btrim(p_pantalla), ''), 300), v_adj)
  RETURNING id INTO v;

  RETURN v;
END;
$$;

DROP FUNCTION IF EXISTS dk.buzon_ver(integer);

CREATE OR REPLACE FUNCTION dk.buzon_ver(p_limite integer)
RETURNS TABLE (
  id uuid,
  autor_nombre text,
  autor_tipo text,
  tipo text,
  mensaje text,
  pantalla text,
  estado text,
  respuesta text,
  creado_en timestamp with time zone,
  respondido_en timestamp with time zone,
  adjuntos jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_admin boolean := coalesce(dk.es_admin(), false);
  v_dir boolean := coalesce(dk.es_direccion(), false);
BEGIN
  IF NOT (v_admin OR coalesce(dk.es_socio(), false)) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT b.id,
         coalesce(i.nombre, '(cuenta borrada)')::text,
         b.autor_tipo,
         b.tipo,
         b.mensaje,
         b.pantalla,
         b.estado,
         b.respuesta,
         b.creado_en,
         b.respondido_en,
         coalesce(b.adjuntos, '[]'::jsonb)
    FROM public.buzon_claude b
    LEFT JOIN public.identidades i ON i.id = b.autor
   WHERE v_dir OR b.autor = dk.identidad_actual()
   ORDER BY (b.estado IN ('hecho', 'descartado')), b.creado_en DESC
   LIMIT greatest(1, least(coalesce(p_limite, 50), 200));
END;
$$;

-- 2. Sección Analítica de Redes (solo Dirección)
CREATE TABLE IF NOT EXISTS public.redes_analitica (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha          date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Madrid')::date,
  red            text NOT NULL CHECK (red IN ('instagram', 'facebook', 'tiktok', 'general')),
  titulo         text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 2 AND 160),
  notas_alex     text CHECK (notas_alex IS NULL OR char_length(notas_alex) <= 4000),
  capturas       jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(capturas) = 'array' AND jsonb_array_length(capturas) <= 10),
  analisis_dk    text CHECK (analisis_dk IS NULL OR char_length(analisis_dk) <= 8000),
  rumbo_diario   text CHECK (rumbo_diario IS NULL OR char_length(rumbo_diario) <= 4000),
  estado         text NOT NULL DEFAULT 'pendiente_analisis' CHECK (estado IN ('pendiente_analisis', 'analizado', 'aplicado')),
  creado_por     uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS redes_analitica_fecha_idx
  ON public.redes_analitica (fecha DESC, creado_en DESC);

ALTER TABLE public.redes_analitica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redes_analitica FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.redes_analitica FROM PUBLIC, dk_app, dk_auth, dk_anon, dk_webhook;

CREATE OR REPLACE FUNCTION dk.redes_analitica_listar(
  p_red text DEFAULT NULL,
  p_limite integer DEFAULT 80
)
RETURNS TABLE (
  id uuid,
  fecha date,
  red text,
  titulo text,
  notas_alex text,
  capturas jsonb,
  analisis_dk text,
  rumbo_diario text,
  estado text,
  autor_nombre text,
  creado_en timestamptz,
  actualizado_en timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_red text := nullif(btrim(coalesce(p_red, '')), '');
BEGIN
  PERFORM dk.exigir_direccion();

  IF v_red IS NOT NULL AND v_red NOT IN ('instagram', 'facebook', 'tiktok', 'general') THEN
    RAISE EXCEPTION 'red no válida' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT r.id,
         r.fecha,
         r.red,
         r.titulo,
         r.notas_alex,
         coalesce(r.capturas, '[]'::jsonb),
         r.analisis_dk,
         r.rumbo_diario,
         r.estado,
         coalesce(i.nombre, i.email::text, 'Dirección')::text,
         r.creado_en,
         r.actualizado_en
    FROM public.redes_analitica r
    LEFT JOIN public.identidades i ON i.id = r.creado_por
   WHERE v_red IS NULL OR r.red = v_red
   ORDER BY r.fecha DESC, r.creado_en DESC
   LIMIT greatest(1, least(coalesce(p_limite, 80), 200));
END;
$$;

CREATE OR REPLACE FUNCTION dk.redes_analitica_crear(
  p_fecha date,
  p_red text,
  p_titulo text,
  p_notas_alex text,
  p_capturas jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_id uuid;
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_notas text := nullif(left(btrim(coalesce(p_notas_alex, '')), 4000), '');
  v_capt jsonb;
  v_fecha date := coalesce(p_fecha, (now() AT TIME ZONE 'Europe/Madrid')::date);
BEGIN
  PERFORM dk.exigir_direccion();

  IF p_red NOT IN ('instagram', 'facebook', 'tiktok', 'general') THEN
    RAISE EXCEPTION 'red no válida' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_titulo) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'título no válido' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.redes_analitica WHERE creado_en > now() - interval '1 hour') >= 40 THEN
    RAISE EXCEPTION 'demasiados envíos en una hora' USING ERRCODE = '54000';
  END IF;

  v_capt := dk.validar_adjuntos_media(coalesce(p_capturas, '[]'::jsonb), 10, false);
  IF jsonb_array_length(v_capt) = 0 AND v_notas IS NULL THEN
    RAISE EXCEPTION 'añade al menos una captura o una nota' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.redes_analitica (fecha, red, titulo, notas_alex, capturas, creado_por)
  VALUES (v_fecha, p_red, v_titulo, v_notas, v_capt, dk.identidad_actual())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION dk.redes_analitica_actualizar(
  p_id uuid,
  p_notas_alex text,
  p_analisis_dk text,
  p_rumbo_diario text,
  p_estado text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_direccion();

  IF p_estado NOT IN ('pendiente_analisis', 'analizado', 'aplicado') THEN
    RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023';
  END IF;

  UPDATE public.redes_analitica
     SET notas_alex     = nullif(left(btrim(coalesce(p_notas_alex, '')), 4000), ''),
         analisis_dk    = nullif(left(btrim(coalesce(p_analisis_dk, '')), 8000), ''),
         rumbo_diario   = nullif(left(btrim(coalesce(p_rumbo_diario, '')), 4000), ''),
         estado         = p_estado,
         actualizado_en = now()
   WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entrada no encontrada' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION dk.redes_analitica_borrar(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_direccion();

  DELETE FROM public.redes_analitica WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'entrada no encontrada' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.validar_adjuntos_media(jsonb, integer, boolean)
  FROM PUBLIC, dk_app, dk_auth, dk_anon, dk_webhook;

REVOKE ALL ON FUNCTION
  dk.buzon_escribir(text, text, text, jsonb),
  dk.buzon_ver(integer),
  dk.redes_analitica_listar(text, integer),
  dk.redes_analitica_crear(date, text, text, text, jsonb),
  dk.redes_analitica_actualizar(uuid, text, text, text, text),
  dk.redes_analitica_borrar(uuid)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  dk.buzon_escribir(text, text, text, jsonb),
  dk.buzon_ver(integer),
  dk.redes_analitica_listar(text, integer),
  dk.redes_analitica_crear(date, text, text, text, jsonb),
  dk.redes_analitica_actualizar(uuid, text, text, text, text),
  dk.redes_analitica_borrar(uuid)
  TO dk_auth;

INSERT INTO public.dk_migraciones (nombre)
VALUES ('0123_buzon_adjuntos_y_redes_analitica.sql')
ON CONFLICT DO NOTHING;

COMMIT;
