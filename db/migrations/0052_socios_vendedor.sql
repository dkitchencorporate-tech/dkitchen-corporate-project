-- 0052 · Socio en el sistema (decisiones de karc0, 07/10; ESTADO §0 punto 5 y §6 entrada 74).
-- (a) Código de vendedor por socio: el alta que llega con ?v=CODIGO (o escrito a mano en el
--     checkout) queda atribuida a ese socio. La primera atribución manda; solo karc0 la corrige.
-- (b) Comisión: SOLO atribución por ahora (altas, cuáles pagan y cuánto factura cada una).
-- (c) Puesta a punto: el socio edita la carta de SUS clientes (mismas tablas del panel, con su
--     propio historial) y nunca pagos, planes ni clientes ajenos. El dueño puede retirarle el
--     permiso desde su panel.
-- (d) Acceso: la cuenta del socio la da de alta SOLO karc0 desde Central (regla de acceso) y
--     exige el mismo segundo factor (TOTP) que el super admin. El socio nunca es admin.

BEGIN;

-- 1. Rol nuevo en identidades
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.identidades'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%rol%' LOOP
    EXECUTE format('ALTER TABLE public.identidades DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.identidades ADD CONSTRAINT identidades_rol_check CHECK (rol IN ('cliente', 'admin', 'socio'));

-- 2. Socios (tabla interna: sin permisos para la app, todo por funciones)
CREATE TABLE IF NOT EXISTS public.socios (
  id uuid PRIMARY KEY REFERENCES public.identidades(id) ON DELETE RESTRICT,
  codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9]{3,12}$'),
  nombre text NOT NULL CHECK (length(nombre) BETWEEN 2 AND 80),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.socios FROM PUBLIC, dk_anon, dk_auth, dk_app;

-- 3. Atribución en el restaurante
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS socio_id uuid REFERENCES public.socios(id);
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS socio_origen text CHECK (socio_origen IN ('enlace', 'manual', 'central'));
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS socio_atribuido_en timestamptz;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS socio_puede_editar boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS restaurantes_socio_idx ON public.restaurantes (socio_id) WHERE socio_id IS NOT NULL;

-- 4. Quién es socio
CREATE OR REPLACE FUNCTION dk.es_identidad_socio()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.identidades i JOIN public.socios s ON s.id = i.id
                  WHERE i.id = dk.identidad_actual() AND i.rol = 'socio' AND i.activo AND s.activo);
$$;

-- Socio con el segundo factor superado en ESTA sesión (mismas tablas que el admin, 0022)
CREATE OR REPLACE FUNCTION dk.es_socio()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.es_identidad_socio() AND EXISTS (
    SELECT 1 FROM public.admin_2fa_sesiones s
     WHERE s.identidad = dk.identidad_actual()
       AND s.sesion_hash = dk.sesion_actual_hash()
       AND s.expira_en > now());
$$;

-- ¿Puede quien pregunta tocar la carta de este restaurante? Dueño, o su socio con permiso.
CREATE OR REPLACE FUNCTION dk.gestiona(p_restaurante uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurantes r
                  WHERE r.id = p_restaurante
                    AND (r.propietario = dk.identidad_actual()
                         OR (r.socio_id = dk.identidad_actual() AND r.socio_puede_editar AND dk.es_socio())));
$$;

-- 5. El segundo factor sirve también al socio (cuerpos de 0022; solo cambia la guardia)
CREATE OR REPLACE FUNCTION dk.admin_2fa_estado()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT (dk.es_identidad_admin() OR dk.es_identidad_socio()) THEN RETURN 'no_admin'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_totp WHERE identidad = dk.identidad_actual() AND activado_en IS NOT NULL) THEN
    RETURN 'sin_configurar';
  END IF;
  IF dk.es_admin() OR dk.es_socio() THEN RETURN 'ok'; END IF;
  RETURN 'pendiente';
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_2fa_alta()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid := dk.identidad_actual(); v_sec bytea;
BEGIN
  IF NOT (dk.es_identidad_admin() OR dk.es_identidad_socio()) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_totp WHERE identidad = v_id AND activado_en IS NOT NULL) THEN
    RAISE EXCEPTION 'el segundo factor ya está activado' USING ERRCODE = '42501';
  END IF;
  SELECT secreto INTO v_sec FROM public.admin_totp WHERE identidad = v_id;
  IF v_sec IS NULL THEN
    v_sec := public.gen_random_bytes(20);
    INSERT INTO public.admin_totp (identidad, secreto) VALUES (v_id, v_sec);
  END IF;
  RETURN encode(v_sec, 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_2fa_verificar(p_codigo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_id uuid := dk.identidad_actual();
  v_sesion text := dk.sesion_actual_hash();
  v_t public.admin_totp%ROWTYPE;
  v_ahora bigint := floor(extract(epoch FROM clock_timestamp()) / 30);
  v_c bigint;
BEGIN
  IF NOT (dk.es_identidad_admin() OR dk.es_identidad_socio()) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF v_sesion IS NULL THEN RETURN 'sin_sesion'; END IF;
  IF (SELECT count(*) FROM public.admin_2fa_fallos
      WHERE identidad = v_id AND ocurrido_en > now() - interval '15 minutes') >= 5 THEN
    INSERT INTO public.auditoria (identidad, accion, detalle) VALUES (v_id, 'admin.2fa_bloqueado', NULL);
    RETURN 'bloqueado';
  END IF;

  SELECT * INTO v_t FROM public.admin_totp WHERE identidad = v_id FOR UPDATE;
  IF FOUND AND p_codigo ~ '^[0-9]{6}$' THEN
    FOR v_c IN v_ahora - 1 .. v_ahora + 1 LOOP
      IF v_c > v_t.ultimo_contador AND dk.totp_codigo(v_t.secreto, v_c) = p_codigo::int THEN
        UPDATE public.admin_totp
           SET ultimo_contador = v_c, activado_en = coalesce(activado_en, now())
         WHERE identidad = v_id;
        DELETE FROM public.admin_2fa_sesiones WHERE identidad = v_id AND (expira_en <= now() OR sesion_hash = v_sesion);
        INSERT INTO public.admin_2fa_sesiones (identidad, sesion_hash, expira_en)
        VALUES (v_id, v_sesion, now() + interval '12 hours');
        DELETE FROM public.admin_2fa_fallos WHERE identidad = v_id;
        INSERT INTO public.auditoria (identidad, accion, detalle)
        VALUES (v_id, 'admin.2fa_ok', jsonb_build_object('alta', v_t.activado_en IS NULL));
        RETURN 'ok';
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.admin_2fa_fallos (identidad) VALUES (v_id);
  INSERT INTO public.auditoria (identidad, accion, detalle) VALUES (v_id, 'admin.2fa_fallo', NULL);
  RETURN 'codigo_incorrecto';
END;
$$;

-- 6. Edición delegada: las políticas del panel admiten al socio con permiso.
--    El historial (dk.registrar_cambio, 0021) ya guarda quién hizo cada cambio.
DROP POLICY IF EXISTS restaurante_ve_lo_suyo ON public.restaurantes;
CREATE POLICY restaurante_ve_lo_suyo ON public.restaurantes FOR SELECT TO dk_auth
  USING (propietario = dk.identidad_actual() OR dk.es_admin()
         OR (socio_id = dk.identidad_actual() AND socio_puede_editar AND dk.es_socio()));
DROP POLICY IF EXISTS restaurante_edita_lo_suyo ON public.restaurantes;
CREATE POLICY restaurante_edita_lo_suyo ON public.restaurantes FOR UPDATE TO dk_auth
  USING (propietario = dk.identidad_actual()
         OR (socio_id = dk.identidad_actual() AND socio_puede_editar AND dk.es_socio()))
  WITH CHECK (propietario = dk.identidad_actual()
         OR (socio_id = dk.identidad_actual() AND socio_puede_editar AND dk.es_socio()));
-- (dk_auth solo tiene UPDATE en columnas de diseño y datos legales: plan, pagos y socio quedan fuera)

DROP POLICY IF EXISTS seccion_del_propietario ON public.menu_secciones;
CREATE POLICY seccion_del_propietario ON public.menu_secciones FOR ALL TO dk_auth
  USING (dk.gestiona(restaurante_id)) WITH CHECK (dk.gestiona(restaurante_id));
DROP POLICY IF EXISTS item_del_propietario ON public.menu_items;
CREATE POLICY item_del_propietario ON public.menu_items FOR ALL TO dk_auth
  USING (dk.gestiona(restaurante_id)) WITH CHECK (dk.gestiona(restaurante_id));
DROP POLICY IF EXISTS codigo_del_propietario ON public.codigos_qr;
CREATE POLICY codigo_del_propietario ON public.codigos_qr FOR SELECT TO dk_auth
  USING (dk.gestiona(restaurante_id));
DROP POLICY IF EXISTS elemento_del_propietario ON public.elementos_plano;
CREATE POLICY elemento_del_propietario ON public.elementos_plano FOR ALL TO dk_auth
  USING (dk.gestiona(restaurante_id) OR dk.es_admin())
  WITH CHECK (dk.gestiona(restaurante_id) AND dk.tiene_servicio(restaurante_id, 'plano_mesas'));
DROP POLICY IF EXISTS traduccion_lectura ON public.traducciones;
CREATE POLICY traduccion_lectura ON public.traducciones FOR SELECT TO dk_auth
  USING (dk.gestiona(restaurante_id) OR dk.es_admin());
DROP POLICY IF EXISTS ticket_del_propietario ON public.tickets_soporte;
CREATE POLICY ticket_del_propietario ON public.tickets_soporte FOR SELECT TO dk_auth
  USING (dk.gestiona(restaurante_id));

-- 7. Público: ¿existe este código? (checkout y landing; sin datos del socio)
CREATE OR REPLACE FUNCTION dk.socio_codigo_valido(p_codigo text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.socios s JOIN public.identidades i ON i.id = s.id
                  WHERE s.codigo = upper(btrim(p_codigo)) AND s.activo AND i.activo);
$$;

-- 8. Webhook: atribuye el alta al socio del código. La primera atribución manda. Idempotente.
CREATE OR REPLACE FUNCTION dk.socio_atribuir(p_cliente_stripe text, p_codigo text, p_origen text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_socio uuid; v_rest uuid;
BEGIN
  IF p_codigo IS NULL OR btrim(p_codigo) = '' THEN RETURN false; END IF;
  SELECT s.id INTO v_socio FROM public.socios s JOIN public.identidades i ON i.id = s.id
   WHERE s.codigo = upper(btrim(p_codigo)) AND s.activo AND i.activo;
  IF v_socio IS NULL THEN RETURN false; END IF;
  SELECT id INTO v_rest FROM public.restaurantes WHERE stripe_customer_id = p_cliente_stripe LIMIT 1;
  IF v_rest IS NULL THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.restaurantes
     SET socio_id = v_socio, socio_atribuido_en = now(),
         socio_origen = CASE WHEN p_origen = 'manual' THEN 'manual' ELSE 'enlace' END
   WHERE id = v_rest AND socio_id IS NULL;
  IF FOUND THEN
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (NULL, 'socio.atribucion', jsonb_build_object('socio', v_socio, 'origen', p_origen), v_rest);
  END IF;
  RETURN FOUND;
END;
$$;

-- 9. Central (solo karc0): alta, baja, listado con métricas y corrección de atribución
CREATE OR REPLACE FUNCTION dk.admin_socio_alta(p_email text, p_nombre text, p_codigo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid; v_codigo text := upper(btrim(p_codigo));
BEGIN
  PERFORM dk.exigir_admin();
  SELECT u.id INTO v_id FROM neon_auth."user" u WHERE lower(u.email) = lower(btrim(p_email));
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'la cuenta % no existe: créala primero en Neon Auth', p_email USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.identidades WHERE id = v_id AND rol = 'admin') THEN
    RAISE EXCEPTION 'una cuenta de admin no puede ser socio' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.restaurantes WHERE propietario = v_id) THEN
    RAISE EXCEPTION 'esa cuenta es dueña de un local: el socio necesita una cuenta propia' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.identidades (id, email, nombre, rol, activo)
  VALUES (v_id, lower(btrim(p_email)), btrim(p_nombre), 'socio', true)
  ON CONFLICT (id) DO UPDATE SET rol = 'socio', activo = true, nombre = excluded.nombre;
  INSERT INTO public.socios (id, codigo, nombre) VALUES (v_id, v_codigo, btrim(p_nombre))
  ON CONFLICT (id) DO UPDATE SET activo = true, nombre = excluded.nombre;
  INSERT INTO public.auditoria (identidad, accion, detalle)
  VALUES (dk.identidad_actual(), 'admin.socio_alta', jsonb_build_object('socio', v_id, 'codigo', v_codigo));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_socio_activo(p_socio uuid, p_activo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.socios SET activo = p_activo WHERE id = p_socio;
  IF NOT FOUND THEN RAISE EXCEPTION 'socio no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF NOT p_activo THEN
    DELETE FROM public.admin_2fa_sesiones WHERE identidad = p_socio;
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle)
  VALUES (dk.identidad_actual(), 'admin.socio_activo', jsonb_build_object('socio', p_socio, 'activo', p_activo));
END;
$$;

-- Altas, cuáles pagan y cuánto factura cada una (sin IVA; Fundador al 60 % de Sala)
CREATE OR REPLACE FUNCTION dk.admin_socios()
RETURNS TABLE (id uuid, nombre text, email text, codigo text, activo boolean, creado_en timestamptz,
               altas int, de_pago int, mensual_centimos int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
  SELECT s.id, s.nombre, i.email::text, s.codigo, s.activo, s.creado_en,
         count(r.id)::int,
         count(r.id) FILTER (WHERE r.estado_acceso IN ('activo', 'gracia') AND (r.prueba_hasta IS NULL OR r.prueba_hasta < now()))::int,
         coalesce(sum(CASE WHEN r.fundador_desde IS NOT NULL AND r.fundador_perdido_en IS NULL AND r.plan = 'sala'
                           THEN round(dk.precio_plan('sala') * 0.6)::int ELSE dk.precio_plan(r.plan) END)
                  FILTER (WHERE r.estado_acceso IN ('activo', 'gracia') AND (r.prueba_hasta IS NULL OR r.prueba_hasta < now())), 0)::int
    FROM public.socios s JOIN public.identidades i ON i.id = s.id
    LEFT JOIN public.restaurantes r ON r.socio_id = s.id
   GROUP BY s.id, s.nombre, i.email, s.codigo, s.activo, s.creado_en
   ORDER BY s.creado_en;
END;
$$;

-- Corrección manual de karc0 (p_codigo NULL = quitar la atribución)
CREATE OR REPLACE FUNCTION dk.admin_atribuir_socio(p_restaurante uuid, p_codigo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_socio uuid;
BEGIN
  PERFORM dk.exigir_admin();
  IF p_codigo IS NOT NULL THEN
    SELECT id INTO v_socio FROM public.socios WHERE codigo = upper(btrim(p_codigo));
    IF v_socio IS NULL THEN RAISE EXCEPTION 'código de socio no encontrado' USING ERRCODE = 'P0002'; END IF;
  END IF;
  UPDATE public.restaurantes
     SET socio_id = v_socio, socio_origen = CASE WHEN v_socio IS NULL THEN NULL ELSE 'central' END,
         socio_atribuido_en = CASE WHEN v_socio IS NULL THEN NULL ELSE now() END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.socio_atribuir', jsonb_build_object('socio', v_socio), p_restaurante);
END;
$$;

-- 10. Central limitado del socio
CREATE OR REPLACE FUNCTION dk.socio_mi_ficha()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v jsonb;
BEGIN
  IF NOT dk.es_socio() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object('nombre', s.nombre, 'codigo', s.codigo,
           'altas', (SELECT count(*) FROM public.restaurantes r WHERE r.socio_id = s.id),
           'de_pago', (SELECT count(*) FROM public.restaurantes r WHERE r.socio_id = s.id
                        AND r.estado_acceso IN ('activo', 'gracia') AND (r.prueba_hasta IS NULL OR r.prueba_hasta < now())))
    INTO v FROM public.socios s WHERE s.id = dk.identidad_actual();
  RETURN v;
END;
$$;

-- Sus clientes: lo necesario para la puesta a punto y el seguimiento; sin correos ni pagos
CREATE OR REPLACE FUNCTION dk.socio_mis_clientes()
RETURNS TABLE (id uuid, nombre text, slug text, plan text, fundador boolean, estado_acceso text,
               en_prueba boolean, puede_editar boolean, alta_en timestamptz, productos int, tickets_abiertos int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT dk.es_socio() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT r.id, r.nombre, r.slug, r.plan,
         (r.fundador_desde IS NOT NULL AND r.fundador_perdido_en IS NULL),
         r.estado_acceso, (r.prueba_hasta IS NOT NULL AND r.prueba_hasta >= now()),
         r.socio_puede_editar, r.creado_en,
         (SELECT count(*)::int FROM public.menu_items m WHERE m.restaurante_id = r.id),
         (SELECT count(*)::int FROM public.tickets_soporte t WHERE t.restaurante_id = r.id AND t.estado = 'abierto')
    FROM public.restaurantes r
   WHERE r.socio_id = dk.identidad_actual()
   ORDER BY r.creado_en DESC;
END;
$$;

-- 11. Panel del dueño: quién es su asesor y retirarle (o devolverle) el permiso de edición
CREATE OR REPLACE FUNCTION dk.mi_socio()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT jsonb_build_object('nombre', s.nombre, 'puede_editar', r.socio_puede_editar)
    FROM public.restaurantes r JOIN public.socios s ON s.id = r.socio_id
   WHERE r.propietario = dk.identidad_actual() AND s.activo
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION dk.socio_permiso_mio(p_permitir boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  WITH c AS (
    UPDATE public.restaurantes SET socio_puede_editar = p_permitir
     WHERE propietario = dk.identidad_actual() AND socio_id IS NOT NULL
    RETURNING id)
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  SELECT dk.identidad_actual(), 'cliente.socio_permiso', jsonb_build_object('permitir', p_permitir), c.id FROM c;
  IF NOT FOUND THEN RAISE EXCEPTION 'sin socio asignado' USING ERRCODE = 'P0002'; END IF;
END;
$$;

-- 12. Permisos
REVOKE ALL ON FUNCTION dk.es_identidad_socio(), dk.es_socio(), dk.gestiona(uuid),
  dk.socio_codigo_valido(text), dk.socio_atribuir(text, text, text),
  dk.admin_socio_alta(text, text, text), dk.admin_socio_activo(uuid, boolean), dk.admin_socios(),
  dk.admin_atribuir_socio(uuid, text), dk.socio_mi_ficha(), dk.socio_mis_clientes(),
  dk.mi_socio(), dk.socio_permiso_mio(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.es_identidad_socio(), dk.es_socio(), dk.gestiona(uuid),
  dk.admin_socio_alta(text, text, text), dk.admin_socio_activo(uuid, boolean), dk.admin_socios(),
  dk.admin_atribuir_socio(uuid, text), dk.socio_mi_ficha(), dk.socio_mis_clientes(),
  dk.mi_socio(), dk.socio_permiso_mio(boolean) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.socio_codigo_valido(text) TO dk_anon, dk_auth, dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.socio_atribuir(text, text, text) TO dk_aprovisionamiento;

COMMIT;
