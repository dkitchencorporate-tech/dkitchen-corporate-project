-- 0021 — Super admin del QR: historial de cambios, ficha de cliente y acciones auditadas (27/09/2026)
--
-- Reglas: toda acción del admin pasa por una función SECURITY DEFINER que
-- comprueba dk.es_admin() dentro de la base (no en la app), fija search_path,
-- no es ejecutable por PUBLIC y deja rastro en auditoria. Los cambios que el
-- cliente hace en su panel se registran por trigger, no por la app, así que no
-- dependen de que el código se acuerde de auditar.

BEGIN;

-- 1. Auditoría enlazada al restaurante
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS restaurante_id uuid;
CREATE INDEX IF NOT EXISTS auditoria_restaurante_idx ON public.auditoria (restaurante_id, ocurrido_en DESC);

-- 2. Trigger de historial: qué cambió, cuándo y quién
CREATE OR REPLACE FUNCTION dk.registrar_cambio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $$
DECLARE
  v_viejo jsonb := CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END;
  v_nuevo jsonb := CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) END;
  v_rest uuid;
  v_cambios jsonb := '{}'::jsonb;
  k text;
BEGIN
  v_rest := CASE TG_TABLE_NAME
              WHEN 'restaurantes' THEN coalesce(v_nuevo, v_viejo)->>'id'
              ELSE coalesce(v_nuevo, v_viejo)->>'restaurante_id'
            END::uuid;

  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT jsonb_object_keys(v_nuevo) LOOP
      -- Identificadores de pago: nunca al historial
      CONTINUE WHEN k IN ('stripe_customer_id','stripe_subscription_id','whop_membresia_ampliado');
      IF v_nuevo->k IS DISTINCT FROM v_viejo->k THEN
        v_cambios := v_cambios || jsonb_build_object(k, jsonb_build_object('antes', v_viejo->k, 'despues', v_nuevo->k));
      END IF;
    END LOOP;
    IF v_cambios = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSE
    v_cambios := jsonb_build_object('nombre', coalesce(v_nuevo, v_viejo)->'nombre');
  END IF;

  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), TG_TABLE_NAME || '.' || lower(TG_OP),
          jsonb_build_object('id', coalesce(v_nuevo, v_viejo)->'id', 'cambios', v_cambios), v_rest);

  RETURN coalesce(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION dk.registrar_cambio() FROM PUBLIC;

DROP TRIGGER IF EXISTS historial_restaurantes ON public.restaurantes;
CREATE TRIGGER historial_restaurantes AFTER UPDATE ON public.restaurantes
  FOR EACH ROW EXECUTE FUNCTION dk.registrar_cambio();
DROP TRIGGER IF EXISTS historial_menu_secciones ON public.menu_secciones;
CREATE TRIGGER historial_menu_secciones AFTER INSERT OR UPDATE OR DELETE ON public.menu_secciones
  FOR EACH ROW EXECUTE FUNCTION dk.registrar_cambio();
DROP TRIGGER IF EXISTS historial_menu_items ON public.menu_items;
CREATE TRIGGER historial_menu_items AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION dk.registrar_cambio();

-- 3. Guardia común
CREATE OR REPLACE FUNCTION dk.exigir_admin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT dk.es_admin() THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION dk.exigir_admin() FROM PUBLIC;

-- 4. Ficha de cliente
CREATE OR REPLACE FUNCTION dk.admin_ficha_cliente(p_restaurante uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r jsonb;
BEGIN
  PERFORM dk.exigir_admin();
  SELECT jsonb_build_object(
    'restaurante', to_jsonb(x) - 'stripe_customer_id' - 'stripe_subscription_id' - 'whop_membresia_ampliado',
    'email', (SELECT u.email FROM neon_auth."user" u WHERE u.id = x.propietario),
    'contacto', (SELECT u.name FROM neon_auth."user" u WHERE u.id = x.propietario),
    'ultimo_acceso', (SELECT max(s."createdAt") FROM neon_auth.session s WHERE s."userId" = x.propietario),
    'codigos', (SELECT coalesce(jsonb_agg(c.codigo), '[]') FROM public.codigos_qr c WHERE c.restaurante_id = x.id AND c.activo),
    'platos', (SELECT count(*) FROM public.menu_items m WHERE m.restaurante_id = x.id),
    'secciones', (SELECT count(*) FROM public.menu_secciones s WHERE s.restaurante_id = x.id),
    'escaneos_30d', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'n', coalesce(n, 0)) ORDER BY d), '[]')
      FROM generate_series(current_date - 29, current_date, interval '1 day') d
      LEFT JOIN (
        SELECT e.ocurrido_en::date dia, count(*) n
        FROM public.escaneos e JOIN public.codigos_qr c ON c.codigo = e.codigo
        WHERE c.restaurante_id = x.id AND e.ocurrido_en >= current_date - 29
        GROUP BY 1
      ) t ON t.dia = d::date),
    'llamadas_30d', (SELECT count(*) FROM public.llamadas_camarero l WHERE l.restaurante_id = x.id AND l.creada_en >= now() - interval '30 days')
  ) INTO r
  FROM public.restaurantes x WHERE x.id = p_restaurante;
  RETURN r;
END;
$$;

-- 5. Acciones del admin (auditadas)
CREATE OR REPLACE FUNCTION dk.admin_cambiar_estado(p_restaurante uuid, p_estado text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_estado NOT IN ('activo', 'suspendido') THEN
    RAISE EXCEPTION 'estado no permitido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes
     SET estado_acceso = p_estado,
         activo = (p_estado = 'activo'),
         pago_fallido_desde = CASE WHEN p_estado = 'activo' THEN NULL ELSE pago_fallido_desde END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.cambiar_estado', jsonb_build_object('estado', p_estado), p_restaurante);
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_cambiar_plan(p_restaurante uuid, p_plan text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_plan NOT IN ('basico', 'ampliado') THEN
    RAISE EXCEPTION 'plan no permitido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes SET plan = p_plan WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.cambiar_plan', jsonb_build_object('plan', p_plan), p_restaurante);
END;
$$;

-- Devuelve el correo y el asunto para avisar al cliente (el envío lo hace la app)
CREATE OR REPLACE FUNCTION dk.admin_responder_ticket(p_ticket uuid, p_respuesta text, p_cerrar boolean DEFAULT false)
RETURNS TABLE (email text, asunto text, restaurante text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  PERFORM dk.exigir_admin();
  IF p_respuesta IS NULL OR length(btrim(p_respuesta)) = 0 OR length(p_respuesta) > 4000 THEN
    RAISE EXCEPTION 'respuesta no válida' USING ERRCODE = '22023';
  END IF;
  UPDATE public.tickets_soporte t
     SET respuesta = btrim(p_respuesta),
         estado = CASE WHEN p_cerrar THEN 'cerrado' ELSE 'respondido' END,
         respondido_en = now()
   WHERE t.id = p_ticket
  RETURNING t.restaurante_id INTO v_rest;
  IF v_rest IS NULL THEN RAISE EXCEPTION 'ticket no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.responder_ticket', jsonb_build_object('ticket', p_ticket, 'cerrado', p_cerrar), v_rest);
  RETURN QUERY
    SELECT u.email::text, t.asunto, r.nombre
    FROM public.tickets_soporte t
    JOIN public.restaurantes r ON r.id = t.restaurante_id
    JOIN neon_auth."user" u ON u.id = r.propietario
    WHERE t.id = p_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_estado_solicitud_qr(p_solicitud uuid, p_estado text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  PERFORM dk.exigir_admin();
  IF p_estado NOT IN ('solicitado','presupuestado','pagado','en_produccion','enviado') THEN
    RAISE EXCEPTION 'estado no permitido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.solicitudes_qr_fisico SET estado = p_estado, actualizado_en = now()
   WHERE id = p_solicitud RETURNING restaurante_id INTO v_rest;
  IF v_rest IS NULL THEN RAISE EXCEPTION 'solicitud no encontrada' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.estado_solicitud_qr', jsonb_build_object('solicitud', p_solicitud, 'estado', p_estado), v_rest);
END;
$$;

-- 6. Bandeja global de soporte
CREATE OR REPLACE FUNCTION dk.admin_bandeja_soporte()
RETURNS TABLE (id uuid, restaurante_id uuid, restaurante text, asunto text, mensaje text, estado text,
               respuesta text, creado_en timestamptz, respondido_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
    SELECT t.id, t.restaurante_id, r.nombre, t.asunto, t.mensaje, t.estado, t.respuesta, t.creado_en, t.respondido_en
    FROM public.tickets_soporte t JOIN public.restaurantes r ON r.id = t.restaurante_id
    ORDER BY (t.estado = 'abierto') DESC, t.creado_en DESC
    LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_solicitudes_qr()
RETURNS TABLE (id uuid, restaurante_id uuid, restaurante text, tipo text, cantidad integer, direccion_envio text,
               notas text, estado text, creado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
    SELECT s.id, s.restaurante_id, r.nombre, s.tipo, s.cantidad, s.direccion_envio, s.notas, s.estado, s.creado_en
    FROM public.solicitudes_qr_fisico s JOIN public.restaurantes r ON r.id = s.restaurante_id
    ORDER BY (s.estado <> 'enviado') DESC, s.creado_en DESC
    LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_historial_cliente(p_restaurante uuid)
RETURNS TABLE (ocurrido_en timestamptz, accion text, detalle jsonb, quien text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
    SELECT a.ocurrido_en, a.accion, a.detalle,
           CASE WHEN a.identidad IS NULL THEN 'sistema'
                WHEN EXISTS (SELECT 1 FROM public.identidades i WHERE i.id = a.identidad AND i.rol = 'admin') THEN 'DKitchen'
                ELSE 'cliente' END
    FROM public.auditoria a
    WHERE a.restaurante_id = p_restaurante
    ORDER BY a.ocurrido_en DESC
    LIMIT 100;
END;
$$;

-- 7. Permisos: nadie por defecto; solo dk_auth (y dentro exige admin)
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'dk.admin_ficha_cliente(uuid)', 'dk.admin_cambiar_estado(uuid,text)', 'dk.admin_cambiar_plan(uuid,text)',
    'dk.admin_responder_ticket(uuid,text,boolean)', 'dk.admin_estado_solicitud_qr(uuid,text)',
    'dk.admin_bandeja_soporte()', 'dk.admin_solicitudes_qr()', 'dk.admin_historial_cliente(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_auth', f);
  END LOOP;
END $$;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0021_super_admin_qr.sql');

COMMIT;
