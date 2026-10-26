-- 0106 (28/10/2026, karc0, E1–E2): mapa cartográfico de la web en Central (/admin-dkitchen/mapa).
-- Cada recorrido (lanzado desde Central) guarda una foto del grafo: nodos = URL con su zona, estado
-- HTTP y avisos (callejón sin salida, roto, externo); aristas = clics posibles (enlace o formulario).
-- Se guardan todos los recorridos para poder comparar. Solo administradores con 2FA.
BEGIN;

CREATE TABLE IF NOT EXISTS public.mapa_recorridos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid,
  duracion_ms integer NOT NULL CHECK (duracion_ms >= 0),
  paginas integer NOT NULL,
  aristas integer NOT NULL,
  callejones integer NOT NULL,
  rotos integer NOT NULL,
  externos integer NOT NULL,
  nota text CHECK (nota IS NULL OR length(nota) <= 500)
);

CREATE TABLE IF NOT EXISTS public.mapa_nodos (
  recorrido_id uuid NOT NULL REFERENCES public.mapa_recorridos(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (length(url) <= 500),
  zona text NOT NULL CHECK (zona IN ('marketing', 'qr', 'signature', 'experience', 'pago', 'legal', 'panel', 'central', 'externo')),
  titulo text CHECK (titulo IS NULL OR length(titulo) <= 200),
  estado_http integer,
  ms integer,
  callejon boolean NOT NULL DEFAULT false,
  roto boolean NOT NULL DEFAULT false,
  externo boolean NOT NULL DEFAULT false,
  PRIMARY KEY (recorrido_id, url)
);

CREATE TABLE IF NOT EXISTS public.mapa_aristas (
  recorrido_id uuid NOT NULL REFERENCES public.mapa_recorridos(id) ON DELETE CASCADE,
  origen text NOT NULL,
  destino text NOT NULL,
  texto text CHECK (texto IS NULL OR length(texto) <= 120),
  tipo text NOT NULL CHECK (tipo IN ('enlace', 'formulario')),
  global boolean NOT NULL DEFAULT false,
  PRIMARY KEY (recorrido_id, origen, destino, tipo)
);

ALTER TABLE public.mapa_recorridos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapa_nodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapa_aristas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mapa_recorridos, public.mapa_nodos, public.mapa_aristas FROM PUBLIC;

-- Guarda un recorrido entero (lo calcula el servidor de Central): {duracion_ms, nodos: [...], aristas: [...]}.
CREATE OR REPLACE FUNCTION dk.admin_mapa_guardar(p jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM dk.exigir_admin();
  IF jsonb_typeof(p->'nodos') <> 'array' OR jsonb_typeof(p->'aristas') <> 'array'
     OR jsonb_array_length(p->'nodos') > 2000 OR jsonb_array_length(p->'aristas') > 50000 THEN
    RAISE EXCEPTION 'datos: recorrido' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.mapa_recorridos (creado_por, duracion_ms, paginas, aristas, callejones, rotos, externos, nota)
  SELECT dk.identidad_actual(), greatest(0, coalesce((p->>'duracion_ms')::int, 0)),
    count(*) FILTER (WHERE NOT coalesce((n->>'externo')::boolean, false)),
    jsonb_array_length(p->'aristas'),
    count(*) FILTER (WHERE coalesce((n->>'callejon')::boolean, false)),
    count(*) FILTER (WHERE coalesce((n->>'roto')::boolean, false)),
    count(*) FILTER (WHERE coalesce((n->>'externo')::boolean, false)),
    nullif(left(coalesce(p->>'nota', ''), 500), '')
  FROM jsonb_array_elements(p->'nodos') n
  RETURNING id INTO v_id;
  INSERT INTO public.mapa_nodos (recorrido_id, url, zona, titulo, estado_http, ms, callejon, roto, externo)
  SELECT DISTINCT ON (n->>'url') v_id, left(n->>'url', 500), n->>'zona', left(n->>'titulo', 200), (n->>'estado_http')::int, (n->>'ms')::int,
    coalesce((n->>'callejon')::boolean, false), coalesce((n->>'roto')::boolean, false), coalesce((n->>'externo')::boolean, false)
  FROM jsonb_array_elements(p->'nodos') n;
  INSERT INTO public.mapa_aristas (recorrido_id, origen, destino, texto, tipo, global)
  SELECT v_id, left(a->>'origen', 500), left(a->>'destino', 500), left(a->>'texto', 120), a->>'tipo', coalesce((a->>'global')::boolean, false)
  FROM jsonb_array_elements(p->'aristas') a
  ON CONFLICT DO NOTHING;
  RETURN v_id;
END;
$$;

-- Lee un recorrido (el último si p_id es NULL) con sus nodos y aristas, y la lista de recorridos.
CREATE OR REPLACE FUNCTION dk.admin_mapa(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM dk.exigir_admin();
  v_id := coalesce(p_id, (SELECT id FROM public.mapa_recorridos ORDER BY creado_en DESC LIMIT 1));
  RETURN jsonb_build_object(
    'recorridos', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'creado_en', creado_en, 'paginas', paginas, 'callejones', callejones, 'rotos', rotos) ORDER BY creado_en DESC)
      FROM (SELECT * FROM public.mapa_recorridos ORDER BY creado_en DESC LIMIT 30) r), '[]'::jsonb),
    'recorrido', (SELECT to_jsonb(r) FROM public.mapa_recorridos r WHERE id = v_id),
    'nodos', coalesce((SELECT jsonb_agg(jsonb_build_object('url', url, 'zona', zona, 'titulo', titulo, 'estado_http', estado_http, 'ms', ms,
        'callejon', callejon, 'roto', roto, 'externo', externo) ORDER BY zona, url) FROM public.mapa_nodos WHERE recorrido_id = v_id), '[]'::jsonb),
    'aristas', coalesce((SELECT jsonb_agg(jsonb_build_object('o', origen, 'd', destino, 't', texto, 'f', tipo = 'formulario', 'g', global))
      FROM public.mapa_aristas WHERE recorrido_id = v_id), '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_mapa_guardar(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.admin_mapa(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_mapa_guardar(jsonb) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.admin_mapa(uuid) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0106_mapa_web.sql') ON CONFLICT DO NOTHING;

COMMIT;
