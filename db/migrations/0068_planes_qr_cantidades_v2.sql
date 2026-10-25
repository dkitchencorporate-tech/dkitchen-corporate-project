-- 0068 (10/10/2026, karc0, ESTADO §6 entrada 130; sustituye a la decisión A de la entrada 61):
-- 1. Todo plan QR trae «un poco de cada cosa»: plano, app de sala, Conexión TPV y Comandero entran en
--    TODOS los planes, limitados por CANTIDAD. Se acaban las cuotas mensuales sueltas (TPV 19 €, Comandero 9 €).
-- 2. Topes (Carta / Local / Sala): platos 40/80/120 · mesas 6/15/30 · camareros 1/3/6 · reservas/mes
--    30/120/350 · comandas al TPV/mes 150/600/1.800 · historial del Comandero 7/30/90 días · banners 1/2/3.
--    Se mantiene el 10 % de cortesía (dk.plan_tope_max). Quien supere los topes pasa a un plan personalizado.
--    Lo que un local ya tenga por encima del tope se respeta: solo se bloquea añadir más.
-- 3. Idiomas: español + 1 idioma (inglés) incluidos en todos los planes; cada idioma más = «idioma_extra»,
--    15 € de pago único por idioma. El pack antiguo «idiomas» (hasta 3) se respeta para quien lo compró.
-- 4. Comandas al TPV por encima del tope del mes: la comanda se guarda igual en el panel, pero deja de
--    enviarse sola al TPV hasta el mes siguiente (o hasta subir de plan).
-- 5. Upsell de la puesta a punto a 29 €: disponible tras el checkout y en el panel MIENTRAS el local no haya
--    empezado a configurar su carta (menos de 3 platos con precio) y no la tenga contratada.
BEGIN;

CREATE OR REPLACE FUNCTION dk.plan_tope(p_plan text, p_que text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog AS $$
  SELECT CASE p_que
    WHEN 'productos'        THEN CASE p_plan WHEN 'sala' THEN 120  WHEN 'ampliado' THEN 80  ELSE 40 END
    WHEN 'mesas'            THEN CASE p_plan WHEN 'sala' THEN 30   WHEN 'ampliado' THEN 15  ELSE 6 END
    WHEN 'camareros'        THEN CASE p_plan WHEN 'sala' THEN 6    WHEN 'ampliado' THEN 3   ELSE 1 END
    WHEN 'reservas_mes'     THEN CASE p_plan WHEN 'sala' THEN 350  WHEN 'ampliado' THEN 120 ELSE 30 END
    WHEN 'banners'          THEN CASE p_plan WHEN 'sala' THEN 3    WHEN 'ampliado' THEN 2   ELSE 1 END
    WHEN 'comandas_tpv_mes' THEN CASE p_plan WHEN 'sala' THEN 1800 WHEN 'ampliado' THEN 600 ELSE 150 END
    WHEN 'historial_dias'   THEN CASE p_plan WHEN 'sala' THEN 90   WHEN 'ampliado' THEN 30  ELSE 7 END
    WHEN 'idiomas'          THEN 1
  END
$$;

-- Cortesía del 10 % solo en lo que se cuenta; banners, historial e idiomas son exactos.
CREATE OR REPLACE FUNCTION dk.plan_tope_max(p_plan text, p_que text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog AS $$
  SELECT CASE WHEN p_que IN ('banners', 'historial_dias', 'idiomas') THEN dk.plan_tope(p_plan, p_que)
              ELSE ceil(dk.plan_tope(p_plan, p_que) * 1.1)::int END
$$;

-- Plano, app de sala, TPV y Comandero: en todos los planes (los topes de cantidad hacen la diferencia).
-- «idiomas» ya no lo da ningún plan: solo el pack antiguo comprado (ver dk.idiomas_permitidos).
CREATE OR REPLACE FUNCTION dk.tiene_servicio(p_restaurante uuid, p_servicio text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servicios_contratados s
    WHERE s.restaurante_id = p_restaurante AND s.estado <> 'cancelado'
      AND (s.servicio = p_servicio
           OR (s.servicio = 'pack_sala' AND p_servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv'))))
  OR EXISTS (
    SELECT 1 FROM public.restaurantes r WHERE r.id = p_restaurante AND (
         (dk.plan_nivel(r.plan) >= 1 AND p_servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv', 'comandero_pro'))
      OR (r.nivel_diseno = 'signature' AND p_servicio = 'comandero_pro')));
$$;

-- Idiomas además del español: 1 incluido + 3 del pack antiguo + 1 por cada idioma extra pagado.
CREATE OR REPLACE FUNCTION dk.idiomas_permitidos(p_restaurante uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.plan_tope(r.plan, 'idiomas')
       + CASE WHEN EXISTS (SELECT 1 FROM public.servicios_contratados s WHERE s.restaurante_id = r.id
                             AND s.servicio = 'idiomas' AND s.estado <> 'cancelado') THEN 3 ELSE 0 END
       + (SELECT count(*)::int FROM public.servicios_contratados s WHERE s.restaurante_id = r.id
            AND s.servicio = 'idioma_extra' AND s.estado <> 'cancelado')
  FROM public.restaurantes r WHERE r.id = p_restaurante;
$$;

CREATE OR REPLACE FUNCTION dk.fijar_idiomas(p_idiomas text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_lista text[]; v_max int;
BEGIN
  SELECT id INTO v_rest FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF v_rest IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(array_agg(DISTINCT x), '{}') INTO v_lista
    FROM unnest(coalesce(p_idiomas, '{}')) x WHERE x IN ('en', 'fr', 'de', 'it', 'pt', 'ca');
  v_max := dk.idiomas_permitidos(v_rest);
  IF cardinality(v_lista) > v_max THEN
    RAISE EXCEPTION 'Tu plan incluye % idioma(s) además del español. Cada idioma más se añade desde Mejoras.', v_max
      USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.restaurantes SET idiomas = v_lista WHERE id = v_rest;
END;
$$;

-- Historial del Comandero según el plan (Signature: un año).
CREATE OR REPLACE FUNCTION dk.comandero_rango(p_rest uuid, p_desde date, p_hasta date)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_dias int;
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta OR p_hasta - p_desde > 366 THEN
    RAISE EXCEPTION 'Rango de fechas no válido (máximo un año).' USING ERRCODE = '22023';
  END IF;
  SELECT CASE WHEN r.nivel_diseno = 'signature' THEN 366 ELSE dk.plan_tope(r.plan, 'historial_dias') END
    INTO v_dias FROM public.restaurantes r WHERE r.id = p_rest;
  IF p_desde < dk.hoy_madrid() - coalesce(v_dias, 0) THEN
    RAISE EXCEPTION 'Tu plan guarda el historial de los últimos % días.', coalesce(v_dias, 0) USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- Comandas enviadas al TPV este mes (hora de Madrid).
CREATE OR REPLACE FUNCTION dk.comandas_tpv_mes(p_rest uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT count(*)::int FROM public.registros_sala s
   WHERE s.restaurante_id = p_rest AND s.enviado_en IS NOT NULL
     AND s.enviado_en >= date_trunc('month', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';
$$;

CREATE OR REPLACE FUNCTION dk.tpv_dentro_de_tope(p_rest uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT r.nivel_diseno = 'signature' OR dk.comandas_tpv_mes(r.id) < dk.plan_tope_max(r.plan, 'comandas_tpv_mes')
  FROM public.restaurantes r WHERE r.id = p_rest;
$$;

CREATE OR REPLACE FUNCTION dk.sala_destino_tpv(p_token_hash text, p_registro uuid)
RETURNS TABLE(proveedor text, endpoint_url text, credencial_cifrada text, restaurante text, mesa text, lineas jsonb, creado_en timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT t.proveedor, t.endpoint_url, t.credencial_cifrada, r.nombre, s.mesa, s.lineas, s.creado_en
  FROM public.camareros c
  JOIN public.registros_sala s ON s.id = p_registro AND s.restaurante_id = c.restaurante_id
  JOIN public.restaurantes r ON r.id = c.restaurante_id
  JOIN public.conexiones_tpv t ON t.restaurante_id = c.restaurante_id AND t.activa
  WHERE c.token_hash = p_token_hash AND c.activo AND dk.tiene_servicio(c.restaurante_id, 'conexion_tpv')
    AND dk.tpv_dentro_de_tope(c.restaurante_id);
$$;

CREATE OR REPLACE FUNCTION dk.panel_destino_tpv(p_registro uuid)
RETURNS TABLE(proveedor text, endpoint_url text, credencial_cifrada text, restaurante text, mesa text, lineas jsonb, creado_en timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  RETURN QUERY
  SELECT t.proveedor, t.endpoint_url, t.credencial_cifrada, r.nombre, s.mesa, s.lineas, s.creado_en
    FROM public.registros_sala s
    JOIN public.restaurantes r ON r.id = s.restaurante_id
    JOIN public.conexiones_tpv t ON t.restaurante_id = s.restaurante_id AND t.activa
   WHERE s.id = p_registro AND s.restaurante_id = v_rest AND dk.tiene_servicio(v_rest, 'conexion_tpv')
     AND dk.tpv_dentro_de_tope(v_rest);
END;
$$;

-- Uso del plan en el panel: añade comandas al TPV e idiomas.
CREATE OR REPLACE FUNCTION dk.mi_uso_plan()
RETURNS TABLE(que text, usados integer, tope integer, tope_max integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r public.restaurantes; v_mes timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';
BEGIN
  SELECT * INTO r FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT q.que, q.n::int,
         CASE WHEN q.que = 'idiomas' THEN dk.idiomas_permitidos(r.id) ELSE dk.plan_tope(r.plan, q.que) END,
         CASE WHEN q.que = 'idiomas' THEN dk.idiomas_permitidos(r.id) ELSE dk.plan_tope_max(r.plan, q.que) END
  FROM (VALUES
    ('productos',        (SELECT count(*) FROM public.menu_items WHERE restaurante_id = r.id)),
    ('mesas',            (SELECT count(*) FROM public.mesas WHERE restaurante_id = r.id)),
    ('camareros',        (SELECT count(*) FROM public.camareros WHERE restaurante_id = r.id AND activo)),
    ('reservas_mes',     (SELECT count(*) FROM public.reservas WHERE restaurante_id = r.id AND creada_en >= v_mes)),
    ('banners',          (SELECT count(*) FROM public.promociones WHERE restaurante_id = r.id AND activa)),
    ('comandas_tpv_mes', dk.comandas_tpv_mes(r.id)::bigint),
    ('idiomas',          cardinality(coalesce(r.idiomas, '{}'))::bigint)
  ) AS q(que, n);
END;
$$;

-- Catálogo: TPV y Comandero dejan de venderse como cuota; pack de idiomas fuera; idioma extra a 15 €.
UPDATE public.catalogo_servicios SET en_venta = false WHERE servicio IN ('conexion_tpv', 'comandero_pro', 'idiomas');
INSERT INTO public.catalogo_servicios (servicio, nombre, tipo, precio_centimos, precio_ancla_centimos, requiere_ampliado, en_venta)
VALUES ('idioma_extra', 'Idioma extra (traducido por DKitchen)', 'unico', 1500, NULL, false, true)
ON CONFLICT (servicio) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = 'unico', precio_centimos = 1500, en_venta = true;

-- Pagos: el idioma extra se puede comprar varias veces (cada pago = un idioma más).
DROP INDEX IF EXISTS public.servicios_unico_vigente;
CREATE UNIQUE INDEX servicios_unico_vigente ON public.servicios_contratados (restaurante_id, servicio)
  WHERE estado <> 'cancelado' AND servicio <> 'idioma_extra';
CREATE OR REPLACE FUNCTION dk.registrar_pago_servicio(p_restaurante uuid, p_servicio text, p_referencia text, p_centimos int)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_catalogo int := dk.precio_servicio(p_servicio);
  v_precio int;
BEGIN
  IF v_catalogo IS NULL THEN RETURN 'servicio_desconocido'; END IF;
  -- Importe fijado por el servidor al crear el cobro; nunca más que el catálogo ni menos de 1 €.
  v_precio := CASE WHEN p_centimos BETWEEN 100 AND v_catalogo THEN p_centimos ELSE v_catalogo END;
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
  IF p_servicio <> 'idioma_extra' THEN
    -- Un pago sustituye al regalo vigente del mismo servicio.
    UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
     WHERE restaurante_id = p_restaurante AND servicio = p_servicio AND origen = 'regalo' AND estado <> 'cancelado';
    IF EXISTS (SELECT 1 FROM public.servicios_contratados
               WHERE restaurante_id = p_restaurante AND servicio = p_servicio AND estado <> 'cancelado') THEN
      RETURN 'renovacion';
    END IF;
  END IF;
  INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen, precio_centimos, referencia_pago)
  VALUES (p_restaurante, p_servicio, 'pago', v_precio, p_referencia);
  IF p_servicio = 'pack_sala' THEN
    UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
     WHERE restaurante_id = p_restaurante AND servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv') AND estado <> 'cancelado';
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (NULL, 'pago.servicio', jsonb_build_object('servicio', p_servicio, 'centimos', v_precio, 'catalogo', v_catalogo), p_restaurante);
  RETURN 'ok';
END;
$$;

-- Upsell de bienvenida de la puesta a punto: ¿sigue disponible para este local?
CREATE OR REPLACE FUNCTION dk.puesta_bienvenida_disponible(p_rest uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.servicios_contratados s WHERE s.restaurante_id = p_rest
                       AND s.servicio IN ('setup_esencial', 'setup_experto') AND s.estado <> 'cancelado')
     AND (SELECT count(*) FROM public.menu_items i WHERE i.restaurante_id = p_rest AND i.precio > 0) < 3
     AND EXISTS (SELECT 1 FROM public.restaurantes r WHERE r.id = p_rest AND r.tutorial_completado_en IS NULL);
$$;

CREATE OR REPLACE FUNCTION dk.puesta_bienvenida_mia()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT coalesce((SELECT dk.puesta_bienvenida_disponible(r.id) FROM public.restaurantes r
                    WHERE r.propietario = dk.identidad_actual() LIMIT 1), false);
$$;

REVOKE ALL ON FUNCTION dk.idiomas_permitidos(uuid), dk.comandas_tpv_mes(uuid), dk.tpv_dentro_de_tope(uuid),
  dk.puesta_bienvenida_disponible(uuid), dk.puesta_bienvenida_mia() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.puesta_bienvenida_mia() TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.puesta_bienvenida_disponible(uuid) TO dk_aprovisionamiento;

COMMIT;
