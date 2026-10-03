-- 0045 · Comandero: cuenta por mesa, rondas con precio de servidor, anulaciones e informes (03/10/2026)
-- Especificación aprobada por karc0: ESTADO_WEB_DKITCHENCORPORATE.md §3.1.
-- Frontera Verifactu: esto NO es un sistema de facturación. Una cuenta de mesa no es
-- un ticket: no se numera, no se cobra y no se imprime. «Cerrar» = cobrada fuera (en el
-- TPV del local). La precuenta solo se ve en pantalla con «Documento no válido como factura».
-- Prohibido añadir aquí cualquier «emitir ticket/factura».
-- Conservación: cuentas, líneas y sus rondas se guardan juntas (sin purga), para que
-- los informes históricos cuadren siempre (karc0, 03/10).
--
-- Niveles:
--   App de sala (QR)  → cuenta por mesa, rondas, TPV, mesas en vivo, cerrar mesa, resumen de HOY.
--   Comandero Pro     → 12 € + IVA/mes: histórico con filtros, CSV/Excel, anulaciones, ranking.
--   Signature         → todo incluido (nivel_diseno = 'signature').
--   Prueba «todo incluido» → incluye Comandero Pro; «Quedarme con todo» lo suma al precio.

-- =====================================================================
-- 1. Catálogo: Comandero Pro (espejo en src/lib/pricing-config.ts · SERVICIOS_QR)
-- =====================================================================
INSERT INTO public.catalogo_servicios (servicio, nombre, tipo, precio_centimos, precio_ancla_centimos, requiere_ampliado)
VALUES ('comandero_pro', 'Comandero Pro', 'mensual', 1200, NULL, true)
ON CONFLICT (servicio) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo,
  precio_centimos = EXCLUDED.precio_centimos, requiere_ampliado = EXCLUDED.requiere_ampliado;

-- ¿Tiene activo un módulo? El pack cubre los tres de sala; Signature incluye Comandero Pro.
CREATE OR REPLACE FUNCTION dk.tiene_servicio(p_restaurante uuid, p_servicio text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servicios_contratados s
    WHERE s.restaurante_id = p_restaurante AND s.estado <> 'cancelado'
      AND (s.servicio = p_servicio
           OR (s.servicio = 'pack_sala' AND p_servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv'))))
  OR (p_servicio = 'comandero_pro' AND EXISTS (
    SELECT 1 FROM public.restaurantes r WHERE r.id = p_restaurante AND r.nivel_diseno = 'signature'));
$$;

-- La prueba «todo incluido» incluye Comandero Pro (sobre la versión de 0035)
CREATE OR REPLACE FUNCTION dk.admin_regalar_todo(p_restaurante uuid, p_dias int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE s text;
BEGIN
  PERFORM dk.exigir_admin();
  IF p_dias IS NOT NULL AND (p_dias < 1 OR p_dias > 120) THEN
    RAISE EXCEPTION 'la prueba debe durar entre 1 y 120 días' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes
     SET plan = 'ampliado', estado_acceso = 'activo', pago_fallido_desde = NULL,
         prueba_hasta = CASE WHEN p_dias IS NULL THEN NULL ELSE current_date + p_dias END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  FOREACH s IN ARRAY ARRAY['idiomas', 'pack_sala', 'comandero_pro'] LOOP
    INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen)
    VALUES (p_restaurante, s, 'regalo') ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.regalar_todo', jsonb_build_object('dias', p_dias), p_restaurante);
END;
$$;

-- Las pruebas ya abiertas también lo reciben (y «Quedarme con todo» lo sumará)
INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen)
SELECT r.id, 'comandero_pro', 'regalo' FROM public.restaurantes r
 WHERE r.prueba_hasta IS NOT NULL AND r.prueba_hasta >= current_date
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 2. Datos: cuentas por mesa y líneas con precio del servidor
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.cuentas_mesa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  mesa text NOT NULL CHECK (mesa ~ '^[A-Za-z0-9-]{1,12}$'),
  comensales smallint CHECK (comensales BETWEEN 1 AND 99),
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada', 'anulada')),
  abierta_en timestamptz NOT NULL DEFAULT now(),
  abierta_por uuid REFERENCES public.camareros(id) ON DELETE SET NULL,
  cerrada_en timestamptz,
  cerrada_por_camarero uuid REFERENCES public.camareros(id) ON DELETE SET NULL,
  cerrada_por uuid,                       -- identidad del encargado (si cerró él)
  motivo_anulacion text CHECK (motivo_anulacion IS NULL OR char_length(btrim(motivo_anulacion)) BETWEEN 3 AND 200),
  CHECK ((estado = 'abierta') = (cerrada_en IS NULL)),
  CHECK (estado <> 'anulada' OR motivo_anulacion IS NOT NULL)
);
-- Como máximo una cuenta abierta por mesa
CREATE UNIQUE INDEX IF NOT EXISTS cuentas_mesa_una_abierta ON public.cuentas_mesa (restaurante_id, mesa) WHERE estado = 'abierta';
CREATE INDEX IF NOT EXISTS cuentas_mesa_fecha_idx ON public.cuentas_mesa (restaurante_id, abierta_en DESC);

ALTER TABLE public.registros_sala
  ADD COLUMN IF NOT EXISTS cuenta_id uuid REFERENCES public.cuentas_mesa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revisado_en timestamptz;   -- el encargado la pasó a mano (sin TPV)
CREATE INDEX IF NOT EXISTS registros_sala_cuenta_idx ON public.registros_sala (cuenta_id);

CREATE TABLE IF NOT EXISTS public.lineas_cuenta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id uuid NOT NULL REFERENCES public.cuentas_mesa(id) ON DELETE CASCADE,
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  registro_id uuid REFERENCES public.registros_sala(id) ON DELETE SET NULL,
  plato_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  cantidad smallint NOT NULL CHECK (cantidad BETWEEN 1 AND 50),
  precio_unitario numeric(10,2) NOT NULL CHECK (precio_unitario >= 0),   -- lo fija el servidor (dk.precio_vigente)
  nota text NOT NULL DEFAULT '',
  camarero_id uuid REFERENCES public.camareros(id) ON DELETE SET NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  anulada_en timestamptz,
  anulada_por uuid,                       -- identidad del encargado; el camarero no anula
  motivo_anulacion text CHECK (motivo_anulacion IS NULL OR char_length(btrim(motivo_anulacion)) BETWEEN 3 AND 200),
  CHECK ((anulada_en IS NULL) = (motivo_anulacion IS NULL))
);
CREATE INDEX IF NOT EXISTS lineas_cuenta_cuenta_idx ON public.lineas_cuenta (cuenta_id);
CREATE INDEX IF NOT EXISTS lineas_cuenta_fecha_idx ON public.lineas_cuenta (restaurante_id, creada_en DESC);

-- Solo lectura para el dueño; toda escritura pasa por funciones SECURITY DEFINER
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cuentas_mesa', 'lineas_cuenta'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, dk_anon, dk_app', t);
    EXECUTE format('GRANT SELECT ON public.%I TO dk_auth', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS cuenta_del_propietario ON public.cuentas_mesa;
CREATE POLICY cuenta_del_propietario ON public.cuentas_mesa FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin());
DROP POLICY IF EXISTS linea_del_propietario ON public.lineas_cuenta;
CREATE POLICY linea_del_propietario ON public.lineas_cuenta FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin());

-- =====================================================================
-- 3. Piezas comunes
-- =====================================================================
-- Fecha de hoy en el local (todo el comandero cuenta por día de Madrid)
CREATE OR REPLACE FUNCTION dk.hoy_madrid() RETURNS date
LANGUAGE sql STABLE SET search_path TO pg_catalog AS $$ SELECT (now() AT TIME ZONE 'Europe/Madrid')::date $$;

-- Restaurante del encargado (dueño con sesión) con App de sala; si no, error
CREATE OR REPLACE FUNCTION dk.comandero_restaurante_propio()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  SELECT id INTO v_rest FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF v_rest IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF NOT dk.tiene_servicio(v_rest, 'app_sala') THEN
    RAISE EXCEPTION 'El comandero es parte de la App de sala.' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_rest;
END;
$$;

-- Camarero válido por su token (o NULL)
CREATE OR REPLACE FUNCTION dk.comandero_camarero(p_token_hash text)
RETURNS public.camareros LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT c.* FROM public.camareros c
    JOIN public.restaurantes r ON r.id = c.restaurante_id AND r.activo AND r.estado_acceso IN ('activo', 'gracia')
   WHERE c.token_hash = p_token_hash AND c.activo AND dk.tiene_servicio(c.restaurante_id, 'app_sala');
$$;

-- Cuenta completa (precuenta en pantalla): líneas, rondas, importe y minutos
CREATE OR REPLACE FUNCTION dk.comandero_cuenta_json(p_cuenta uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT jsonb_build_object(
    'id', k.id, 'mesa', k.mesa, 'comensales', k.comensales, 'estado', k.estado,
    'abierta_en', k.abierta_en, 'cerrada_en', k.cerrada_en, 'motivo_anulacion', k.motivo_anulacion,
    'minutos', (extract(epoch FROM (coalesce(k.cerrada_en, now()) - k.abierta_en)) / 60)::int,
    'abierta_por', (SELECT c.nombre FROM public.camareros c WHERE c.id = k.abierta_por),
    'importe', (SELECT coalesce(sum(l.cantidad * l.precio_unitario), 0) FROM public.lineas_cuenta l
                 WHERE l.cuenta_id = k.id AND l.anulada_en IS NULL),
    'lineas', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'id', l.id, 'registro_id', l.registro_id, 'plato_id', l.plato_id, 'nombre', l.nombre,
                 'cantidad', l.cantidad, 'precio', l.precio_unitario, 'nota', l.nota, 'creada_en', l.creada_en,
                 'camarero', (SELECT c.nombre FROM public.camareros c WHERE c.id = l.camarero_id),
                 'anulada', l.anulada_en IS NOT NULL, 'motivo_anulacion', l.motivo_anulacion) ORDER BY l.creada_en, l.nombre), '[]')
               FROM public.lineas_cuenta l WHERE l.cuenta_id = k.id),
    'rondas', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'id', s.id, 'estado', s.estado, 'creado_en', s.creado_en, 'revisado_en', s.revisado_en,
                 'camarero', (SELECT c.nombre FROM public.camareros c WHERE c.id = s.camarero_id)) ORDER BY s.creado_en), '[]')
               FROM public.registros_sala s WHERE s.cuenta_id = k.id),
    'aviso', 'Documento no válido como factura')
  FROM public.cuentas_mesa k WHERE k.id = p_cuenta;
$$;

-- =====================================================================
-- 4. Camarero (app de sala, acceso por token): abrir, añadir ronda, ver, cerrar
-- =====================================================================
CREATE OR REPLACE FUNCTION dk.sala_abrir_cuenta(p_token_hash text, p_mesa text, p_comensales int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros; v_id uuid;
BEGIN
  v_cam := dk.comandero_camarero(p_token_hash);
  IF v_cam.id IS NULL OR p_mesa !~ '^[A-Za-z0-9-]{1,12}$' THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM public.cuentas_mesa
   WHERE restaurante_id = v_cam.restaurante_id AND mesa = p_mesa AND estado = 'abierta';
  IF v_id IS NOT NULL THEN
    IF p_comensales BETWEEN 1 AND 99 THEN UPDATE public.cuentas_mesa SET comensales = p_comensales WHERE id = v_id; END IF;
    RETURN v_id;
  END IF;
  INSERT INTO public.cuentas_mesa (restaurante_id, mesa, comensales, abierta_por)
  VALUES (v_cam.restaurante_id, p_mesa, CASE WHEN p_comensales BETWEEN 1 AND 99 THEN p_comensales END, v_cam.id)
  ON CONFLICT (restaurante_id, mesa) WHERE estado = 'abierta' DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN   -- otro camarero la abrió a la vez
    SELECT id INTO v_id FROM public.cuentas_mesa
     WHERE restaurante_id = v_cam.restaurante_id AND mesa = p_mesa AND estado = 'abierta';
  END IF;
  UPDATE public.mesas SET camarero_id = v_cam.id
   WHERE restaurante_id = v_cam.restaurante_id AND numero = p_mesa AND camarero_id IS NULL;
  RETURN v_id;
END;
$$;

-- Registrar una ronda: solo platos de su carta; el PRECIO lo pone el servidor.
-- Si la mesa no tenía cuenta abierta, se abre. Mantiene la firma y el contrato de 0028.
CREATE OR REPLACE FUNCTION dk.sala_registrar(p_token_hash text, p_mesa text, p_lineas jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros; v_id uuid; v_cuenta uuid; v_lineas jsonb;
BEGIN
  v_cam := dk.comandero_camarero(p_token_hash);
  IF v_cam.id IS NULL THEN RETURN NULL; END IF;
  IF p_mesa !~ '^[A-Za-z0-9-]{1,12}$' OR jsonb_typeof(p_lineas) <> 'array'
     OR jsonb_array_length(p_lineas) NOT BETWEEN 1 AND 60 THEN RETURN NULL; END IF;
  SELECT jsonb_agg(jsonb_build_object('plato_id', i.id, 'nombre', i.nombre,
           'cantidad', least(50, greatest(1, (l->>'cantidad')::int)),
           'nota', left(coalesce(l->>'nota', ''), 120),
           'precio', dk.precio_vigente(i)))
    INTO v_lineas
    FROM jsonb_array_elements(p_lineas) l
    JOIN public.menu_items i ON i.id = (l->>'plato_id')::uuid AND i.restaurante_id = v_cam.restaurante_id;
  IF v_lineas IS NULL THEN RETURN NULL; END IF;
  v_cuenta := dk.sala_abrir_cuenta(p_token_hash, p_mesa, NULL);
  INSERT INTO public.registros_sala (restaurante_id, mesa, camarero_id, lineas, cuenta_id)
  VALUES (v_cam.restaurante_id, p_mesa, v_cam.id, v_lineas, v_cuenta) RETURNING id INTO v_id;
  INSERT INTO public.lineas_cuenta (cuenta_id, restaurante_id, registro_id, plato_id, nombre, cantidad, precio_unitario, nota, camarero_id)
  SELECT v_cuenta, v_cam.restaurante_id, v_id, (x->>'plato_id')::uuid, x->>'nombre', (x->>'cantidad')::smallint,
         (x->>'precio')::numeric, x->>'nota', v_cam.id
    FROM jsonb_array_elements(v_lineas) x;
  -- Las rondas de una cuenta se conservan igual que la cuenta (los informes deben cuadrar);
  -- solo se purgan a los 180 días las antiguas sin cuenta (anteriores al comandero).
  DELETE FROM public.registros_sala WHERE restaurante_id = v_cam.restaurante_id AND cuenta_id IS NULL
     AND creado_en < now() - interval '180 days';
  RETURN v_id;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$$;

-- Cuenta abierta de una mesa para el camarero (NULL si no hay)
CREATE OR REPLACE FUNCTION dk.sala_cuenta(p_token_hash text, p_mesa text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros; v_id uuid;
BEGIN
  v_cam := dk.comandero_camarero(p_token_hash);
  IF v_cam.id IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM public.cuentas_mesa
   WHERE restaurante_id = v_cam.restaurante_id AND mesa = p_mesa AND estado = 'abierta';
  IF v_id IS NULL THEN RETURN NULL; END IF;
  RETURN dk.comandero_cuenta_json(v_id);
END;
$$;

-- Cerrar mesa = «cobrada fuera» (en el TPV del local). No genera ticket ni número.
CREATE OR REPLACE FUNCTION dk.sala_cerrar_cuenta(p_token_hash text, p_cuenta uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros;
BEGIN
  v_cam := dk.comandero_camarero(p_token_hash);
  IF v_cam.id IS NULL THEN RETURN false; END IF;
  UPDATE public.cuentas_mesa SET estado = 'cerrada', cerrada_en = now(), cerrada_por_camarero = v_cam.id
   WHERE id = p_cuenta AND restaurante_id = v_cam.restaurante_id AND estado = 'abierta';
  RETURN FOUND;
END;
$$;

-- Contexto del camarero (sobre 0028): carta con precio vigente y secciones en orden,
-- y en cada mesa su cuenta abierta (importe y minutos).
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
                'plazas', m.plazas, 'x', m.x, 'y', m.y, 'ancho', m.ancho, 'alto', m.alto, 'mia', m.camarero_id = v_cam.id,
                'camarero', (SELECT c.nombre FROM public.camareros c WHERE c.id = m.camarero_id)) ORDER BY m.zona, m.numero), '[]')
              FROM public.mesas m WHERE m.restaurante_id = v_rest.id),
    'elementos', (SELECT coalesce(jsonb_agg(jsonb_build_object('tipo', e.tipo, 'x', e.x, 'y', e.y, 'ancho', e.ancho, 'alto', e.alto,
                'etiqueta', e.etiqueta, 'color', e.color, 'mia', e.camarero_id = v_cam.id)), '[]')
              FROM public.elementos_plano e WHERE e.restaurante_id = v_rest.id),
    'llamadas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'mesa', l.mesa, 'motivo', l.motivo, 'creada_en', l.creada_en)
                ORDER BY l.creada_en), '[]')
              FROM public.llamadas_camarero l WHERE l.restaurante_id = v_rest.id AND l.atendida_en IS NULL
                AND l.creada_en > now() - interval '3 hours'),
    'cuentas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'mesa', k.mesa, 'comensales', k.comensales,
                'minutos', (extract(epoch FROM (now() - k.abierta_en)) / 60)::int,
                'importe', (SELECT coalesce(sum(l.cantidad * l.precio_unitario), 0) FROM public.lineas_cuenta l
                             WHERE l.cuenta_id = k.id AND l.anulada_en IS NULL))), '[]')
              FROM public.cuentas_mesa k WHERE k.restaurante_id = v_rest.id AND k.estado = 'abierta'),
    'secciones', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre) ORDER BY s.orden, s.nombre), '[]')
              FROM public.menu_secciones s WHERE s.restaurante_id = v_rest.id),
    'carta', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'nombre', i.nombre, 'precio', dk.precio_vigente(i),
                'seccion_id', i.seccion_id,
                'seccion', (SELECT s.nombre FROM public.menu_secciones s WHERE s.id = i.seccion_id)) ORDER BY i.orden, i.nombre), '[]')
              FROM public.menu_items i WHERE i.restaurante_id = v_rest.id AND i.disponible)
  );
END;
$$;

-- =====================================================================
-- 5. Encargado (panel → Sala → Mesas en vivo; sondeo cada 10 s)
-- =====================================================================
CREATE OR REPLACE FUNCTION dk.mesas_en_vivo()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  RETURN jsonb_build_object(
    'tpv', dk.tiene_servicio(v_rest, 'conexion_tpv'),
    'pro', dk.tiene_servicio(v_rest, 'comandero_pro'),
    'mesas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'numero', m.numero, 'zona', m.zona, 'forma', m.forma,
                'plazas', m.plazas, 'x', m.x, 'y', m.y, 'ancho', m.ancho, 'alto', m.alto,
                'camarero', (SELECT c.nombre FROM public.camareros c WHERE c.id = m.camarero_id)) ORDER BY m.zona, m.numero), '[]')
              FROM public.mesas m WHERE m.restaurante_id = v_rest),
    'cuentas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'mesa', k.mesa, 'comensales', k.comensales,
                'abierta_en', k.abierta_en, 'minutos', (extract(epoch FROM (now() - k.abierta_en)) / 60)::int,
                'abierta_por', (SELECT c.nombre FROM public.camareros c WHERE c.id = k.abierta_por),
                'importe', (SELECT coalesce(sum(l.cantidad * l.precio_unitario), 0) FROM public.lineas_cuenta l
                             WHERE l.cuenta_id = k.id AND l.anulada_en IS NULL),
                'rondas', (SELECT count(*) FROM public.registros_sala s WHERE s.cuenta_id = k.id)) ORDER BY k.abierta_en), '[]')
              FROM public.cuentas_mesa k WHERE k.restaurante_id = v_rest AND k.estado = 'abierta'),
    -- Rondas que el encargado tiene que pasar a mano: sin TPV, o el TPV falló. Últimas 12 h.
    'rondas_entrantes', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'mesa', s.mesa, 'cuenta_id', s.cuenta_id,
                'lineas', s.lineas, 'estado', s.estado, 'creado_en', s.creado_en, 'detalle_tpv', s.detalle_tpv,
                'camarero', (SELECT c.nombre FROM public.camareros c WHERE c.id = s.camarero_id)) ORDER BY s.creado_en), '[]')
              FROM public.registros_sala s
             WHERE s.restaurante_id = v_rest AND s.revisado_en IS NULL AND s.estado <> 'enviado_tpv'
               AND s.creado_en > now() - interval '12 hours')
  );
END;
$$;

CREATE OR REPLACE FUNCTION dk.cuenta_detalle(p_cuenta uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  IF NOT EXISTS (SELECT 1 FROM public.cuentas_mesa WHERE id = p_cuenta AND restaurante_id = v_rest) THEN RETURN NULL; END IF;
  RETURN dk.comandero_cuenta_json(p_cuenta);
END;
$$;

-- El encargado marca una ronda como pasada (cuando no hay TPV o falló)
CREATE OR REPLACE FUNCTION dk.ronda_revisada(p_registro uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  UPDATE public.registros_sala SET revisado_en = now()
   WHERE id = p_registro AND restaurante_id = v_rest AND revisado_en IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION dk.cerrar_cuenta(p_cuenta uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  UPDATE public.cuentas_mesa SET estado = 'cerrada', cerrada_en = now(), cerrada_por = dk.identidad_actual()
   WHERE id = p_cuenta AND restaurante_id = v_rest AND estado = 'abierta';
  RETURN FOUND;
END;
$$;

-- Anular una línea (solo el encargado): se marca con motivo y quién; nunca se borra
CREATE OR REPLACE FUNCTION dk.anular_linea(p_linea uuid, p_motivo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_l public.lineas_cuenta;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  IF char_length(btrim(coalesce(p_motivo, ''))) NOT BETWEEN 3 AND 200 THEN
    RAISE EXCEPTION 'Indica un motivo (de 3 a 200 caracteres).' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.lineas_cuenta l SET anulada_en = now(), anulada_por = dk.identidad_actual(), motivo_anulacion = btrim(p_motivo)
    FROM public.cuentas_mesa k
   WHERE l.id = p_linea AND l.restaurante_id = v_rest AND l.anulada_en IS NULL
     AND k.id = l.cuenta_id AND k.estado = 'abierta'
  RETURNING l.* INTO v_l;
  IF v_l.id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'comandero.anular_linea',
          jsonb_build_object('linea', v_l.id, 'cuenta', v_l.cuenta_id, 'plato', v_l.nombre, 'cantidad', v_l.cantidad,
                             'importe', v_l.cantidad * v_l.precio_unitario, 'motivo', v_l.motivo_anulacion), v_rest);
  RETURN true;
END;
$$;

-- Anular una cuenta entera (abierta por error): también con motivo, sin borrar
CREATE OR REPLACE FUNCTION dk.anular_cuenta(p_cuenta uuid, p_motivo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  IF char_length(btrim(coalesce(p_motivo, ''))) NOT BETWEEN 3 AND 200 THEN
    RAISE EXCEPTION 'Indica un motivo (de 3 a 200 caracteres).' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.cuentas_mesa SET estado = 'anulada', cerrada_en = now(), cerrada_por = dk.identidad_actual(),
         motivo_anulacion = btrim(p_motivo)
   WHERE id = p_cuenta AND restaurante_id = v_rest AND estado = 'abierta';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'comandero.anular_cuenta', jsonb_build_object('cuenta', p_cuenta, 'motivo', btrim(p_motivo)), v_rest);
  RETURN true;
END;
$$;

-- =====================================================================
-- 6. Informes («Resumen de sala (no fiscal)»). Sin Pro: solo HOY.
-- =====================================================================
-- Valida el rango: sin Comandero Pro solo se permite el día de hoy; con Pro, hasta 366 días.
CREATE OR REPLACE FUNCTION dk.comandero_rango(p_rest uuid, p_desde date, p_hasta date)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta OR p_hasta - p_desde > 366 THEN
    RAISE EXCEPTION 'Rango de fechas no válido (máximo un año).' USING ERRCODE = '22023';
  END IF;
  IF NOT dk.tiene_servicio(p_rest, 'comandero_pro') AND (p_desde <> dk.hoy_madrid() OR p_hasta <> dk.hoy_madrid()) THEN
    RAISE EXCEPTION 'El histórico es de Comandero Pro.' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION dk.resumen_sala(p_desde date, p_hasta date, p_mesa text DEFAULT NULL, p_camarero uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_pro boolean;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  PERFORM dk.comandero_rango(v_rest, p_desde, p_hasta);
  v_pro := dk.tiene_servicio(v_rest, 'comandero_pro');
  RETURN (
    WITH k AS (
      SELECT c.*, (SELECT coalesce(sum(l.cantidad * l.precio_unitario), 0) FROM public.lineas_cuenta l
                    WHERE l.cuenta_id = c.id AND l.anulada_en IS NULL) AS importe
        FROM public.cuentas_mesa c
       WHERE c.restaurante_id = v_rest
         AND (c.abierta_en AT TIME ZONE 'Europe/Madrid')::date BETWEEN p_desde AND p_hasta
         AND (p_mesa IS NULL OR c.mesa = p_mesa)
         AND (p_camarero IS NULL OR c.abierta_por = p_camarero)
    ), cerradas AS (SELECT * FROM k WHERE estado = 'cerrada'),
    an AS (
      SELECT l.* FROM public.lineas_cuenta l JOIN k ON k.id = l.cuenta_id WHERE l.anulada_en IS NOT NULL
    )
    SELECT jsonb_build_object(
      'aviso', 'Resumen de sala (no fiscal). Documento no válido como factura.',
      'desde', p_desde, 'hasta', p_hasta, 'pro', v_pro,
      'cuentas_cerradas', (SELECT count(*) FROM cerradas),
      'cuentas_abiertas', (SELECT count(*) FROM k WHERE estado = 'abierta'),
      'cuentas_anuladas', (SELECT count(*) FROM k WHERE estado = 'anulada'),
      'importe', (SELECT coalesce(sum(importe), 0) FROM cerradas),
      'comensales', (SELECT coalesce(sum(comensales), 0) FROM cerradas),
      'importe_medio', (SELECT coalesce(round(avg(importe), 2), 0) FROM cerradas),
      'minutos_medios', (SELECT coalesce(round(avg(extract(epoch FROM (cerrada_en - abierta_en)) / 60)), 0) FROM cerradas),
      'lineas_anuladas', (SELECT count(*) FROM an),
      'importe_anulado', (SELECT coalesce(sum(cantidad * precio_unitario), 0) FROM an),
      'por_mesa', (SELECT coalesce(jsonb_agg(x ORDER BY x->>'mesa'), '[]') FROM (
          SELECT jsonb_build_object('mesa', mesa, 'cuentas', count(*), 'importe', sum(importe)) x
            FROM cerradas GROUP BY mesa) t),
      'ranking_camareros', CASE WHEN v_pro THEN (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'importe')::numeric DESC), '[]') FROM (
          SELECT jsonb_build_object('camarero_id', c.id, 'nombre', coalesce(c.nombre, 'Encargado / sin camarero'),
                   'cuentas', count(*), 'importe', sum(cerradas.importe), 'comensales', coalesce(sum(cerradas.comensales), 0)) x
            FROM cerradas LEFT JOIN public.camareros c ON c.id = cerradas.abierta_por
           GROUP BY c.id, c.nombre) t) END
    ));
END;
$$;

-- Filas de cuentas para la descarga CSV/Excel (Pro, o solo hoy)
CREATE OR REPLACE FUNCTION dk.informe_cuentas(p_desde date, p_hasta date, p_mesa text DEFAULT NULL, p_camarero uuid DEFAULT NULL)
RETURNS TABLE (fecha date, mesa text, abierta_en timestamptz, cerrada_en timestamptz, minutos int, estado text,
               comensales smallint, camarero_apertura text, camarero_cierre text, rondas bigint, lineas bigint,
               importe numeric, importe_anulado numeric, motivo_anulacion text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  PERFORM dk.comandero_rango(v_rest, p_desde, p_hasta);
  RETURN QUERY
  SELECT (k.abierta_en AT TIME ZONE 'Europe/Madrid')::date, k.mesa, k.abierta_en, k.cerrada_en,
         (extract(epoch FROM (coalesce(k.cerrada_en, now()) - k.abierta_en)) / 60)::int, k.estado, k.comensales,
         (SELECT c.nombre FROM public.camareros c WHERE c.id = k.abierta_por),
         CASE WHEN k.cerrada_por_camarero IS NOT NULL THEN (SELECT c.nombre FROM public.camareros c WHERE c.id = k.cerrada_por_camarero)
              WHEN k.cerrada_por IS NOT NULL THEN 'Encargado' END,
         (SELECT count(*) FROM public.registros_sala s WHERE s.cuenta_id = k.id),
         (SELECT count(*) FROM public.lineas_cuenta l WHERE l.cuenta_id = k.id AND l.anulada_en IS NULL),
         (SELECT coalesce(sum(l.cantidad * l.precio_unitario), 0) FROM public.lineas_cuenta l WHERE l.cuenta_id = k.id AND l.anulada_en IS NULL),
         (SELECT coalesce(sum(l.cantidad * l.precio_unitario), 0) FROM public.lineas_cuenta l WHERE l.cuenta_id = k.id AND l.anulada_en IS NOT NULL),
         k.motivo_anulacion
    FROM public.cuentas_mesa k
   WHERE k.restaurante_id = v_rest
     AND (k.abierta_en AT TIME ZONE 'Europe/Madrid')::date BETWEEN p_desde AND p_hasta
     AND (p_mesa IS NULL OR k.mesa = p_mesa)
     AND (p_camarero IS NULL OR k.abierta_por = p_camarero)
   ORDER BY k.abierta_en;
END;
$$;

-- Informe de anulaciones (solo Pro): líneas y cuentas anuladas, con motivo
CREATE OR REPLACE FUNCTION dk.informe_anulaciones(p_desde date, p_hasta date)
RETURNS TABLE (anulada_en timestamptz, tipo text, mesa text, plato text, cantidad smallint, importe numeric,
               camarero text, motivo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  IF NOT dk.tiene_servicio(v_rest, 'comandero_pro') THEN
    RAISE EXCEPTION 'El informe de anulaciones es de Comandero Pro.' USING ERRCODE = 'P0001';
  END IF;
  PERFORM dk.comandero_rango(v_rest, p_desde, p_hasta);
  RETURN QUERY
  SELECT * FROM (
    SELECT l.anulada_en, 'linea'::text, k.mesa, l.nombre, l.cantidad, l.cantidad * l.precio_unitario,
           (SELECT c.nombre FROM public.camareros c WHERE c.id = l.camarero_id), l.motivo_anulacion
      FROM public.lineas_cuenta l JOIN public.cuentas_mesa k ON k.id = l.cuenta_id
     WHERE l.restaurante_id = v_rest AND l.anulada_en IS NOT NULL
       AND (l.anulada_en AT TIME ZONE 'Europe/Madrid')::date BETWEEN p_desde AND p_hasta
    UNION ALL
    SELECT k.cerrada_en, 'cuenta'::text, k.mesa, NULL, NULL,
           (SELECT coalesce(sum(l.cantidad * l.precio_unitario), 0) FROM public.lineas_cuenta l WHERE l.cuenta_id = k.id AND l.anulada_en IS NULL),
           (SELECT c.nombre FROM public.camareros c WHERE c.id = k.abierta_por), k.motivo_anulacion
      FROM public.cuentas_mesa k
     WHERE k.restaurante_id = v_rest AND k.estado = 'anulada'
       AND (k.cerrada_en AT TIME ZONE 'Europe/Madrid')::date BETWEEN p_desde AND p_hasta
  ) t ORDER BY 1;
END;
$$;

-- =====================================================================
-- 7. Permisos de las funciones
-- =====================================================================
DO $$
DECLARE f text;
BEGIN
  -- internas: nadie las llama directamente
  FOREACH f IN ARRAY ARRAY['dk.comandero_restaurante_propio()', 'dk.comandero_camarero(text)', 'dk.comandero_cuenta_json(uuid)',
                           'dk.comandero_rango(uuid,date,date)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
  END LOOP;
  -- app de sala (anónimo con token de camarero)
  FOREACH f IN ARRAY ARRAY['dk.sala_abrir_cuenta(text,text,integer)', 'dk.sala_registrar(text,text,jsonb)',
                           'dk.sala_cuenta(text,text)', 'dk.sala_cerrar_cuenta(text,uuid)', 'dk.sala_contexto(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_anon', f);
  END LOOP;
  -- panel del encargado (sesión del dueño)
  FOREACH f IN ARRAY ARRAY['dk.mesas_en_vivo()', 'dk.cuenta_detalle(uuid)', 'dk.ronda_revisada(uuid)', 'dk.cerrar_cuenta(uuid)',
                           'dk.anular_linea(uuid,text)', 'dk.anular_cuenta(uuid,text)',
                           'dk.resumen_sala(date,date,text,uuid)', 'dk.informe_cuentas(date,date,text,uuid)',
                           'dk.informe_anulaciones(date,date)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_auth', f);
  END LOOP;
  EXECUTE 'GRANT EXECUTE ON FUNCTION dk.hoy_madrid() TO dk_auth, dk_anon';
END $$;
