-- 0066 (08/10/2026, karc0, tarea 3 de la entrada 124):
-- 1. Central anota el precio REALMENTE cobrado (la puesta a punto de bienvenida es 29 €, no los 49 € del
--    catálogo). El webhook de Stripe pasa el importe sin IVA que fijó el servidor al crear el cobro.
-- 2. La puesta a punto (esencial o experta) incluye 3 MESES de Conexión TPV (decisión de karc0). Se guarda
--    como regalo con fecha de fin (regalo_hasta); el cron diario lo vence. Si el local ya tiene el módulo
--    (plan Sala, Pack Sala o contratado) no se regala nada. Si paga el módulo durante el regalo, el pago
--    sustituye al regalo.
BEGIN;

ALTER TABLE public.servicios_contratados ADD COLUMN IF NOT EXISTS regalo_hasta date;

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
  -- Un pago sustituye al regalo vigente del mismo servicio.
  UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
   WHERE restaurante_id = p_restaurante AND servicio = p_servicio AND origen = 'regalo' AND estado <> 'cancelado';
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
  VALUES (NULL, 'pago.servicio', jsonb_build_object('servicio', p_servicio, 'centimos', v_precio, 'catalogo', v_catalogo), p_restaurante);
  -- Puesta a punto → 3 meses de Conexión TPV de regalo (si aún no lo tiene).
  IF p_servicio IN ('setup_esencial', 'setup_experto') AND NOT dk.tiene_servicio(p_restaurante, 'conexion_tpv') THEN
    INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen, precio_centimos, regalo_hasta)
    VALUES (p_restaurante, 'conexion_tpv', 'regalo', 0, (current_date + interval '3 months')::date);
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (NULL, 'regalo.conexion_tpv', jsonb_build_object('motivo', p_servicio, 'hasta', (current_date + interval '3 months')::date), p_restaurante);
  END IF;
  RETURN 'ok';
END;
$$;

-- La firma antigua (3 argumentos) sigue funcionando con el precio del catálogo.
CREATE OR REPLACE FUNCTION dk.registrar_pago_servicio(p_restaurante uuid, p_servicio text, p_referencia text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.registrar_pago_servicio(p_restaurante, p_servicio, p_referencia, NULL::int);
$$;

-- Cron diario: vence los regalos con fecha y devuelve cuántos.
CREATE OR REPLACE FUNCTION dk.vencer_regalos()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE n int;
BEGIN
  WITH v AS (
    UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
     WHERE origen = 'regalo' AND regalo_hasta IS NOT NULL AND regalo_hasta < current_date AND estado <> 'cancelado'
    RETURNING restaurante_id, servicio)
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  SELECT NULL, 'regalo.vencido', jsonb_build_object('servicio', servicio), restaurante_id FROM v;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Regalos que vencen en los próximos N días (aviso interno del cron para ofrecer quedarse el módulo).
CREATE OR REPLACE FUNCTION dk.regalos_por_vencer(p_dias int)
RETURNS TABLE (restaurante text, email text, servicio text, hasta date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT r.nombre::text, i.email::text, s.servicio, s.regalo_hasta
    FROM public.servicios_contratados s
    JOIN public.restaurantes r ON r.id = s.restaurante_id
    LEFT JOIN public.identidades i ON i.id = r.propietario
   WHERE s.origen = 'regalo' AND s.estado <> 'cancelado' AND s.regalo_hasta = current_date + p_dias;
$$;

REVOKE ALL ON FUNCTION dk.registrar_pago_servicio(uuid, text, text, int), dk.vencer_regalos(), dk.regalos_por_vencer(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.registrar_pago_servicio(uuid, text, text, int), dk.vencer_regalos(), dk.regalos_por_vencer(int) TO dk_aprovisionamiento;

COMMIT;
