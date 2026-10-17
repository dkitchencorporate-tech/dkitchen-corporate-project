-- 0081 · Reenganche de bajas + lista de exclientes + entrada de leads de la tarea (karc0, 17/10/2026; ESTADO §6 entradas 172–173).
-- Bajas: secuencia de 3 correos (día 0 «puertas abiertas», día 30 «tu carta sigue guardada», día 53 «se borra en 7 días»).
--   · Enlace de vuelta /volver/<token>: si la baja aún no ha llegado, «anular mi baja»; si ya está suspendida
--     (y no se ha borrado), paga el primer mes de SU plan a precio normal (decisión de karc0) y recupera la carta.
--     El importe lo fija la base (dk.precio_plan), nunca el navegador.
--   · Lista de exclientes (public.suscriptores_marketing): LSSI art. 21.2, cada correo comercial lleva la baja
--     de la lista con un clic (/baja-lista/<token> y cabecera List-Unsubscribe).
--   · Fuera de la secuencia comercial: cuentas archivadas y demos internas (pilotos, Casa Caracas). El aviso legal
--     del día 53 sale siempre, como hasta ahora.
--   · Arreglo: pagar un enlace (dk.aplicar_enlace_pago) no volvía a poner activo = true ni limpiaba la baja
--     programada, así que una cuenta suspendida que pagaba seguía sin carta.
-- Leads: dk.leads_importar recibe los leads de la tarea de Windows «DKitchen Buscar clientes» (vía /api/prospeccion/leads,
--   protegida con LEADS_TAREA_SECRET) y los mete en Prospección como «Por revisar», sin duplicados.

BEGIN;

-- 1. Lista de exclientes -------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suscriptores_marketing (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND char_length(email) <= 254),
  nombre         text CHECK (char_length(nombre) <= 120),
  origen         text NOT NULL DEFAULT 'exclientes' CHECK (origen IN ('exclientes')),
  estado         text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'baja')),
  token          text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') CHECK (token ~ '^[0-9a-f]{32}$'),
  restaurante_id uuid REFERENCES public.restaurantes(id) ON DELETE SET NULL,
  alta_en        timestamptz NOT NULL DEFAULT now(),
  baja_en        timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS suscriptores_marketing_email_origen ON public.suscriptores_marketing (lower(email), origen);
ALTER TABLE public.suscriptores_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscriptores_marketing FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.suscriptores_marketing FROM PUBLIC;
DROP POLICY IF EXISTS suscriptores_admin ON public.suscriptores_marketing;
CREATE POLICY suscriptores_admin ON public.suscriptores_marketing FOR SELECT TO dk_auth USING (dk.es_admin());
GRANT SELECT ON public.suscriptores_marketing TO dk_auth;

-- 2. Estado del reenganche en cada local ----------------------------------------------------------------
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS vuelta_token text UNIQUE CHECK (vuelta_token ~ '^[0-9a-f]{32}$');
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS reenganche_30_enviado boolean NOT NULL DEFAULT false;

-- El trigger de la 0041 también reinicia el día 30 al entrar o salir de la suspensión.
CREATE OR REPLACE FUNCTION dk.marcar_baja() RETURNS trigger
LANGUAGE plpgsql SET search_path TO pg_catalog AS $$
BEGIN
  IF NEW.estado_acceso = 'suspendido' AND OLD.estado_acceso IS DISTINCT FROM 'suspendido' THEN
    NEW.baja_desde := (now() AT TIME ZONE 'Europe/Madrid')::date;
    NEW.baja_avisada := false;
    NEW.reenganche_30_enviado := false;
  ELSIF NEW.estado_acceso <> 'suspendido' THEN
    NEW.baja_desde := NULL;
    NEW.baja_avisada := false;
    NEW.reenganche_30_enviado := false;
  END IF;
  RETURN NEW;
END;
$$;

-- Fuera de la secuencia comercial: archivadas y demos internas (archivado_en IS NULL AND NOT demo_interna).

-- 3. Día 0: tokens para el correo de baja (panel y Central). Mete al dueño en la lista de exclientes
--    (si ya se había dado de baja de la lista, se respeta) y devuelve el enlace de vuelta y el de la lista.
CREATE OR REPLACE FUNCTION dk.reenganche_preparar(p_restaurante uuid)
RETURNS TABLE (vuelta text, baja_lista text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r public.restaurantes; v_email text;
BEGIN
  SELECT * INTO r FROM public.restaurantes WHERE id = p_restaurante;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.restaurantes SET vuelta_token = coalesce(vuelta_token, replace(gen_random_uuid()::text, '-', ''))
   WHERE id = r.id RETURNING vuelta_token INTO vuelta;
  SELECT u.email::text INTO v_email FROM neon_auth."user" u WHERE u.id = r.propietario;
  IF v_email IS NOT NULL AND r.archivado_en IS NULL AND NOT r.demo_interna THEN
    INSERT INTO public.suscriptores_marketing (email, nombre, origen, restaurante_id)
    VALUES (lower(v_email), left(r.nombre, 120), 'exclientes', r.id)
    ON CONFLICT (lower(email), origen) DO UPDATE SET restaurante_id = EXCLUDED.restaurante_id, nombre = EXCLUDED.nombre;
    SELECT s.token INTO baja_lista FROM public.suscriptores_marketing s
     WHERE lower(s.email) = lower(v_email) AND s.origen = 'exclientes' AND s.estado = 'activo';
  END IF;
  RETURN NEXT;
END;
$$;

-- 4. Día 30: «tu carta sigue guardada». Marca como enviado a todos los que cumplen 30 días (una sola vez)
--    y devuelve solo los que siguen suscritos a la lista.
CREATE OR REPLACE FUNCTION dk.reenganche_30_pendientes()
RETURNS TABLE (nombre text, email text, plan text, precio_centimos int, borrado_el date, vuelta text, baja_lista text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
#variable_conflict use_column
BEGIN
  -- Las bajas por impago (o de Central sin correo) entran aquí en la lista; quien ya se dio de baja de ella, se respeta.
  INSERT INTO public.suscriptores_marketing (email, nombre, origen, restaurante_id)
  SELECT lower(u.email::text), left(r.nombre, 120), 'exclientes', r.id
    FROM public.restaurantes r JOIN neon_auth."user" u ON u.id = r.propietario
   WHERE r.estado_acceso = 'suspendido' AND NOT r.reenganche_30_enviado AND r.baja_desde IS NOT NULL
     AND r.baja_desde <= (now() AT TIME ZONE 'Europe/Madrid')::date - 30
     AND r.baja_desde >  (now() AT TIME ZONE 'Europe/Madrid')::date - 53
     AND r.archivado_en IS NULL AND NOT r.demo_interna
  ON CONFLICT (lower(email), origen) DO NOTHING;
  RETURN QUERY
    WITH marcados AS (
      UPDATE public.restaurantes r SET reenganche_30_enviado = true,
             vuelta_token = coalesce(r.vuelta_token, replace(gen_random_uuid()::text, '-', ''))
       WHERE r.estado_acceso = 'suspendido' AND NOT r.reenganche_30_enviado AND r.baja_desde IS NOT NULL
         AND r.baja_desde <= (now() AT TIME ZONE 'Europe/Madrid')::date - 30
         AND r.baja_desde >  (now() AT TIME ZONE 'Europe/Madrid')::date - 53
      RETURNING r.*
    )
    SELECT m.nombre::text, u.email::text, coalesce(m.plan, 'ampliado')::text, dk.precio_plan(coalesce(m.plan, 'ampliado')),
           m.baja_desde + 60, m.vuelta_token, s.token
      FROM marcados m
      JOIN neon_auth."user" u ON u.id = m.propietario
      JOIN public.suscriptores_marketing s ON lower(s.email) = lower(u.email::text) AND s.origen = 'exclientes' AND s.estado = 'activo'
     WHERE m.archivado_en IS NULL AND NOT m.demo_interna;
END;
$$;

-- 5. Día 53: el aviso legal de siempre, ahora con el enlace de vuelta y la baja de la lista (si procede).
DROP FUNCTION IF EXISTS dk.bajas_por_avisar();
CREATE FUNCTION dk.bajas_por_avisar()
RETURNS TABLE (nombre text, email text, borrado_el date, plan text, precio_centimos int, vuelta text, baja_lista text, comercial boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  RETURN QUERY
    WITH marcados AS (
      UPDATE public.restaurantes r SET baja_avisada = true,
             vuelta_token = coalesce(r.vuelta_token, replace(gen_random_uuid()::text, '-', ''))
       WHERE r.estado_acceso = 'suspendido' AND NOT r.baja_avisada
         AND r.baja_desde <= (now() AT TIME ZONE 'Europe/Madrid')::date - 53
      RETURNING r.*
    )
    SELECT m.nombre::text, u.email::text, m.baja_desde + 60, coalesce(m.plan, 'ampliado')::text,
           dk.precio_plan(coalesce(m.plan, 'ampliado')), m.vuelta_token, s.token,
           (m.archivado_en IS NULL AND NOT m.demo_interna)
      FROM marcados m
      JOIN neon_auth."user" u ON u.id = m.propietario
      LEFT JOIN public.suscriptores_marketing s ON lower(s.email) = lower(u.email::text) AND s.origen = 'exclientes' AND s.estado = 'activo';
END;
$$;

-- 6. Página /volver/<token> (visitante anónimo): qué ve el excliente.
CREATE OR REPLACE FUNCTION dk.vuelta_ver(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r public.restaurantes;
BEGIN
  IF p_token !~ '^[0-9a-f]{32}$' THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.restaurantes WHERE vuelta_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'nombre', r.nombre,
    'plan', coalesce(r.plan, 'ampliado'),
    'precio_centimos', dk.precio_plan(coalesce(r.plan, 'ampliado')),
    'estado', CASE WHEN r.estado_acceso = 'suspendido' THEN 'suspendida'
                   WHEN r.baja_programada_en IS NOT NULL THEN 'baja_programada'
                   ELSE 'activa' END,
    'baja_programada_en', r.baja_programada_en,
    'borrado_el', CASE WHEN r.baja_desde IS NOT NULL THEN r.baja_desde + 60 END);
END;
$$;

-- 7. «Volver con mi carta»: prepara (o reutiliza, 23 h) un enlace de pago del plan a precio normal.
ALTER TABLE public.enlaces_pago DROP CONSTRAINT IF EXISTS enlaces_pago_origen_check;
ALTER TABLE public.enlaces_pago ADD CONSTRAINT enlaces_pago_origen_check CHECK (origen IN ('admin', 'prueba', 'vuelta'));

CREATE OR REPLACE FUNCTION dk.vuelta_preparar(p_token text)
RETURNS TABLE (enlace uuid, restaurante_id uuid, nombre text, email text, plan text, centimos int, url text, cliente_stripe text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r public.restaurantes; v_plan text; v_precio int; e public.enlaces_pago;
BEGIN
  IF p_token !~ '^[0-9a-f]{32}$' THEN RAISE EXCEPTION 'enlace no válido' USING ERRCODE = '22023'; END IF;
  SELECT * INTO r FROM public.restaurantes WHERE vuelta_token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'enlace no válido' USING ERRCODE = 'P0002'; END IF;
  IF r.estado_acceso <> 'suspendido' THEN RAISE EXCEPTION 'la cuenta no está de baja' USING ERRCODE = '22023'; END IF;
  v_plan := coalesce(r.plan, 'ampliado');
  v_precio := dk.precio_plan(v_plan);
  IF v_precio < 100 THEN RAISE EXCEPTION 'plan sin precio' USING ERRCODE = '22023'; END IF;
  SELECT * INTO e FROM public.enlaces_pago x
   WHERE x.restaurante_id = r.id AND x.origen = 'vuelta' AND x.estado = 'pendiente' AND x.url IS NOT NULL
     AND x.plan = v_plan AND x.primer_cobro_centimos = v_precio AND x.creado_en > now() - interval '23 hours'
   ORDER BY x.creado_en DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.enlaces_pago (restaurante_id, creado_por, plan, servicios, primer_cobro_centimos, mensual_centimos, nota, dias_gratis, origen)
    VALUES (r.id, NULL, v_plan, '{}', v_precio, v_precio, 'Vuelta tras la baja (/volver)', 0, 'vuelta')
    RETURNING * INTO e;
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (NULL, 'cliente.vuelta_preparada', jsonb_build_object('enlace', e.id, 'plan', v_plan, 'centimos', v_precio), r.id);
  END IF;
  SELECT u.email::text INTO email FROM neon_auth."user" u WHERE u.id = r.propietario;
  enlace := e.id; restaurante_id := r.id; nombre := r.nombre; plan := v_plan; centimos := v_precio; url := e.url;
  cliente_stripe := r.stripe_customer_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION dk.vuelta_fijar_url(p_enlace uuid, p_url text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF p_url !~ '^https://' THEN RAISE EXCEPTION 'url no válida' USING ERRCODE = '22023'; END IF;
  UPDATE public.enlaces_pago SET url = p_url WHERE id = p_enlace AND origen = 'vuelta' AND estado = 'pendiente';
END;
$$;

-- «Anular mi baja» (la baja aún no ha llegado): la app reanuda antes la renovación en Stripe.
CREATE OR REPLACE FUNCTION dk.vuelta_datos_anular(p_token text)
RETURNS TABLE (restaurante_id uuid, nombre text, stripe_customer_id text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF p_token !~ '^[0-9a-f]{32}$' THEN RETURN; END IF;
  RETURN QUERY SELECT r.id, r.nombre::text, r.stripe_customer_id::text FROM public.restaurantes r
   WHERE r.vuelta_token = p_token AND r.baja_programada_en IS NOT NULL AND r.estado_acceso <> 'suspendido';
END;
$$;

CREATE OR REPLACE FUNCTION dk.vuelta_anular_baja(p_token text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid; v_nombre text;
BEGIN
  IF p_token !~ '^[0-9a-f]{32}$' THEN RAISE EXCEPTION 'enlace no válido' USING ERRCODE = '22023'; END IF;
  UPDATE public.restaurantes SET baja_programada_en = NULL, baja_motivo = NULL, baja_por = NULL
   WHERE vuelta_token = p_token AND baja_programada_en IS NOT NULL AND estado_acceso <> 'suspendido'
  RETURNING id, nombre INTO v_id, v_nombre;
  IF v_id IS NULL THEN RAISE EXCEPTION 'no hay una baja pendiente que anular' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (NULL, 'cliente.anular_baja', jsonb_build_object('origen', 'volver'), v_id);
  RETURN v_nombre;
END;
$$;

-- 8. Baja de la lista con un clic (visitante anónimo).
CREATE OR REPLACE FUNCTION dk.lista_ver(p_token text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT jsonb_build_object('nombre', s.nombre, 'estado', s.estado)
    FROM public.suscriptores_marketing s WHERE p_token ~ '^[0-9a-f]{32}$' AND s.token = p_token
$$;

CREATE OR REPLACE FUNCTION dk.lista_baja(p_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF p_token !~ '^[0-9a-f]{32}$' THEN RETURN false; END IF;
  UPDATE public.suscriptores_marketing SET estado = 'baja', baja_en = coalesce(baja_en, now()) WHERE token = p_token;
  RETURN FOUND;
END;
$$;

-- 9. Arreglo: pagar un enlace reactiva de verdad una cuenta suspendida (activo = true y fuera la baja programada).
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
         -- 0081: una cuenta suspendida (baja) que paga vuelve entera: carta pública y panel
         activo = true, baja_programada_en = NULL, baja_motivo = NULL, baja_por = NULL,
         -- 0062: pagar convierte una demo interna en cliente real (y la saca del archivo)
         demo_interna = false, archivado_en = NULL,
         prueba_hasta = CASE WHEN e.plan IS NOT NULL THEN NULL ELSE prueba_hasta END,
         primer_cobro = CASE WHEN e.mensual_centimos > 0 THEN current_date + e.dias_gratis ELSE primer_cobro END,
         -- el cobro recurrente queda ligado a este cliente de Stripe (gracia/impago)
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
  VALUES (NULL, CASE WHEN e.origen = 'vuelta' THEN 'pago.vuelta' ELSE 'pago.enlace_admin' END,
          jsonb_build_object('enlace', e.id, 'primer', e.primer_cobro_centimos, 'mensual', e.mensual_centimos, 'dias_gratis', e.dias_gratis), e.restaurante_id);
  RETURN 'ok';
END;
$$;

-- 10. Leads de la tarea de Windows → Prospección («Por revisar», cartera de karc0, sin duplicados).
CREATE OR REPLACE FUNCTION dk.leads_importar(p_leads jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_admin uuid; l jsonb; v_nombre text; v_zona text; v_tel text; v_ig text; v_web text; v_tipo text; v_prod text;
  v_nuevos int := 0; v_dup int := 0; v_malos int := 0;
BEGIN
  IF jsonb_typeof(p_leads) <> 'array' OR jsonb_array_length(p_leads) > 50 THEN
    RAISE EXCEPTION 'se esperan como mucho 50 leads' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO v_admin FROM public.identidades WHERE rol = 'admin' AND activo LIMIT 1;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'sin administrador' USING ERRCODE = 'P0002'; END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(p_leads) LOOP
    v_nombre := left(btrim(coalesce(l->>'nombre', '')), 120);
    v_zona := left(coalesce(nullif(btrim(l->>'zona'), ''), 'Baza'), 60);
    IF char_length(v_nombre) < 2 OR char_length(v_zona) < 2 THEN v_malos := v_malos + 1; CONTINUE; END IF;
    v_tel := left(nullif(btrim(l->>'telefono'), ''), 30);
    v_ig := left(nullif(regexp_replace(btrim(coalesce(l->>'instagram', '')), '^(https?://(www\.)?instagram\.com/|@)', ''), ''), 120);
    v_web := left(nullif(btrim(l->>'web'), ''), 200);
    v_tipo := lower(coalesce(l->>'tipo', ''));
    v_tipo := CASE WHEN v_tipo IN ('pizzeria','asador','restaurante','hamburgueseria','kebab','bar','cafeteria','heladeria','panaderia') THEN v_tipo
                   WHEN v_tipo LIKE 'pizz%' THEN 'pizzeria' WHEN v_tipo LIKE 'hambur%' THEN 'hamburgueseria'
                   WHEN v_tipo LIKE 'cafe%' THEN 'cafeteria' WHEN v_tipo LIKE '%tapa%' OR v_tipo LIKE 'bar%' THEN 'bar'
                   WHEN v_tipo LIKE 'restau%' THEN 'restaurante' ELSE 'otro' END;
    v_prod := lower(coalesce(l->>'producto', ''));
    IF EXISTS (SELECT 1 FROM public.prospectos p
                WHERE (lower(p.nombre) = lower(v_nombre) AND lower(p.zona) = lower(v_zona))
                   OR (v_tel IS NOT NULL AND char_length(regexp_replace(v_tel, '\D', '', 'g')) >= 9
                       -- los 9 últimos dígitos: «+34 600 111 222» = «600111222»
                       AND right(regexp_replace(coalesce(p.telefono, ''), '\D', '', 'g'), 9) = right(regexp_replace(v_tel, '\D', '', 'g'), 9))
                   OR (v_ig IS NOT NULL AND lower(p.instagram) = lower(v_ig))) THEN
      v_dup := v_dup + 1; CONTINUE;
    END IF;
    INSERT INTO public.prospectos (comercial_id, creado_por, estado, fuente, nombre, tipo, zona, telefono, instagram, web, notas, puntuacion, oferta)
    VALUES (v_admin, v_admin, 'por_revisar', 'script', v_nombre, v_tipo, v_zona, v_tel, v_ig,
            CASE WHEN v_web ~ '^https?://' THEN v_web END,
            left(concat_ws(E'\n',
              'Tarea «Buscar clientes» · ' || to_char(now() AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY'),
              nullif('Valoración: ' || coalesce(l->>'valoracion', '') || coalesce(' (' || (l->>'resenas') || ' reseñas)', ''), 'Valoración: '),
              nullif('Señal: ' || coalesce(l->>'senal', ''), 'Señal: '),
              nullif('Producto: ' || coalesce(l->>'producto', ''), 'Producto: '),
              nullif('Mensaje sugerido: ' || coalesce(l->>'mensaje', ''), 'Mensaje sugerido: ')), 2000),
            CASE lower(coalesce(l->>'prioridad', '')) WHEN 'alta' THEN 80 WHEN 'media' THEN 60 WHEN 'baja' THEN 40 END,
            CASE WHEN v_prod LIKE 'signature%' THEN 'signature' WHEN v_prod LIKE 'experience%' THEN 'experience' ELSE 'qr_1' END);
    v_nuevos := v_nuevos + 1;
  END LOOP;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (NULL, 'sistema.leads_tarea', jsonb_build_object('nuevos', v_nuevos, 'duplicados', v_dup, 'descartados', v_malos), NULL);
  RETURN jsonb_build_object('nuevos', v_nuevos, 'duplicados', v_dup, 'descartados', v_malos);
END;
$$;

-- 11. Permisos
REVOKE ALL ON FUNCTION dk.reenganche_preparar(uuid), dk.reenganche_30_pendientes(),
  dk.bajas_por_avisar(), dk.vuelta_ver(text), dk.vuelta_preparar(text), dk.vuelta_fijar_url(uuid, text), dk.vuelta_datos_anular(text),
  dk.vuelta_anular_baja(text), dk.lista_ver(text), dk.lista_baja(text), dk.leads_importar(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.reenganche_preparar(uuid), dk.reenganche_30_pendientes(), dk.bajas_por_avisar(),
  dk.vuelta_preparar(text), dk.vuelta_fijar_url(uuid, text), dk.vuelta_datos_anular(text), dk.vuelta_anular_baja(text),
  dk.leads_importar(jsonb) TO dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.vuelta_ver(text), dk.lista_ver(text), dk.lista_baja(text) TO dk_anon;

COMMIT;
