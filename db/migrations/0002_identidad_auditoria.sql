-- 0002 · Identidad verificada y auditoría
--
-- La identidad no la declara el despliegue: la aplicación entrega el JWT a
-- auth.jwt_session_init() y es Postgres quien verifica la firma contra el JWKS
-- de BetterAuth. Una aplicación comprometida no puede suplantar a nadie porque
-- no tiene con qué firmar.

-- ---------------------------------------------------------------------------
-- Quién es quien pregunta
-- ---------------------------------------------------------------------------
-- Devuelve NULL en lugar de fallar cuando no hay sesión: "sin JWT" significa
-- anónimo, que es un estado legítimo, no un error.
CREATE OR REPLACE FUNCTION dk.identidad_actual()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = auth, pg_catalog
AS $$
BEGIN
  RETURN auth.uid();
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tabla de identidades de la aplicación
-- ---------------------------------------------------------------------------
-- El rol sale de una fila, nunca de comparar un correo con una constante. Así
-- se revoca con un UPDATE y no con un despliegue.
CREATE TABLE identidades (
  id         uuid PRIMARY KEY,
  email      citext NOT NULL UNIQUE,
  nombre     text,
  rol        text NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
  activo     boolean NOT NULL DEFAULT true,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE identidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE identidades FORCE ROW LEVEL SECURITY;

-- Cada cual se ve solo a sí mismo. Nadie puede editar su propio rol desde la
-- aplicación: no se concede UPDATE, punto. Los cambios de rol pasan por el
-- propietario de la base, y quedan auditados.
CREATE POLICY identidad_se_ve_a_si_misma ON identidades
  FOR SELECT TO dk_auth
  USING (id = dk.identidad_actual());

GRANT SELECT ON identidades TO dk_auth;

CREATE FUNCTION dk.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM identidades
    WHERE id = dk.identidad_actual() AND rol = 'admin' AND activo
  );
$$;

REVOKE ALL ON FUNCTION dk.es_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.es_admin() TO dk_auth;

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
-- Nadie escribe aquí directamente: solo las funciones SECURITY DEFINER. Y nadie
-- borra nunca. Un registro que se puede borrar no es un registro.
CREATE TABLE auditoria (
  id          bigserial PRIMARY KEY,
  ocurrido_en timestamptz NOT NULL DEFAULT now(),
  identidad   uuid,
  accion      text NOT NULL,
  detalle     jsonb
);

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria FORCE ROW LEVEL SECURITY;
REVOKE ALL ON auditoria FROM dk_anon, dk_auth;

-- Solo un administrador puede leer la auditoría, y ni él puede modificarla.
CREATE POLICY auditoria_solo_lectura_admin ON auditoria
  FOR SELECT TO dk_auth
  USING (dk.es_admin());

GRANT SELECT ON auditoria TO dk_auth;

CREATE FUNCTION dk.auditar(p_accion text, p_detalle jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
BEGIN
  INSERT INTO auditoria (identidad, accion, detalle)
  VALUES (dk.identidad_actual(), p_accion, p_detalle);
END;
$$;

REVOKE ALL ON FUNCTION dk.auditar(text, jsonb) FROM PUBLIC;
