-- 0003 · Motor de QR de carta
--
-- El QR impreso codifica /r/{codigo}. Al escanearlo se registra el escaneo y se
-- redirige a /m/{slug}, que es el menú vivo. Esa capa intermedia es lo que
-- permite dos cosas a la vez: que el QR impreso no caduque nunca —ni siquiera
-- si el restaurante cambia de slug— y que existan escaneos que contar, que es
-- de donde sale el umbral de 600/mes del marco Sostener/Evolucionar/Soltar.

-- ---------------------------------------------------------------------------
-- Restaurantes
-- ---------------------------------------------------------------------------
CREATE TABLE restaurantes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propietario  uuid NOT NULL REFERENCES identidades(id) ON DELETE RESTRICT,
  slug         text NOT NULL UNIQUE,
  nombre       text NOT NULL,
  logo_url     text,
  plan         text NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico', 'ampliado')),
  activo       boolean NOT NULL DEFAULT true,
  creado_en    timestamptz NOT NULL DEFAULT now(),

  -- El slug va en la URL pública del menú: se acota para que no quepan sorpresas.
  CONSTRAINT slug_valido CHECK (slug ~ '^[a-z0-9-]{3,40}$'),
  CONSTRAINT nombre_no_vacio CHECK (length(btrim(nombre)) > 0)
);

CREATE INDEX restaurantes_propietario_idx ON restaurantes (propietario);

ALTER TABLE restaurantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurantes FORCE ROW LEVEL SECURITY;

-- El menú es público por definición: quien escanea un QR no tiene sesión.
CREATE POLICY restaurante_visible_si_activo ON restaurantes
  FOR SELECT TO dk_anon
  USING (activo);

CREATE POLICY restaurante_ve_lo_suyo ON restaurantes
  FOR SELECT TO dk_auth
  USING (propietario = dk.identidad_actual() OR dk.es_admin());

-- USING decide qué filas puede tocar; WITH CHECK, cómo pueden quedar después.
-- Sin la segunda, un propietario podría reasignar su restaurante a otro.
CREATE POLICY restaurante_edita_lo_suyo ON restaurantes
  FOR UPDATE TO dk_auth
  USING (propietario = dk.identidad_actual())
  WITH CHECK (propietario = dk.identidad_actual());

GRANT SELECT (id, slug, nombre, logo_url, plan, activo) ON restaurantes TO dk_anon;
GRANT SELECT ON restaurantes TO dk_auth;
GRANT UPDATE (nombre, logo_url) ON restaurantes TO dk_auth;

-- ---------------------------------------------------------------------------
-- Carta
-- ---------------------------------------------------------------------------
CREATE TABLE menu_secciones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  nombre         text NOT NULL,
  orden          int NOT NULL DEFAULT 0,
  CONSTRAINT seccion_nombre_no_vacio CHECK (length(btrim(nombre)) > 0)
);

CREATE INDEX menu_secciones_restaurante_idx ON menu_secciones (restaurante_id, orden);

CREATE TABLE menu_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  seccion_id     uuid REFERENCES menu_secciones(id) ON DELETE SET NULL,
  nombre         text NOT NULL,
  descripcion    text,
  precio         numeric(10,2) NOT NULL,
  foto_url       text,
  alergenos      text[] NOT NULL DEFAULT '{}',
  disponible     boolean NOT NULL DEFAULT true,
  orden          int NOT NULL DEFAULT 0,

  CONSTRAINT precio_no_negativo CHECK (precio >= 0),
  CONSTRAINT item_nombre_no_vacio CHECK (length(btrim(nombre)) > 0)
);

CREATE INDEX menu_items_restaurante_idx ON menu_items (restaurante_id, orden);

-- Los topes de 50 y 150 productos son una característica publicada del plan. Si
-- solo se comprobaran en la interfaz serían una sugerencia, no un límite.
CREATE FUNCTION dk.comprobar_tope_productos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_tope int;
  v_actual int;
BEGIN
  SELECT CASE plan WHEN 'basico' THEN 50 WHEN 'ampliado' THEN 150 ELSE 0 END
    INTO v_tope
    FROM restaurantes WHERE id = NEW.restaurante_id;

  SELECT count(*) INTO v_actual
    FROM menu_items WHERE restaurante_id = NEW.restaurante_id;

  IF v_actual >= v_tope THEN
    RAISE EXCEPTION 'Tope de % productos alcanzado para el plan contratado', v_tope
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_items_tope
  BEFORE INSERT ON menu_items
  FOR EACH ROW EXECUTE FUNCTION dk.comprobar_tope_productos();

ALTER TABLE menu_secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_secciones FORCE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items FORCE ROW LEVEL SECURITY;

CREATE POLICY seccion_publica ON menu_secciones
  FOR SELECT TO dk_anon
  USING (EXISTS (SELECT 1 FROM restaurantes r WHERE r.id = restaurante_id AND r.activo));

CREATE POLICY seccion_del_propietario ON menu_secciones
  FOR ALL TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r
                 WHERE r.id = restaurante_id AND r.propietario = dk.identidad_actual()))
  WITH CHECK (EXISTS (SELECT 1 FROM restaurantes r
                      WHERE r.id = restaurante_id AND r.propietario = dk.identidad_actual()));

-- Un plato agotado desaparece de la carta pública sin borrarse: el propietario
-- lo sigue viendo para volver a activarlo.
CREATE POLICY item_publico ON menu_items
  FOR SELECT TO dk_anon
  USING (disponible AND EXISTS (SELECT 1 FROM restaurantes r
                                WHERE r.id = restaurante_id AND r.activo));

CREATE POLICY item_del_propietario ON menu_items
  FOR ALL TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r
                 WHERE r.id = restaurante_id AND r.propietario = dk.identidad_actual()))
  WITH CHECK (EXISTS (SELECT 1 FROM restaurantes r
                      WHERE r.id = restaurante_id AND r.propietario = dk.identidad_actual()));

GRANT SELECT ON menu_secciones, menu_items TO dk_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_secciones, menu_items TO dk_auth;

-- ---------------------------------------------------------------------------
-- Códigos y escaneos
-- ---------------------------------------------------------------------------
CREATE TABLE codigos_qr (
  codigo         text PRIMARY KEY,
  restaurante_id uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  activo         boolean NOT NULL DEFAULT true,
  creado_en      timestamptz NOT NULL DEFAULT now(),

  -- Aleatorio y no correlativo: un código secuencial deja recorrer el catálogo
  -- entero de clientes probando números.
  CONSTRAINT codigo_valido CHECK (codigo ~ '^[a-z0-9]{8,16}$')
);

CREATE INDEX codigos_qr_restaurante_idx ON codigos_qr (restaurante_id);

CREATE TABLE escaneos (
  id          bigserial PRIMARY KEY,
  codigo      text NOT NULL REFERENCES codigos_qr(codigo) ON DELETE CASCADE,
  ocurrido_en timestamptz NOT NULL DEFAULT now(),
  user_agent  text,
  pais        text
);

-- El recuento mensual por restaurante es la consulta que decide la relación
-- comercial con el cliente, así que se indexa para que no dependa de un barrido.
CREATE INDEX escaneos_codigo_fecha_idx ON escaneos (codigo, ocurrido_en DESC);

ALTER TABLE codigos_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_qr FORCE ROW LEVEL SECURITY;
ALTER TABLE escaneos ENABLE ROW LEVEL SECURITY;
ALTER TABLE escaneos FORCE ROW LEVEL SECURITY;

CREATE POLICY codigo_del_propietario ON codigos_qr
  FOR SELECT TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r
                 WHERE r.id = restaurante_id AND r.propietario = dk.identidad_actual()));

CREATE POLICY escaneo_del_propietario ON escaneos
  FOR SELECT TO dk_auth
  USING (EXISTS (SELECT 1 FROM codigos_qr c JOIN restaurantes r ON r.id = c.restaurante_id
                 WHERE c.codigo = escaneos.codigo AND r.propietario = dk.identidad_actual()));

GRANT SELECT ON codigos_qr, escaneos TO dk_auth;
-- dk_anon no recibe NADA sobre estas tablas: escanear se hace por función.

-- ---------------------------------------------------------------------------
-- Resolver un QR
-- ---------------------------------------------------------------------------
-- Un anónimo puede registrar un escaneo —es un QR pegado en una mesa— pero solo
-- a través de esta función. Al no tener INSERT sobre la tabla no puede inventar
-- escaneos de otro restaurante ni falsear la fecha.
CREATE FUNCTION dk.resolver_codigo(
  p_codigo     text,
  p_user_agent text DEFAULT NULL,
  p_pais       text DEFAULT NULL
)
RETURNS TABLE (slug text, nombre text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_rest uuid;
BEGIN
  SELECT c.restaurante_id INTO v_rest
    FROM codigos_qr c JOIN restaurantes r ON r.id = c.restaurante_id
   WHERE c.codigo = p_codigo AND c.activo AND r.activo;

  IF v_rest IS NULL THEN
    RETURN;  -- sin filas: el front responde 404 sin revelar si existía
  END IF;

  INSERT INTO escaneos (codigo, user_agent, pais)
  VALUES (p_codigo, left(p_user_agent, 400), left(p_pais, 2));

  RETURN QUERY SELECT r.slug, r.nombre FROM restaurantes r WHERE r.id = v_rest;
END;
$$;

REVOKE ALL ON FUNCTION dk.resolver_codigo(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.resolver_codigo(text, text, text) TO dk_anon, dk_auth;

-- Escaneos del mes en curso, que es la cifra del marco de ciclo de vida.
CREATE FUNCTION dk.escaneos_del_mes(p_restaurante uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  SELECT count(*)::int
    FROM escaneos e JOIN codigos_qr c ON c.codigo = e.codigo
   WHERE c.restaurante_id = p_restaurante
     AND e.ocurrido_en >= date_trunc('month', now());
$$;

REVOKE ALL ON FUNCTION dk.escaneos_del_mes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.escaneos_del_mes(uuid) TO dk_auth;
