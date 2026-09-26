-- 0019 — Panel operativo QR (27/09/2026)
--
-- 1. Datos del local editables por el propietario (y visibles en la carta).
-- 2. Vista de administración: resumen de clientes QR solo para dk.es_admin().
-- 3. Upgrade Básico → Ampliado desde el webhook de Whop (rol dk_aprovisionamiento).
-- 4. Llamar al camarero (módulo Ampliado): el visitante llama desde la carta,
--    el propietario lo ve y lo marca como atendido en su panel.

BEGIN;

-- 1 ─ Datos del local ─────────────────────────────────────────────────────────
ALTER TABLE restaurantes
  ADD COLUMN IF NOT EXISTS descripcion text CHECK (char_length(descripcion) <= 280),
  ADD COLUMN IF NOT EXISTS telefono text CHECK (char_length(telefono) <= 30),
  ADD COLUMN IF NOT EXISTS direccion text CHECK (char_length(direccion) <= 160),
  ADD COLUMN IF NOT EXISTS horario text CHECK (char_length(horario) <= 200),
  ADD COLUMN IF NOT EXISTS instagram text CHECK (char_length(instagram) <= 60),
  ADD COLUMN IF NOT EXISTS url_resenas text CHECK (char_length(url_resenas) <= 300),
  ADD COLUMN IF NOT EXISTS whop_membresia_ampliado text;

GRANT SELECT (descripcion, telefono, direccion, horario, instagram, url_resenas)
  ON restaurantes TO dk_anon, dk_auth;
GRANT UPDATE (descripcion, telefono, direccion, horario, instagram, url_resenas)
  ON restaurantes TO dk_auth;

-- 2 ─ Resumen de clientes para el admin interno ───────────────────────────────
CREATE OR REPLACE FUNCTION dk.admin_resumen_clientes()
RETURNS TABLE (
  restaurante_id uuid, nombre text, slug text, plan text, estado_acceso text,
  activo boolean, creado_en timestamptz, email text, contacto text,
  codigo_qr text, platos bigint, escaneos_mes bigint, escaneos_total bigint,
  tickets_abiertos bigint, solicitudes_qr_pendientes bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
BEGIN
  IF NOT dk.es_admin() THEN
    RAISE EXCEPTION 'solo admin' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.id, r.nombre, r.slug, r.plan, r.estado_acceso, r.activo, r.creado_en,
         i.email::text, i.nombre,
         c.codigo,
         (SELECT count(*) FROM menu_items m WHERE m.restaurante_id = r.id),
         (SELECT count(*) FROM escaneos e WHERE e.codigo = c.codigo
            AND e.ocurrido_en >= date_trunc('month', now())),
         (SELECT count(*) FROM escaneos e WHERE e.codigo = c.codigo),
         (SELECT count(*) FROM tickets_soporte t WHERE t.restaurante_id = r.id AND t.estado <> 'cerrado'),
         (SELECT count(*) FROM solicitudes_qr_fisico s WHERE s.restaurante_id = r.id AND s.estado = 'solicitado')
  FROM restaurantes r
  LEFT JOIN identidades i ON i.id = r.propietario
  LEFT JOIN LATERAL (SELECT q.codigo FROM codigos_qr q WHERE q.restaurante_id = r.id AND q.activo
                     ORDER BY q.creado_en LIMIT 1) c ON true
  ORDER BY r.creado_en DESC;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_resumen_clientes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_resumen_clientes() TO dk_auth;

-- 3 ─ Upgrade a Ampliado (lo llama el webhook) ────────────────────────────────
CREATE OR REPLACE FUNCTION dk.aplicar_upgrade_ampliado(p_restaurante uuid, p_membresia text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE n int;
BEGIN
  UPDATE restaurantes
     SET plan = 'ampliado', whop_membresia_ampliado = p_membresia
   WHERE id = p_restaurante AND plan = 'basico';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END;
$$;
REVOKE ALL ON FUNCTION dk.aplicar_upgrade_ampliado(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.aplicar_upgrade_ampliado(uuid, text) TO dk_aprovisionamiento;

-- 4 ─ Llamar al camarero ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llamadas_camarero (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  mesa text NOT NULL CHECK (char_length(mesa) BETWEEN 1 AND 12),
  motivo text NOT NULL DEFAULT 'camarero' CHECK (motivo IN ('camarero', 'cuenta')),
  creada_en timestamptz NOT NULL DEFAULT now(),
  atendida_en timestamptz
);
CREATE INDEX IF NOT EXISTS llamadas_camarero_pendientes
  ON llamadas_camarero (restaurante_id, creada_en DESC) WHERE atendida_en IS NULL;

ALTER TABLE llamadas_camarero ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamadas_camarero FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS llamada_del_propietario ON llamadas_camarero;
CREATE POLICY llamada_del_propietario ON llamadas_camarero FOR SELECT TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r WHERE r.id = restaurante_id
                 AND r.propietario = dk.identidad_actual()));
DROP POLICY IF EXISTS llamada_atender_propia ON llamadas_camarero;
CREATE POLICY llamada_atender_propia ON llamadas_camarero FOR UPDATE TO dk_auth
  USING (EXISTS (SELECT 1 FROM restaurantes r WHERE r.id = restaurante_id
                 AND r.propietario = dk.identidad_actual()));
GRANT SELECT ON llamadas_camarero TO dk_auth;
GRANT UPDATE (atendida_en) ON llamadas_camarero TO dk_auth;

-- El visitante no toca la tabla: solo esta función, que exige plan Ampliado,
-- restaurante activo y como mucho una llamada pendiente por mesa cada 45 s.
CREATE OR REPLACE FUNCTION dk.llamar_camarero(p_slug text, p_mesa text, p_motivo text DEFAULT 'camarero')
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE v_rest uuid; v_mesa text := left(btrim(p_mesa), 12);
BEGIN
  IF v_mesa IS NULL OR v_mesa = '' THEN RETURN 'mesa_invalida'; END IF;
  IF p_motivo NOT IN ('camarero', 'cuenta') THEN RETURN 'motivo_invalido'; END IF;

  SELECT id INTO v_rest FROM restaurantes
   WHERE slug = p_slug AND activo AND plan = 'ampliado'
     AND estado_acceso IN ('activo', 'gracia');
  IF v_rest IS NULL THEN RETURN 'no_disponible'; END IF;

  IF EXISTS (SELECT 1 FROM llamadas_camarero
              WHERE restaurante_id = v_rest AND mesa = v_mesa AND atendida_en IS NULL
                AND creada_en > now() - interval '45 seconds') THEN
    RETURN 'ya_avisado';
  END IF;

  INSERT INTO llamadas_camarero (restaurante_id, mesa, motivo) VALUES (v_rest, v_mesa, p_motivo);
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION dk.llamar_camarero(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.llamar_camarero(text, text, text) TO dk_anon;

INSERT INTO dk_migraciones (nombre) VALUES ('0019_panel_operativo_qr.sql')
  ON CONFLICT DO NOTHING;

COMMIT;
