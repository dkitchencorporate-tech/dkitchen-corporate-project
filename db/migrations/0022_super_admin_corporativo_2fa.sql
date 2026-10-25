-- 0022 — Super admin corporativo + segundo factor (TOTP) verificado en la base (27/09/2026)
--
-- 1. El super admin de DKitchen es dkitchen@dkitchencorporate.es. klarx94 deja
--    de ser admin (se configuró así en 0019 por error).
-- 2. dk.es_admin() ya no basta con el rol: exige además que ESTA sesión haya
--    superado el segundo factor (TOTP RFC 6238) en las últimas 12 h. Como todas
--    las políticas RLS y funciones de admin pasan por dk.es_admin(), el 2FA se
--    aplica en la base de datos, no depende de que la app lo recuerde.
-- 3. El secreto TOTP vive solo en la base (tabla sin permisos para ningún rol
--    de la app) y el código se verifica aquí con pgcrypto. Solo se entrega una
--    vez, durante el alta, y nunca después de activarlo.
-- 4. Anti-reutilización (un código solo sirve una vez) y bloqueo tras 5
--    fallos en 15 minutos.
-- La sesión se identifica con dk.sesion = SHA-256 de la cookie de sesión de
-- Neon Auth, fijada por la app en cada transacción (set_config local).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Tablas internas: RLS forzado, sin políticas, sin permisos → solo funciones SECURITY DEFINER
CREATE TABLE IF NOT EXISTS public.admin_totp (
  identidad uuid PRIMARY KEY REFERENCES public.identidades(id) ON DELETE CASCADE,
  secreto bytea NOT NULL,
  activado_en timestamptz,
  ultimo_contador bigint NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.admin_2fa_sesiones (
  id bigserial PRIMARY KEY,
  identidad uuid NOT NULL REFERENCES public.identidades(id) ON DELETE CASCADE,
  sesion_hash text NOT NULL,
  verificado_en timestamptz NOT NULL DEFAULT now(),
  expira_en timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_2fa_sesiones_idx ON public.admin_2fa_sesiones (identidad, sesion_hash);
CREATE TABLE IF NOT EXISTS public.admin_2fa_fallos (
  id bigserial PRIMARY KEY,
  identidad uuid NOT NULL,
  ocurrido_en timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['admin_totp','admin_2fa_sesiones','admin_2fa_fallos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, dk_app, dk_auth, dk_anon', t);
  END LOOP;
END $$;
REVOKE ALL ON SEQUENCE public.admin_2fa_sesiones_id_seq, public.admin_2fa_fallos_id_seq FROM PUBLIC;

-- TOTP (RFC 6238: HMAC-SHA1, pasos de 30 s, 6 dígitos)
CREATE OR REPLACE FUNCTION dk.totp_codigo(p_secreto bytea, p_contador bigint)
RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path TO pg_catalog AS $$
DECLARE h bytea; o int;
BEGIN
  h := public.hmac(int8send(p_contador), p_secreto, 'sha1');
  o := get_byte(h, 19) & 15;
  RETURN (((get_byte(h, o) & 127) << 24) | (get_byte(h, o + 1) << 16)
          | (get_byte(h, o + 2) << 8) | get_byte(h, o + 3)) % 1000000;
END;
$$;
REVOKE ALL ON FUNCTION dk.totp_codigo(bytea, bigint) FROM PUBLIC;

CREATE OR REPLACE FUNCTION dk.sesion_actual_hash()
RETURNS text LANGUAGE sql STABLE SET search_path TO pg_catalog AS $$
  SELECT CASE WHEN current_setting('dk.sesion', true) ~ '^[0-9a-f]{64}$'
              THEN current_setting('dk.sesion', true) END;
$$;
REVOKE ALL ON FUNCTION dk.sesion_actual_hash() FROM PUBLIC;

-- Rol de admin SIN segundo factor (solo para decidir a dónde redirigir)
CREATE OR REPLACE FUNCTION dk.es_identidad_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.identidades
                 WHERE id = dk.identidad_actual() AND rol = 'admin' AND activo);
$$;
REVOKE ALL ON FUNCTION dk.es_identidad_admin() FROM PUBLIC;

-- dk.es_admin(): rol admin + 2FA superado en ESTA sesión y vigente
CREATE OR REPLACE FUNCTION dk.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.es_identidad_admin() AND EXISTS (
    SELECT 1 FROM public.admin_2fa_sesiones s
    WHERE s.identidad = dk.identidad_actual()
      AND s.sesion_hash = dk.sesion_actual_hash()
      AND s.expira_en > now());
$$;

CREATE OR REPLACE FUNCTION dk.admin_2fa_estado()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT dk.es_identidad_admin() THEN RETURN 'no_admin'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_totp WHERE identidad = dk.identidad_actual() AND activado_en IS NOT NULL) THEN
    RETURN 'sin_configurar';
  END IF;
  IF dk.es_admin() THEN RETURN 'ok'; END IF;
  RETURN 'pendiente';
END;
$$;

-- Alta: devuelve el secreto (hex) SOLO si aún no se ha activado
CREATE OR REPLACE FUNCTION dk.admin_2fa_alta()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid := dk.identidad_actual(); v_sec bytea;
BEGIN
  IF NOT dk.es_identidad_admin() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
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

-- Verificación: 'ok' | 'codigo_incorrecto' | 'bloqueado' | 'sin_sesion'
CREATE OR REPLACE FUNCTION dk.admin_2fa_verificar(p_codigo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_id uuid := dk.identidad_actual();
  v_sesion text := dk.sesion_actual_hash();
  v_t public.admin_totp%ROWTYPE;
  v_ahora bigint := floor(extract(epoch FROM clock_timestamp()) / 30);
  v_c bigint;
BEGIN
  IF NOT dk.es_identidad_admin() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
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

-- Cerrar la sesión de admin (logout): borra el 2FA de esta sesión
CREATE OR REPLACE FUNCTION dk.admin_2fa_cerrar()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  DELETE FROM public.admin_2fa_sesiones
  WHERE identidad = dk.identidad_actual() AND sesion_hash = dk.sesion_actual_hash();
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['dk.admin_2fa_estado()','dk.admin_2fa_alta()','dk.admin_2fa_verificar(text)','dk.admin_2fa_cerrar()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_auth', f);
  END LOOP;
END $$;

-- Super admin corporativo; klarx94 deja de ser admin
INSERT INTO public.identidades (id, email, nombre, rol, activo)
VALUES ('e48db8b4-e60a-4b5e-941d-cc9ce121b6a5', 'dkitchen@dkitchencorporate.es', 'DKitchen Super Admin', 'admin', true)
ON CONFLICT (id) DO UPDATE SET rol = 'admin', activo = true;
UPDATE public.identidades SET rol = 'cliente', activo = false
WHERE id = '2a596c6e-6df1-43e5-8a3f-7faa6e0d181c';
INSERT INTO public.auditoria (identidad, accion, detalle)
VALUES (NULL, 'sistema.super_admin', jsonb_build_object('nuevo', 'dkitchen@dkitchencorporate.es', 'retirado', 'klarx94@gmail.com'));

INSERT INTO public.dk_migraciones (nombre) VALUES ('0022_super_admin_corporativo_2fa.sql');

COMMIT;
