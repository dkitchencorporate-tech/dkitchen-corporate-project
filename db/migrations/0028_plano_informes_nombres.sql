-- 0028 — Escalera comercial aprobada, plano de sala completo e informes por camarero (29/09/2026)
--
-- Nombres y precios aprobados por karc0:
--   Puesta a punto (antes Setup Esencial) 49 € · Carta de Autor 280 → 199 € · Idiomas 29 €
--   Plano de mesas 24 €/mes · App de sala 49 €/mes (con informes) · Conexión TPV 59 €/mes
--   Pack Sala 119 €/mes (sueltos 132 €) · DKitchen Signature = Núcleo Operativo
-- Idiomas: servicio HECHO POR DKITCHEN (el cliente elige idiomas; traduce DKitchen).

BEGIN;

-- 1. Catálogo
UPDATE public.catalogo_servicios SET nombre = 'Puesta a punto', precio_centimos = 4900, precio_ancla_centimos = NULL WHERE servicio = 'setup_esencial';
UPDATE public.catalogo_servicios SET nombre = 'Carta de Autor' WHERE servicio = 'setup_experto';
UPDATE public.catalogo_servicios SET nombre = 'Idiomas (hasta 3, traducidos por DKitchen)' WHERE servicio = 'idiomas';
UPDATE public.catalogo_servicios SET precio_centimos = 4900 WHERE servicio = 'app_sala';
UPDATE public.catalogo_servicios SET precio_centimos = 5900 WHERE servicio = 'conexion_tpv';
UPDATE public.catalogo_servicios SET precio_centimos = 11900, precio_ancla_centimos = 13200 WHERE servicio = 'pack_sala';

-- 2. Idiomas: solo DKitchen escribe traducciones (el cliente las ve)
DROP POLICY IF EXISTS traduccion_del_propietario ON public.traducciones;
CREATE POLICY traduccion_lectura ON public.traducciones FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin());
CREATE POLICY traduccion_escritura_admin ON public.traducciones FOR ALL TO dk_auth
  USING (dk.es_admin()) WITH CHECK (dk.es_admin());

-- 3. Plano de sala: paredes, divisiones, barra, puertas y zonas (con camarero)
CREATE TABLE IF NOT EXISTS public.elementos_plano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('pared', 'division', 'barra', 'puerta', 'zona')),
  x numeric(5,2) NOT NULL CHECK (x BETWEEN 0 AND 100),
  y numeric(5,2) NOT NULL CHECK (y BETWEEN 0 AND 100),
  ancho numeric(5,2) NOT NULL CHECK (ancho BETWEEN 0.5 AND 100),
  alto numeric(5,2) NOT NULL CHECK (alto BETWEEN 0.5 AND 100),
  etiqueta text CHECK (etiqueta IS NULL OR char_length(etiqueta) <= 30),
  color text CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$'),
  camarero_id uuid REFERENCES public.camareros(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS elementos_plano_idx ON public.elementos_plano (restaurante_id);
ALTER TABLE public.elementos_plano ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elementos_plano FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.elementos_plano FROM PUBLIC, dk_anon, dk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elementos_plano TO dk_auth;
CREATE POLICY elemento_del_propietario ON public.elementos_plano FOR ALL TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin())
  WITH CHECK (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual())
              AND dk.tiene_servicio(restaurante_id, 'plano_mesas'));
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS ancho numeric(5,2) NOT NULL DEFAULT 7 CHECK (ancho BETWEEN 2 AND 40);
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS alto numeric(5,2) NOT NULL DEFAULT 10 CHECK (alto BETWEEN 2 AND 40);

-- 4. Informes: quién atendió cada llamada y cuándo
ALTER TABLE public.llamadas_camarero ADD COLUMN IF NOT EXISTS atendida_por uuid REFERENCES public.camareros(id) ON DELETE SET NULL;

-- Atender: registra quién, y si la mesa no tenía camarero, se la autoasigna
CREATE OR REPLACE FUNCTION dk.sala_atender(p_token_hash text, p_llamada uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros%ROWTYPE; v_mesa text;
BEGIN
  SELECT * INTO v_cam FROM public.camareros WHERE token_hash = p_token_hash AND activo;
  IF NOT FOUND OR NOT dk.tiene_servicio(v_cam.restaurante_id, 'app_sala') THEN RETURN false; END IF;
  UPDATE public.llamadas_camarero SET atendida_en = now(), atendida_por = v_cam.id
   WHERE id = p_llamada AND restaurante_id = v_cam.restaurante_id AND atendida_en IS NULL
  RETURNING mesa INTO v_mesa;
  IF v_mesa IS NULL THEN RETURN false; END IF;
  UPDATE public.mesas SET camarero_id = v_cam.id
   WHERE restaurante_id = v_cam.restaurante_id AND numero = v_mesa AND camarero_id IS NULL;
  RETURN true;
END;
$$;

-- Los registros de sala se conservan 180 días para los informes (sin importes)
CREATE OR REPLACE FUNCTION dk.sala_registrar(p_token_hash text, p_mesa text, p_lineas jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros%ROWTYPE; v_id uuid; v_lineas jsonb;
BEGIN
  SELECT * INTO v_cam FROM public.camareros WHERE token_hash = p_token_hash AND activo;
  IF NOT FOUND OR NOT dk.tiene_servicio(v_cam.restaurante_id, 'app_sala') THEN RETURN NULL; END IF;
  IF p_mesa !~ '^[A-Za-z0-9-]{1,12}$' OR jsonb_typeof(p_lineas) <> 'array' THEN RETURN NULL; END IF;
  SELECT jsonb_agg(jsonb_build_object('plato_id', i.id, 'nombre', i.nombre,
           'cantidad', least(50, greatest(1, (l->>'cantidad')::int)),
           'nota', left(coalesce(l->>'nota', ''), 120)))
    INTO v_lineas
    FROM jsonb_array_elements(p_lineas) l
    JOIN public.menu_items i ON i.id = (l->>'plato_id')::uuid AND i.restaurante_id = v_cam.restaurante_id;
  IF v_lineas IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.registros_sala (restaurante_id, mesa, camarero_id, lineas)
  VALUES (v_cam.restaurante_id, p_mesa, v_cam.id, v_lineas) RETURNING id INTO v_id;
  -- La mesa que registra pasa a ser suya si no tenía camarero
  UPDATE public.mesas SET camarero_id = v_cam.id
   WHERE restaurante_id = v_cam.restaurante_id AND numero = p_mesa AND camarero_id IS NULL;
  DELETE FROM public.registros_sala WHERE restaurante_id = v_cam.restaurante_id AND creado_en < now() - interval '180 days';
  RETURN v_id;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$$;

-- Informe por camarero para el dueño (desde una fecha): comandas, líneas, mesas, llamadas, respuesta media
CREATE OR REPLACE FUNCTION dk.informe_camareros(p_desde date)
RETURNS TABLE (camarero_id uuid, nombre text, comandas bigint, lineas bigint, mesas bigint, llamadas_atendidas bigint, respuesta_media_seg integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH r AS (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual())
  SELECT c.id, c.nombre,
    (SELECT count(*) FROM public.registros_sala s WHERE s.camarero_id = c.id AND s.creado_en >= p_desde),
    (SELECT coalesce(sum((SELECT sum((l->>'cantidad')::int) FROM jsonb_array_elements(s.lineas) l)), 0)
       FROM public.registros_sala s WHERE s.camarero_id = c.id AND s.creado_en >= p_desde)::bigint,
    (SELECT count(DISTINCT s.mesa) FROM public.registros_sala s WHERE s.camarero_id = c.id AND s.creado_en >= p_desde),
    (SELECT count(*) FROM public.llamadas_camarero l WHERE l.atendida_por = c.id AND l.creada_en >= p_desde),
    (SELECT avg(extract(epoch FROM (l.atendida_en - l.creada_en)))::int FROM public.llamadas_camarero l
      WHERE l.atendida_por = c.id AND l.creada_en >= p_desde)
  FROM public.camareros c JOIN r ON r.id = c.restaurante_id
  ORDER BY 3 DESC;
$$;
REVOKE ALL ON FUNCTION dk.informe_camareros(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.informe_camareros(date) TO dk_auth;

-- Contexto del camarero: añade elementos del plano y tamaño de mesas
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
    'carta', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'nombre', i.nombre,
                'seccion', (SELECT s.nombre FROM public.menu_secciones s WHERE s.id = i.seccion_id)) ORDER BY i.orden, i.nombre), '[]')
              FROM public.menu_items i WHERE i.restaurante_id = v_rest.id AND i.disponible)
  );
END;
$$;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0028_plano_informes_nombres.sql');

COMMIT;
