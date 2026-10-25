-- 0083 · Central como memoria completa (17/10/2026, decisiones de karc0 por AskUserQuestion).
-- 1. documentos: reportes y TODA la documentación viva del escritorio, en la base (el repo es público:
--    la documentación interna no va a git). La sube herramientas-claude/docs.cjs (rol propietario),
--    sin Credenciales, secretos ni carpetas judiciales. Central → Reportes y Documentos la leen.
-- 2. decisiones: cada punto crítico con su contexto, opciones y la recomendación de Claude; karc0 elige
--    o escribe su respuesta desde Central y Claude lo lee al empezar (buzon.cjs).
-- 3. Mis tareas: urgencia y documentación enlazada (escritorio y Central) para el tablero.
-- Solo admins (2FA). Las tablas no tienen permisos para la app: todo por funciones.
BEGIN;

-- 1 · Documentos -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          text NOT NULL CHECK (tipo IN ('reporte', 'documento')),
  ruta          text NOT NULL UNIQUE CHECK (char_length(ruta) BETWEEN 3 AND 400),
  carpeta       text NOT NULL DEFAULT '' CHECK (char_length(carpeta) <= 200),
  titulo        text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 300),
  resumen       text CHECK (resumen IS NULL OR char_length(resumen) <= 600),
  fecha         date,
  contenido     text NOT NULL CHECK (octet_length(contenido) <= 2000000),
  huella        text NOT NULL CHECK (huella ~ '^[0-9a-f]{64}$'),
  archivado     boolean NOT NULL DEFAULT false,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documentos_tipo_idx ON public.documentos (tipo, carpeta, fecha DESC);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.documentos FROM PUBLIC, dk_app, dk_auth, dk_anon;

-- Lista sin el contenido (para Reportes y Documentos).
CREATE OR REPLACE FUNCTION dk.admin_documentos(p_tipo text)
RETURNS TABLE (ruta text, carpeta text, titulo text, resumen text, fecha date, bytes int, archivado boolean, actualizado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT d.ruta, d.carpeta, d.titulo, d.resumen, d.fecha, octet_length(d.contenido), d.archivado, d.actualizado_en
    FROM public.documentos d
   WHERE d.tipo = p_tipo
   ORDER BY d.archivado, d.carpeta, d.fecha DESC NULLS LAST, d.ruta;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_documento(p_ruta text)
RETURNS TABLE (ruta text, tipo text, carpeta text, titulo text, fecha date, contenido text, archivado boolean, actualizado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT d.ruta, d.tipo, d.carpeta, d.titulo, d.fecha, d.contenido, d.archivado, d.actualizado_en
    FROM public.documentos d WHERE d.ruta = p_ruta;
END;
$$;

-- 2 · Decisiones -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decisiones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden           int NOT NULL DEFAULT 100,
  tema            text NOT NULL DEFAULT 'otro' CHECK (char_length(tema) BETWEEN 2 AND 60),
  titulo          text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 200),
  contexto        text NOT NULL CHECK (char_length(contexto) BETWEEN 3 AND 6000),
  -- [{"id":"a","texto":"…","detalle":"…","recomendada":true}, …] (2 a 6 opciones)
  opciones        jsonb NOT NULL CHECK (jsonb_typeof(opciones) = 'array' AND jsonb_array_length(opciones) BETWEEN 2 AND 6),
  estado          text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'decidida', 'aplazada')),
  eleccion        text CHECK (eleccion IS NULL OR char_length(eleccion) <= 20),
  respuesta_karc0 text CHECK (respuesta_karc0 IS NULL OR char_length(respuesta_karc0) <= 4000),
  nota_claude     text CHECK (nota_claude IS NULL OR char_length(nota_claude) <= 3000),
  doc_ruta        text CHECK (doc_ruta IS NULL OR char_length(doc_ruta) <= 400),
  tarea_id        uuid REFERENCES public.tareas_karc0 (id) ON DELETE SET NULL,
  decidido_en     timestamptz,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  cambiado_en     timestamptz,
  leido_claude_en timestamptz
);
CREATE INDEX IF NOT EXISTS decisiones_estado_idx ON public.decisiones (estado, orden);
ALTER TABLE public.decisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisiones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.decisiones FROM PUBLIC, dk_app, dk_auth, dk_anon;

CREATE OR REPLACE FUNCTION dk.admin_decisiones()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(d) - 'leido_claude_en'
             ORDER BY CASE d.estado WHEN 'pendiente' THEN 0 WHEN 'aplazada' THEN 1 ELSE 2 END, d.orden, d.creado_en)
      FROM public.decisiones d), '[]'::jsonb);
END;
$$;

-- karc0 decide: una opción de la lista, «otra» (con su texto) o «aplazar».
CREATE OR REPLACE FUNCTION dk.admin_decidir(p_id uuid, p_eleccion text, p_respuesta text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_ops jsonb; r text := nullif(btrim(coalesce(p_respuesta, '')), '');
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF char_length(coalesce(r, '')) > 4000 THEN RAISE EXCEPTION 'respuesta demasiado larga' USING ERRCODE = '22023'; END IF;
  SELECT opciones INTO v_ops FROM public.decisiones WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'decisión no encontrada' USING ERRCODE = 'P0002'; END IF;
  IF p_eleccion = 'aplazar' THEN
    UPDATE public.decisiones SET estado = 'aplazada', respuesta_karc0 = coalesce(r, respuesta_karc0), cambiado_en = now() WHERE id = p_id;
  ELSIF p_eleccion = 'otra' THEN
    IF r IS NULL THEN RAISE EXCEPTION 'escribe tu respuesta' USING ERRCODE = '22023'; END IF;
    UPDATE public.decisiones SET estado = 'decidida', eleccion = 'otra', respuesta_karc0 = r, decidido_en = now(), cambiado_en = now() WHERE id = p_id;
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_ops) o WHERE o->>'id' = p_eleccion) THEN
    UPDATE public.decisiones SET estado = 'decidida', eleccion = p_eleccion, respuesta_karc0 = r, decidido_en = now(), cambiado_en = now() WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'opción no válida' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- 3 · Mis tareas: urgencia y documentación ---------------------------------------------------
ALTER TABLE public.tareas_karc0 ADD COLUMN IF NOT EXISTS urgencia text NOT NULL DEFAULT 'media'
  CHECK (urgencia IN ('urgente', 'alta', 'media', 'baja'));
ALTER TABLE public.tareas_karc0 ADD COLUMN IF NOT EXISTS doc_escritorio text
  CHECK (doc_escritorio IS NULL OR char_length(doc_escritorio) <= 400);
ALTER TABLE public.tareas_karc0 ADD COLUMN IF NOT EXISTS doc_central text
  CHECK (doc_central IS NULL OR char_length(doc_central) <= 400);

DROP FUNCTION IF EXISTS dk.admin_tareas();
CREATE FUNCTION dk.admin_tareas()
RETURNS TABLE (id uuid, orden int, bloque text, titulo text, detalle text, enlace text, para_cuando date, estado text,
               nota_karc0 text, nota_claude text, cambiado_en timestamptz, leido_claude boolean, responsable text, estimado text,
               urgencia text, doc_escritorio text, doc_central text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT t.id, t.orden, t.bloque, t.titulo, t.detalle, t.enlace, t.para_cuando, t.estado, t.nota_karc0, t.nota_claude, t.cambiado_en,
         coalesce(t.cambiado_en IS NULL OR t.leido_claude_en >= t.cambiado_en, false), t.responsable, t.estimado,
         t.urgencia, t.doc_escritorio, t.doc_central
    FROM public.tareas_karc0 t
   ORDER BY (t.estado = 'hecha'), CASE t.urgencia WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, t.orden, t.creado_en;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_documentos(text), dk.admin_documento(text), dk.admin_decisiones(), dk.admin_decidir(uuid, text, text), dk.admin_tareas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_documentos(text), dk.admin_documento(text), dk.admin_decisiones(), dk.admin_decidir(uuid, text, text), dk.admin_tareas() TO dk_auth;

COMMIT;
