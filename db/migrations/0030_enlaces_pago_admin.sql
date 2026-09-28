-- 0030 · Enlaces de pago preparados por DKitchen desde Central
-- El super admin decide qué se cobra (plan, servicios), el primer cobro y la
-- cuota mensual (precio normal, descuento o lo que acuerde). El importe queda
-- fijado AQUÍ, en la base; el webhook de Whop solo aplica lo que dice la fila.

CREATE TABLE IF NOT EXISTS public.enlaces_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  creado_por uuid,
  plan text CHECK (plan IN ('basico', 'ampliado')),
  servicios text[] NOT NULL DEFAULT '{}',
  primer_cobro_centimos int NOT NULL CHECK (primer_cobro_centimos BETWEEN 100 AND 1000000),
  mensual_centimos int NOT NULL DEFAULT 0 CHECK (mensual_centimos BETWEEN 0 AND 1000000),
  nota text CHECK (length(nota) <= 300),
  url text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'anulado')),
  referencia_pago text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  pagado_en timestamptz,
  CHECK (plan IS NOT NULL OR cardinality(servicios) > 0)
);
ALTER TABLE public.enlaces_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enlaces_pago FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enlace_lectura ON public.enlaces_pago;
CREATE POLICY enlace_lectura ON public.enlaces_pago FOR SELECT TO dk_auth
  USING (dk.es_admin() OR restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()));
GRANT SELECT ON public.enlaces_pago TO dk_auth;

CREATE OR REPLACE FUNCTION dk.admin_crear_enlace(p_restaurante uuid, p_plan text, p_servicios text[], p_primer int, p_mensual int, p_nota text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE v_id uuid; s text;
BEGIN
  PERFORM dk.exigir_admin();
  IF NOT EXISTS (SELECT 1 FROM public.restaurantes WHERE id = p_restaurante) THEN
    RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002';
  END IF;
  FOREACH s IN ARRAY coalesce(p_servicios, '{}') LOOP
    IF NOT EXISTS (SELECT 1 FROM public.catalogo_servicios WHERE servicio = s) THEN
      RAISE EXCEPTION 'servicio no válido: %', s USING ERRCODE = '22023';
    END IF;
  END LOOP;
  INSERT INTO public.enlaces_pago (restaurante_id, creado_por, plan, servicios, primer_cobro_centimos, mensual_centimos, nota)
  VALUES (p_restaurante, dk.identidad_actual(), nullif(p_plan, ''), coalesce(p_servicios, '{}'), p_primer, coalesce(p_mensual, 0), nullif(left(p_nota, 300), ''))
  RETURNING id INTO v_id;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.enlace_pago', jsonb_build_object('enlace', v_id, 'plan', p_plan, 'servicios', p_servicios, 'primer', p_primer, 'mensual', p_mensual), p_restaurante);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_enlace_url(p_enlace uuid, p_url text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_url !~ '^https://' THEN RAISE EXCEPTION 'url no válida' USING ERRCODE = '22023'; END IF;
  UPDATE public.enlaces_pago SET url = p_url WHERE id = p_enlace AND estado = 'pendiente';
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_anular_enlace(p_enlace uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.enlaces_pago SET estado = 'anulado' WHERE id = p_enlace AND estado = 'pendiente';
END;
$$;

-- Lo llama el webhook firmado de Whop (rol dk_aprovisionamiento). Idempotente.
CREATE OR REPLACE FUNCTION dk.aplicar_enlace_pago(p_enlace uuid, p_referencia text, p_miembro text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE e public.enlaces_pago; s text;
BEGIN
  SELECT * INTO e FROM public.enlaces_pago WHERE id = p_enlace FOR UPDATE;
  IF NOT FOUND THEN RETURN 'desconocido'; END IF;
  IF e.estado = 'pagado' THEN RETURN 'renovacion'; END IF;
  IF e.estado = 'anulado' THEN RETURN 'anulado'; END IF;
  UPDATE public.enlaces_pago SET estado = 'pagado', pagado_en = now(), referencia_pago = p_referencia WHERE id = e.id;
  UPDATE public.restaurantes
     SET plan = coalesce(e.plan, plan), estado_acceso = 'activo', pago_fallido_desde = NULL,
         -- el cobro recurrente queda ligado a este miembro de Whop (gracia/impago)
         stripe_customer_id = CASE WHEN e.mensual_centimos > 0 AND p_miembro IS NOT NULL THEN p_miembro ELSE stripe_customer_id END
   WHERE id = e.restaurante_id;
  FOREACH s IN ARRAY e.servicios LOOP
    -- si ya lo tenía en demo o regalo, pasa a ser de pago
    UPDATE public.servicios_contratados SET origen = 'pago', precio_centimos = coalesce(dk.precio_servicio(s), 0), referencia_pago = p_referencia || ':' || s
     WHERE restaurante_id = e.restaurante_id AND servicio = s AND estado <> 'cancelado';
    IF NOT FOUND THEN
      INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen, precio_centimos, referencia_pago)
      VALUES (e.restaurante_id, s, 'pago', coalesce(dk.precio_servicio(s), 0), p_referencia || ':' || s);
    END IF;
    IF s = 'pack_sala' THEN
      UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
       WHERE restaurante_id = e.restaurante_id AND servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv') AND estado <> 'cancelado';
    END IF;
  END LOOP;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (NULL, 'pago.enlace_admin', jsonb_build_object('enlace', e.id, 'primer', e.primer_cobro_centimos, 'mensual', e.mensual_centimos), e.restaurante_id);
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_crear_enlace(uuid, text, text[], int, int, text), dk.admin_enlace_url(uuid, text),
  dk.admin_anular_enlace(uuid), dk.aplicar_enlace_pago(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_crear_enlace(uuid, text, text[], int, int, text), dk.admin_enlace_url(uuid, text),
  dk.admin_anular_enlace(uuid) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.aplicar_enlace_pago(uuid, text, text) TO dk_aprovisionamiento;
