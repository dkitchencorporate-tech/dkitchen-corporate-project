-- 0038 · Imágenes y banners con IA (karc0, 30/09/2026)
-- 3 imágenes gratis por cliente para siempre; bono de 50 por 9 € + IVA (pago
-- único, recomprable, nunca caduca). Límites: 20 al día por cliente y tope
-- global de gasto de 20 $ al mes (aviso al 80 %). Todo el recuento vive aquí:
-- el servidor reserva una imagen antes de llamar a la IA y la devuelve si falla.

INSERT INTO public.catalogo_servicios (servicio, nombre, tipo, precio_centimos, precio_ancla_centimos, requiere_ampliado)
VALUES ('bono_ia', 'Bono de 50 imágenes con IA', 'unico', 900, NULL, false)
ON CONFLICT (servicio) DO NOTHING;

CREATE OR REPLACE FUNCTION dk.ia_gratis() RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT 3 $$;
CREATE OR REPLACE FUNCTION dk.ia_limite_diario() RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT 20 $$;
CREATE OR REPLACE FUNCTION dk.ia_tope_mensual_usd() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 20::numeric $$;
CREATE OR REPLACE FUNCTION dk.ia_coste_imagen_usd() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.039::numeric $$;

CREATE TABLE IF NOT EXISTS public.ia_movimientos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  tipo           text NOT NULL CHECK (tipo IN ('compra', 'uso', 'devolucion')),
  cantidad       int  NOT NULL CHECK (cantidad > 0),
  coste_usd      numeric(8,4) NOT NULL DEFAULT 0,
  referencia     text UNIQUE,
  detalle        text CHECK (detalle IS NULL OR char_length(detalle) <= 200),
  creado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ia_movimientos_rest_idx ON public.ia_movimientos (restaurante_id, creado_en);
CREATE INDEX IF NOT EXISTS ia_movimientos_mes_idx ON public.ia_movimientos (creado_en) WHERE tipo IN ('uso', 'devolucion');

ALTER TABLE public.ia_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_movimientos FORCE ROW LEVEL SECURITY;
GRANT SELECT ON public.ia_movimientos TO dk_auth;   -- solo lectura: escribir, únicamente con las funciones de abajo
DROP POLICY IF EXISTS ia_del_propietario ON public.ia_movimientos;
CREATE POLICY ia_del_propietario ON public.ia_movimientos FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin());

-- Saldo de un restaurante
CREATE OR REPLACE FUNCTION dk.ia_saldo(p_restaurante uuid)
RETURNS TABLE (restantes int, gratis_restantes int, compradas int, usadas int, hoy int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH m AS (
    SELECT coalesce(sum(cantidad) FILTER (WHERE tipo = 'compra'), 0)::int compradas,
           (coalesce(sum(cantidad) FILTER (WHERE tipo = 'uso'), 0) - coalesce(sum(cantidad) FILTER (WHERE tipo = 'devolucion'), 0))::int usadas,
           (coalesce(sum(cantidad) FILTER (WHERE tipo = 'uso' AND creado_en >= date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'), 0)
            - coalesce(sum(cantidad) FILTER (WHERE tipo = 'devolucion' AND creado_en >= date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'), 0))::int hoy
      FROM public.ia_movimientos WHERE restaurante_id = p_restaurante
  )
  SELECT greatest(0, dk.ia_gratis() + compradas - usadas), greatest(0, dk.ia_gratis() - usadas), compradas, usadas, hoy FROM m;
$$;

CREATE OR REPLACE FUNCTION dk.ia_gasto_mes_usd()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT coalesce(sum(CASE WHEN tipo = 'uso' THEN coste_usd ELSE -coste_usd END), 0)
    FROM public.ia_movimientos
   WHERE tipo IN ('uso', 'devolucion') AND creado_en >= date_trunc('month', now());
$$;

-- Mi saldo (panel del cliente)
CREATE OR REPLACE FUNCTION dk.ia_mi_saldo(p_restaurante uuid)
RETURNS TABLE (restantes int, gratis_restantes int, compradas int, usadas int, hoy int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.restaurantes WHERE id = p_restaurante AND propietario = dk.identidad_actual()) THEN
    RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM dk.ia_saldo(p_restaurante);
END;
$$;

-- Reserva una imagen antes de llamar a la IA (atómico: bloquea el restaurante).
CREATE OR REPLACE FUNCTION dk.ia_reservar(p_restaurante uuid, p_detalle text)
RETURNS TABLE (movimiento uuid, aviso_80 boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE s record; v_gasto numeric; v_id uuid;
BEGIN
  PERFORM 1 FROM public.restaurantes
   WHERE id = p_restaurante AND propietario = dk.identidad_actual() AND estado_acceso IN ('activo', 'gracia')
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado o sin acceso' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM dk.ia_saldo(p_restaurante);
  IF s.restantes <= 0 THEN RAISE EXCEPTION 'ia_sin_saldo' USING ERRCODE = 'P0001'; END IF;
  IF s.hoy >= dk.ia_limite_diario() THEN RAISE EXCEPTION 'ia_limite_diario' USING ERRCODE = 'P0001'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('dk.ia_tope'));
  v_gasto := dk.ia_gasto_mes_usd();
  IF v_gasto + dk.ia_coste_imagen_usd() > dk.ia_tope_mensual_usd() THEN RAISE EXCEPTION 'ia_tope_global' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.ia_movimientos (restaurante_id, tipo, cantidad, coste_usd, detalle)
  VALUES (p_restaurante, 'uso', 1, dk.ia_coste_imagen_usd(), left(p_detalle, 200)) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id,
    (v_gasto < dk.ia_tope_mensual_usd() * 0.8 AND v_gasto + dk.ia_coste_imagen_usd() >= dk.ia_tope_mensual_usd() * 0.8);
END;
$$;

-- Si la IA falla, se devuelve la imagen (idempotente).
CREATE OR REPLACE FUNCTION dk.ia_devolver(p_movimiento uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE m public.ia_movimientos;
BEGIN
  SELECT * INTO m FROM public.ia_movimientos WHERE id = p_movimiento AND tipo = 'uso';
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.restaurantes WHERE id = m.restaurante_id AND propietario = dk.identidad_actual()) THEN
    RAISE EXCEPTION 'movimiento no encontrado' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.ia_movimientos (restaurante_id, tipo, cantidad, coste_usd, referencia, detalle)
  VALUES (m.restaurante_id, 'devolucion', 1, m.coste_usd, 'dev-' || m.id, 'La IA no devolvió imagen')
  ON CONFLICT (referencia) DO NOTHING;
END;
$$;

-- Compra del bono desde el webhook de Whop (recomprable; idempotente por pago).
CREATE OR REPLACE FUNCTION dk.registrar_pago_servicio(p_restaurante uuid, p_servicio text, p_referencia text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_precio int := dk.precio_servicio(p_servicio);
BEGIN
  IF v_precio IS NULL THEN RETURN 'servicio_desconocido'; END IF;
  IF p_servicio = 'bono_ia' THEN
    INSERT INTO public.ia_movimientos (restaurante_id, tipo, cantidad, referencia, detalle)
    VALUES (p_restaurante, 'compra', 50, p_referencia, 'Bono de 50 imágenes')
    ON CONFLICT (referencia) DO NOTHING;
    IF NOT FOUND THEN RETURN 'ya_registrado'; END IF;
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (NULL, 'pago.bono_ia', jsonb_build_object('centimos', v_precio), p_restaurante);
    RETURN 'ok';
  END IF;
  IF EXISTS (SELECT 1 FROM public.servicios_contratados WHERE referencia_pago = p_referencia) THEN RETURN 'ya_registrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.servicios_contratados
             WHERE restaurante_id = p_restaurante AND servicio = p_servicio AND estado <> 'cancelado') THEN
    RETURN 'renovacion';
  END IF;
  INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen, precio_centimos, referencia_pago)
  VALUES (p_restaurante, p_servicio, 'pago', v_precio, p_referencia);
  IF p_servicio = 'pack_sala' THEN
    UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
     WHERE restaurante_id = p_restaurante AND servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv') AND estado <> 'cancelado';
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (NULL, 'pago.servicio', jsonb_build_object('servicio', p_servicio, 'centimos', v_precio), p_restaurante);
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION dk.ia_saldo(uuid), dk.ia_gasto_mes_usd(), dk.ia_mi_saldo(uuid), dk.ia_reservar(uuid, text), dk.ia_devolver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.ia_mi_saldo(uuid), dk.ia_reservar(uuid, text), dk.ia_devolver(uuid) TO dk_auth;
