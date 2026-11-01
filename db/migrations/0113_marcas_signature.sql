-- 0113 (02/11/2026, Signature semiautomática con el motor white label · Claude, con autorización de karc0):
--   Encargo de marca por proyecto Signature. Dirección lo pide desde Central (botón «Preparar marca»);
--   el flujo del repo privado dkitchen-marcas (GitHub Actions) lo recoge, crea repo + base + Vercel + subdominio
--   y va escribiendo cada paso del checklist. Central solo lee y pide: nunca toca la infraestructura.
BEGIN;

CREATE TABLE IF NOT EXISTS public.marcas_signature (
  proyecto_id    uuid PRIMARY KEY REFERENCES public.proyectos(id) ON DELETE CASCADE,
  slug           text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  nombre         text NOT NULL CHECK (char_length(trim(nombre)) BETWEEN 2 AND 80),
  color          text NOT NULL DEFAULT '#6E0C2B' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  preajuste      text NOT NULL DEFAULT 'restaurante' CHECK (preajuste IN ('restaurante', 'bar', 'dark_kitchen', 'dark_store')),
  ciudad         text CHECK (char_length(ciudad) <= 60),
  estado         text NOT NULL DEFAULT 'pedida' CHECK (estado IN ('pedida', 'en_curso', 'lista', 'error')),
  pasos          jsonb NOT NULL DEFAULT '{}'::jsonb,
  url            text CHECK (url IS NULL OR (url ~ '^https://' AND char_length(url) <= 200)),
  repo           text CHECK (char_length(repo) <= 120),
  error          text CHECK (char_length(error) <= 500),
  prueba         boolean NOT NULL DEFAULT false,
  pedida_por     uuid REFERENCES public.identidades(id),
  intentos       integer NOT NULL DEFAULT 0,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marcas_signature_estado_idx ON public.marcas_signature (estado) WHERE estado IN ('pedida', 'en_curso');
ALTER TABLE public.marcas_signature ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marcas_signature FROM PUBLIC;

-- Pedir (o volver a pedir tras un error) la marca de un proyecto Signature ya pagado. Solo dirección.
CREATE OR REPLACE FUNCTION dk.admin_marca_pedir(p_proyecto uuid, p_slug text, p_nombre text, p_color text, p_preajuste text, p_ciudad text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r public.proyectos%ROWTYPE; v_slug text := lower(trim(coalesce(p_slug, ''))); m public.marcas_signature%ROWTYPE;
BEGIN
  PERFORM dk.exigir_direccion();
  SELECT * INTO r FROM public.proyectos WHERE id = p_proyecto;
  IF NOT FOUND OR r.producto <> 'signature' THEN RAISE EXCEPTION 'proyecto Signature no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF r.fase IN ('solicitud', 'descartado') THEN RAISE EXCEPTION 'la marca se prepara después del pago' USING ERRCODE = '22023'; END IF;
  SELECT * INTO m FROM public.marcas_signature WHERE proyecto_id = p_proyecto;
  IF FOUND AND m.estado IN ('pedida', 'en_curso', 'lista') THEN RAISE EXCEPTION 'la marca ya está %', m.estado USING ERRCODE = '22023'; END IF;
  IF FOUND AND m.slug <> v_slug THEN RAISE EXCEPTION 'el nombre corto no se puede cambiar' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.marcas_signature AS x (proyecto_id, slug, nombre, color, preajuste, ciudad, prueba, pedida_por)
  VALUES (p_proyecto, v_slug, trim(p_nombre), upper(coalesce(nullif(trim(p_color), ''), '#6E0C2B')),
          coalesce(nullif(p_preajuste, ''), 'restaurante'), nullif(trim(coalesce(p_ciudad, '')), ''),
          coalesce(r.negocio, '') ~* '^PRUEBA', dk.identidad_actual())
  ON CONFLICT (proyecto_id) DO UPDATE SET nombre = EXCLUDED.nombre, color = EXCLUDED.color, preajuste = EXCLUDED.preajuste,
    ciudad = EXCLUDED.ciudad, estado = 'pedida', error = NULL, pedida_por = EXCLUDED.pedida_por, actualizado_en = now();
  INSERT INTO public.proyecto_eventos (proyecto_id, tipo, texto, autor)
  VALUES (p_proyecto, 'nota', 'Marca pedida al motor: ' || v_slug, dk.identidad_actual());
  RETURN v_slug;
END;
$$;

-- Estado de la marca de un proyecto (o de todos, para el tablero). Solo administradores de Central.
CREATE OR REPLACE FUNCTION dk.admin_marcas(p_proyecto uuid DEFAULT NULL)
RETURNS TABLE (proyecto_id uuid, slug text, nombre text, color text, preajuste text, ciudad text, estado text, pasos jsonb,
               url text, repo text, error text, prueba boolean, creado_en timestamptz, actualizado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT m.proyecto_id, m.slug, m.nombre, m.color, m.preajuste, m.ciudad, m.estado, m.pasos, m.url, m.repo,
                      m.error, m.prueba, m.creado_en, m.actualizado_en
                 FROM public.marcas_signature m WHERE p_proyecto IS NULL OR m.proyecto_id = p_proyecto;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_marca_pedir(uuid, text, text, text, text, text), dk.admin_marcas(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_marca_pedir(uuid, text, text, text, text, text), dk.admin_marcas(uuid) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0113_marcas_signature.sql') ON CONFLICT DO NOTHING;
COMMIT;
