-- 0061 · Bloque 1b AMPLIADO de AUTOMATIZACION_PRODUCTOS_2026-10-08.md (§9 y §10): Central de gestión total.
-- (a) Baja al final del periodo pagado: baja_programada_en (+ motivo y quién). La rellenan el panel del
--     cliente y Central; al vencer, el webhook de Stripe (customer.subscription.deleted) o, de respaldo,
--     el cron diario pasan el local a 'suspendido' → el trigger de 0041 pone baja_desde y arranca el
--     borrado a los 60 días.
-- (b) Archivo (archivado_en) y cuenta demo interna (demo_interna): fuera de ingresos, del parte y de las alertas.
-- (c) Ingresos reales: admin_resumen_clientes devuelve la cuota que de verdad se paga (sin prueba, demo,
--     cortesía ni suspendidos) y los datos de las pestañas.
-- (d) Modo soporte: dk.gestiona() y la edición de datos del local admiten al super admin (con 2FA).
-- (e) Fuera regalos: «todo incluido» solo con fecha fija (sin fecha solo para demo interna).
-- (f) Avisos de fallo desde Central (tabla + funciones admin).
-- Todas las funciones admin: SECURITY DEFINER y coalesce(dk.es_admin(), false).

BEGIN;

-- 1. Columnas nuevas (dk_auth no tiene UPDATE sobre ellas: solo funciones)
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS demo_interna boolean NOT NULL DEFAULT false;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS archivado_en timestamptz;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS baja_programada_en date;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS baja_motivo text CHECK (baja_motivo IS NULL OR char_length(baja_motivo) <= 1000);
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS baja_por text CHECK (baja_por IS NULL OR baja_por IN ('cliente', 'dkitchen'));

-- 2. Cuota mensual que de verdad se cobra (céntimos, sin IVA). 0 = no paga (prueba, demo, cortesía, archivado, suspendido).
CREATE OR REPLACE FUNCTION dk.cuota_real(p_restaurante uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE x public.restaurantes; v_enlaces int; v_plan int; v_mod int; v_nivel int;
BEGIN
  SELECT * INTO x FROM public.restaurantes WHERE id = p_restaurante;
  IF NOT FOUND OR x.demo_interna OR x.archivado_en IS NOT NULL OR x.estado_acceso = 'suspendido'
     OR coalesce(x.prueba_hasta >= current_date, false) THEN
    RETURN 0;
  END IF;
  -- Cuota acordada en un enlace de Central (0030): manda sobre el precio de tarifa.
  SELECT coalesce(sum(e.mensual_centimos), 0)::int INTO v_enlaces
    FROM public.enlaces_pago e WHERE e.restaurante_id = x.id AND e.estado = 'pagado' AND e.mensual_centimos > 0;
  IF v_enlaces > 0 THEN RETURN v_enlaces; END IF;
  -- Sin cliente de Stripe real (alta de cortesía «cortesia-…») no hay cobro.
  IF x.stripe_customer_id IS NULL OR x.stripe_customer_id NOT LIKE 'cus\_%' THEN RETURN 0; END IF;
  v_nivel := dk.plan_nivel(x.plan);
  v_plan := CASE WHEN x.fundador_desde IS NOT NULL AND x.fundador_perdido_en IS NULL AND x.plan = 'sala'
                 THEN round(dk.precio_plan('sala') * 0.6)::int ELSE dk.precio_plan(x.plan) END;
  SELECT coalesce(sum(k.precio_centimos), 0)::int INTO v_mod
    FROM public.servicios_contratados s JOIN public.catalogo_servicios k ON k.servicio = s.servicio
   WHERE s.restaurante_id = x.id AND s.estado <> 'cancelado' AND s.origen = 'pago' AND k.tipo = 'mensual'
     AND NOT (v_nivel >= 2 AND s.servicio IN ('plano_mesas', 'app_sala', 'pack_sala'))
     AND NOT (v_nivel >= 3 AND s.servicio IN ('conexion_tpv', 'comandero_pro', 'idiomas'));
  RETURN v_plan + v_mod;
END;
$$;

-- 3. Lista de clientes de Central con todo lo que necesitan las pestañas
DROP FUNCTION IF EXISTS dk.admin_resumen_clientes();
CREATE FUNCTION dk.admin_resumen_clientes()
RETURNS TABLE (
  restaurante_id uuid, nombre text, slug text, plan text, estado_acceso text,
  activo boolean, creado_en timestamptz, email text, contacto text,
  codigo_qr text, platos bigint, escaneos_mes bigint, escaneos_total bigint,
  tickets_abiertos bigint, solicitudes_qr_pendientes bigint,
  escaneos_14d bigint, prueba_hasta date, demo_interna boolean, archivado_en timestamptz,
  baja_programada_en date, baja_desde date, pago_fallido_desde timestamptz, cuota_centimos integer,
  tutorial_paso smallint, tutorial_completado boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'solo admin' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.id, r.nombre, r.slug, r.plan, r.estado_acceso, r.activo, r.creado_en,
         i.email::text, i.nombre,
         c.codigo,
         (SELECT count(*) FROM menu_items m WHERE m.restaurante_id = r.id),
         (SELECT count(*) FROM escaneos e WHERE e.codigo = c.codigo
            AND e.ocurrido_en >= date_trunc('month', now())),
         (SELECT count(*) FROM escaneos e WHERE e.codigo = c.codigo),
         (SELECT count(*) FROM tickets_soporte t WHERE t.restaurante_id = r.id AND t.estado <> 'cerrado'),
         (SELECT count(*) FROM solicitudes_qr_fisico s WHERE s.restaurante_id = r.id AND s.estado = 'solicitado'),
         (SELECT count(*) FROM escaneos e JOIN codigos_qr q ON q.codigo = e.codigo
            WHERE q.restaurante_id = r.id AND e.ocurrido_en > now() - interval '14 days'),
         r.prueba_hasta, r.demo_interna, r.archivado_en, r.baja_programada_en, r.baja_desde, r.pago_fallido_desde,
         dk.cuota_real(r.id), r.tutorial_paso, r.tutorial_completado_en IS NOT NULL
  FROM restaurantes r
  LEFT JOIN identidades i ON i.id = r.propietario
  LEFT JOIN LATERAL (SELECT q.codigo FROM codigos_qr q WHERE q.restaurante_id = r.id AND q.activo
                     ORDER BY q.creado_en LIMIT 1) c ON true
  ORDER BY r.creado_en DESC;
END;
$$;

-- 4. Archivo, demo interna y baja programada desde Central
CREATE OR REPLACE FUNCTION dk.admin_archivar(p_restaurante uuid, p_archivar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.restaurantes SET archivado_en = CASE WHEN p_archivar THEN coalesce(archivado_en, now()) END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), CASE WHEN p_archivar THEN 'admin.archivar' ELSE 'admin.desarchivar' END, '{}'::jsonb, p_restaurante);
END;
$$;

-- Demo interna: no cuenta en ingresos ni en el parte, sin prueba que venza (no recibe avisos ni pasa a solo lectura).
CREATE OR REPLACE FUNCTION dk.admin_demo(p_restaurante uuid, p_demo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.restaurantes
     SET demo_interna = p_demo,
         prueba_hasta = CASE WHEN p_demo THEN NULL ELSE prueba_hasta END,
         estado_acceso = CASE WHEN p_demo AND estado_acceso = 'solo_lectura' AND pago_fallido_desde IS NULL THEN 'activo' ELSE estado_acceso END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.demo', jsonb_build_object('demo', p_demo), p_restaurante);
END;
$$;

-- Baja programada (Central). La cancelación en Stripe la hace la app ANTES de llamar aquí y pasa la fecha
-- de fin del periodo pagado. Fecha de hoy o pasada (o sin suscripción) = baja inmediata.
-- Devuelve correo y nombre para el aviso al cliente.
CREATE OR REPLACE FUNCTION dk.admin_programar_baja(p_restaurante uuid, p_fecha date, p_motivo text)
RETURNS TABLE (email text, contacto text, nombre text, inmediata boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date; v_inm boolean;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_fecha IS NULL OR p_fecha > v_hoy + 400 THEN RAISE EXCEPTION 'fecha de baja no válida' USING ERRCODE = '22023'; END IF;
  v_inm := p_fecha <= v_hoy;
  UPDATE public.restaurantes
     SET baja_programada_en = greatest(p_fecha, v_hoy), baja_motivo = left(nullif(trim(p_motivo), ''), 1000), baja_por = 'dkitchen',
         estado_acceso = CASE WHEN v_inm THEN 'suspendido' ELSE estado_acceso END,
         activo = CASE WHEN v_inm THEN false ELSE activo END
   WHERE id = p_restaurante AND estado_acceso <> 'suspendido';
  IF NOT FOUND THEN RAISE EXCEPTION 'el local no existe o ya está de baja' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.programar_baja', jsonb_build_object('fecha', greatest(p_fecha, v_hoy), 'inmediata', v_inm), p_restaurante);
  RETURN QUERY SELECT u.email::text, u.name::text, r.nombre, v_inm
    FROM public.restaurantes r LEFT JOIN neon_auth."user" u ON u.id = r.propietario WHERE r.id = p_restaurante;
END;
$$;

-- Anular una baja programada que aún no ha vencido (la app reactiva antes la renovación en Stripe).
CREATE OR REPLACE FUNCTION dk.admin_anular_baja(p_restaurante uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.restaurantes SET baja_programada_en = NULL, baja_motivo = NULL, baja_por = NULL
   WHERE id = p_restaurante AND baja_programada_en IS NOT NULL AND estado_acceso <> 'suspendido';
  IF NOT FOUND THEN RAISE EXCEPTION 'no hay una baja pendiente que anular' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.anular_baja', '{}'::jsonb, p_restaurante);
END;
$$;

-- Baja pedida por el dueño desde su panel (ya cancela Stripe la app): deja la fecha para que venza sola.
CREATE OR REPLACE FUNCTION dk.panel_programar_baja(p_restaurante uuid, p_fecha date, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
  IF p_fecha IS NULL OR p_fecha > v_hoy + 400 THEN RAISE EXCEPTION 'fecha de baja no válida' USING ERRCODE = '22023'; END IF;
  UPDATE public.restaurantes
     SET baja_programada_en = greatest(p_fecha, v_hoy), baja_motivo = left(nullif(trim(p_motivo), ''), 1000), baja_por = 'cliente'
   WHERE id = p_restaurante AND propietario = dk.identidad_actual() AND estado_acceso <> 'suspendido';
  IF NOT FOUND THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'panel.programar_baja', jsonb_build_object('fecha', greatest(p_fecha, v_hoy)), p_restaurante);
END;
$$;

-- Webhook (customer.subscription.deleted): si ese cliente de Stripe tenía una baja programada, se ejecuta ya.
CREATE OR REPLACE FUNCTION dk.baja_por_stripe(p_cliente text)
RETURNS TABLE (restaurante_id uuid, nombre text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  RETURN QUERY
    WITH b AS (
      UPDATE public.restaurantes r SET estado_acceso = 'suspendido', activo = false
       WHERE r.stripe_customer_id = p_cliente AND p_cliente LIKE 'cus\_%'
         AND r.baja_programada_en IS NOT NULL AND r.estado_acceso <> 'suspendido'
      RETURNING r.id, r.nombre
    ), a AS (
      INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
      SELECT NULL, 'sistema.baja_ejecutada', jsonb_build_object('origen', 'stripe'), b.id FROM b
    )
    SELECT b.id, b.nombre FROM b;
END;
$$;

-- Cron diario (respaldo del webhook): ejecuta las bajas cuya fecha ya llegó.
CREATE OR REPLACE FUNCTION dk.ejecutar_bajas_vencidas()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH b AS (
    UPDATE public.restaurantes SET estado_acceso = 'suspendido', activo = false
     WHERE baja_programada_en IS NOT NULL AND baja_programada_en <= (now() AT TIME ZONE 'Europe/Madrid')::date
       AND estado_acceso <> 'suspendido'
    RETURNING id
  ), a AS (
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    SELECT NULL, 'sistema.baja_ejecutada', jsonb_build_object('origen', 'cron'), id FROM b
  )
  SELECT count(*)::int FROM b;
$$;

-- Reactivar limpia la baja programada (si se reactiva, ya no hay baja pendiente).
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
         pago_fallido_desde = CASE WHEN p_estado = 'activo' THEN NULL ELSE pago_fallido_desde END,
         baja_programada_en = CASE WHEN p_estado = 'activo' THEN NULL ELSE baja_programada_en END,
         baja_motivo = CASE WHEN p_estado = 'activo' THEN NULL ELSE baja_motivo END,
         baja_por = CASE WHEN p_estado = 'activo' THEN NULL ELSE baja_por END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.cambiar_estado', jsonb_build_object('estado', p_estado), p_restaurante);
END;
$$;

-- 5. Fuera regalos: «todo incluido» solo con fecha fija; sin fecha, únicamente en una cuenta demo interna.
CREATE OR REPLACE FUNCTION dk.admin_regalar_todo(p_restaurante uuid, p_dias int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_dias IS NOT NULL AND (p_dias < 1 OR p_dias > 120) THEN
    RAISE EXCEPTION 'la prueba debe durar entre 1 y 120 días' USING ERRCODE = '22023';
  END IF;
  IF p_dias IS NULL AND NOT EXISTS (SELECT 1 FROM public.restaurantes WHERE id = p_restaurante AND demo_interna) THEN
    RAISE EXCEPTION 'la prueba necesita una fecha de fin (sin fecha solo en cuentas demo internas)' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes
     SET plan = 'sala', nivel_diseno = 'autor', estado_acceso = 'activo', pago_fallido_desde = NULL,
         prueba_hasta = CASE WHEN p_dias IS NULL THEN NULL ELSE current_date + p_dias END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen)
  VALUES (p_restaurante, 'setup_experto', 'regalo') ON CONFLICT DO NOTHING;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.regalar_todo', jsonb_build_object('dias', p_dias), p_restaurante);
END;
$$;

-- Las pruebas de una demo interna no vencen ni avisan.
CREATE OR REPLACE FUNCTION dk.avanzar_pruebas()
RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
  WITH vencidas AS (
    UPDATE public.restaurantes SET estado_acceso = 'solo_lectura'
     WHERE prueba_hasta IS NOT NULL AND prueba_hasta < current_date
       AND estado_acceso = 'activo' AND pago_fallido_desde IS NULL AND NOT demo_interna
    RETURNING id
  ), registro AS (
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    SELECT NULL, 'prueba.vencida', '{}'::jsonb, id FROM vencidas
  )
  SELECT count(*)::int FROM vencidas;
$$;

CREATE OR REPLACE FUNCTION dk.pruebas_por_avisar()
RETURNS TABLE (restaurante_id uuid, nombre text, email text, contacto text, prueba_hasta date, dias int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
  SELECT r.id, r.nombre, u.email, u.name, r.prueba_hasta, (r.prueba_hasta - current_date)::int
    FROM public.restaurantes r JOIN neon_auth."user" u ON u.id = r.propietario
   WHERE r.prueba_hasta - current_date IN (3, 1) AND r.estado_acceso = 'activo' AND NOT r.demo_interna;
$$;

-- 6. Modo soporte: el super admin (con 2FA) gestiona la carta y el local de cualquier cliente desde su panel.
CREATE OR REPLACE FUNCTION dk.gestiona(p_restaurante uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurantes r
                  WHERE r.id = p_restaurante
                    AND (r.propietario = dk.identidad_actual()
                         OR (r.socio_id = dk.identidad_actual() AND r.socio_puede_editar AND dk.es_socio())))
         OR coalesce(dk.es_admin(), false);
$$;

DROP POLICY IF EXISTS restaurante_edita_lo_suyo ON public.restaurantes;
CREATE POLICY restaurante_edita_lo_suyo ON public.restaurantes FOR UPDATE TO dk_auth
  USING (propietario = dk.identidad_actual()
         OR (socio_id = dk.identidad_actual() AND socio_puede_editar AND dk.es_socio())
         OR coalesce(dk.es_admin(), false))
  WITH CHECK (propietario = dk.identidad_actual()
         OR (socio_id = dk.identidad_actual() AND socio_puede_editar AND dk.es_socio())
         OR coalesce(dk.es_admin(), false));

-- 7. Avisos de fallo desde Central («Avisar de un fallo» en cada pantalla). Claude los lee al empezar.
CREATE TABLE IF NOT EXISTS public.avisos_fallo (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor       uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  pantalla    text NOT NULL CHECK (char_length(pantalla) BETWEEN 1 AND 300),
  mensaje     text NOT NULL CHECK (char_length(mensaje) BETWEEN 3 AND 3000),
  estado      text NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'en_curso', 'resuelto')),
  nota        text CHECK (nota IS NULL OR char_length(nota) <= 1000),
  creado_en   timestamptz NOT NULL DEFAULT now(),
  resuelto_en timestamptz
);
CREATE INDEX IF NOT EXISTS avisos_fallo_idx ON public.avisos_fallo (estado, creado_en DESC);
ALTER TABLE public.avisos_fallo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_fallo FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.avisos_fallo FROM PUBLIC;

CREATE OR REPLACE FUNCTION dk.admin_avisar_fallo(p_pantalla text, p_mensaje text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v uuid;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF (SELECT count(*) FROM public.avisos_fallo WHERE creado_en > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'demasiados avisos en una hora' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public.avisos_fallo (autor, pantalla, mensaje)
  VALUES (dk.identidad_actual(), left(trim(p_pantalla), 300), left(trim(p_mensaje), 3000))
  RETURNING id INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_avisos_fallo(p_limite int)
RETURNS TABLE (id uuid, pantalla text, mensaje text, estado text, nota text, creado_en timestamptz, resuelto_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT a.id, a.pantalla, a.mensaje, a.estado, a.nota, a.creado_en, a.resuelto_en
    FROM public.avisos_fallo a ORDER BY (a.estado = 'resuelto'), a.creado_en DESC LIMIT greatest(1, least(p_limite, 200));
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_aviso_estado(p_id uuid, p_estado text, p_nota text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('nuevo', 'en_curso', 'resuelto') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  UPDATE public.avisos_fallo SET estado = p_estado, nota = coalesce(left(nullif(trim(p_nota), ''), 1000), nota),
         resuelto_en = CASE WHEN p_estado = 'resuelto' THEN now() END
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'aviso no encontrado' USING ERRCODE = 'P0002'; END IF;
END;
$$;

-- 8. Parte y panel de mando (cuerpo de 0057): sin demo interna ni archivados; ingreso mensual real;
--    montaje sin empezar con texto claro; aviso de bajas que vencen en 7 días.
CREATE OR REPLACE FUNCTION dk.mando_datos()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  v_ini timestamptz := (v_hoy::timestamp AT TIME ZONE 'Europe/Madrid');
  v_alertas jsonb := '[]'::jsonb;
  v_ia numeric; v_tope numeric; v_bytes bigint;
  v jsonb;
BEGIN
  -- Pagos: impago en curso (gracia, solo lectura, suspendido sin baja voluntaria)
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'pago', 'gravedad', 'urgente', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', CASE r.estado_acceso WHEN 'gracia' THEN 'Cobro fallido: en periodo de gracia'
                                    WHEN 'solo_lectura' THEN 'Impago: panel en solo lectura'
                                    ELSE 'Suspendido por impago' END
        || coalesce(' desde el ' || to_char(r.pago_fallido_desde AT TIME ZONE 'Europe/Madrid', 'DD/MM'), '')))
    FROM public.restaurantes r
    WHERE NOT r.demo_interna AND r.archivado_en IS NULL AND r.estado_acceso IN ('gracia', 'solo_lectura', 'suspendido') AND r.baja_desde IS NULL), '[]'::jsonb);

  -- Pagos: prueba que vence en 3 días o menos
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'prueba', 'gravedad', 'aviso', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', 'La prueba vence ' || CASE WHEN r.prueba_hasta = v_hoy THEN 'hoy' ELSE 'el ' || to_char(r.prueba_hasta, 'DD/MM') END))
    FROM public.restaurantes r
    WHERE NOT r.demo_interna AND r.archivado_en IS NULL AND r.activo AND r.baja_desde IS NULL AND r.prueba_hasta BETWEEN v_hoy AND v_hoy + 3), '[]'::jsonb);

  -- Bajas programadas que vencen en 7 días o menos (0061)
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'baja', 'gravedad', 'aviso', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', 'Baja programada' || CASE r.baja_por WHEN 'cliente' THEN ' (la pidió el cliente)' ELSE ' (desde Central)' END
        || ': deja de estar activo ' || CASE WHEN r.baja_programada_en = v_hoy THEN 'hoy' ELSE 'el ' || to_char(r.baja_programada_en, 'DD/MM') END))
    FROM public.restaurantes r
    WHERE NOT r.demo_interna AND r.archivado_en IS NULL AND r.estado_acceso <> 'suspendido'
      AND r.baja_programada_en BETWEEN v_hoy AND v_hoy + 7), '[]'::jsonb);

  -- Pagos: reembolsos y disputas de los últimos 7 días
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', e.tipo, 'gravedad', 'urgente', 'restaurante_id', e.restaurante_id, 'nombre', r.nombre,
      'texto', CASE e.tipo WHEN 'disputa' THEN 'Disputa (contracargo) de ' ELSE 'Reembolso de ' END
        || replace(to_char(e.importe_centimos / 100.0, 'FM9999990.00'), '.', ',') || ' € el ' || to_char(e.creado_en AT TIME ZONE 'Europe/Madrid', 'DD/MM')))
    FROM public.eventos_cobro e LEFT JOIN public.restaurantes r ON r.id = e.restaurante_id
    WHERE e.tipo IN ('reembolso', 'disputa') AND e.creado_en > now() - interval '7 days'), '[]'::jsonb);

  -- Locales atascados: montaje guiado sin terminar 48 h después del alta
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'montaje', 'gravedad', 'aviso', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', CASE WHEN coalesce(r.tutorial_paso, 0) = 0 THEN 'No ha empezado el montaje guiado'
                     ELSE 'Montaje guiado a medias (paso ' || r.tutorial_paso || ')' END
        || ' · alta hace ' || floor(extract(epoch FROM now() - r.creado_en) / 86400)::int || ' días'))
    FROM public.restaurantes r
    WHERE NOT r.demo_interna AND r.archivado_en IS NULL AND r.activo AND r.baja_desde IS NULL AND r.tutorial_completado_en IS NULL
      AND r.creado_en < now() - interval '48 hours'), '[]'::jsonb);

  -- Locales atascados: 14 días sin escaneos (con más de 14 días de vida)
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'dormido', 'gravedad', 'aviso', 'restaurante_id', r.id, 'nombre', r.nombre,
      'texto', 'Sin escaneos en 14 días'))
    FROM public.restaurantes r
    WHERE NOT r.demo_interna AND r.archivado_en IS NULL AND r.activo AND r.baja_desde IS NULL AND r.estado_acceso = 'activo'
      AND r.creado_en < now() - interval '14 days'
      AND NOT EXISTS (SELECT 1 FROM public.escaneos s JOIN public.codigos_qr q ON q.codigo = s.codigo
                      WHERE q.restaurante_id = r.id AND s.ocurrido_en > now() - interval '14 days')), '[]'::jsonb);

  -- Tickets abiertos más de 24 h
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'ticket', 'gravedad', CASE WHEN t.creado_en < now() - interval '72 hours' THEN 'urgente' ELSE 'aviso' END,
      'restaurante_id', t.restaurante_id, 'nombre', r.nombre, 'ticket_id', t.id,
      'texto', 'Ticket sin responder (' || coalesce('N' || t.nivel, 'sin nivel') || ') hace '
        || floor(extract(epoch FROM now() - t.creado_en) / 3600)::int || ' h: ' || left(t.asunto, 60)))
    FROM public.tickets_soporte t JOIN public.restaurantes r ON r.id = t.restaurante_id
    WHERE t.estado = 'abierto' AND t.creado_en < now() - interval '24 hours'), '[]'::jsonb);

  -- Oportunidades (0057): locales que piden una llamada para Signature desde su panel
  v_alertas := v_alertas || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'tipo', 'signature', 'gravedad', CASE WHEN l.creado_en < now() - interval '48 hours' THEN 'urgente' ELSE 'aviso' END,
      'restaurante_id', l.restaurante_id, 'nombre', r.nombre,
      'texto', 'Pide una llamada para Signature (' || coalesce(l.datos ->> 'escaneos', '0') || ' escaneos, '
        || coalesce(l.datos ->> 'reservas', '0') || ' reservas y ' || coalesce(l.datos ->> 'llamadas', '0') || ' llamadas en 30 días)'))
    FROM public.leads_signature l JOIN public.restaurantes r ON r.id = l.restaurante_id
    WHERE l.atendido_en IS NULL), '[]'::jsonb);

  -- Topes técnicos: gasto de IA del mes, espacio de Neon y errores del webhook en 24 h
  v_ia := dk.ia_gasto_mes_usd(); v_tope := dk.ia_tope_mensual_usd();
  IF v_tope > 0 AND v_ia / v_tope > 0.7 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object('tipo', 'ia', 'gravedad', CASE WHEN v_ia / v_tope > 0.9 THEN 'urgente' ELSE 'aviso' END,
      'texto', 'IA al ' || round(100 * v_ia / v_tope) || ' % del tope mensual (' || round(v_ia, 2) || ' de ' || v_tope || ' $)'));
  END IF;
  v_bytes := pg_database_size(current_database());
  IF v_bytes > 0.6 * 512 * 1024 * 1024 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object('tipo', 'neon', 'gravedad', CASE WHEN v_bytes > 0.8 * 512 * 1024 * 1024 THEN 'urgente' ELSE 'aviso' END,
      'texto', 'Base de datos al ' || round(100.0 * v_bytes / (512 * 1024 * 1024)) || ' % del plan Free de Neon'));
  END IF;
  v_alertas := v_alertas || coalesce((SELECT jsonb_build_array(jsonb_build_object('tipo', 'webhook', 'gravedad', 'urgente',
      'texto', count(*) || ' error(es) del webhook de Stripe en 24 h; el último: ' || coalesce(max(detalle), '?')))
    FROM public.eventos_cobro WHERE tipo = 'error_webhook' AND creado_en > now() - interval '24 hours' HAVING count(*) > 0), '[]'::jsonb);

  SELECT jsonb_build_object(
    'fecha', v_hoy,
    'generado_en', now(),
    'altas', jsonb_build_object(
      'hoy', count(*) FILTER (WHERE r.creado_en >= v_ini),
      'd7',  count(*) FILTER (WHERE r.creado_en >= v_ini - interval '6 days'),
      'd30', count(*) FILTER (WHERE r.creado_en >= v_ini - interval '29 days')),
    'bajas', jsonb_build_object(
      'hoy', count(*) FILTER (WHERE r.baja_desde = v_hoy),
      'd7',  count(*) FILTER (WHERE r.baja_desde > v_hoy - 7),
      'd30', count(*) FILTER (WHERE r.baja_desde > v_hoy - 30)),
    'activos', count(*) FILTER (WHERE r.activo AND r.estado_acceso = 'activo' AND r.baja_desde IS NULL AND r.archivado_en IS NULL),
    'ingreso_mensual_centimos', coalesce(sum(dk.cuota_real(r.id)), 0),
    'en_prueba', count(*) FILTER (WHERE r.activo AND r.baja_desde IS NULL AND r.archivado_en IS NULL AND r.prueba_hasta >= v_hoy),
    'fundadores', count(*) FILTER (WHERE r.fundador_desde IS NOT NULL AND r.fundador_perdido_en IS NULL),
    'por_plan', (SELECT coalesce(jsonb_object_agg(plan, n), '{}'::jsonb) FROM (
        SELECT plan, count(*) n FROM public.restaurantes WHERE activo AND estado_acceso = 'activo' AND baja_desde IS NULL
          AND NOT demo_interna AND archivado_en IS NULL GROUP BY plan) x),
    'por_socio', (SELECT coalesce(jsonb_object_agg(s.codigo, x.n), '{}'::jsonb) FROM (
        SELECT socio_id, count(*) n FROM public.restaurantes WHERE socio_id IS NOT NULL AND creado_en >= v_ini - interval '29 days' GROUP BY socio_id) x
        JOIN public.socios s ON s.id = x.socio_id),
    -- Paso a pago = PRIMERA renovación cobrada (> 0 €) de un local tras su alta
    'pasos_pago', (SELECT jsonb_build_object(
        'hoy', count(*) FILTER (WHERE primera >= v_ini),
        'd7',  count(*) FILTER (WHERE primera >= v_ini - interval '6 days'),
        'd30', count(*) FILTER (WHERE primera >= v_ini - interval '29 days'))
      FROM (SELECT restaurante_id, min(creado_en) primera FROM public.eventos_cobro
            WHERE tipo = 'renovacion' AND importe_centimos > 0 AND restaurante_id IS NOT NULL GROUP BY restaurante_id) p),
    'cobrado_centimos', (SELECT jsonb_build_object(
        'hoy', coalesce(sum(importe_centimos) FILTER (WHERE creado_en >= v_ini), 0),
        'd30', coalesce(sum(importe_centimos) FILTER (WHERE creado_en >= v_ini - interval '29 days'), 0))
      FROM public.eventos_cobro WHERE tipo IN ('alta', 'renovacion')),
    'fallidos_7d', (SELECT count(*) FROM public.eventos_cobro WHERE tipo = 'fallido' AND creado_en > now() - interval '7 days'),
    'tickets', (SELECT jsonb_build_object(
        'abiertos', count(*) FILTER (WHERE estado = 'abierto'),
        'abiertos_24h', count(*) FILTER (WHERE estado = 'abierto' AND creado_en < now() - interval '24 hours'),
        'n1', count(*) FILTER (WHERE estado = 'abierto' AND (nivel = 1 OR (nivel IS NULL AND origen = 'chat'))),
        'n2', count(*) FILTER (WHERE estado = 'abierto' AND nivel = 2),
        'n3', count(*) FILTER (WHERE estado = 'abierto' AND nivel = 3),
        'sin_nivel', count(*) FILTER (WHERE estado = 'abierto' AND nivel IS NULL AND origen IS DISTINCT FROM 'chat'),
        'hoy', count(*) FILTER (WHERE creado_en >= v_ini),
        'resueltos_n2', count(*) FILTER (WHERE resuelto_en IS NOT NULL AND categoria IS NOT NULL))
      FROM public.tickets_soporte),
    'ia', jsonb_build_object('gasto_usd', round(v_ia, 2), 'tope_usd', v_tope),
    'neon_mb', round(v_bytes / 1048576.0),
    'alertas', v_alertas,
    'urgentes', (SELECT count(*) FROM jsonb_array_elements(v_alertas) a WHERE a ->> 'gravedad' = 'urgente'),
    'necesita_humano', jsonb_array_length(v_alertas))
  INTO v
  FROM public.restaurantes r
  WHERE NOT r.demo_interna;
  RETURN v;
END;
$$;

-- 9. Las 3 cuentas que existen hoy son demos de karc0 (recorrido 114): pasan a demo interna.
UPDATE public.restaurantes SET demo_interna = true, prueba_hasta = NULL;

-- 10. Permisos
REVOKE ALL ON FUNCTION dk.cuota_real(uuid), dk.admin_resumen_clientes(), dk.admin_archivar(uuid, boolean), dk.admin_demo(uuid, boolean),
  dk.admin_programar_baja(uuid, date, text), dk.admin_anular_baja(uuid), dk.panel_programar_baja(uuid, date, text),
  dk.baja_por_stripe(text), dk.ejecutar_bajas_vencidas(), dk.admin_avisar_fallo(text, text), dk.admin_avisos_fallo(int),
  dk.admin_aviso_estado(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_resumen_clientes(), dk.admin_archivar(uuid, boolean), dk.admin_demo(uuid, boolean),
  dk.admin_programar_baja(uuid, date, text), dk.admin_anular_baja(uuid), dk.panel_programar_baja(uuid, date, text),
  dk.admin_avisar_fallo(text, text), dk.admin_avisos_fallo(int), dk.admin_aviso_estado(uuid, text, text) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.baja_por_stripe(text), dk.ejecutar_bajas_vencidas() TO dk_aprovisionamiento;

COMMIT;
