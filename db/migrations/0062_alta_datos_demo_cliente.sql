-- 0062 (08/10/2026, karc0): alta con datos del local + demo → cliente + propuesta con su demo.
-- (a) dk.alta_datos_local: el webhook guarda teléfono y dirección del formulario de alta (adelanta el montaje).
-- (b) dk.aplicar_enlace_pago: pagar un enlace de Central quita la marca de demo interna y el archivo.
-- (c) dk.propuesta_ver: devuelve la demo ya montada (demo_slug) y el enlace de pago pendiente (pago_url).
BEGIN;

CREATE OR REPLACE FUNCTION dk.alta_datos_local(p_restaurante uuid, p_telefono text, p_direccion text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  UPDATE public.restaurantes
     SET telefono = coalesce(nullif(left(btrim(p_telefono), 30), ''), telefono),
         direccion = coalesce(nullif(left(btrim(p_direccion), 160), ''), direccion)
   WHERE id = p_restaurante;
END;
$$;
REVOKE ALL ON FUNCTION dk.alta_datos_local(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.alta_datos_local(uuid, text, text) TO dk_aprovisionamiento;

CREATE OR REPLACE FUNCTION dk.aplicar_enlace_pago(p_enlace uuid, p_referencia text, p_miembro text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE e public.enlaces_pago; s text;
BEGIN
  SELECT * INTO e FROM public.enlaces_pago WHERE id = p_enlace FOR UPDATE;
  IF NOT FOUND THEN RETURN 'desconocido'; END IF;
  IF e.estado = 'pagado' THEN
    -- Si el alta llegó como activación de membresía sin miembro, el primer cobro real lo enlaza.
    IF e.mensual_centimos > 0 AND p_miembro IS NOT NULL THEN
      UPDATE public.restaurantes SET stripe_customer_id = coalesce(stripe_customer_id, p_miembro) WHERE id = e.restaurante_id;
    END IF;
    RETURN 'renovacion';
  END IF;
  IF e.estado = 'anulado' THEN RETURN 'anulado'; END IF;
  UPDATE public.enlaces_pago SET estado = 'pagado', pagado_en = now(), referencia_pago = p_referencia WHERE id = e.id;
  UPDATE public.restaurantes
     SET plan = coalesce(e.plan, plan), estado_acceso = 'activo', pago_fallido_desde = NULL,
         -- 0062: pagar convierte una demo interna en cliente real (y la saca del archivo)
         demo_interna = false, archivado_en = NULL,
         prueba_hasta = CASE WHEN e.plan IS NOT NULL THEN NULL ELSE prueba_hasta END,
         primer_cobro = CASE WHEN e.mensual_centimos > 0 THEN current_date + e.dias_gratis ELSE primer_cobro END,
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
  VALUES (NULL, 'pago.enlace_admin', jsonb_build_object('enlace', e.id, 'primer', e.primer_cobro_centimos, 'mensual', e.mensual_centimos, 'dias_gratis', e.dias_gratis), e.restaurante_id);
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION dk.propuesta_ver(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE p public.prospectos%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{32}$' THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.prospectos WHERE propuesta_token = p_token;
  IF NOT FOUND OR p.no_contactar THEN RETURN NULL; END IF;
  IF p.propuesta_vista_en IS NULL OR p.propuesta_vista_en < now() - interval '30 minutes' THEN
    UPDATE public.prospectos SET propuesta_vistas = propuesta_vistas + 1, propuesta_vista_en = now() WHERE id = p.id;
    INSERT INTO public.prospecto_eventos (prospecto_id, tipo) VALUES (p.id, 'propuesta_vista');
  END IF;
  RETURN jsonb_build_object('nombre', p.nombre, 'tipo', p.tipo, 'zona', p.zona, 'texto', p.propuesta_texto,
    'muestra_url', p.muestra_url, 'oferta', p.oferta,
    'comercial', (SELECT coalesce(c.nombre_publico, s.nombre, 'DKitchen') FROM public.identidades i
                    LEFT JOIN public.socios s ON s.id = i.id LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
                   WHERE i.id = p.comercial_id),
    'telefono', (SELECT c.telefono FROM public.comerciales_contacto c WHERE c.identidad = p.comercial_id),
    'codigo', (SELECT s.codigo FROM public.socios s WHERE s.id = p.comercial_id AND s.activo),
    -- 0062: la demo ya montada para este local y su enlace de pago pendiente (demo → cliente)
    'demo_slug', (SELECT r.slug FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'pago_url', (SELECT e.url FROM public.enlaces_pago e WHERE e.restaurante_id = p.restaurante_id AND e.estado = 'pendiente' AND e.url IS NOT NULL
                  ORDER BY e.creado_en DESC LIMIT 1));
END;
$$;
GRANT EXECUTE ON FUNCTION dk.propuesta_ver(text) TO dk_anon;

COMMIT;
