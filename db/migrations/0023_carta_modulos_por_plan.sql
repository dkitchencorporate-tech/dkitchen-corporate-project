-- 0023 — Carta: plantillas, banner de promociones, reservas y módulos por plan (28/09/2026)
--
-- Módulos por plan, aplicados en la BASE (no solo en la interfaz):
--   Básico   (9 €):  3 plantillas · hasta 50 productos · 1 promoción activa
--   Ampliado (25 €): 3 plantillas · hasta 150 productos · promociones ilimitadas
--                    con programación · camarero · reseñas · QR por mesa ·
--                    reservas (formulario → WhatsApp + correo del negocio)

BEGIN;

-- 1. Restaurante: plantilla y WhatsApp de reservas
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS plantilla text NOT NULL DEFAULT 'clasica',
  ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_plantilla_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_plantilla_check
  CHECK (plantilla IN ('clasica', 'visual', 'express'));
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_whatsapp_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_whatsapp_check
  CHECK (whatsapp IS NULL OR whatsapp ~ '^\+?[0-9]{9,15}$');
GRANT UPDATE (plantilla, whatsapp) ON public.restaurantes TO dk_auth;
GRANT SELECT (plantilla) ON public.restaurantes TO dk_anon;
GRANT SELECT (plantilla, whatsapp) ON public.restaurantes TO dk_auth;

-- 2. Tope de productos: YA existe (trigger menu_items_tope → dk.comprobar_tope_productos, 50/150).
--    Verificado el 28/09 en rama de prueba; no se duplica.

-- 3. Promociones (banner flotante de inicio)
CREATE TABLE IF NOT EXISTS public.promociones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 60),
  texto text CHECK (texto IS NULL OR char_length(texto) <= 160),
  imagen_url text CHECK (imagen_url IS NULL OR imagen_url ~ '^https://'),
  boton_texto text CHECK (boton_texto IS NULL OR char_length(boton_texto) <= 30),
  boton_seccion uuid REFERENCES public.menu_secciones(id) ON DELETE SET NULL,
  inicio date,
  fin date,
  dias smallint[] CHECK (dias IS NULL OR dias <@ ARRAY[1,2,3,4,5,6,7]::smallint[]),
  hora_inicio time,
  hora_fin time,
  prioridad smallint NOT NULL DEFAULT 0 CHECK (prioridad BETWEEN 0 AND 9),
  activa boolean NOT NULL DEFAULT true,
  vistas integer NOT NULL DEFAULT 0,
  clics integer NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (fin IS NULL OR inicio IS NULL OR fin >= inicio)
);
CREATE INDEX IF NOT EXISTS promociones_restaurante_idx ON public.promociones (restaurante_id);
ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promociones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.promociones FROM PUBLIC, dk_anon, dk_app;
GRANT SELECT, INSERT, DELETE ON public.promociones TO dk_auth;
GRANT UPDATE (titulo, texto, imagen_url, boton_texto, boton_seccion, inicio, fin, dias, hora_inicio, hora_fin, prioridad, activa)
  ON public.promociones TO dk_auth;
DROP POLICY IF EXISTS promocion_del_propietario ON public.promociones;
CREATE POLICY promocion_del_propietario ON public.promociones FOR ALL TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()))
  WITH CHECK (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()));
DROP POLICY IF EXISTS promocion_lectura_admin ON public.promociones;
CREATE POLICY promocion_lectura_admin ON public.promociones FOR SELECT TO dk_auth USING (dk.es_admin());

-- Básico: solo 1 promoción activa
CREATE OR REPLACE FUNCTION dk.tope_promociones()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_plan text;
BEGIN
  IF NOT NEW.activa THEN RETURN NEW; END IF;
  SELECT plan INTO v_plan FROM public.restaurantes WHERE id = NEW.restaurante_id;
  IF v_plan <> 'ampliado' AND EXISTS (
    SELECT 1 FROM public.promociones
    WHERE restaurante_id = NEW.restaurante_id AND activa AND id <> NEW.id) THEN
    RAISE EXCEPTION 'Tu plan Básico permite 1 promoción activa. Desactiva la actual o pasa al plan Ampliado.' USING ERRCODE = 'P0001';
  END IF;
  IF v_plan <> 'ampliado' AND (NEW.dias IS NOT NULL OR NEW.hora_inicio IS NOT NULL OR NEW.hora_fin IS NOT NULL) THEN
    RAISE EXCEPTION 'La programación por días y horas es del plan Ampliado.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION dk.tope_promociones() FROM PUBLIC;
DROP TRIGGER IF EXISTS tope_promociones ON public.promociones;
CREATE TRIGGER tope_promociones BEFORE INSERT OR UPDATE ON public.promociones
  FOR EACH ROW EXECUTE FUNCTION dk.tope_promociones();

-- Promoción vigente para la carta pública (hora de Madrid)
CREATE OR REPLACE FUNCTION dk.promocion_vigente(p_slug text)
RETURNS TABLE (id uuid, titulo text, texto text, imagen_url text, boton_texto text, boton_seccion uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH ahora AS (SELECT (now() AT TIME ZONE 'Europe/Madrid') t)
  SELECT p.id, p.titulo, p.texto, p.imagen_url, p.boton_texto, p.boton_seccion
  FROM public.promociones p
  JOIN public.restaurantes r ON r.id = p.restaurante_id, ahora
  WHERE r.slug = lower(p_slug) AND r.activo AND r.estado_acceso IN ('activo', 'gracia')
    AND p.activa
    AND (p.inicio IS NULL OR ahora.t::date >= p.inicio)
    AND (p.fin IS NULL OR ahora.t::date <= p.fin)
    AND (p.dias IS NULL OR extract(isodow FROM ahora.t)::smallint = ANY (p.dias))
    AND (p.hora_inicio IS NULL OR ahora.t::time >= p.hora_inicio)
    AND (p.hora_fin IS NULL OR ahora.t::time <= p.hora_fin)
  ORDER BY p.prioridad DESC, p.creado_en DESC
  LIMIT 1;
$$;

-- Métrica de la promoción (vista / clic), con freno de frecuencia por clave
CREATE OR REPLACE FUNCTION dk.registrar_evento_promocion(p_promocion uuid, p_tipo text, p_clave text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF p_tipo NOT IN ('vista', 'clic') THEN RETURN; END IF;
  IF dk.limite_superado('promo:' || left(coalesce(p_clave, ''), 80) || ':' || p_promocion || ':' || p_tipo, 1, interval '30 minutes') THEN
    RETURN;
  END IF;
  UPDATE public.promociones
     SET vistas = vistas + (p_tipo = 'vista')::int, clics = clics + (p_tipo = 'clic')::int
   WHERE id = p_promocion AND activa;
END;
$$;

-- 4. Reservas (plan Ampliado): formulario → registro + aviso por correo y WhatsApp
CREATE TABLE IF NOT EXISTS public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 80),
  telefono text NOT NULL CHECK (telefono ~ '^\+?[0-9 ]{9,20}$'),
  fecha date NOT NULL,
  hora time NOT NULL,
  personas smallint NOT NULL CHECK (personas BETWEEN 1 AND 50),
  notas text CHECK (notas IS NULL OR char_length(notas) <= 300),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
  creada_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservas_restaurante_idx ON public.reservas (restaurante_id, fecha DESC);
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.reservas FROM PUBLIC, dk_anon, dk_app;
GRANT SELECT ON public.reservas TO dk_auth;
GRANT UPDATE (estado) ON public.reservas TO dk_auth;
DROP POLICY IF EXISTS reserva_del_propietario ON public.reservas;
CREATE POLICY reserva_del_propietario ON public.reservas FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()) OR dk.es_admin());
DROP POLICY IF EXISTS reserva_estado_propietario ON public.reservas;
CREATE POLICY reserva_estado_propietario ON public.reservas FOR UPDATE TO dk_auth
  USING (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()))
  WITH CHECK (restaurante_id IN (SELECT id FROM public.restaurantes WHERE propietario = dk.identidad_actual()));

-- Crear reserva desde la carta pública. Devuelve el estado + datos para avisar al negocio.
CREATE OR REPLACE FUNCTION dk.crear_reserva(
  p_slug text, p_nombre text, p_telefono text, p_fecha date, p_hora time, p_personas integer, p_notas text
) RETURNS TABLE (resultado text, reserva_id uuid, restaurante text, email_negocio text, whatsapp text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r record; v_id uuid; v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
  SELECT x.id, x.nombre, x.whatsapp, x.propietario INTO r
  FROM public.restaurantes x
  WHERE x.slug = lower(p_slug) AND x.activo AND x.plan = 'ampliado' AND x.estado_acceso IN ('activo', 'gracia');
  IF r.id IS NULL THEN RETURN QUERY SELECT 'no_disponible', NULL::uuid, NULL::text, NULL::text, NULL::text; RETURN; END IF;
  IF p_fecha IS NULL OR p_fecha < v_hoy OR p_fecha > v_hoy + 180 THEN
    RETURN QUERY SELECT 'fecha_invalida', NULL::uuid, NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservas
             WHERE restaurante_id = r.id AND telefono = btrim(p_telefono) AND creada_en > now() - interval '2 minutes') THEN
    RETURN QUERY SELECT 'duplicada', NULL::uuid, NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  INSERT INTO public.reservas (restaurante_id, nombre, telefono, fecha, hora, personas, notas)
  VALUES (r.id, btrim(p_nombre), btrim(p_telefono), p_fecha, p_hora, p_personas, nullif(btrim(p_notas), ''))
  RETURNING id INTO v_id;
  RETURN QUERY SELECT 'ok', v_id, r.nombre,
    (SELECT u.email::text FROM neon_auth."user" u WHERE u.id = r.propietario), r.whatsapp;
EXCEPTION WHEN check_violation THEN
  RETURN QUERY SELECT 'datos_invalidos', NULL::uuid, NULL::text, NULL::text, NULL::text;
END;
$$;

-- Permisos de funciones
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['dk.promocion_vigente(text)', 'dk.registrar_evento_promocion(uuid,text,text)',
                           'dk.crear_reserva(text,text,text,date,time,integer,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_anon', f);
  END LOOP;
END $$;

-- Historial (0021) también para promociones y reservas
DROP TRIGGER IF EXISTS historial_promociones ON public.promociones;
-- Solo cambios de contenido: las vistas y clics de la carta no generan historial
CREATE TRIGGER historial_promociones AFTER INSERT OR DELETE OR UPDATE OF
  titulo, texto, imagen_url, boton_texto, boton_seccion, inicio, fin, dias, hora_inicio, hora_fin, prioridad, activa
  ON public.promociones FOR EACH ROW EXECUTE FUNCTION dk.registrar_cambio();

INSERT INTO public.dk_migraciones (nombre) VALUES ('0023_carta_modulos_por_plan.sql');

COMMIT;
