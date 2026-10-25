-- 0031 · Selectores de estilo de la carta (decisión 29/09/2026)
-- El cliente del nivel Esencial elige: estilo (plantilla), fondo, letra y color
-- de una paleta curada. Las combinaciones son cerradas para que nunca quede fea.
-- En Carta de Autor / Signature el diseño sigue siendo de DKitchen.

ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS estilo_fondo text NOT NULL DEFAULT 'papel',
  ADD COLUMN IF NOT EXISTS estilo_letra text NOT NULL DEFAULT 'sans';
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_estilo_fondo_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_estilo_fondo_check CHECK (estilo_fondo IN ('papel', 'blanco', 'oscuro'));
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_estilo_letra_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_estilo_letra_check CHECK (estilo_letra IN ('sans', 'serif'));
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_plantilla_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_plantilla_check CHECK (plantilla IN ('clasica', 'visual', 'express', 'editorial'));

-- Paleta curada ampliada (se mantienen los colores anteriores por compatibilidad)
CREATE OR REPLACE FUNCTION dk.paleta_esencial()
 RETURNS text[] LANGUAGE sql IMMUTABLE
AS $$
  SELECT ARRAY['#E8592A', '#D9531E', '#B23A48', '#C58B2A', '#2F5D50', '#2F8F6B', '#1F4E79', '#3B6EA5', '#5B3E8A', '#6B4E2E', '#1A1714', '#17191E'];
$$;

-- El cliente Esencial ya puede cambiar estilo, fondo y letra; el nivel sigue siendo de DKitchen
CREATE OR REPLACE FUNCTION dk.control_diseno_cliente()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  IF dk.es_admin() OR dk.identidad_actual() IS NULL THEN RETURN NEW; END IF;
  IF NEW.nivel_diseno IS DISTINCT FROM OLD.nivel_diseno THEN
    RAISE EXCEPTION 'El nivel de diseño lo asigna DKitchen.' USING ERRCODE = '42501';
  END IF;
  IF NEW.color_marca IS DISTINCT FROM OLD.color_marca OR NEW.plantilla IS DISTINCT FROM OLD.plantilla
     OR NEW.estilo_fondo IS DISTINCT FROM OLD.estilo_fondo OR NEW.estilo_letra IS DISTINCT FROM OLD.estilo_letra THEN
    IF OLD.nivel_diseno <> 'esencial' THEN
      RAISE EXCEPTION 'El diseño de tu carta lo ha hecho DKitchen. Pídenos cualquier cambio en Soporte.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.color_marca IS NOT NULL AND NOT (upper(NEW.color_marca) = ANY (dk.paleta_esencial())) THEN
      RAISE EXCEPTION 'Elige uno de los colores de la paleta.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Permisos por columna (el esquema usa privilegios de columna, no de tabla)
GRANT SELECT (estilo_fondo, estilo_letra) ON public.restaurantes TO dk_anon, dk_auth, dk_sincronizacion;
GRANT UPDATE (plantilla, estilo_fondo, estilo_letra) ON public.restaurantes TO dk_auth;
