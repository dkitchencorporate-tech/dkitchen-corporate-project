-- 0037 · Estudio de carta (karc0, 30/09/2026)
-- 1) Platos: etiqueta (Especial, Nuevo, Recomendado), promoción con precio y
--    fechas (la carta muestra el precio normal tachado solo mientras está
--    vigente) y combos con precio cerrado que agrupan otros platos.
-- 2) Banners: el botón puede llevar al inicio, a una sección, a un plato,
--    a reservar o no mostrarse.
-- 3) Legales del negocio: datos del titular que el cliente escribe y publica
--    él mismo (nada se muestra hasta que activa sus páginas legales).

-- 1 · Platos --------------------------------------------------------------
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS etiqueta text,
  ADD COLUMN IF NOT EXISTS precio_promo numeric(10,2),
  ADD COLUMN IF NOT EXISTS promo_desde date,
  ADD COLUMN IF NOT EXISTS promo_hasta date,
  ADD COLUMN IF NOT EXISTS es_combo boolean NOT NULL DEFAULT false;

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_etiqueta_check;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_etiqueta_check
  CHECK (etiqueta IS NULL OR etiqueta IN ('especial', 'nuevo', 'recomendado'));
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_promo_check;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_promo_check CHECK (
  precio_promo IS NULL OR (precio_promo >= 0 AND precio_promo < precio
    AND (promo_desde IS NULL OR promo_hasta IS NULL OR promo_desde <= promo_hasta)));

GRANT UPDATE (etiqueta, precio_promo, promo_desde, promo_hasta, es_combo) ON public.menu_items TO dk_auth;

-- Precio que se cobra hoy (promoción vigente o precio normal), en un único sitio.
CREATE OR REPLACE FUNCTION dk.precio_vigente(p public.menu_items)
RETURNS numeric LANGUAGE sql STABLE SET search_path TO pg_catalog AS $$
  SELECT CASE WHEN p.precio_promo IS NOT NULL
               AND (p.promo_desde IS NULL OR p.promo_desde <= (now() AT TIME ZONE 'Europe/Madrid')::date)
               AND (p.promo_hasta IS NULL OR p.promo_hasta >= (now() AT TIME ZONE 'Europe/Madrid')::date)
              THEN p.precio_promo ELSE p.precio END;
$$;

-- Componentes de un combo
CREATE TABLE IF NOT EXISTS public.menu_combo_items (
  combo_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  item_id  uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  cantidad smallint NOT NULL DEFAULT 1 CHECK (cantidad BETWEEN 1 AND 20),
  PRIMARY KEY (combo_id, item_id),
  CHECK (combo_id <> item_id)
);
CREATE INDEX IF NOT EXISTS menu_combo_items_item_idx ON public.menu_combo_items (item_id);

-- Un combo solo agrupa platos normales del mismo restaurante (nada de combos dentro de combos).
CREATE OR REPLACE FUNCTION dk.validar_combo_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE c public.menu_items; i public.menu_items; n int;
BEGIN
  SELECT * INTO c FROM public.menu_items WHERE id = NEW.combo_id;
  SELECT * INTO i FROM public.menu_items WHERE id = NEW.item_id;
  IF NOT c.es_combo THEN RAISE EXCEPTION 'el plato no es un combo' USING ERRCODE = '22023'; END IF;
  IF i.es_combo THEN RAISE EXCEPTION 'un combo no puede contener otro combo' USING ERRCODE = '22023'; END IF;
  IF c.restaurante_id <> i.restaurante_id THEN RAISE EXCEPTION 'plato de otro restaurante' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO n FROM public.menu_combo_items WHERE combo_id = NEW.combo_id AND item_id <> NEW.item_id;
  IF n >= 12 THEN RAISE EXCEPTION 'un combo admite como máximo 12 platos' USING ERRCODE = '22023'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validar_combo_item ON public.menu_combo_items;
CREATE TRIGGER validar_combo_item BEFORE INSERT OR UPDATE ON public.menu_combo_items
  FOR EACH ROW EXECUTE FUNCTION dk.validar_combo_item();

ALTER TABLE public.menu_combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_combo_items FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_combo_items TO dk_auth;
GRANT SELECT ON public.menu_combo_items TO dk_anon, dk_sincronizacion;

DROP POLICY IF EXISTS combo_del_propietario ON public.menu_combo_items;
CREATE POLICY combo_del_propietario ON public.menu_combo_items FOR ALL TO dk_auth
  USING (EXISTS (SELECT 1 FROM public.menu_items m JOIN public.restaurantes r ON r.id = m.restaurante_id
                  WHERE m.id = combo_id AND r.propietario = dk.identidad_actual()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_items m JOIN public.restaurantes r ON r.id = m.restaurante_id
                  WHERE m.id = combo_id AND r.propietario = dk.identidad_actual()
                    AND r.estado_acceso IN ('activo', 'gracia')));
-- Público: se ve lo que se ve del combo (las políticas de menu_items filtran restaurante activo y disponibilidad).
DROP POLICY IF EXISTS combo_publico ON public.menu_combo_items;
CREATE POLICY combo_publico ON public.menu_combo_items FOR SELECT TO dk_anon, dk_sincronizacion
  USING (EXISTS (SELECT 1 FROM public.menu_items m WHERE m.id = combo_id));

-- 2 · Banners ---------------------------------------------------------------
ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS boton_destino text NOT NULL DEFAULT 'inicio',
  ADD COLUMN IF NOT EXISTS boton_plato uuid REFERENCES public.menu_items(id) ON DELETE SET NULL;
ALTER TABLE public.promociones DROP CONSTRAINT IF EXISTS promociones_boton_destino_check;
ALTER TABLE public.promociones ADD CONSTRAINT promociones_boton_destino_check
  CHECK (boton_destino IN ('inicio', 'seccion', 'plato', 'reservar', 'ninguno'));
-- Los banners antiguos con sección elegida pasan a destino «seccion».
UPDATE public.promociones SET boton_destino = 'seccion' WHERE boton_seccion IS NOT NULL AND boton_destino = 'inicio';
GRANT UPDATE (boton_destino, boton_plato) ON public.promociones TO dk_auth;

DROP FUNCTION IF EXISTS dk.banners_vigentes(text);
CREATE FUNCTION dk.banners_vigentes(p_slug text)
RETURNS TABLE (id uuid, titulo text, texto text, imagen_url text, boton_texto text, boton_seccion uuid,
               boton_destino text, boton_plato uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH ahora AS (SELECT (now() AT TIME ZONE 'Europe/Madrid') t)
  SELECT p.id, p.titulo, p.texto, p.imagen_url, p.boton_texto, p.boton_seccion, p.boton_destino, p.boton_plato
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

-- 3 · Legales del negocio ---------------------------------------------------
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS legal_titular text CHECK (legal_titular IS NULL OR char_length(legal_titular) <= 160),
  ADD COLUMN IF NOT EXISTS legal_nif text CHECK (legal_nif IS NULL OR legal_nif ~ '^[A-Z0-9-]{8,12}$'),
  ADD COLUMN IF NOT EXISTS legal_email text CHECK (legal_email IS NULL OR (char_length(legal_email) <= 160 AND legal_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  ADD COLUMN IF NOT EXISTS legal_domicilio text CHECK (legal_domicilio IS NULL OR char_length(legal_domicilio) <= 240),
  ADD COLUMN IF NOT EXISTS legal_activo boolean NOT NULL DEFAULT false;
GRANT SELECT (legal_titular, legal_nif, legal_email, legal_domicilio, legal_activo) ON public.restaurantes TO dk_auth;
GRANT UPDATE (legal_titular, legal_nif, legal_email, legal_domicilio, legal_activo) ON public.restaurantes TO dk_auth;

-- Solo se publica lo que el propio cliente ha activado.
CREATE OR REPLACE FUNCTION dk.legal_publico(p_slug text)
RETURNS TABLE (nombre text, titular text, nif text, email text, domicilio text, telefono text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT r.nombre, r.legal_titular, r.legal_nif, r.legal_email, coalesce(r.legal_domicilio, r.direccion), r.telefono
    FROM public.restaurantes r
   WHERE r.slug = p_slug AND r.activo AND r.legal_activo AND r.legal_titular IS NOT NULL AND r.legal_email IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION dk.legal_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.legal_publico(text) TO dk_anon, dk_auth;
