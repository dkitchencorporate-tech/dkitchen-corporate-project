-- 0076 (13/10/2026): LANDING DEL LOCAL editable desde el Estudio del panel
-- (PLAN_LANDING_LOCAL_2026-10-13.md). Una fila por local. Se escribe SOLO con
-- dk.guardar_landing() (dueño, socio con permiso o admin con 2FA vía dk.gestiona)
-- y se lee en público con dk.landing_publica(slug). Topes por plan:
--   basico (Carta 9 €): sin landing · ampliado (Local 29 €): 3 estilos, 4 fotos, sin FAQ ·
--   sala (69 €): 4 estilos, 8 fotos y hasta 6 preguntas.
BEGIN;

CREATE TABLE IF NOT EXISTS public.landing_local (
  restaurante_id    uuid PRIMARY KEY REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  activa            boolean NOT NULL DEFAULT true,
  estilo            text NOT NULL DEFAULT 'noir' CHECK (estilo IN ('noir', 'crema', 'brasa', 'mar')),
  titular           text CHECK (char_length(titular) <= 90),
  subtitulo         text CHECK (char_length(subtitulo) <= 160),
  historia          text CHECK (char_length(historia) <= 600),
  foto_historia_url text CHECK (foto_historia_url ~ '^https://'),
  galeria           text[] NOT NULL DEFAULT '{}' CHECK (cardinality(galeria) <= 8),
  destacados        uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(destacados) <= 6),
  bloques           text[] NOT NULL DEFAULT ARRAY['historia', 'destacados', 'galeria', 'datos', 'resenas', 'faq', 'reserva'],
  faq               jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(faq) = 'array' AND jsonb_array_length(faq) <= 6),
  cta_principal     text NOT NULL DEFAULT 'reservar' CHECK (cta_principal IN ('reservar', 'carta', 'llamar')),
  seo_titulo        text CHECK (char_length(seo_titulo) <= 70),
  seo_descripcion   text CHECK (char_length(seo_descripcion) <= 160),
  actualizado_en    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_local ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.landing_local FROM PUBLIC, dk_anon, dk_auth;
GRANT SELECT ON public.landing_local TO dk_auth;
DROP POLICY IF EXISTS landing_lee_quien_gestiona ON public.landing_local;
CREATE POLICY landing_lee_quien_gestiona ON public.landing_local FOR SELECT TO dk_auth
  USING (dk.gestiona(restaurante_id));

-- Guardar (todo validado aquí; el navegador no decide topes)
CREATE OR REPLACE FUNCTION dk.guardar_landing(p_rest uuid, p jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_plan text; v_estilo text; v_galeria text[]; v_dest uuid[]; v_bloques text[]; v_faq jsonb; v_foto text;
  v_max_fotos int; v_url text;
BEGIN
  IF NOT dk.gestiona(p_rest) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT plan INTO v_plan FROM public.restaurantes WHERE id = p_rest;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF v_plan = 'basico' THEN
    RAISE EXCEPTION 'La landing va incluida desde el plan Local.' USING ERRCODE = 'P0001';
  END IF;
  v_max_fotos := CASE WHEN v_plan = 'sala' THEN 8 ELSE 4 END;

  v_estilo := coalesce(p->>'estilo', 'noir');
  IF v_estilo NOT IN ('noir', 'crema', 'brasa', 'mar') THEN RAISE EXCEPTION 'Estilo no válido.' USING ERRCODE = 'P0001'; END IF;
  IF v_plan <> 'sala' AND v_estilo = 'mar' THEN
    RAISE EXCEPTION 'El estilo Mar va incluido en el plan Sala.' USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(array_agg(u), '{}') INTO v_galeria
    FROM (SELECT jsonb_array_elements_text(coalesce(p->'galeria', '[]')) AS u) x WHERE u ~ '^https://[^\s<>"]+$';
  IF cardinality(v_galeria) > v_max_fotos THEN
    RAISE EXCEPTION 'Tu plan admite % fotos en la galería.', v_max_fotos USING ERRCODE = 'P0001';
  END IF;
  FOREACH v_url IN ARRAY v_galeria LOOP
    IF char_length(v_url) > 600 THEN RAISE EXCEPTION 'Foto no válida.' USING ERRCODE = 'P0001'; END IF;
  END LOOP;

  -- Destacados: solo platos de ESTE local
  SELECT coalesce(array_agg(pl.id ORDER BY x.n), '{}') INTO v_dest
    FROM (SELECT (e)::uuid AS id, n FROM jsonb_array_elements_text(coalesce(p->'destacados', '[]')) WITH ORDINALITY AS t(e, n)
           WHERE e ~* '^[0-9a-f-]{36}$') x
    JOIN public.menu_items pl ON pl.id = x.id AND pl.restaurante_id = p_rest;
  IF cardinality(v_dest) > 6 THEN RAISE EXCEPTION 'Máximo 6 platos destacados.' USING ERRCODE = 'P0001'; END IF;

  SELECT coalesce(array_agg(b ORDER BY n), '{}') INTO v_bloques
    FROM jsonb_array_elements_text(coalesce(p->'bloques', '[]')) WITH ORDINALITY AS t(b, n)
   WHERE b IN ('historia', 'destacados', 'galeria', 'datos', 'resenas', 'faq', 'reserva');
  IF cardinality(v_bloques) = 0 THEN v_bloques := ARRAY['historia', 'destacados', 'galeria', 'datos', 'resenas', 'faq', 'reserva']; END IF;
  IF cardinality(v_bloques) <> (SELECT count(DISTINCT b) FROM unnest(v_bloques) b) THEN
    RAISE EXCEPTION 'Bloques repetidos.' USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('p', left(q->>'p', 140), 'r', left(q->>'r', 400))), '[]') INTO v_faq
    FROM jsonb_array_elements(coalesce(p->'faq', '[]')) q
   WHERE jsonb_typeof(q) = 'object' AND char_length(coalesce(q->>'p', '')) > 0 AND char_length(coalesce(q->>'r', '')) > 0;
  IF v_plan <> 'sala' AND jsonb_array_length(v_faq) > 0 THEN
    RAISE EXCEPTION 'Las preguntas frecuentes van incluidas en el plan Sala.' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_array_length(v_faq) > 6 THEN RAISE EXCEPTION 'Máximo 6 preguntas.' USING ERRCODE = 'P0001'; END IF;

  v_foto := nullif(p->>'foto_historia_url', '');
  IF v_foto IS NOT NULL AND v_foto !~ '^https://[^\s<>"]+$' THEN RAISE EXCEPTION 'Foto no válida.' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.landing_local AS l (restaurante_id, activa, estilo, titular, subtitulo, historia, foto_historia_url,
      galeria, destacados, bloques, faq, cta_principal, seo_titulo, seo_descripcion, actualizado_en)
  VALUES (p_rest, coalesce((p->>'activa')::boolean, true), v_estilo,
      nullif(left(btrim(p->>'titular'), 90), ''), nullif(left(btrim(p->>'subtitulo'), 160), ''), nullif(left(btrim(p->>'historia'), 600), ''),
      v_foto, v_galeria, v_dest, v_bloques, v_faq,
      CASE WHEN p->>'cta_principal' IN ('reservar', 'carta', 'llamar') THEN p->>'cta_principal' ELSE 'reservar' END,
      nullif(left(btrim(p->>'seo_titulo'), 70), ''), nullif(left(btrim(p->>'seo_descripcion'), 160), ''), now())
  ON CONFLICT (restaurante_id) DO UPDATE SET
      activa = EXCLUDED.activa, estilo = EXCLUDED.estilo, titular = EXCLUDED.titular, subtitulo = EXCLUDED.subtitulo,
      historia = EXCLUDED.historia, foto_historia_url = EXCLUDED.foto_historia_url, galeria = EXCLUDED.galeria,
      destacados = EXCLUDED.destacados, bloques = EXCLUDED.bloques, faq = EXCLUDED.faq, cta_principal = EXCLUDED.cta_principal,
      seo_titulo = EXCLUDED.seo_titulo, seo_descripcion = EXCLUDED.seo_descripcion, actualizado_en = now();
END;
$$;

-- Lectura pública por slug (la página /l/<slug>): solo si está activa y el plan la incluye
CREATE OR REPLACE FUNCTION dk.landing_publica(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT jsonb_build_object('estilo', l.estilo, 'titular', l.titular, 'subtitulo', l.subtitulo, 'historia', l.historia,
           'foto_historia_url', l.foto_historia_url, 'galeria', to_jsonb(l.galeria), 'destacados', to_jsonb(l.destacados),
           'bloques', to_jsonb(l.bloques), 'faq', CASE WHEN r.plan = 'sala' THEN l.faq ELSE '[]'::jsonb END,
           'cta_principal', l.cta_principal, 'seo_titulo', l.seo_titulo, 'seo_descripcion', l.seo_descripcion)
    FROM public.landing_local l JOIN public.restaurantes r ON r.id = l.restaurante_id
   WHERE r.slug = p_slug AND l.activa AND r.plan <> 'basico';
$$;

REVOKE ALL ON FUNCTION dk.guardar_landing(uuid, jsonb), dk.landing_publica(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.landing_publica(text) TO dk_anon, dk_auth;
GRANT EXECUTE ON FUNCTION dk.guardar_landing(uuid, jsonb) TO dk_auth;

COMMIT;
