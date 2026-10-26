-- 0105 (28/10/2026, karc0, R5): ofertas por fecha para los locales clientes (Halloween, Navidad,
-- San Valentín, Carnaval…). Central las edita (texto, qué incluye, precio, fechas en que se ven,
-- encendida); el panel del dueño las enseña en Negocio → Mejoras solo dentro de sus fechas.
-- El precio lo fija SIEMPRE la base: dk.oferta_fecha_solicitar copia el de la oferta en la solicitud
-- y el servidor cobra ese (o, mientras no haya pasarela, avisa a Central: «Solicitud recibida»).
-- Una solicitud por local y oferta. Central con 2FA (dk.exigir_admin).
BEGIN;

CREATE TABLE IF NOT EXISTS public.ofertas_fecha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema text NOT NULL CHECK (tema IN ('halloween', 'navidad', 'san_valentin', 'carnaval', 'otra')),
  titulo text NOT NULL CHECK (length(titulo) BETWEEN 3 AND 80),
  descripcion text NOT NULL CHECK (length(descripcion) BETWEEN 3 AND 400),
  incluye text[] NOT NULL DEFAULT '{}' CHECK (cardinality(incluye) <= 6),
  precio_centimos integer NOT NULL CHECK (precio_centimos BETWEEN 100 AND 100000),
  precio_ancla_centimos integer CHECK (precio_ancla_centimos IS NULL OR precio_ancla_centimos > precio_centimos),
  desde date NOT NULL,
  hasta date NOT NULL CHECK (hasta >= desde),
  activa boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  cambiado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ofertas_fecha ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ofertas_fecha FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.ofertas_fecha_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.ofertas_fecha(id) ON DELETE RESTRICT,
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  -- Copia de la oferta en el momento de pedirla: lo que se cobra aunque Central cambie la oferta después.
  titulo text NOT NULL,
  precio_centimos integer NOT NULL CHECK (precio_centimos >= 100),
  estado text NOT NULL DEFAULT 'recibida' CHECK (estado IN ('recibida', 'en_curso', 'entregada', 'descartada')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (oferta_id, restaurante_id)
);
ALTER TABLE public.ofertas_fecha_solicitudes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ofertas_fecha_solicitudes FROM PUBLIC;

CREATE OR REPLACE FUNCTION dk.hoy_madrid()
RETURNS date LANGUAGE sql STABLE SET search_path TO pg_catalog AS $$ SELECT (now() AT TIME ZONE 'Europe/Madrid')::date $$;

-- Panel: las ofertas que se ven hoy y si este local ya la ha pedido.
CREATE OR REPLACE FUNCTION dk.ofertas_fecha_mias()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH r AS (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual() LIMIT 1)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'tema', o.tema, 'titulo', o.titulo, 'descripcion', o.descripcion,
      'incluye', to_jsonb(o.incluye), 'precio_centimos', o.precio_centimos, 'precio_ancla_centimos', o.precio_ancla_centimos,
      'hasta', o.hasta, 'solicitada', s.estado) ORDER BY o.hasta, o.titulo), '[]'::jsonb)
  FROM public.ofertas_fecha o
  LEFT JOIN public.ofertas_fecha_solicitudes s ON s.oferta_id = o.id AND s.restaurante_id = (SELECT id FROM r)
  WHERE o.activa AND dk.hoy_madrid() BETWEEN o.desde AND o.hasta AND EXISTS (SELECT 1 FROM r);
$$;

-- Panel: el dueño pide una oferta. Comprueba fechas y estado en la base; el precio sale de la oferta.
CREATE OR REPLACE FUNCTION dk.oferta_fecha_solicitar(p_oferta uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_r record; v_o record; v_id uuid;
BEGIN
  SELECT id, nombre INTO v_r FROM public.restaurantes WHERE propietario = dk.identidad_actual() LIMIT 1;
  IF v_r.id IS NULL THEN RAISE EXCEPTION 'Solo el dueño del local puede pedir esta oferta.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_o FROM public.ofertas_fecha WHERE id = p_oferta AND activa AND dk.hoy_madrid() BETWEEN desde AND hasta;
  IF v_o.id IS NULL THEN RAISE EXCEPTION 'Esta oferta ya no está disponible.' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.ofertas_fecha_solicitudes (oferta_id, restaurante_id, titulo, precio_centimos)
  VALUES (v_o.id, v_r.id, v_o.titulo, v_o.precio_centimos)
  ON CONFLICT (oferta_id, restaurante_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Ya has pedido esta oferta: te escribimos para prepararla.' USING ERRCODE = '23505'; END IF;
  RETURN jsonb_build_object('id', v_id, 'titulo', v_o.titulo, 'precio_centimos', v_o.precio_centimos,
    'restaurante_id', v_r.id, 'restaurante_nombre', v_r.nombre);
END;
$$;

-- Central: todas las ofertas con sus solicitudes.
CREATE OR REPLACE FUNCTION dk.admin_ofertas_fecha()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN jsonb_build_object('hoy', dk.hoy_madrid(), 'ofertas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'tema', o.tema,
      'titulo', o.titulo, 'descripcion', o.descripcion, 'incluye', to_jsonb(o.incluye), 'precio_centimos', o.precio_centimos,
      'precio_ancla_centimos', o.precio_ancla_centimos, 'desde', o.desde, 'hasta', o.hasta, 'activa', o.activa,
      'solicitudes', coalesce((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'restaurante_id', s.restaurante_id, 'local', r.nombre,
          'precio_centimos', s.precio_centimos, 'estado', s.estado, 'creado_en', s.creado_en) ORDER BY s.creado_en DESC)
        FROM public.ofertas_fecha_solicitudes s JOIN public.restaurantes r ON r.id = s.restaurante_id WHERE s.oferta_id = o.id), '[]'::jsonb))
    ORDER BY o.desde) FROM public.ofertas_fecha o), '[]'::jsonb));
END;
$$;

-- Central: crear (p_id NULL) o cambiar una oferta. Las solicitudes ya hechas guardan su precio.
CREATE OR REPLACE FUNCTION dk.admin_oferta_fecha_guardar(p_id uuid, p_tema text, p_titulo text, p_descripcion text, p_incluye text[],
  p_precio integer, p_ancla integer, p_desde date, p_hasta date, p_activa boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid; v_incluye text[];
BEGIN
  PERFORM dk.exigir_admin();
  SELECT coalesce(array_agg(left(btrim(x), 120)) FILTER (WHERE btrim(x) <> ''), '{}') INTO v_incluye FROM unnest(coalesce(p_incluye, '{}')) x;
  IF p_id IS NULL THEN
    INSERT INTO public.ofertas_fecha (tema, titulo, descripcion, incluye, precio_centimos, precio_ancla_centimos, desde, hasta, activa)
    VALUES (p_tema, btrim(p_titulo), btrim(p_descripcion), v_incluye, p_precio, p_ancla, p_desde, p_hasta, coalesce(p_activa, true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.ofertas_fecha SET tema = p_tema, titulo = btrim(p_titulo), descripcion = btrim(p_descripcion), incluye = v_incluye,
      precio_centimos = p_precio, precio_ancla_centimos = p_ancla, desde = p_desde, hasta = p_hasta, activa = coalesce(p_activa, true), cambiado_en = now()
    WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'no encontrada' USING ERRCODE = 'P0002'; END IF;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_oferta_fecha_solicitud_estado(p_id uuid, p_estado text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_estado NOT IN ('recibida', 'en_curso', 'entregada', 'descartada') THEN RAISE EXCEPTION 'datos: estado' USING ERRCODE = '22023'; END IF;
  UPDATE public.ofertas_fecha_solicitudes SET estado = p_estado WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION dk.hoy_madrid() FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.ofertas_fecha_mias() FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.oferta_fecha_solicitar(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.admin_ofertas_fecha() FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.admin_oferta_fecha_guardar(uuid, text, text, text, text[], integer, integer, date, date, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.admin_oferta_fecha_solicitud_estado(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.ofertas_fecha_mias() TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.oferta_fecha_solicitar(uuid) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.admin_ofertas_fecha() TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.admin_oferta_fecha_guardar(uuid, text, text, text, text[], integer, integer, date, date, boolean) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.admin_oferta_fecha_solicitud_estado(uuid, text) TO dk_auth;

-- Las 4 de arranque (karc0, 28/10): encendidas; cada una sale sola en sus fechas. Precios + IVA.
INSERT INTO public.ofertas_fecha (tema, titulo, descripcion, incluye, precio_centimos, desde, hasta)
SELECT * FROM (VALUES
  ('halloween', 'Pack Halloween', 'Tu carta vestida de Halloween para el fin de semana que más se sale. Lo montamos nosotros en 24 h.',
    ARRAY['Portada y banner de Halloween en tu carta', '10 fotos con IA de tus platos o tu menú especial', 'Cartel con tu QR para la puerta o el escaparate'], 1900, DATE '2026-10-15', DATE '2026-10-31'),
  ('navidad', 'Pack Navidad', 'Menús de Navidad, Nochebuena y Nochevieja en tu carta, listos para coger reservas de grupos.',
    ARRAY['Portada y banner de Navidad en tu carta', 'Tus menús de Navidad y Nochevieja montados', '10 fotos con IA de temporada', 'Cartel con tu QR para reservar'], 2900, DATE '2026-11-15', DATE '2027-01-06'),
  ('carnaval', 'Pack Carnaval', 'Tu carta con el ambiente del Carnaval y tus especiales destacados.',
    ARRAY['Portada y banner de Carnaval en tu carta', '10 fotos con IA de tus especiales', 'Cartel con tu QR para la puerta'], 1500, DATE '2027-01-15', DATE '2027-02-09'),
  ('san_valentin', 'Pack San Valentín', 'Tu menú para dos, destacado en la carta, para llenar la noche del 14.',
    ARRAY['Portada y banner de San Valentín en tu carta', 'Tu menú para dos montado y destacado', '10 fotos con IA de temporada', 'Cartel con tu QR para reservar'], 1900, DATE '2027-01-20', DATE '2027-02-14')
) v(tema, titulo, descripcion, incluye, precio, desde, hasta)
WHERE NOT EXISTS (SELECT 1 FROM public.ofertas_fecha);

INSERT INTO public.dk_migraciones (nombre) VALUES ('0105_ofertas_fecha.sql') ON CONFLICT DO NOTHING;

COMMIT;
