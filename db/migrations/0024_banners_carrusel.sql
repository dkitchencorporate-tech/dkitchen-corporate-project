-- 0024 — Banners en carrusel (28/09/2026, petición de karc0)
--
-- El "banner" deja de ser un modal puntual: es un carrusel fijo arriba de la
-- carta con banners ya diseñados (imagen, texto opcional).
--   Básico:   1 banner activo.
--   Ampliado: hasta 3 banners activos a la vez, con programación.
-- Un banner puede ser solo imagen (sin título) o solo texto.

BEGIN;

ALTER TABLE public.promociones ALTER COLUMN titulo DROP NOT NULL;
ALTER TABLE public.promociones DROP CONSTRAINT IF EXISTS promociones_titulo_check;
ALTER TABLE public.promociones DROP CONSTRAINT IF EXISTS promociones_contenido_check;
ALTER TABLE public.promociones ADD CONSTRAINT promociones_contenido_check CHECK (
  (titulo IS NULL OR char_length(btrim(titulo)) BETWEEN 1 AND 60)
  AND (imagen_url IS NOT NULL OR (titulo IS NOT NULL AND char_length(btrim(titulo)) > 0))
);

CREATE OR REPLACE FUNCTION dk.tope_promociones()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_plan text; v_tope int; v_activas int;
BEGIN
  IF NOT NEW.activa THEN RETURN NEW; END IF;
  SELECT plan INTO v_plan FROM public.restaurantes WHERE id = NEW.restaurante_id;
  v_tope := CASE WHEN v_plan = 'ampliado' THEN 3 ELSE 1 END;
  SELECT count(*) INTO v_activas FROM public.promociones
   WHERE restaurante_id = NEW.restaurante_id AND activa AND id <> NEW.id;
  IF v_activas >= v_tope THEN
    RAISE EXCEPTION '%', CASE WHEN v_plan = 'ampliado'
      THEN 'Puedes tener hasta 3 banners activos a la vez. Pausa uno para activar otro.'
      ELSE 'Tu plan Básico permite 1 banner activo. Pausa el actual o pasa al plan Ampliado (hasta 3 en carrusel).' END
      USING ERRCODE = 'P0001';
  END IF;
  IF v_plan <> 'ampliado' AND (NEW.dias IS NOT NULL OR NEW.hora_inicio IS NOT NULL OR NEW.hora_fin IS NOT NULL) THEN
    RAISE EXCEPTION 'La programación por días y horas es del plan Ampliado.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- Hasta 3 banners vigentes, en orden de prioridad
DROP FUNCTION IF EXISTS dk.promocion_vigente(text);
CREATE FUNCTION dk.banners_vigentes(p_slug text)
RETURNS TABLE (id uuid, titulo text, texto text, imagen_url text, boton_texto text, boton_seccion uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH ahora AS (SELECT (now() AT TIME ZONE 'Europe/Madrid') t)
  SELECT p.id, p.titulo, p.texto, p.imagen_url, p.boton_texto, p.boton_seccion
  FROM public.promociones p
  JOIN public.restaurantes r ON r.id = p.restaurante_id, ahora
  WHERE r.slug = lower(p_slug) AND r.activo AND r.estado_acceso IN ('activo', 'gracia')
    AND p.activa
    AND (p.inicio IS NULL OR ahora.t::date >= p.inicio)
    AND (p.fin IS NULL OR ahora.t::date <= p.fin)
    AND (p.dias IS NULL OR extract(isodow FROM ahora.t)::smallint = ANY (p.dias))
    AND (p.hora_inicio IS NULL OR ahora.t::time >= p.hora_inicio)
    AND (p.hora_fin IS NULL OR ahora.t::time <= p.hora_fin)
  ORDER BY p.prioridad DESC, p.creado_en DESC
  LIMIT CASE WHEN (SELECT plan FROM public.restaurantes WHERE slug = lower(p_slug)) = 'ampliado' THEN 3 ELSE 1 END;
$$;
REVOKE ALL ON FUNCTION dk.banners_vigentes(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.banners_vigentes(text) TO dk_anon;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0024_banners_carrusel.sql');

COMMIT;
