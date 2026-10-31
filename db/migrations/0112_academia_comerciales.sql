-- 0112 (01/11/2026, tanda 6 del rediseño · Claude, con autorización de karc0):
-- Academia comercial (rol en_formacion, intentos, habilitación por el servidor), entrenamiento de Alex
-- (solo dkitchen@dkitchencorporate.es) con bitácora de campo, y palancas con OK de dirección.
BEGIN;

-- 1 ─ Rol «en_formacion»: solo Academia. dk.es_admin() deja de valer para él (Central y sus funciones lo rechazan).
ALTER TABLE public.identidades DROP CONSTRAINT IF EXISTS identidades_rol_admin_check;
ALTER TABLE public.identidades ADD CONSTRAINT identidades_rol_admin_check CHECK (rol_admin IN ('direccion', 'comercial', 'en_formacion'));

CREATE OR REPLACE FUNCTION dk.es_admin_academia()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.es_identidad_admin() AND EXISTS (
    SELECT 1 FROM public.admin_2fa_sesiones s
    WHERE s.identidad = dk.identidad_actual() AND s.sesion_hash = dk.sesion_actual_hash() AND s.expira_en > now());
$$;

CREATE OR REPLACE FUNCTION dk.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.es_admin_academia()
     AND coalesce((SELECT rol_admin FROM public.identidades WHERE id = dk.identidad_actual()), 'comercial') <> 'en_formacion';
$$;

CREATE OR REPLACE FUNCTION dk.es_alex()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.es_direccion() AND EXISTS (SELECT 1 FROM public.identidades WHERE id = dk.identidad_actual() AND lower(email::text) = 'dkitchen@dkitchencorporate.es');
$$;

-- 2 ─ Intentos de la Academia (la nota la calcula el servidor de la app con el banco firmado)
CREATE TABLE IF NOT EXISTS public.academia_intentos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identidad  uuid NOT NULL REFERENCES public.identidades(id) ON DELETE CASCADE,
  bloque     text NOT NULL CHECK (bloque IN ('N1', 'N2', 'N3', 'N4', 'E1', 'E2', 'E3', 'E4')),
  version    text NOT NULL DEFAULT 'test' CHECK (version IN ('test', 'pie', 'digital', 'alex')),
  nota       int  NOT NULL CHECK (nota BETWEEN 0 AND 100),
  aprobado   boolean NOT NULL,
  notas      jsonb NOT NULL DEFAULT '{}'::jsonb,
  detalle    jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academia_intentos_ident ON public.academia_intentos (identidad, bloque, version, creado_en DESC);

CREATE TABLE IF NOT EXISTS public.academia_bitacora (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identidad  uuid NOT NULL REFERENCES public.identidades(id) ON DELETE CASCADE,
  datos      jsonb NOT NULL CHECK (jsonb_typeof(datos) = 'object' AND length(datos::text) <= 6000),
  creado_en  timestamptz NOT NULL DEFAULT now()
);

-- 3 ─ Palancas con OK de dirección
CREATE TABLE IF NOT EXISTS public.palancas_solicitudes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comercial    uuid NOT NULL REFERENCES public.identidades(id),
  tipo         text NOT NULL CHECK (tipo IN ('descuento', 'montaje_gratis', 'experience_piloto', 'signature_fraccionado', 'signature_financiado')),
  local        text NOT NULL CHECK (char_length(local) BETWEEN 2 AND 120),
  detalle      jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado       text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'usada')),
  decision     jsonb,
  decidido_por uuid REFERENCES public.identidades(id),
  creado_en    timestamptz NOT NULL DEFAULT now(),
  decidido_en  timestamptz,
  usada_en     timestamptz
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['academia_intentos', 'academia_bitacora', 'palancas_solicitudes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
  END LOOP;
END $$;

-- Registrar un intento (2 suspensos seguidos en un bloque y versión → espera de 24 h; Alex no espera)
CREATE OR REPLACE FUNCTION dk.academia_registrar(p_bloque text, p_version text, p_nota int, p_aprobado boolean, p_notas jsonb, p_detalle jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid := dk.identidad_actual(); v_nuevo uuid; v_ult boolean[];
BEGIN
  IF NOT dk.es_admin_academia() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF (p_bloque = 'N4' OR p_version = 'alex') AND NOT dk.es_alex() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF NOT dk.es_alex() THEN
    SELECT array_agg(aprobado) INTO v_ult FROM (
      SELECT aprobado FROM public.academia_intentos WHERE identidad = v_id AND bloque = p_bloque AND version = p_version
       AND creado_en > now() - interval '24 hours' ORDER BY creado_en DESC LIMIT 2) x;
    IF coalesce(array_length(v_ult, 1), 0) = 2 AND NOT v_ult[1] AND NOT v_ult[2] THEN
      RAISE EXCEPTION 'espera 24 h tras dos suspensos seguidos' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  INSERT INTO public.academia_intentos (identidad, bloque, version, nota, aprobado, notas, detalle)
  VALUES (v_id, p_bloque, p_version, greatest(0, least(100, p_nota)), p_aprobado, coalesce(p_notas, '{}'::jsonb), left(coalesce(p_detalle, '{}'::jsonb)::text, 20000)::jsonb)
  RETURNING id INTO v_nuevo;
  RETURN v_nuevo;
END;
$$;

-- ¿Cumple para habilitarse? N1, N2 y N3 ≥ 90 % + E1–E4 aprobados a pie y en digital
CREATE OR REPLACE FUNCTION dk.academia_cumple(p_identidad uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT (SELECT count(DISTINCT bloque) FROM public.academia_intentos WHERE identidad = p_identidad AND bloque IN ('N1', 'N2', 'N3') AND version = 'test' AND nota >= 90) = 3
     AND (SELECT count(DISTINCT bloque || version) FROM public.academia_intentos WHERE identidad = p_identidad AND bloque IN ('E1', 'E2', 'E3', 'E4') AND version IN ('pie', 'digital') AND aprobado) = 8;
$$;

CREATE OR REPLACE FUNCTION dk.academia_resumen(p_identidad uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT jsonb_build_object(
    'bloques', coalesce((SELECT jsonb_object_agg(k, v) FROM (
        SELECT bloque || ':' || version AS k, jsonb_build_object('mejor', max(nota), 'aprobado', bool_or(aprobado), 'intentos', count(*), 'ultimo', max(creado_en)) AS v
          FROM public.academia_intentos WHERE identidad = p_identidad GROUP BY bloque, version) x), '{}'::jsonb),
    'cumple', dk.academia_cumple(p_identidad),
    'rol', (SELECT rol_admin FROM public.identidades WHERE id = p_identidad));
$$;

CREATE OR REPLACE FUNCTION dk.academia_mi_estado()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT dk.es_admin_academia() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN dk.academia_resumen(dk.identidad_actual()) || jsonb_build_object('alex', dk.es_alex());
END;
$$;

-- Últimos intentos de Alex (para su informe de entrenamiento)
CREATE OR REPLACE FUNCTION dk.academia_mis_intentos(p_limite int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT dk.es_admin_academia() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(i) - 'identidad' ORDER BY i.creado_en DESC) FROM (
    SELECT * FROM public.academia_intentos WHERE identidad = dk.identidad_actual() ORDER BY creado_en DESC LIMIT least(greatest(p_limite, 1), 100)) i), '[]'::jsonb);
END;
$$;

-- Equipo (dirección): rol, progreso y si cumple
CREATE OR REPLACE FUNCTION dk.admin_academia_equipo()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email::text, 'nombre', i.nombre, 'rol', i.rol_admin) || dk.academia_resumen(i.id) ORDER BY i.creado_en)
    FROM public.identidades i WHERE i.rol = 'admin' AND i.activo), '[]'::jsonb);
END;
$$;

-- Habilitar: solo dirección y solo si el servidor confirma que cumple
CREATE OR REPLACE FUNCTION dk.admin_habilitar_comercial(p_identidad uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  IF NOT EXISTS (SELECT 1 FROM public.identidades WHERE id = p_identidad AND rol = 'admin' AND rol_admin = 'en_formacion') THEN
    RAISE EXCEPTION 'no está en formación' USING ERRCODE = '22023';
  END IF;
  IF NOT dk.academia_cumple(p_identidad) THEN
    RAISE EXCEPTION 'no cumple: N1, N2 y N3 al 90 %% y los 4 escenarios a pie y en digital' USING ERRCODE = '42501';
  END IF;
  UPDATE public.identidades SET rol_admin = 'comercial' WHERE id = p_identidad;
  INSERT INTO public.auditoria (identidad, accion, detalle) VALUES (dk.identidad_actual(), 'admin.habilitar_comercial', jsonb_build_object('comercial', p_identidad));
END;
$$;

-- Cambio de rol: «comercial» ya no se regala (se habilita); dirección puede devolver a formación
CREATE OR REPLACE FUNCTION dk.admin_cambiar_rol_admin(p_identidad uuid, p_nuevo_rol text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rol text := lower(trim(coalesce(p_nuevo_rol, 'en_formacion')));
BEGIN
  PERFORM dk.exigir_direccion();
  IF v_rol NOT IN ('direccion', 'comercial', 'en_formacion') THEN RAISE EXCEPTION 'rol no valido' USING ERRCODE = '22023'; END IF;
  IF v_rol = 'comercial' AND NOT EXISTS (SELECT 1 FROM public.identidades WHERE id = p_identidad AND rol_admin = 'comercial') AND NOT dk.academia_cumple(p_identidad) THEN
    RAISE EXCEPTION 'para ser comercial tiene que aprobar la Academia' USING ERRCODE = '42501';
  END IF;
  UPDATE public.identidades SET rol_admin = v_rol WHERE id = p_identidad AND rol = 'admin';
END;
$$;

-- Alta de administrador: todo comercial nuevo entra «en formación»
CREATE OR REPLACE FUNCTION dk.admin_admin_alta(p_email text, p_nombre text, p_rol_admin text DEFAULT 'comercial')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_id uuid; v_email text := lower(btrim(p_email)); v_nombre text := btrim(p_nombre);
  v_rol text := CASE WHEN lower(btrim(coalesce(p_rol_admin, ''))) = 'direccion' THEN 'direccion' ELSE 'en_formacion' END;
BEGIN
  PERFORM dk.exigir_direccion();
  IF char_length(coalesce(v_nombre, '')) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'nombre no válido' USING ERRCODE = '22023'; END IF;
  SELECT u.id INTO v_id FROM neon_auth."user" u WHERE lower(u.email) = v_email;
  IF v_id IS NULL THEN RAISE EXCEPTION 'la cuenta % no existe: créala primero en Neon Auth', v_email USING ERRCODE = 'P0002'; END IF;
  IF EXISTS (SELECT 1 FROM public.identidades WHERE id = v_id AND rol = 'admin' AND activo) THEN RAISE EXCEPTION 'esa cuenta ya es administradora' USING ERRCODE = '23505'; END IF;
  IF EXISTS (SELECT 1 FROM public.identidades WHERE id = v_id AND rol = 'socio') THEN RAISE EXCEPTION 'esa cuenta es de un socio: el administrador necesita una cuenta propia' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.restaurantes WHERE propietario = v_id) THEN RAISE EXCEPTION 'esa cuenta es dueña de un local: el administrador necesita una cuenta propia' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.admin_totp WHERE identidad = v_id;
  DELETE FROM public.admin_2fa_sesiones WHERE identidad = v_id;
  INSERT INTO public.identidades (id, email, nombre, rol, rol_admin, activo) VALUES (v_id, v_email, v_nombre, 'admin', v_rol, true)
  ON CONFLICT (id) DO UPDATE SET rol = 'admin', rol_admin = excluded.rol_admin, activo = true, nombre = excluded.nombre;
  INSERT INTO public.auditoria (identidad, accion, detalle) VALUES (dk.identidad_actual(), 'admin.admin_alta', jsonb_build_object('admin', v_id, 'email', v_email, 'rol_admin', v_rol));
  RETURN v_id;
END;
$$;

-- Bitácora de campo de Alex
CREATE OR REPLACE FUNCTION dk.academia_bitacora_guardar(p_datos jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v uuid;
BEGIN
  IF NOT dk.es_alex() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.academia_bitacora (identidad, datos) VALUES (dk.identidad_actual(), p_datos) RETURNING id INTO v;
  RETURN v;
END;
$$;
CREATE OR REPLACE FUNCTION dk.academia_bitacora()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT dk.es_alex() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'datos', datos, 'creado_en', creado_en) ORDER BY creado_en DESC) FROM public.academia_bitacora), '[]'::jsonb);
END;
$$;

-- Palancas: pedir (comercial habilitado o dirección), ver, decidir (dirección) y consumir en el alta
CREATE OR REPLACE FUNCTION dk.palanca_solicitar(p_tipo text, p_local text, p_detalle jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v uuid;
BEGIN
  PERFORM dk.exigir_admin();
  INSERT INTO public.palancas_solicitudes (comercial, tipo, local, detalle)
  VALUES (dk.identidad_actual(), p_tipo, left(btrim(p_local), 120), left(coalesce(p_detalle, '{}'::jsonb)::text, 2000)::jsonb) RETURNING id INTO v;
  RETURN v;
END;
$$;
CREATE OR REPLACE FUNCTION dk.palancas_ver()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(p) || jsonb_build_object('comercial_nombre', i.nombre, 'comercial_email', i.email::text) ORDER BY p.creado_en DESC)
    FROM public.palancas_solicitudes p JOIN public.identidades i ON i.id = p.comercial
   WHERE (dk.es_direccion() OR p.comercial = dk.identidad_actual()) AND p.creado_en > now() - interval '60 days'), '[]'::jsonb);
END;
$$;
CREATE OR REPLACE FUNCTION dk.admin_palanca_decidir(p_id uuid, p_aprobar boolean, p_decision jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  UPDATE public.palancas_solicitudes SET estado = CASE WHEN p_aprobar THEN 'aprobada' ELSE 'rechazada' END,
         decision = coalesce(p_decision, '{}'::jsonb), decidido_por = dk.identidad_actual(), decidido_en = now()
   WHERE id = p_id AND estado = 'pendiente';
  IF NOT FOUND THEN RAISE EXCEPTION 'la solicitud ya no está pendiente' USING ERRCODE = '22023'; END IF;
END;
$$;
CREATE OR REPLACE FUNCTION dk.palanca_consumir(p_id uuid, p_tipo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v public.palancas_solicitudes;
BEGIN
  PERFORM dk.exigir_admin();
  SELECT * INTO v FROM public.palancas_solicitudes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v.estado <> 'aprobada' OR v.tipo <> p_tipo OR (v.comercial <> dk.identidad_actual() AND NOT dk.es_direccion()) THEN
    RAISE EXCEPTION 'palanca sin aprobación válida' USING ERRCODE = '42501';
  END IF;
  UPDATE public.palancas_solicitudes SET estado = 'usada', usada_en = now() WHERE id = p_id;
  RETURN v.detalle || coalesce(v.decision, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION dk.es_admin_academia(), dk.es_alex(), dk.academia_registrar(text, text, int, boolean, jsonb, jsonb), dk.academia_cumple(uuid),
  dk.academia_resumen(uuid), dk.academia_mi_estado(), dk.academia_mis_intentos(int), dk.admin_academia_equipo(), dk.admin_habilitar_comercial(uuid),
  dk.academia_bitacora_guardar(jsonb), dk.academia_bitacora(), dk.palanca_solicitar(text, text, jsonb), dk.palancas_ver(),
  dk.admin_palanca_decidir(uuid, boolean, jsonb), dk.palanca_consumir(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.es_admin_academia(), dk.es_alex(), dk.academia_registrar(text, text, int, boolean, jsonb, jsonb),
  dk.academia_mi_estado(), dk.academia_mis_intentos(int), dk.admin_academia_equipo(), dk.admin_habilitar_comercial(uuid),
  dk.academia_bitacora_guardar(jsonb), dk.academia_bitacora(), dk.palanca_solicitar(text, text, jsonb), dk.palancas_ver(),
  dk.admin_palanca_decidir(uuid, boolean, jsonb), dk.palanca_consumir(uuid, text) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0112_academia_comerciales.sql') ON CONFLICT DO NOTHING;
COMMIT;
