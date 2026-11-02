-- 0116 · Contrato del comercial firmado al entrar en Academia (decisiones de Alex, 02/11/2026; autorizada por Alex).
-- El comercial (en formación o habilitado) rellena NIF y domicilio, lee su contrato y marca la casilla: queda FIRMADO
-- con su prueba (fecha, IP, navegador, versión y huella SHA-256 del texto exacto). Sin firma no hay formación:
-- dk.academia_registrar lo exige a todo el que no sea dirección. La habilitación (dk.academia_cumple) pide además
-- las 8 lecciones (L1–L8, versión «leccion»). Elisabet (titular) firma como SIMULACIÓN, sin valor legal.

BEGIN;

ALTER TABLE public.identidades ADD COLUMN IF NOT EXISTS contrato_simulacion boolean NOT NULL DEFAULT false;
UPDATE public.identidades SET contrato_simulacion = true WHERE lower(email::text) = 'elisabetmc82+comercial@gmail.com';

CREATE TABLE IF NOT EXISTS public.contratos_comerciales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identidad uuid NOT NULL REFERENCES public.identidades(id) ON DELETE RESTRICT,
  version text NOT NULL CHECK (char_length(version) BETWEEN 2 AND 40),
  huella text NOT NULL CHECK (huella ~ '^[0-9a-f]{64}$'),
  datos jsonb NOT NULL,
  comision text NOT NULL CHECK (char_length(comision) BETWEEN 2 AND 200),
  simulacion boolean NOT NULL DEFAULT false,
  ip text,
  navegador text,
  firmado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identidad, version)
);
-- Academia nueva: 8 lecciones (L1–L8, versión «leccion») y 2 escenarios más de práctica (E5, E6).
ALTER TABLE public.academia_intentos DROP CONSTRAINT IF EXISTS academia_intentos_bloque_check;
ALTER TABLE public.academia_intentos ADD CONSTRAINT academia_intentos_bloque_check CHECK (bloque = ANY (ARRAY[
  'N1','N2','N3','N4','E1','E2','E3','E4','E5','E6','L1','L2','L3','L4','L5','L6','L7','L8']));
ALTER TABLE public.academia_intentos DROP CONSTRAINT IF EXISTS academia_intentos_version_check;
ALTER TABLE public.academia_intentos ADD CONSTRAINT academia_intentos_version_check CHECK (version = ANY (ARRAY['test','pie','digital','alex','leccion']));

ALTER TABLE public.contratos_comerciales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contratos_comerciales FROM PUBLIC;

-- El contrato propio (o «sin firmar»). Cualquier miembro con 2FA (también en formación).
CREATE OR REPLACE FUNCTION dk.comercial_mi_contrato()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid := dk.identidad_actual(); r record; v_sim boolean;
BEGIN
  IF NOT dk.es_admin_academia() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT contrato_simulacion INTO v_sim FROM public.identidades WHERE id = v_id;
  SELECT * INTO r FROM public.contratos_comerciales WHERE identidad = v_id ORDER BY firmado_en DESC LIMIT 1;
  IF r.id IS NULL THEN
    RETURN jsonb_build_object('firmado', false, 'simulacion', coalesce(v_sim, false), 'rol', dk.rol_admin_actual(),
      'email', (SELECT email::text FROM public.identidades WHERE id = v_id), 'nombre', (SELECT nombre FROM public.identidades WHERE id = v_id));
  END IF;
  RETURN jsonb_build_object('firmado', true, 'id', r.id, 'version', r.version, 'huella', r.huella, 'datos', r.datos, 'comision', r.comision,
    'simulacion', r.simulacion, 'firmado_en', r.firmado_en, 'rol', dk.rol_admin_actual(),
    'email', (SELECT email::text FROM public.identidades WHERE id = v_id));
END;
$$;

-- Firma: una por versión del texto. La simulación la decide la base (identidades.contrato_simulacion), no el navegador.
CREATE OR REPLACE FUNCTION dk.comercial_firmar(p_version text, p_huella text, p_datos jsonb, p_comision text, p_ip text, p_navegador text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid := dk.identidad_actual(); v_sim boolean; v_nuevo uuid;
  v_nombre text := btrim(coalesce(p_datos ->> 'nombre', '')); v_nif text := upper(btrim(coalesce(p_datos ->> 'nif', '')));
  v_dom text := btrim(coalesce(p_datos ->> 'domicilio', ''));
BEGIN
  IF NOT dk.es_admin_academia() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF dk.rol_admin_actual() = 'direccion' THEN RAISE EXCEPTION 'dirección no firma contrato de agente' USING ERRCODE = '42501'; END IF;
  IF char_length(v_nombre) NOT BETWEEN 5 AND 120 THEN RAISE EXCEPTION 'nombre completo no válido' USING ERRCODE = '22023'; END IF;
  IF v_nif !~ '^([0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z]|[A-HJ-NP-SUVW][0-9]{7}[0-9A-J])$' THEN RAISE EXCEPTION 'NIF no válido' USING ERRCODE = '22023'; END IF;
  IF char_length(v_dom) NOT BETWEEN 10 AND 240 THEN RAISE EXCEPTION 'domicilio no válido' USING ERRCODE = '22023'; END IF;
  SELECT contrato_simulacion INTO v_sim FROM public.identidades WHERE id = v_id;
  INSERT INTO public.contratos_comerciales (identidad, version, huella, datos, comision, simulacion, ip, navegador)
  VALUES (v_id, p_version, lower(p_huella),
          jsonb_build_object('nombre', v_nombre, 'nif', v_nif, 'domicilio', v_dom, 'zona', left(btrim(coalesce(p_datos ->> 'zona', '')), 120)),
          p_comision, coalesce(v_sim, false), left(p_ip, 80), left(p_navegador, 300))
  ON CONFLICT (identidad, version) DO NOTHING
  RETURNING id INTO v_nuevo;
  IF v_nuevo IS NOT NULL THEN
    INSERT INTO public.auditoria (identidad, accion, detalle)
    VALUES (v_id, 'comercial.contrato_firmado', jsonb_build_object('contrato', v_nuevo, 'version', p_version, 'simulacion', coalesce(v_sim, false)));
  END IF;
  RETURN dk.comercial_mi_contrato();
END;
$$;

-- Dirección: contratos de todos los comerciales (Central → Comerciales).
CREATE OR REPLACE FUNCTION dk.admin_contratos_comerciales()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT dk.es_direccion() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'identidad', c.identidad, 'email', i.email::text, 'nombre', c.datos ->> 'nombre',
      'version', c.version, 'simulacion', c.simulacion, 'firmado_en', c.firmado_en, 'huella', c.huella) ORDER BY c.firmado_en DESC)
    FROM public.contratos_comerciales c JOIN public.identidades i ON i.id = c.identidad), '[]'::jsonb);
END;
$$;

-- Dirección: un contrato concreto con sus datos (para regenerar el PDF firmado).
CREATE OR REPLACE FUNCTION dk.admin_contrato_comercial(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r record;
BEGIN
  IF NOT dk.es_direccion() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT c.*, i.email::text AS correo INTO r FROM public.contratos_comerciales c JOIN public.identidades i ON i.id = c.identidad WHERE c.id = p_id;
  IF r.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('firmado', true, 'id', r.id, 'version', r.version, 'huella', r.huella, 'datos', r.datos, 'comision', r.comision,
    'simulacion', r.simulacion, 'firmado_en', r.firmado_en, 'email', r.correo, 'ip', r.ip);
END;
$$;

-- Sin contrato firmado no se registra formación (salvo dirección). Resto igual que en 0112.
CREATE OR REPLACE FUNCTION dk.academia_registrar(p_bloque text, p_version text, p_nota integer, p_aprobado boolean, p_notas jsonb, p_detalle jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid := dk.identidad_actual(); v_nuevo uuid; v_ult boolean[];
BEGIN
  IF NOT dk.es_admin_academia() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF (p_bloque = 'N4' OR p_version = 'alex') AND NOT dk.es_alex() THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF dk.rol_admin_actual() <> 'direccion' AND NOT EXISTS (SELECT 1 FROM public.contratos_comerciales WHERE identidad = v_id) THEN
    RAISE EXCEPTION 'firma primero tu contrato de agente' USING ERRCODE = '42501';
  END IF;
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

-- Habilitación: contrato firmado + 8 lecciones + N1–N3 al 90 % + E1–E4 a pie y en digital.
CREATE OR REPLACE FUNCTION dk.academia_cumple(p_identidad uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.contratos_comerciales WHERE identidad = p_identidad)
     AND (SELECT count(DISTINCT bloque) FROM public.academia_intentos WHERE identidad = p_identidad AND bloque IN ('L1','L2','L3','L4','L5','L6','L7','L8') AND version = 'leccion' AND aprobado) = 8
     AND (SELECT count(DISTINCT bloque) FROM public.academia_intentos WHERE identidad = p_identidad AND bloque IN ('N1', 'N2', 'N3') AND version = 'test' AND nota >= 90) = 3
     AND (SELECT count(DISTINCT bloque || version) FROM public.academia_intentos WHERE identidad = p_identidad AND bloque IN ('E1', 'E2', 'E3', 'E4') AND version IN ('pie', 'digital') AND aprobado) = 8;
$$;

REVOKE ALL ON FUNCTION dk.comercial_mi_contrato(), dk.comercial_firmar(text, text, jsonb, text, text, text), dk.admin_contratos_comerciales(), dk.admin_contrato_comercial(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.comercial_mi_contrato(), dk.comercial_firmar(text, text, jsonb, text, text, text), dk.admin_contratos_comerciales(), dk.admin_contrato_comercial(uuid) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0116_contratos_comerciales.sql') ON CONFLICT DO NOTHING;
COMMIT;
