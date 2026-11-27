-- =============================================================================
-- 0125 · Central → Ventas → Ideas y contenido (27/11/2026, Alex)
-- Tablero único de contenido: lluvia de ideas → propuesta de Agente DK →
-- aprobación de Alex → producción → programada → publicada y medida.
-- Solo Dirección (dk.exigir_direccion()). Nada se publica sin estado «aprobada».
-- (0124 queda reservada para la migración de rol_admin y estado «enviado».)
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.ideas_contenido (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 2 AND 160),
  idea            text CHECK (idea IS NULL OR char_length(idea) <= 6000),
  serie           text CHECK (serie IS NULL OR char_length(serie) <= 120),
  orden           integer NOT NULL DEFAULT 100,
  nicho           text CHECK (nicho IS NULL OR char_length(nicho) <= 80),
  publico         text NOT NULL DEFAULT 'dueno' CHECK (publico IN ('dueno', 'emprendedor', 'empleado', 'cliente_final', 'general')),
  servicio        text NOT NULL DEFAULT 'general' CHECK (servicio IN ('signature', 'experience', 'qr', 'auditoria', 'general')),
  red             text NOT NULL DEFAULT 'tiktok' CHECK (red IN ('tiktok', 'instagram', 'facebook', 'todas')),
  formato         text CHECK (formato IS NULL OR char_length(formato) <= 80),
  desarrollo      text CHECK (desarrollo IS NULL OR char_length(desarrollo) <= 12000),
  nota_alex       text CHECK (nota_alex IS NULL OR char_length(nota_alex) <= 4000),
  estado          text NOT NULL DEFAULT 'idea' CHECK (estado IN ('idea', 'propuesta', 'aprobada', 'produccion', 'programada', 'publicada', 'descartada')),
  fecha_prevista  date,
  enlace          text CHECK (enlace IS NULL OR char_length(enlace) <= 500),
  vistas          integer CHECK (vistas IS NULL OR vistas >= 0),
  retencion_seg   numeric(6,2) CHECK (retencion_seg IS NULL OR retencion_seg >= 0),
  compartidos     integer CHECK (compartidos IS NULL OR compartidos >= 0),
  guardados       integer CHECK (guardados IS NULL OR guardados >= 0),
  comentarios     integer CHECK (comentarios IS NULL OR comentarios >= 0),
  aprendizaje     text CHECK (aprendizaje IS NULL OR char_length(aprendizaje) <= 4000),
  creado_por      uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ideas_contenido_estado_idx ON public.ideas_contenido (estado, serie, orden, creado_en);

ALTER TABLE public.ideas_contenido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas_contenido FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ideas_contenido FROM PUBLIC, dk_app, dk_auth, dk_anon, dk_webhook;

CREATE OR REPLACE FUNCTION dk.ideas_listar()
RETURNS SETOF public.ideas_contenido
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  RETURN QUERY SELECT * FROM public.ideas_contenido i
   ORDER BY i.fecha_prevista NULLS LAST, coalesce(i.serie, '~'), i.orden, i.creado_en DESC
   LIMIT 400;
END;
$$;

-- Captura rápida de Alex: un título y el texto tal cual se le ocurre.
CREATE OR REPLACE FUNCTION dk.ideas_crear(p_titulo text, p_idea text, p_publico text, p_servicio text, p_red text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM dk.exigir_direccion();
  IF (SELECT count(*) FROM public.ideas_contenido WHERE creado_en > now() - interval '1 hour') >= 60 THEN
    RAISE EXCEPTION 'demasiadas ideas en una hora' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public.ideas_contenido (titulo, idea, publico, servicio, red, creado_por)
  VALUES (btrim(p_titulo), nullif(left(btrim(coalesce(p_idea, '')), 6000), ''),
          coalesce(nullif(p_publico, ''), 'dueno'), coalesce(nullif(p_servicio, ''), 'general'),
          coalesce(nullif(p_red, ''), 'tiktok'), dk.identidad_actual())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Cambio de estado con nota opcional (botones Aprobar / Pedir cambios / Descartar / Recuperar).
CREATE OR REPLACE FUNCTION dk.ideas_estado(p_id uuid, p_estado text, p_nota text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE v_nota text := nullif(left(btrim(coalesce(p_nota, '')), 4000), '');
BEGIN
  PERFORM dk.exigir_direccion();
  IF p_estado NOT IN ('idea', 'propuesta', 'aprobada', 'produccion', 'programada', 'publicada', 'descartada') THEN
    RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.ideas_contenido
     SET estado = p_estado,
         nota_alex = CASE WHEN v_nota IS NULL THEN nota_alex
                          ELSE left(coalesce(nota_alex || E'\n\n', '') || '— ' || to_char(now() AT TIME ZONE 'Europe/Madrid', 'DD/MM HH24:MI') || ' — ' || v_nota, 4000) END,
         actualizado_en = now()
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'idea no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$$;

-- Edición completa (Alex o Agente DK): campos de texto, fecha y medición.
CREATE OR REPLACE FUNCTION dk.ideas_guardar(p_id uuid, p jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  UPDATE public.ideas_contenido SET
    titulo         = coalesce(nullif(btrim(p->>'titulo'), ''), titulo),
    idea           = CASE WHEN p ? 'idea' THEN nullif(btrim(p->>'idea'), '') ELSE idea END,
    serie          = CASE WHEN p ? 'serie' THEN nullif(btrim(p->>'serie'), '') ELSE serie END,
    nicho          = CASE WHEN p ? 'nicho' THEN nullif(btrim(p->>'nicho'), '') ELSE nicho END,
    publico        = coalesce(nullif(p->>'publico', ''), publico),
    servicio       = coalesce(nullif(p->>'servicio', ''), servicio),
    red            = coalesce(nullif(p->>'red', ''), red),
    formato        = CASE WHEN p ? 'formato' THEN nullif(btrim(p->>'formato'), '') ELSE formato END,
    desarrollo     = CASE WHEN p ? 'desarrollo' THEN nullif(btrim(p->>'desarrollo'), '') ELSE desarrollo END,
    fecha_prevista = CASE WHEN p ? 'fecha_prevista' THEN nullif(p->>'fecha_prevista', '')::date ELSE fecha_prevista END,
    enlace         = CASE WHEN p ? 'enlace' THEN nullif(btrim(p->>'enlace'), '') ELSE enlace END,
    vistas         = CASE WHEN p ? 'vistas' THEN nullif(p->>'vistas', '')::integer ELSE vistas END,
    retencion_seg  = CASE WHEN p ? 'retencion_seg' THEN nullif(replace(p->>'retencion_seg', ',', '.'), '')::numeric ELSE retencion_seg END,
    compartidos    = CASE WHEN p ? 'compartidos' THEN nullif(p->>'compartidos', '')::integer ELSE compartidos END,
    guardados      = CASE WHEN p ? 'guardados' THEN nullif(p->>'guardados', '')::integer ELSE guardados END,
    comentarios    = CASE WHEN p ? 'comentarios' THEN nullif(p->>'comentarios', '')::integer ELSE comentarios END,
    aprendizaje    = CASE WHEN p ? 'aprendizaje' THEN nullif(btrim(p->>'aprendizaje'), '') ELSE aprendizaje END,
    actualizado_en = now()
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'idea no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.ideas_listar(), dk.ideas_crear(text, text, text, text, text),
  dk.ideas_estado(uuid, text, text), dk.ideas_guardar(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.ideas_listar(), dk.ideas_crear(text, text, text, text, text),
  dk.ideas_estado(uuid, text, text), dk.ideas_guardar(uuid, jsonb) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0125_ideas_contenido.sql') ON CONFLICT DO NOTHING;

COMMIT;
