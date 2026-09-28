-- 0026 — Diseño por niveles (el cliente administra, DKitchen diseña) + alérgenos normalizados (28/09/2026)
--
-- Decisiones de karc0 (QR_ANALISIS_DISENO_NIVELES_Y_MODULOS_2026-09-28.md §9):
--  - El cliente YA NO cambia la plantilla: la asigna DKitchen (alta o Setup).
--  - Nivel de diseño: esencial (incluido) · autor (Setup Experto) · signature (a medida).
--  - En nivel esencial el color se elige de una PALETA CURADA (contraste
--    garantizado); en autor/signature el color lo fija DKitchen.
--  - Alérgenos: solo los 14 códigos oficiales (Reglamento UE 1169/2011).
--    Los datos de prueba se sembraron con GLU/LEC/FRS → "FRS FRS" en la carta.

BEGIN;

-- 1. Nivel de diseño
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS nivel_diseno text NOT NULL DEFAULT 'esencial';
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_nivel_diseno_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_nivel_diseno_check
  CHECK (nivel_diseno IN ('esencial', 'autor', 'signature'));
GRANT SELECT (nivel_diseno) ON public.restaurantes TO dk_auth, dk_anon;

-- 2. El cliente ya no cambia la plantilla
REVOKE UPDATE (plantilla) ON public.restaurantes FROM dk_auth;

-- 3. Paleta curada para el nivel esencial (el cambio de color lo valida la BD)
CREATE OR REPLACE FUNCTION dk.paleta_esencial() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['#D9531E', '#B23A48', '#C58B2A', '#2F5D50', '#1F4E79', '#5B3E8A', '#6B4E2E', '#1A1714'];
$$;
GRANT EXECUTE ON FUNCTION dk.paleta_esencial() TO dk_auth;

CREATE OR REPLACE FUNCTION dk.control_diseno_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  -- DKitchen (admin con 2FA) y los procesos del sistema pueden todo
  IF dk.es_admin() OR dk.identidad_actual() IS NULL THEN RETURN NEW; END IF;
  IF NEW.color_marca IS DISTINCT FROM OLD.color_marca THEN
    IF OLD.nivel_diseno <> 'esencial' THEN
      RAISE EXCEPTION 'El color de tu carta lo ha fijado DKitchen en tu diseño. Pídenos el cambio en Soporte.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.color_marca IS NOT NULL AND NOT (upper(NEW.color_marca) = ANY (dk.paleta_esencial())) THEN
      RAISE EXCEPTION 'Elige uno de los colores de la paleta.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF NEW.plantilla IS DISTINCT FROM OLD.plantilla OR NEW.nivel_diseno IS DISTINCT FROM OLD.nivel_diseno THEN
    RAISE EXCEPTION 'El diseño de la carta lo asigna DKitchen.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION dk.control_diseno_cliente() FROM PUBLIC;
DROP TRIGGER IF EXISTS control_diseno_cliente ON public.restaurantes;
CREATE TRIGGER control_diseno_cliente BEFORE UPDATE ON public.restaurantes
  FOR EACH ROW EXECUTE FUNCTION dk.control_diseno_cliente();

-- Los colores actuales fuera de paleta se respetan (no se tocan datos de clientes);
-- la paleta se aplica al siguiente cambio.

-- 4. Asignación de diseño por DKitchen (super admin, auditada)
CREATE OR REPLACE FUNCTION dk.admin_asignar_diseno(p_restaurante uuid, p_plantilla text, p_nivel text, p_color text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_plantilla NOT IN ('clasica', 'visual', 'express') OR p_nivel NOT IN ('esencial', 'autor', 'signature')
     OR (p_color IS NOT NULL AND p_color !~ '^#[0-9a-fA-F]{6}$') THEN
    RAISE EXCEPTION 'valores no permitidos' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes
     SET plantilla = p_plantilla, nivel_diseno = p_nivel, color_marca = coalesce(p_color, color_marca)
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.asignar_diseno',
          jsonb_build_object('plantilla', p_plantilla, 'nivel', p_nivel, 'color', p_color), p_restaurante);
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_asignar_diseno(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_asignar_diseno(uuid, text, text, text) TO dk_auth;

-- 5. Alérgenos: normalizar datos existentes y blindar con lista blanca
UPDATE public.menu_items
   SET alergenos = ARRAY(
     SELECT DISTINCT CASE a WHEN 'GLU' THEN 'GL' WHEN 'LEC' THEN 'LE' WHEN 'FRS' THEN 'FR' WHEN 'HUE' THEN 'HU'
                             WHEN 'PES' THEN 'PE' WHEN 'SOJ' THEN 'SO' WHEN 'CRU' THEN 'CR' WHEN 'MOL' THEN 'MU'
                             WHEN 'SUL' THEN 'SU' WHEN 'SES' THEN 'SE' WHEN 'MOS' THEN 'MO' WHEN 'API' THEN 'AP'
                             WHEN 'ALT' THEN 'AL' WHEN 'CAC' THEN 'CA' ELSE upper(a) END
     FROM unnest(alergenos) a)
 WHERE alergenos && ARRAY['GLU','LEC','FRS','HUE','PES','SOJ','CRU','MOL','SUL','SES','MOS','API','ALT','CAC'];
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_alergenos_oficiales;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_alergenos_oficiales
  CHECK (alergenos <@ ARRAY['GL','CR','HU','PE','CA','SO','LE','FR','AP','MO','SE','SU','AL','MU']::text[]);

INSERT INTO public.dk_migraciones (nombre) VALUES ('0026_diseno_por_niveles_y_alergenos.sql');

COMMIT;
