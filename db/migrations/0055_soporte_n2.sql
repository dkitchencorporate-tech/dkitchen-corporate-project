-- 0055 · Soporte nivel 2 (decisiones de karc0, 07/10; ESTADO §6 entrada 79; protocolo en
-- PROTOCOLO_SOPORTE_N2.md). Hoy lo llevan karc0 y Claude Code A MANO desde Central: diagnóstico
-- con los datos reales del local, cuatro acciones seguras con un clic (auditadas) y borrador de
-- respuesta. Cada ticket se cierra con categoría, acciones hechas y si el diagnóstico acertó:
-- con 50 tickets resueltos así se valorará automatizarlo con un modelo Claude (AI Gateway).
-- Dinero, plan, reembolsos, bajas y borrados NUNCA son acciones de N2.

BEGIN;

-- 1. Registro de resolución en el ticket (la base de conocimiento para automatizar)
ALTER TABLE public.tickets_soporte ADD COLUMN IF NOT EXISTS categoria text
  CHECK (categoria IN ('acceso', 'carta', 'qr', 'equipo_sala', 'tpv', 'reservas', 'pagos', 'plan', 'baja', 'error', 'sugerencia', 'otro'));
ALTER TABLE public.tickets_soporte ADD COLUMN IF NOT EXISTS diagnostico jsonb;
ALTER TABLE public.tickets_soporte ADD COLUMN IF NOT EXISTS acciones jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tickets_soporte ADD COLUMN IF NOT EXISTS nivel smallint CHECK (nivel BETWEEN 1 AND 3);
ALTER TABLE public.tickets_soporte ADD COLUMN IF NOT EXISTS diagnostico_acertado boolean;
ALTER TABLE public.tickets_soporte ADD COLUMN IF NOT EXISTS resolucion text CHECK (resolucion IS NULL OR char_length(resolucion) <= 500);
ALTER TABLE public.tickets_soporte ADD COLUMN IF NOT EXISTS resuelto_en timestamptz;

-- 2. Diagnóstico del local (solo lectura, solo Central). Nada de comensales ni importes de tarjeta.
CREATE OR REPLACE FUNCTION dk.admin_diagnostico(p_restaurante uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE r public.restaurantes; v jsonb;
BEGIN
  PERFORM dk.exigir_admin();
  SELECT * INTO r FROM public.restaurantes WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  SELECT jsonb_build_object(
    'local', jsonb_build_object('nombre', r.nombre, 'slug', r.slug, 'plan', r.plan, 'activo', r.activo,
              'estado_acceso', r.estado_acceso, 'prueba_hasta', r.prueba_hasta, 'primer_cobro', r.primer_cobro,
              'fundador', r.fundador_desde IS NOT NULL AND r.fundador_perdido_en IS NULL,
              'paga_por_stripe', coalesce(r.stripe_customer_id, '') LIKE 'cus_%', 'creado_en', r.creado_en),
    'acceso', (SELECT jsonb_build_object('email', u.email, 'verificado', u."emailVerified", 'alta', u."createdAt",
                  'bloqueado', coalesce(u.banned, false),
                  'sesiones', (SELECT count(*) FROM neon_auth.session s WHERE s."userId" = u.id),
                  'ultima_sesion', (SELECT max(s."createdAt") FROM neon_auth.session s WHERE s."userId" = u.id))
                 FROM neon_auth."user" u WHERE u.id = r.propietario),
    'carta', (SELECT jsonb_build_object('secciones', (SELECT count(*) FROM public.menu_secciones WHERE restaurante_id = r.id),
                  'platos', count(*), 'sin_foto', count(*) FILTER (WHERE m.foto_url IS NULL),
                  'sin_precio', count(*) FILTER (WHERE coalesce(m.precio, 0) = 0),
                  'ocultos', count(*) FILTER (WHERE NOT m.disponible))
                FROM public.menu_items m WHERE m.restaurante_id = r.id),
    'ficha', jsonb_build_object('logo', r.logo_url IS NOT NULL, 'direccion', r.direccion IS NOT NULL, 'horario', r.horario IS NOT NULL,
              'telefono', r.telefono IS NOT NULL, 'whatsapp', r.whatsapp IS NOT NULL, 'idiomas', r.idiomas),
    'qr', (SELECT jsonb_build_object('activo', bool_or(q.activo), 'codigos', count(*)) FROM public.codigos_qr q WHERE q.restaurante_id = r.id),
    'equipo', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'rol', c.rol, 'activo', c.activo,
                  'ultimo_acceso', c.ultimo_acceso) ORDER BY c.activo DESC, c.nombre), '[]'::jsonb)
                 FROM public.camareros c WHERE c.restaurante_id = r.id),
    'tpv', (SELECT jsonb_build_object('proveedor', t.proveedor, 'activa', t.activa, 'ultimo_envio', t.ultimo_envio, 'ultimo_error', t.ultimo_error,
                  'fallidos_7d', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'mesa', s.mesa, 'creado_en', s.creado_en, 'detalle', s.detalle_tpv)
                                   ORDER BY s.creado_en DESC), '[]'::jsonb)
                                   FROM public.registros_sala s WHERE s.restaurante_id = r.id AND s.estado = 'error_tpv' AND s.creado_en > now() - interval '7 days'))
              FROM public.conexiones_tpv t WHERE t.restaurante_id = r.id),
    'servicios', (SELECT coalesce(jsonb_agg(s.servicio ORDER BY s.servicio), '[]'::jsonb) FROM public.servicios_contratados s
                   WHERE s.restaurante_id = r.id AND s.estado <> 'cancelado'),
    'tickets', jsonb_build_object('abiertos', (SELECT count(*) FROM public.tickets_soporte WHERE restaurante_id = r.id AND estado = 'abierto'),
              'ultimos_30d', (SELECT count(*) FROM public.tickets_soporte WHERE restaurante_id = r.id AND creado_en > now() - interval '30 days')),
    'socio', (SELECT jsonb_build_object('nombre', s.nombre, 'codigo', s.codigo, 'puede_editar', r.socio_puede_editar) FROM public.socios s WHERE s.id = r.socio_id),
    'generado_en', now()
  ) INTO v;
  RETURN v;
END;
$$;

-- 3. Acciones seguras (reversibles, auditadas). Cada una se anota en el ticket si llega uno.
CREATE OR REPLACE FUNCTION dk.admin_ticket_anotar(p_ticket uuid, p_accion text, p_detalle jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_ticket IS NULL THEN RETURN; END IF;
  UPDATE public.tickets_soporte
     SET acciones = acciones || jsonb_build_array(jsonb_build_object('accion', p_accion, 'detalle', p_detalle, 'en', now()))
   WHERE id = p_ticket;
END;
$$;

-- Nuevo enlace para un miembro del equipo (el viejo deja de valer). El token lo genera la web.
CREATE OR REPLACE FUNCTION dk.admin_equipo_regenerar(p_camarero uuid, p_token_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_rest uuid;
BEGIN
  PERFORM dk.exigir_admin();
  SELECT restaurante_id INTO v_rest FROM public.camareros WHERE id = p_camarero;
  IF v_rest IS NULL THEN RETURN false; END IF;
  RETURN dk.equipo_regenerar_en(v_rest, p_camarero, p_token_hash, NULL);
END;
$$;

-- Reintento al TPV desde Central (mismos datos que el panel del dueño, 0046)
CREATE OR REPLACE FUNCTION dk.admin_destino_tpv(p_registro uuid)
RETURNS TABLE (proveedor text, endpoint_url text, credencial_cifrada text, restaurante text, mesa text, lineas jsonb, creado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
  SELECT t.proveedor, t.endpoint_url, t.credencial_cifrada, r.nombre, s.mesa, s.lineas, s.creado_en
    FROM public.registros_sala s
    JOIN public.restaurantes r ON r.id = s.restaurante_id
    JOIN public.conexiones_tpv t ON t.restaurante_id = s.restaurante_id AND t.activa
   WHERE s.id = p_registro AND dk.tiene_servicio(s.restaurante_id, 'conexion_tpv');
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_resultado_tpv(p_registro uuid, p_ok boolean, p_detalle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_rest uuid;
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.registros_sala SET estado = CASE WHEN p_ok THEN 'enviado_tpv' ELSE 'error_tpv' END,
         enviado_en = now(), detalle_tpv = left(p_detalle, 300)
   WHERE id = p_registro RETURNING restaurante_id INTO v_rest;
  IF v_rest IS NULL THEN RETURN; END IF;
  UPDATE public.conexiones_tpv SET ultimo_envio = now(), ultimo_error = CASE WHEN p_ok THEN NULL ELSE left(p_detalle, 300) END
   WHERE restaurante_id = v_rest;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.reintento_tpv', jsonb_build_object('registro', p_registro, 'ok', p_ok), v_rest);
END;
$$;

-- 4. Cierre con resolución (lo que contará para los 50)
CREATE OR REPLACE FUNCTION dk.admin_ticket_resolver(p_ticket uuid, p_categoria text, p_nivel smallint, p_acertado boolean, p_resolucion text, p_diagnostico jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.tickets_soporte
     SET categoria = p_categoria, nivel = p_nivel, diagnostico_acertado = p_acertado,
         resolucion = left(nullif(btrim(p_resolucion), ''), 500), diagnostico = coalesce(p_diagnostico, diagnostico),
         resuelto_en = now(), estado = 'cerrado'
   WHERE id = p_ticket;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  SELECT dk.identidad_actual(), 'admin.ticket_resuelto', jsonb_build_object('ticket', p_ticket, 'categoria', p_categoria, 'nivel', p_nivel), restaurante_id
    FROM public.tickets_soporte WHERE id = p_ticket;
END;
$$;

-- 5. Métricas para decidir la automatización (umbral: 50 resueltos con registro completo)
CREATE OR REPLACE FUNCTION dk.admin_soporte_metricas()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v jsonb;
BEGIN
  PERFORM dk.exigir_admin();
  SELECT jsonb_build_object(
    'recibidos', count(*),
    'resueltos', count(*) FILTER (WHERE resuelto_en IS NOT NULL AND categoria IS NOT NULL),
    'con_diagnostico_valorado', count(*) FILTER (WHERE diagnostico_acertado IS NOT NULL),
    'acierto', round(100.0 * count(*) FILTER (WHERE diagnostico_acertado) / nullif(count(*) FILTER (WHERE diagnostico_acertado IS NOT NULL), 0)),
    'por_nivel', (SELECT coalesce(jsonb_object_agg(nivel, n), '{}'::jsonb) FROM (SELECT nivel, count(*) n FROM public.tickets_soporte WHERE nivel IS NOT NULL GROUP BY nivel) x),
    'por_categoria', (SELECT coalesce(jsonb_object_agg(categoria, n), '{}'::jsonb) FROM (SELECT categoria, count(*) n FROM public.tickets_soporte WHERE categoria IS NOT NULL GROUP BY categoria) x),
    'horas_medias_resolucion', round((avg(extract(epoch FROM resuelto_en - creado_en) / 3600) FILTER (WHERE resuelto_en IS NOT NULL))::numeric, 1))
  INTO v FROM public.tickets_soporte;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_diagnostico(uuid), dk.admin_ticket_anotar(uuid, text, jsonb), dk.admin_equipo_regenerar(uuid, text),
  dk.admin_destino_tpv(uuid), dk.admin_resultado_tpv(uuid, boolean, text),
  dk.admin_ticket_resolver(uuid, text, smallint, boolean, text, jsonb), dk.admin_soporte_metricas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_diagnostico(uuid), dk.admin_ticket_anotar(uuid, text, jsonb), dk.admin_equipo_regenerar(uuid, text),
  dk.admin_destino_tpv(uuid), dk.admin_resultado_tpv(uuid, boolean, text),
  dk.admin_ticket_resolver(uuid, text, smallint, boolean, text, jsonb), dk.admin_soporte_metricas() TO dk_auth;

COMMIT;
