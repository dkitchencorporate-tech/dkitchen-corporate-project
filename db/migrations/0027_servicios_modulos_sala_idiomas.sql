-- 0027 — Servicios contratados, Módulos de Sala, idiomas, ofertas y crédito de migración (28/09/2026)
--
-- Estrategia: DKITCHEN_ESTRATEGIA_PRECIOS_ESCALERA_Y_RETENCION_2026-09-28.md
--   Setup Esencial 149 € · Setup Experto 280 → 199 € (primeros 20) · Idiomas 29 € (pago único, hasta 3)
--   Plano de mesas 24 €/mes · App de sala 39 €/mes · Conexión TPV 49 €/mes · Pack Sala 99 €/mes
-- Frontera con el Núcleo: el cliente final NUNCA pide desde la carta; sin cocina,
-- tickets, pagos ni historial de ventas. La app de sala registra lo que pide cada
-- mesa y lo envía al TPV del local (que es quien factura).

BEGIN;

-- =====================================================================
-- 1. Catálogo de precios (fuente de verdad del servidor; el cliente no fija precios)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.catalogo_servicios (
  servicio text PRIMARY KEY,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('unico', 'mensual')),
  precio_centimos integer NOT NULL CHECK (precio_centimos > 0),
  precio_ancla_centimos integer,
  requiere_ampliado boolean NOT NULL DEFAULT false
);
ALTER TABLE public.catalogo_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_servicios FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogo_servicios FROM PUBLIC, dk_anon, dk_app;
GRANT SELECT ON public.catalogo_servicios TO dk_auth, dk_aprovisionamiento;
DROP POLICY IF EXISTS catalogo_lectura ON public.catalogo_servicios;
CREATE POLICY catalogo_lectura ON public.catalogo_servicios FOR SELECT TO dk_auth, dk_aprovisionamiento USING (true);
INSERT INTO public.catalogo_servicios (servicio, nombre, tipo, precio_centimos, precio_ancla_centimos, requiere_ampliado) VALUES
  ('setup_esencial', 'Setup Esencial', 'unico', 14900, NULL, false),
  ('setup_experto', 'Setup Experto · Carta de Autor', 'unico', 19900, 28000, false),
  ('idiomas', 'Pack de idiomas (hasta 3)', 'unico', 2900, NULL, false),
  ('plano_mesas', 'Plano de mesas', 'mensual', 2400, NULL, true),
  ('app_sala', 'App de sala', 'mensual', 3900, NULL, true),
  ('conexion_tpv', 'Conexión con tu TPV', 'mensual', 4900, NULL, true),
  ('pack_sala', 'Pack Sala Completo', 'mensual', 9900, 11200, true)
ON CONFLICT (servicio) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, precio_centimos = EXCLUDED.precio_centimos,
  precio_ancla_centimos = EXCLUDED.precio_ancla_centimos, requiere_ampliado = EXCLUDED.requiere_ampliado;

-- =====================================================================
-- 2. Servicios contratados por restaurante
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.servicios_contratados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  servicio text NOT NULL REFERENCES public.catalogo_servicios(servicio),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'entregado', 'cancelado')),
  origen text NOT NULL CHECK (origen IN ('pago', 'regalo', 'demo')),
  precio_centimos integer NOT NULL DEFAULT 0,
  referencia_pago text UNIQUE,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  contratado_en timestamptz NOT NULL DEFAULT now(),
  cancelado_en timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS servicios_unico_vigente ON public.servicios_contratados (restaurante_id, servicio)
  WHERE estado <> 'cancelado';
ALTER TABLE public.servicios_contratados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_contratados FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.servicios_contratados FROM PUBLIC, dk_anon, dk_app;
GRANT SELECT ON public.servicios_contratados TO dk_auth;
DROP POLICY IF EXISTS servicio_del_propietario ON public.servicios_contratados;
CREATE POLICY servicio_del_propietario ON public.servicios_contratados FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin());

-- ¿Tiene activo un módulo? (el pack cubre los tres)
CREATE OR REPLACE FUNCTION dk.tiene_servicio(p_restaurante uuid, p_servicio text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servicios_contratados s
    WHERE s.restaurante_id = p_restaurante AND s.estado <> 'cancelado'
      AND (s.servicio = p_servicio
           OR (s.servicio = 'pack_sala' AND p_servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv'))));
$$;
REVOKE ALL ON FUNCTION dk.tiene_servicio(uuid, text) FROM PUBLIC;
-- Lo usan las políticas RLS de mesas y traducciones (evaluadas como dk_auth)
GRANT EXECUTE ON FUNCTION dk.tiene_servicio(uuid, text) TO dk_auth;

-- Plazas del Setup Experto a 199 € (primeros 20 pagados)
CREATE OR REPLACE FUNCTION dk.plazas_setup_experto()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT greatest(0, 20 - (SELECT count(*)::int FROM public.servicios_contratados
                          WHERE servicio = 'setup_experto' AND origen = 'pago' AND estado <> 'cancelado'));
$$;
REVOKE ALL ON FUNCTION dk.plazas_setup_experto() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.plazas_setup_experto() TO dk_anon, dk_auth, dk_aprovisionamiento;

-- Precio vigente decidido por el servidor (Experto: 199 € si quedan plazas, si no 280 €)
CREATE OR REPLACE FUNCTION dk.precio_servicio(p_servicio text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT CASE WHEN p_servicio = 'setup_experto' AND dk.plazas_setup_experto() = 0
              THEN coalesce(c.precio_ancla_centimos, c.precio_centimos) ELSE c.precio_centimos END
  FROM public.catalogo_servicios c WHERE c.servicio = p_servicio;
$$;
REVOKE ALL ON FUNCTION dk.precio_servicio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.precio_servicio(text) TO dk_auth, dk_aprovisionamiento;

-- Alta tras el pago (solo webhook). Idempotente por referencia de pago.
CREATE OR REPLACE FUNCTION dk.registrar_pago_servicio(p_restaurante uuid, p_servicio text, p_referencia text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_precio int := dk.precio_servicio(p_servicio);
BEGIN
  IF v_precio IS NULL THEN RETURN 'servicio_desconocido'; END IF;
  IF EXISTS (SELECT 1 FROM public.servicios_contratados WHERE referencia_pago = p_referencia) THEN RETURN 'ya_registrado'; END IF;
  -- Renovación de un mensual ya vigente: nada que dar de alta
  IF EXISTS (SELECT 1 FROM public.servicios_contratados
             WHERE restaurante_id = p_restaurante AND servicio = p_servicio AND estado <> 'cancelado') THEN
    RETURN 'renovacion';
  END IF;
  INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen, precio_centimos, referencia_pago)
  VALUES (p_restaurante, p_servicio, 'pago', v_precio, p_referencia);
  -- El pack sustituye a los módulos sueltos (se cancelan para no duplicar cobro en la BD)
  IF p_servicio = 'pack_sala' THEN
    UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
     WHERE restaurante_id = p_restaurante AND servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv') AND estado <> 'cancelado';
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (NULL, 'pago.servicio', jsonb_build_object('servicio', p_servicio, 'centimos', v_precio), p_restaurante);
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION dk.registrar_pago_servicio(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.registrar_pago_servicio(uuid, text, text) TO dk_aprovisionamiento;

-- Super admin: activar (regalo / demo), cancelar, marcar entregado y checklist
CREATE OR REPLACE FUNCTION dk.admin_servicio(p_restaurante uuid, p_servicio text, p_accion text, p_checklist jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF NOT EXISTS (SELECT 1 FROM public.catalogo_servicios WHERE servicio = p_servicio) THEN
    RAISE EXCEPTION 'servicio no válido' USING ERRCODE = '22023';
  END IF;
  IF p_accion IN ('regalar', 'demo') THEN
    INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen)
    VALUES (p_restaurante, p_servicio, CASE p_accion WHEN 'regalar' THEN 'regalo' ELSE 'demo' END)
    ON CONFLICT DO NOTHING;
  ELSIF p_accion = 'cancelar' THEN
    UPDATE public.servicios_contratados SET estado = 'cancelado', cancelado_en = now()
     WHERE restaurante_id = p_restaurante AND servicio = p_servicio AND estado <> 'cancelado';
  ELSIF p_accion = 'entregado' THEN
    UPDATE public.servicios_contratados SET estado = 'entregado'
     WHERE restaurante_id = p_restaurante AND servicio = p_servicio AND estado = 'activo';
  ELSIF p_accion = 'checklist' THEN
    UPDATE public.servicios_contratados SET checklist = coalesce(p_checklist, '{}'::jsonb)
     WHERE restaurante_id = p_restaurante AND servicio = p_servicio AND estado <> 'cancelado';
  ELSE
    RAISE EXCEPTION 'acción no válida' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.servicio', jsonb_build_object('servicio', p_servicio, 'accion', p_accion), p_restaurante);
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_servicio(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_servicio(uuid, text, text, jsonb) TO dk_auth;

-- =====================================================================
-- 3. Idiomas (pago único, hasta 3)
-- =====================================================================
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS idiomas text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_idiomas_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_idiomas_check
  CHECK (idiomas <@ ARRAY['en','fr','de','it','pt','ca']::text[] AND cardinality(idiomas) <= 3);
GRANT SELECT (idiomas) ON public.restaurantes TO dk_auth, dk_anon;

CREATE TABLE IF NOT EXISTS public.traducciones (
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  entidad text NOT NULL CHECK (entidad IN ('plato', 'seccion', 'local')),
  entidad_id uuid NOT NULL,
  idioma text NOT NULL CHECK (idioma IN ('en','fr','de','it','pt','ca')),
  campo text NOT NULL CHECK (campo IN ('nombre', 'descripcion')),
  texto text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 300),
  PRIMARY KEY (entidad_id, idioma, campo)
);
CREATE INDEX IF NOT EXISTS traducciones_restaurante_idx ON public.traducciones (restaurante_id, idioma);
ALTER TABLE public.traducciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traducciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.traducciones FROM PUBLIC, dk_anon, dk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traducciones TO dk_auth;
DROP POLICY IF EXISTS traduccion_del_propietario ON public.traducciones;
CREATE POLICY traduccion_del_propietario ON public.traducciones FOR ALL TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin())
  WITH CHECK ((restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual())
               AND dk.tiene_servicio(restaurante_id, 'idiomas')) OR dk.es_admin());

-- El dueño elige sus idiomas solo si tiene el pack
CREATE OR REPLACE FUNCTION dk.fijar_idiomas(p_idiomas text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  SELECT id INTO v_rest FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF v_rest IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF NOT dk.tiene_servicio(v_rest, 'idiomas') THEN
    RAISE EXCEPTION 'Los idiomas se activan con el Pack de idiomas.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.restaurantes SET idiomas = coalesce(p_idiomas, '{}') WHERE id = v_rest;
END;
$$;
REVOKE ALL ON FUNCTION dk.fijar_idiomas(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.fijar_idiomas(text[]) TO dk_auth;

-- Lectura pública de traducciones de una carta (solo si el pack está activo)
CREATE OR REPLACE FUNCTION dk.traducciones_carta(p_slug text, p_idioma text)
RETURNS TABLE (entidad text, entidad_id uuid, campo text, texto text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT t.entidad, t.entidad_id, t.campo, t.texto
  FROM public.traducciones t JOIN public.restaurantes r ON r.id = t.restaurante_id
  WHERE r.slug = lower(p_slug) AND r.activo AND t.idioma = p_idioma AND p_idioma = ANY (r.idiomas)
    AND dk.tiene_servicio(r.id, 'idiomas');
$$;
REVOKE ALL ON FUNCTION dk.traducciones_carta(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.traducciones_carta(text, text) TO dk_anon;

-- =====================================================================
-- 4. Plano de mesas + camareros (App de sala)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.camareros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 40),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  ultimo_acceso timestamptz
);
CREATE TABLE IF NOT EXISTS public.mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  numero text NOT NULL CHECK (numero ~ '^[A-Za-z0-9-]{1,12}$'),
  zona text NOT NULL DEFAULT 'Sala' CHECK (char_length(zona) BETWEEN 1 AND 30),
  forma text NOT NULL DEFAULT 'cuadrada' CHECK (forma IN ('cuadrada', 'redonda', 'rectangular')),
  plazas smallint NOT NULL DEFAULT 4 CHECK (plazas BETWEEN 1 AND 30),
  x numeric(5,2) NOT NULL DEFAULT 10 CHECK (x BETWEEN 0 AND 100),
  y numeric(5,2) NOT NULL DEFAULT 10 CHECK (y BETWEEN 0 AND 100),
  camarero_id uuid REFERENCES public.camareros(id) ON DELETE SET NULL,
  UNIQUE (restaurante_id, numero)
);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['camareros','mesas'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, dk_anon, dk_app', t);
  END LOOP;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesas TO dk_auth;
GRANT SELECT, UPDATE (nombre, activo), DELETE ON public.camareros TO dk_auth;
DROP POLICY IF EXISTS mesa_del_propietario ON public.mesas;
CREATE POLICY mesa_del_propietario ON public.mesas FOR ALL TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin())
  WITH CHECK (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual())
              AND dk.tiene_servicio(restaurante_id, 'plano_mesas'));
DROP POLICY IF EXISTS camarero_del_propietario ON public.camareros;
CREATE POLICY camarero_del_propietario ON public.camareros FOR ALL TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin())
  WITH CHECK (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()));

-- Alta de camarero: la app genera el token y solo guarda su huella; el enlace se muestra una vez
CREATE OR REPLACE FUNCTION dk.crear_camarero(p_nombre text, p_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_id uuid;
BEGIN
  SELECT id INTO v_rest FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF v_rest IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF NOT dk.tiene_servicio(v_rest, 'app_sala') THEN
    RAISE EXCEPTION 'Los accesos de camarero son de la App de sala.' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.camareros WHERE restaurante_id = v_rest AND activo) >= 20 THEN
    RAISE EXCEPTION 'Máximo 20 camareros activos.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.camareros (restaurante_id, nombre, token_hash) VALUES (v_rest, btrim(p_nombre), p_token_hash)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION dk.crear_camarero(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.crear_camarero(text, text) TO dk_auth;

-- Registros de sala: lo que pide cada mesa → se envía al TPV. SIN precios ni totales
-- (no es historial de ventas; eso es del Núcleo). Se purgan a los 30 días.
CREATE TABLE IF NOT EXISTS public.registros_sala (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  mesa text NOT NULL,
  camarero_id uuid REFERENCES public.camareros(id) ON DELETE SET NULL,
  lineas jsonb NOT NULL CHECK (jsonb_typeof(lineas) = 'array' AND jsonb_array_length(lineas) BETWEEN 1 AND 60),
  estado text NOT NULL DEFAULT 'registrado' CHECK (estado IN ('registrado', 'enviado_tpv', 'error_tpv')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  enviado_en timestamptz,
  detalle_tpv text
);
CREATE INDEX IF NOT EXISTS registros_sala_idx ON public.registros_sala (restaurante_id, creado_en DESC);
ALTER TABLE public.registros_sala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_sala FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.registros_sala FROM PUBLIC, dk_anon, dk_app;
GRANT SELECT ON public.registros_sala TO dk_auth;
DROP POLICY IF EXISTS registro_del_propietario ON public.registros_sala;
CREATE POLICY registro_del_propietario ON public.registros_sala FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin());

-- Contexto del camarero (acceso por enlace con token; se valida la huella en la BD)
CREATE OR REPLACE FUNCTION dk.sala_contexto(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros%ROWTYPE; v_rest public.restaurantes%ROWTYPE;
BEGIN
  SELECT * INTO v_cam FROM public.camareros WHERE token_hash = p_token_hash AND activo;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_rest FROM public.restaurantes WHERE id = v_cam.restaurante_id AND activo AND estado_acceso IN ('activo','gracia');
  IF NOT FOUND OR NOT dk.tiene_servicio(v_rest.id, 'app_sala') THEN RETURN NULL; END IF;
  UPDATE public.camareros SET ultimo_acceso = now() WHERE id = v_cam.id;
  RETURN jsonb_build_object(
    'camarero', jsonb_build_object('id', v_cam.id, 'nombre', v_cam.nombre),
    'restaurante', jsonb_build_object('nombre', v_rest.nombre, 'color', v_rest.color_marca,
                                      'tpv', dk.tiene_servicio(v_rest.id, 'conexion_tpv')),
    'mesas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'numero', m.numero, 'zona', m.zona, 'forma', m.forma,
                'plazas', m.plazas, 'x', m.x, 'y', m.y, 'mia', m.camarero_id = v_cam.id,
                'camarero', (SELECT c.nombre FROM public.camareros c WHERE c.id = m.camarero_id)) ORDER BY m.zona, m.numero), '[]')
              FROM public.mesas m WHERE m.restaurante_id = v_rest.id),
    'llamadas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'mesa', l.mesa, 'motivo', l.motivo, 'creada_en', l.creada_en)
                ORDER BY l.creada_en), '[]')
              FROM public.llamadas_camarero l WHERE l.restaurante_id = v_rest.id AND l.atendida_en IS NULL
                AND l.creada_en > now() - interval '3 hours'),
    'carta', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'nombre', i.nombre,
                'seccion', (SELECT s.nombre FROM public.menu_secciones s WHERE s.id = i.seccion_id)) ORDER BY i.orden, i.nombre), '[]')
              FROM public.menu_items i WHERE i.restaurante_id = v_rest.id AND i.disponible)
  );
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_atender(p_token_hash text, p_llamada uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  SELECT c.restaurante_id INTO v_rest FROM public.camareros c WHERE c.token_hash = p_token_hash AND c.activo;
  IF v_rest IS NULL OR NOT dk.tiene_servicio(v_rest, 'app_sala') THEN RETURN false; END IF;
  UPDATE public.llamadas_camarero SET atendida_en = now()
   WHERE id = p_llamada AND restaurante_id = v_rest AND atendida_en IS NULL;
  RETURN FOUND;
END;
$$;

-- Registrar lo que pide una mesa (solo nombres de la carta del propio local y cantidades)
CREATE OR REPLACE FUNCTION dk.sala_registrar(p_token_hash text, p_mesa text, p_lineas jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros%ROWTYPE; v_id uuid; v_lineas jsonb;
BEGIN
  SELECT * INTO v_cam FROM public.camareros WHERE token_hash = p_token_hash AND activo;
  IF NOT FOUND OR NOT dk.tiene_servicio(v_cam.restaurante_id, 'app_sala') THEN RETURN NULL; END IF;
  IF p_mesa !~ '^[A-Za-z0-9-]{1,12}$' OR jsonb_typeof(p_lineas) <> 'array' THEN RETURN NULL; END IF;
  -- Solo platos reales de su carta; cantidad 1..50; nota corta
  SELECT jsonb_agg(jsonb_build_object('plato_id', i.id, 'nombre', i.nombre,
           'cantidad', least(50, greatest(1, (l->>'cantidad')::int)),
           'nota', left(coalesce(l->>'nota', ''), 120)))
    INTO v_lineas
    FROM jsonb_array_elements(p_lineas) l
    JOIN public.menu_items i ON i.id = (l->>'plato_id')::uuid AND i.restaurante_id = v_cam.restaurante_id;
  IF v_lineas IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.registros_sala (restaurante_id, mesa, camarero_id, lineas)
  VALUES (v_cam.restaurante_id, p_mesa, v_cam.id, v_lineas) RETURNING id INTO v_id;
  DELETE FROM public.registros_sala WHERE restaurante_id = v_cam.restaurante_id AND creado_en < now() - interval '30 days';
  RETURN v_id;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$$;

-- =====================================================================
-- 5. Conexión con el TPV (la configura DKitchen; el secreto va cifrado por la app)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.conexiones_tpv (
  restaurante_id uuid PRIMARY KEY REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  proveedor text NOT NULL CHECK (char_length(proveedor) BETWEEN 2 AND 40),
  endpoint_url text NOT NULL CHECK (endpoint_url ~ '^https://[^\s/$.?#].[^\s]*$'),
  credencial_cifrada text,
  activa boolean NOT NULL DEFAULT true,
  ultimo_envio timestamptz,
  ultimo_error text
);
ALTER TABLE public.conexiones_tpv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conexiones_tpv FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.conexiones_tpv FROM PUBLIC, dk_anon, dk_app, dk_auth;

-- Para el envío: la app (con el token del camarero) obtiene destino + credencial cifrada
CREATE OR REPLACE FUNCTION dk.sala_destino_tpv(p_token_hash text, p_registro uuid)
RETURNS TABLE (proveedor text, endpoint_url text, credencial_cifrada text, restaurante text, mesa text, lineas jsonb, creado_en timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT t.proveedor, t.endpoint_url, t.credencial_cifrada, r.nombre, s.mesa, s.lineas, s.creado_en
  FROM public.camareros c
  JOIN public.registros_sala s ON s.id = p_registro AND s.restaurante_id = c.restaurante_id
  JOIN public.restaurantes r ON r.id = c.restaurante_id
  JOIN public.conexiones_tpv t ON t.restaurante_id = c.restaurante_id AND t.activa
  WHERE c.token_hash = p_token_hash AND c.activo AND dk.tiene_servicio(c.restaurante_id, 'conexion_tpv');
$$;

CREATE OR REPLACE FUNCTION dk.sala_resultado_tpv(p_token_hash text, p_registro uuid, p_ok boolean, p_detalle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  SELECT c.restaurante_id INTO v_rest FROM public.camareros c WHERE c.token_hash = p_token_hash AND c.activo;
  IF v_rest IS NULL THEN RETURN; END IF;
  UPDATE public.registros_sala SET estado = CASE WHEN p_ok THEN 'enviado_tpv' ELSE 'error_tpv' END,
         enviado_en = now(), detalle_tpv = left(p_detalle, 300)
   WHERE id = p_registro AND restaurante_id = v_rest;
  UPDATE public.conexiones_tpv SET ultimo_envio = now(), ultimo_error = CASE WHEN p_ok THEN NULL ELSE left(p_detalle, 300) END
   WHERE restaurante_id = v_rest;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_conexion_tpv(p_restaurante uuid, p_proveedor text, p_endpoint text, p_credencial_cifrada text, p_activa boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  INSERT INTO public.conexiones_tpv (restaurante_id, proveedor, endpoint_url, credencial_cifrada, activa)
  VALUES (p_restaurante, p_proveedor, p_endpoint, p_credencial_cifrada, p_activa)
  ON CONFLICT (restaurante_id) DO UPDATE SET proveedor = EXCLUDED.proveedor, endpoint_url = EXCLUDED.endpoint_url,
    credencial_cifrada = coalesce(EXCLUDED.credencial_cifrada, public.conexiones_tpv.credencial_cifrada), activa = EXCLUDED.activa;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.conexion_tpv', jsonb_build_object('proveedor', p_proveedor, 'activa', p_activa), p_restaurante);
END;
$$;

-- Estado de la conexión para el dueño (sin credencial ni URL completa)
CREATE OR REPLACE FUNCTION dk.estado_conexion_tpv_mia()
RETURNS TABLE (proveedor text, activa boolean, ultimo_envio timestamptz, ultimo_error text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT t.proveedor, t.activa, t.ultimo_envio, t.ultimo_error
  FROM public.conexiones_tpv t JOIN public.restaurantes r ON r.id = t.restaurante_id
  WHERE r.propietario = dk.identidad_actual();
$$;

-- =====================================================================
-- 6. Ofertas inteligentes (la BD decide qué ve cada cliente) + crédito de migración
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ofertas_eventos (
  id bigserial PRIMARY KEY,
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  oferta text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('mostrada', 'cerrada', 'aceptada')),
  ocurrido_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ofertas_eventos_idx ON public.ofertas_eventos (restaurante_id, oferta, ocurrido_en DESC);
ALTER TABLE public.ofertas_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas_eventos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ofertas_eventos FROM PUBLIC, dk_anon, dk_app, dk_auth;

-- Escaneos medios de los 2 últimos meses completos + mes actual
CREATE OR REPLACE FUNCTION dk.escaneos_sostenidos(p_restaurante uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT coalesce(min(n), 0)::int FROM (
    SELECT count(*) n FROM public.escaneos e JOIN public.codigos_qr c ON c.codigo = e.codigo
    WHERE c.restaurante_id = p_restaurante AND e.ocurrido_en >= date_trunc('month', now()) - interval '1 month'
    GROUP BY date_trunc('month', e.ocurrido_en)) t;
$$;

CREATE OR REPLACE FUNCTION dk.ofertas_para_mi()
RETURNS TABLE (oferta text, motivo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r public.restaurantes%ROWTYPE; v_esc int; v_modulos int; cand text[] := '{}'; c text;
BEGIN
  SELECT * INTO r FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF NOT FOUND THEN RETURN; END IF;
  -- Regla 6: en gracia, impago o solo lectura no se ofrece nada
  IF r.estado_acceso <> 'activo' THEN RETURN; END IF;
  v_esc := dk.escaneos_sostenidos(r.id);
  SELECT count(*) INTO v_modulos FROM unnest(ARRAY['plano_mesas','app_sala','conexion_tpv']) m WHERE dk.tiene_servicio(r.id, m);

  -- Candidatas por orden de prioridad
  IF r.plan = 'basico' THEN
    IF v_esc >= 150 THEN cand := cand || 'plan_ampliado'::text; END IF;
  ELSE
    IF v_modulos >= 2 AND NOT dk.tiene_servicio(r.id, 'pack_sala') THEN cand := cand || 'pack_sala'::text; END IF;
    IF v_esc >= 600 AND v_modulos >= 1 THEN cand := cand || 'nucleo'::text; END IF;
    IF v_esc >= 250 THEN
      FOREACH c IN ARRAY ARRAY['plano_mesas','app_sala','conexion_tpv'] LOOP
        IF NOT dk.tiene_servicio(r.id, c) AND v_modulos < 2 THEN cand := cand || c; END IF;
      END LOOP;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.servicios_contratados s WHERE s.restaurante_id = r.id
                 AND s.servicio IN ('setup_esencial','setup_experto') AND s.estado <> 'cancelado')
     AND r.nivel_diseno = 'esencial' THEN
    cand := cand || 'setup_experto'::text;
  END IF;
  IF NOT dk.tiene_servicio(r.id, 'idiomas') THEN cand := cand || 'idiomas'::text; END IF;

  -- Reglas 1 y 5: nunca lo que ya tiene; 30 días de respeto al "no"; 3 "no" → retirada
  FOREACH c IN ARRAY cand LOOP
    CONTINUE WHEN c <> 'plan_ampliado' AND c <> 'nucleo' AND dk.tiene_servicio(r.id, c);
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.ofertas_eventos e WHERE e.restaurante_id = r.id AND e.oferta = c
                          AND e.tipo = 'cerrada' AND e.ocurrido_en > now() - interval '30 days');
    CONTINUE WHEN (SELECT count(*) FROM public.ofertas_eventos e WHERE e.restaurante_id = r.id AND e.oferta = c AND e.tipo = 'cerrada') >= 3;
    oferta := c;
    motivo := CASE c
      WHEN 'plan_ampliado' THEN 'escaneos'
      WHEN 'pack_sala' THEN 'dos_modulos'
      WHEN 'nucleo' THEN 'volumen'
      WHEN 'setup_experto' THEN 'diseno'
      WHEN 'idiomas' THEN 'turismo'
      ELSE 'escaneos' END;
    RETURN NEXT;   -- Regla 4: una sola oferta a la vez
    RETURN;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION dk.registrar_oferta(p_oferta text, p_tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  IF p_tipo NOT IN ('mostrada','cerrada','aceptada') OR p_oferta !~ '^[a-z_]{3,30}$' THEN RETURN; END IF;
  SELECT id INTO v_rest FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF v_rest IS NULL THEN RETURN; END IF;
  IF p_tipo = 'mostrada' AND EXISTS (SELECT 1 FROM public.ofertas_eventos WHERE restaurante_id = v_rest AND oferta = p_oferta
                                     AND tipo = 'mostrada' AND ocurrido_en > now() - interval '1 day') THEN RETURN; END IF;
  INSERT INTO public.ofertas_eventos (restaurante_id, oferta, tipo) VALUES (v_rest, p_oferta, p_tipo);
END;
$$;

-- Crédito de migración al Núcleo: ventana de 6 meses desde el 1.er módulo pagado;
-- se descuenta lo pagado en módulos con tope del 50 % de la entrada (350 €).
CREATE OR REPLACE FUNCTION dk.credito_migracion_mio()
RETURNS TABLE (centimos integer, vence_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_inicio timestamptz; v_pagado bigint;
BEGIN
  SELECT id INTO v_rest FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF v_rest IS NULL THEN RETURN; END IF;
  SELECT min(contratado_en) INTO v_inicio FROM public.servicios_contratados
   WHERE restaurante_id = v_rest AND origen = 'pago' AND servicio IN ('plano_mesas','app_sala','conexion_tpv','pack_sala');
  IF v_inicio IS NULL OR now() > v_inicio + interval '6 months' THEN RETURN; END IF;
  SELECT coalesce(sum(s.precio_centimos * greatest(1, ceil(extract(epoch FROM (coalesce(s.cancelado_en, now()) - s.contratado_en)) / 2592000.0))), 0)
    INTO v_pagado
    FROM public.servicios_contratados s
   WHERE s.restaurante_id = v_rest AND s.origen = 'pago' AND s.servicio IN ('plano_mesas','app_sala','conexion_tpv','pack_sala');
  centimos := least(35000, v_pagado)::int;
  vence_en := v_inicio + interval '6 months';
  RETURN NEXT;
END;
$$;

-- Permisos de las funciones
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['dk.sala_contexto(text)','dk.sala_atender(text,uuid)','dk.sala_registrar(text,text,jsonb)',
                           'dk.sala_destino_tpv(text,uuid)','dk.sala_resultado_tpv(text,uuid,boolean,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_anon', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['dk.admin_conexion_tpv(uuid,text,text,text,boolean)','dk.estado_conexion_tpv_mia()',
                           'dk.ofertas_para_mi()','dk.registrar_oferta(text,text)','dk.credito_migracion_mio()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_auth', f);
  END LOOP;
  EXECUTE 'REVOKE ALL ON FUNCTION dk.escaneos_sostenidos(uuid) FROM PUBLIC';
END $$;

-- Historial de cambios también para mesas y servicios
DROP TRIGGER IF EXISTS historial_mesas ON public.mesas;
CREATE TRIGGER historial_mesas AFTER INSERT OR DELETE OR UPDATE OF numero, zona, forma, plazas, camarero_id ON public.mesas
  FOR EACH ROW EXECUTE FUNCTION dk.registrar_cambio();

INSERT INTO public.dk_migraciones (nombre) VALUES ('0027_servicios_modulos_sala_idiomas.sql');

COMMIT;
