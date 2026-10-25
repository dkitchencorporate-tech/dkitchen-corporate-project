-- 0018 · Solicitudes de QR fisico y tickets de soporte (Panel 1 / Panel 2)
--
-- MOTIVO: el panel de autogestion real necesita dos piezas que no existian:
-- pedir impresion fisica del QR (siempre por presupuesto, nunca autoservicio
-- automatico -- decision explicita de Alex, 2026-09-22) y abrir un ticket de
-- soporte. Ambas las gestiona Alex manualmente desde el Panel 2.
--
-- Patron de RLS nuevo en este proyecto: hasta ahora las tablas o eran de solo
-- lectura publica (menu_items) o sin ningun GRANT directo, mediadas por
-- funciones dk.* (pedidos_nivel_b, marcas). Aqui se usa un tercer patron,
-- igual de valido: GRANT directo a dk_auth + politicas RLS que distinguen
-- "es el dueno de esta fila" de "es admin" via dk.es_admin() -- la via
-- correcta cuando de verdad hace falta que el propio cliente autenticado
-- pueda crear/leer sus propias filas sin pasar por una funcion mediadora
-- (no hay nada que recalcular ni proteger mas alla de "es tuyo o eres admin").

CREATE TABLE solicitudes_qr_fisico (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  tipo            text NOT NULL CHECK (tipo IN ('etiquetas', 'vinilo', 'atril', 'metacrilato')),
  cantidad        int NOT NULL CHECK (cantidad > 0),
  direccion_envio text NOT NULL,
  notas           text,
  precio_centimos int,
  referencia_pago text UNIQUE,
  estado          text NOT NULL DEFAULT 'solicitado'
    CHECK (estado IN ('solicitado', 'presupuestado', 'pagado', 'en_produccion', 'enviado')),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE solicitudes_qr_fisico ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_qr_fisico FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON solicitudes_qr_fisico TO dk_auth;
GRANT UPDATE ON solicitudes_qr_fisico TO dk_auth; -- solo lo usa la rama "es admin" de la politica de abajo

CREATE POLICY solicitud_qr_fisico_del_propietario ON solicitudes_qr_fisico
  FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM restaurantes WHERE propietario = dk.identidad_actual()));

CREATE POLICY solicitud_qr_fisico_crear_la_propia ON solicitudes_qr_fisico
  FOR INSERT TO dk_auth
  WITH CHECK (restaurante_id IN (SELECT id FROM restaurantes WHERE propietario = dk.identidad_actual()));

CREATE POLICY solicitud_qr_fisico_gestion_admin ON solicitudes_qr_fisico
  FOR ALL TO dk_auth
  USING (dk.es_admin())
  WITH CHECK (dk.es_admin());

-- ---------------------------------------------------------------------------

CREATE TABLE tickets_soporte (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  asunto         text NOT NULL,
  mensaje        text NOT NULL,
  estado         text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'respondido', 'cerrado')),
  respuesta      text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  respondido_en  timestamptz
);

ALTER TABLE tickets_soporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_soporte FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON tickets_soporte TO dk_auth;
GRANT UPDATE ON tickets_soporte TO dk_auth; -- solo lo usa la rama "es admin" de la politica de abajo

CREATE POLICY ticket_del_propietario ON tickets_soporte
  FOR SELECT TO dk_auth
  USING (restaurante_id IN (SELECT id FROM restaurantes WHERE propietario = dk.identidad_actual()));

CREATE POLICY ticket_crear_el_propio ON tickets_soporte
  FOR INSERT TO dk_auth
  WITH CHECK (restaurante_id IN (SELECT id FROM restaurantes WHERE propietario = dk.identidad_actual()));

CREATE POLICY ticket_gestion_admin ON tickets_soporte
  FOR ALL TO dk_auth
  USING (dk.es_admin())
  WITH CHECK (dk.es_admin());
