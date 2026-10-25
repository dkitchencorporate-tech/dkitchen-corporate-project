-- 0077 · Central → Mis tareas (13/10/2026, encargo de karc0).
-- Lista de tareas que le tocan a karc0 para el lanzamiento: Claude las crea (q.cjs, rol propietario),
-- karc0 las tacha o deja una nota desde Central y Claude lo lee al empezar cada sesión (buzon.cjs).
-- Solo admins (2FA). La tabla no tiene permisos para la app: todo por funciones.
BEGIN;

CREATE TABLE IF NOT EXISTS public.tareas_karc0 (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden          int NOT NULL DEFAULT 100,
  bloque         text NOT NULL DEFAULT 'otro' CHECK (bloque IN ('redes', 'propuestas', 'anuncios', 'cobro', 'legal', 'flyers', 'otro')),
  titulo         text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 200),
  detalle        text CHECK (detalle IS NULL OR char_length(detalle) <= 3000),
  enlace         text CHECK (enlace IS NULL OR char_length(enlace) <= 500),
  para_cuando    date,
  estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'hecha', 'bloqueada')),
  nota_karc0     text CHECK (nota_karc0 IS NULL OR char_length(nota_karc0) <= 3000),
  nota_claude    text CHECK (nota_claude IS NULL OR char_length(nota_claude) <= 3000),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  cambiado_en    timestamptz,
  leido_claude_en timestamptz
);
CREATE INDEX IF NOT EXISTS tareas_karc0_idx ON public.tareas_karc0 (estado, orden);
ALTER TABLE public.tareas_karc0 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_karc0 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tareas_karc0 FROM PUBLIC, dk_app, dk_auth, dk_anon;

CREATE OR REPLACE FUNCTION dk.admin_tareas()
RETURNS TABLE (id uuid, orden int, bloque text, titulo text, detalle text, enlace text, para_cuando date, estado text,
               nota_karc0 text, nota_claude text, cambiado_en timestamptz, leido_claude boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT t.id, t.orden, t.bloque, t.titulo, t.detalle, t.enlace, t.para_cuando, t.estado, t.nota_karc0, t.nota_claude, t.cambiado_en,
         coalesce(t.cambiado_en IS NULL OR t.leido_claude_en >= t.cambiado_en, false)
    FROM public.tareas_karc0 t
   ORDER BY (t.estado = 'hecha'), t.orden, t.creado_en;
END;
$$;

-- Tachar, bloquear o reabrir y dejar una nota para Claude.
CREATE OR REPLACE FUNCTION dk.admin_tarea_guardar(p_id uuid, p_estado text, p_nota text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('pendiente', 'hecha', 'bloqueada') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  IF char_length(coalesce(p_nota, '')) > 3000 THEN RAISE EXCEPTION 'nota demasiado larga' USING ERRCODE = '22023'; END IF;
  UPDATE public.tareas_karc0
     SET estado = p_estado, nota_karc0 = nullif(btrim(coalesce(p_nota, '')), ''), cambiado_en = now()
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'tarea no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_tareas(), dk.admin_tarea_guardar(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_tareas(), dk.admin_tarea_guardar(uuid, text, text) TO dk_auth;

COMMIT;
