-- 0107 (26/10/2026, E3): medición propia con consentimiento → calor y temperatura en el mapa de Central.
-- Solo llega si el visitante pulsó «Aceptar» en el aviso de cookies (AnaliticaWeb). Nada personal: ni IP,
-- ni identificador, ni cookie propia; solo sumas por día y página (visitas, segundos, salidas de la web)
-- y por día, página y destino (clics). La web escribe con dk.medir (dk_anon, frenada por IP en /api/medir);
-- Central lee con dk.admin_mapa_calor (admin con 2FA). Se guardan 400 días.
BEGIN;

CREATE TABLE IF NOT EXISTS public.mapa_medidas (
  dia date NOT NULL,
  ruta text NOT NULL CHECK (length(ruta) BETWEEN 1 AND 300),
  visitas integer NOT NULL DEFAULT 0 CHECK (visitas >= 0),
  segundos bigint NOT NULL DEFAULT 0 CHECK (segundos >= 0),
  salidas integer NOT NULL DEFAULT 0 CHECK (salidas >= 0),
  PRIMARY KEY (dia, ruta)
);

CREATE TABLE IF NOT EXISTS public.mapa_clics (
  dia date NOT NULL,
  ruta text NOT NULL CHECK (length(ruta) BETWEEN 1 AND 300),
  destino text NOT NULL CHECK (length(destino) BETWEEN 1 AND 300),
  zona text NOT NULL DEFAULT '' CHECK (length(zona) <= 40),
  clics integer NOT NULL DEFAULT 0 CHECK (clics >= 0),
  PRIMARY KEY (dia, ruta, destino, zona)
);

ALTER TABLE public.mapa_medidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapa_clics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mapa_medidas, public.mapa_clics FROM PUBLIC;

-- Una página vista: {ruta, segundos, salida, clics: [{destino, zona}]}. Rutas internas «/…»; destinos
-- internos «/…» o externos «host/ruta». Topes: 1 h por visita y 40 clics.
CREATE OR REPLACE FUNCTION dk.medir(p jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_ruta text := p->>'ruta';
  v_seg integer;
  v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
  IF jsonb_typeof(p) <> 'object' OR v_ruta IS NULL OR v_ruta !~ '^/\S*$' OR length(v_ruta) > 300
     OR v_ruta ~ '^/(api|_next|admin-dkitchen|panel|sala|socio|m|r)(/|$)' THEN
    RETURN false;
  END IF;
  v_seg := least(3600, greatest(0, coalesce((p->>'segundos')::numeric, 0)::integer));
  INSERT INTO public.mapa_medidas AS m (dia, ruta, visitas, segundos, salidas)
  VALUES (v_hoy, v_ruta, 1, v_seg, CASE WHEN coalesce((p->>'salida')::boolean, false) THEN 1 ELSE 0 END)
  ON CONFLICT (dia, ruta) DO UPDATE SET visitas = m.visitas + 1, segundos = m.segundos + excluded.segundos, salidas = m.salidas + excluded.salidas;
  IF jsonb_typeof(p->'clics') = 'array' THEN
    INSERT INTO public.mapa_clics AS k (dia, ruta, destino, zona, clics)
    SELECT v_hoy, v_ruta, d.destino, d.zona, count(*)
    FROM (SELECT left(c->>'destino', 300) destino, coalesce(left(c->>'zona', 40), '') zona
          FROM jsonb_array_elements(p->'clics') WITH ORDINALITY x(c, n)
          WHERE n <= 40 AND jsonb_typeof(c) = 'object' AND length(coalesce(c->>'destino', '')) BETWEEN 1 AND 300
            AND (c->>'destino') !~ '\s') d
    GROUP BY d.destino, d.zona
    ON CONFLICT (dia, ruta, destino, zona) DO UPDATE SET clics = k.clics + excluded.clics;
  END IF;
  DELETE FROM public.mapa_medidas WHERE dia < v_hoy - 400 AND random() < 0.01;
  DELETE FROM public.mapa_clics WHERE dia < v_hoy - 400 AND random() < 0.01;
  RETURN true;
END;
$$;

-- Calor de los últimos p_dias (1–365): por página visitas, tiempo medio, % de salida y temperatura 0–1
-- (visitas respecto a la página más vista); y los clics más repetidos por página y destino.
CREATE OR REPLACE FUNCTION dk.admin_mapa_calor(p_dias integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_desde date := (now() AT TIME ZONE 'Europe/Madrid')::date - least(365, greatest(1, coalesce(p_dias, 30))) + 1;
  v jsonb;
BEGIN
  PERFORM dk.exigir_admin();
  WITH pag AS (
    SELECT ruta, sum(visitas)::int visitas, sum(segundos)::bigint segundos, sum(salidas)::int salidas
    FROM public.mapa_medidas WHERE dia >= v_desde GROUP BY ruta
  ), mx AS (SELECT greatest(1, max(visitas)) m FROM pag)
  SELECT jsonb_build_object(
    'desde', v_desde,
    'visitas', coalesce((SELECT sum(visitas) FROM pag), 0),
    'paginas', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'ruta', ruta, 'visitas', visitas,
        'seg_medio', round(segundos::numeric / greatest(1, visitas)),
        'salida_pct', round(100.0 * salidas / greatest(1, visitas)),
        'temp', round(visitas::numeric / (SELECT m FROM mx), 3)) ORDER BY visitas DESC) FROM pag), '[]'::jsonb),
    'clics', coalesce((SELECT jsonb_agg(jsonb_build_object('ruta', ruta, 'destino', destino, 'zona', zona, 'clics', clics) ORDER BY clics DESC)
        FROM (SELECT ruta, destino, zona, sum(clics)::int clics FROM public.mapa_clics WHERE dia >= v_desde
              GROUP BY ruta, destino, zona ORDER BY 4 DESC LIMIT 300) c), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION dk.medir(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.admin_mapa_calor(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.medir(jsonb) TO dk_anon;
GRANT EXECUTE ON FUNCTION dk.admin_mapa_calor(integer) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0107_mapa_calor.sql') ON CONFLICT DO NOTHING;

COMMIT;
