-- 0082 · Mis tareas con responsable y tiempo estimado + Central → Competencia (17/10/2026, encargo de karc0).
-- 1. Mis tareas deja de ser solo «lo que le toca a karc0»: también la hoja de ruta de desarrollo
--    (quién la hace y cuánto lleva), para que nada viva solo en el chat.
-- 2. Competencia: base viva de competidores. karc0 los añade desde Central (nombre, web, nota);
--    Claude los audita (q.cjs, rol propietario) y rellena la ficha. Solo admins (2FA), todo por funciones.
-- Los reportes fechados NO van a la base: viven en el repo (docs/reportes/*.md) y Central los muestra.
BEGIN;

-- 1 · Mis tareas ------------------------------------------------------------------------------
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.tareas_karc0'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%bloque%'
  LOOP EXECUTE format('ALTER TABLE public.tareas_karc0 DROP CONSTRAINT %I', c); END LOOP;
END $$;
ALTER TABLE public.tareas_karc0 ADD CONSTRAINT tareas_karc0_bloque_check
  CHECK (bloque IN ('redes', 'propuestas', 'anuncios', 'cobro', 'legal', 'flyers', 'otro',
                    'central', 'producto', 'desarrollo', 'auditoria'));
ALTER TABLE public.tareas_karc0 ADD COLUMN IF NOT EXISTS responsable text NOT NULL DEFAULT 'karc0'
  CHECK (responsable IN ('karc0', 'claude', 'antigravity', 'ambos'));
ALTER TABLE public.tareas_karc0 ADD COLUMN IF NOT EXISTS estimado text
  CHECK (estimado IS NULL OR char_length(estimado) <= 60);

DROP FUNCTION IF EXISTS dk.admin_tareas();
CREATE FUNCTION dk.admin_tareas()
RETURNS TABLE (id uuid, orden int, bloque text, titulo text, detalle text, enlace text, para_cuando date, estado text,
               nota_karc0 text, nota_claude text, cambiado_en timestamptz, leido_claude boolean, responsable text, estimado text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT t.id, t.orden, t.bloque, t.titulo, t.detalle, t.enlace, t.para_cuando, t.estado, t.nota_karc0, t.nota_claude, t.cambiado_en,
         coalesce(t.cambiado_en IS NULL OR t.leido_claude_en >= t.cambiado_en, false), t.responsable, t.estimado
    FROM public.tareas_karc0 t
   ORDER BY (t.estado = 'hecha'), t.orden, t.creado_en;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_tareas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_tareas() TO dk_auth;

-- 2 · Competencia -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competidores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 120),
  web           text CHECK (web IS NULL OR (char_length(web) <= 300 AND web ~* '^https?://')),
  categoria     text NOT NULL DEFAULT 'otro'
                CHECK (categoria IN ('carta_qr', 'tpv', 'pedidos', 'reservas', 'app_marca', 'eventos', 'agencia', 'marketing', 'otro')),
  tamano        text CHECK (tamano IS NULL OR tamano IN ('mayor', 'similar', 'menor')),
  zona          text CHECK (zona IS NULL OR char_length(zona) <= 120),
  compite_con   text CHECK (compite_con IS NULL OR char_length(compite_con) <= 120),
  amenaza       text CHECK (amenaza IS NULL OR amenaza IN ('alta', 'media', 'baja')),
  precio        text CHECK (precio IS NULL OR char_length(precio) <= 400),
  propuesta     text CHECK (propuesta IS NULL OR char_length(propuesta) <= 600),
  fuerte        text CHECK (fuerte IS NULL OR char_length(fuerte) <= 3000),
  debil         text CHECK (debil IS NULL OR char_length(debil) <= 3000),
  les_funciona  text CHECK (les_funciona IS NULL OR char_length(les_funciona) <= 3000),
  clientes      text CHECK (clientes IS NULL OR char_length(clientes) <= 3000),
  copiar        text CHECK (copiar IS NULL OR char_length(copiar) <= 3000),
  fuentes       text CHECK (fuentes IS NULL OR char_length(fuentes) <= 2000),
  origen        text NOT NULL DEFAULT 'karc0' CHECK (origen IN ('karc0', 'claude')),
  estado        text NOT NULL DEFAULT 'por_auditar' CHECK (estado IN ('por_auditar', 'auditado', 'vigilar', 'descartado')),
  nota_karc0    text CHECK (nota_karc0 IS NULL OR char_length(nota_karc0) <= 2000),
  auditado_en   timestamptz,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  cambiado_en   timestamptz,
  leido_claude_en timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS competidores_nombre_uq ON public.competidores (lower(btrim(nombre)));
ALTER TABLE public.competidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competidores FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.competidores FROM PUBLIC, dk_app, dk_auth, dk_anon;

CREATE OR REPLACE FUNCTION dk.admin_competidores()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(c) - 'leido_claude_en'
             ORDER BY (c.estado = 'descartado'), (c.estado <> 'por_auditar'),
                      CASE c.amenaza WHEN 'alta' THEN 0 WHEN 'media' THEN 1 WHEN 'baja' THEN 2 ELSE 3 END, c.nombre)
      FROM public.competidores c), '[]'::jsonb);
END;
$$;

-- karc0 añade un competidor desde Central: entra «por auditar» y Claude lo ve en el buzón.
CREATE OR REPLACE FUNCTION dk.admin_competidor_nuevo(p_nombre text, p_web text, p_nota text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v uuid; w text := nullif(btrim(coalesce(p_web, '')), '');
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF char_length(btrim(coalesce(p_nombre, ''))) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'nombre no válido' USING ERRCODE = '22023'; END IF;
  IF w IS NOT NULL AND w !~* '^https?://' THEN w := 'https://' || w; END IF;
  IF w IS NOT NULL AND (char_length(w) > 300 OR w !~* '^https?://[^\s/]+\.[^\s]+$') THEN RAISE EXCEPTION 'web no válida' USING ERRCODE = '22023'; END IF;
  IF char_length(coalesce(p_nota, '')) > 2000 THEN RAISE EXCEPTION 'nota demasiado larga' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.competidores WHERE lower(btrim(nombre)) = lower(btrim(p_nombre))) THEN
    RAISE EXCEPTION 'ya existe' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.competidores (nombre, web, nota_karc0, origen, estado, cambiado_en)
  VALUES (btrim(p_nombre), w, nullif(btrim(coalesce(p_nota, '')), ''), 'karc0', 'por_auditar', now())
  RETURNING id INTO v;
  RETURN v;
END;
$$;

-- Nota de karc0 sobre una ficha; con p_reauditar la devuelve a «por auditar».
CREATE OR REPLACE FUNCTION dk.admin_competidor_nota(p_id uuid, p_nota text, p_reauditar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF char_length(coalesce(p_nota, '')) > 2000 THEN RAISE EXCEPTION 'nota demasiado larga' USING ERRCODE = '22023'; END IF;
  UPDATE public.competidores
     SET nota_karc0 = nullif(btrim(coalesce(p_nota, '')), ''), cambiado_en = now(),
         estado = CASE WHEN coalesce(p_reauditar, false) THEN 'por_auditar' ELSE estado END
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'competidor no encontrado' USING ERRCODE = 'P0002'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_competidores(), dk.admin_competidor_nuevo(text, text, text), dk.admin_competidor_nota(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_competidores(), dk.admin_competidor_nuevo(text, text, text), dk.admin_competidor_nota(uuid, text, boolean) TO dk_auth;

COMMIT;
