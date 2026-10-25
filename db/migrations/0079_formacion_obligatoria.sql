-- 0079 · Formación obligatoria del panel (14/10/2026, decisión de karc0 tras el piloto Casa Caracas).
-- (1) El montaje guiado solo se puede pausar UNA vez («Seguir luego»); después es obligatorio.
-- (2) Cada sección del panel enseña una mini formación la primera vez; se guarda aquí (no en el
--     navegador) para que no se repita al cambiar de móvil.
BEGIN;

ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS tutorial_pausas int NOT NULL DEFAULT 0;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS formacion_vista text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_formacion_vista_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_formacion_vista_check CHECK (cardinality(formacion_vista) <= 40);

CREATE OR REPLACE FUNCTION dk.formacion_estado()
RETURNS TABLE (pausas int, vistas text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT r.tutorial_pausas, r.formacion_vista
    FROM public.restaurantes r
   WHERE r.propietario = dk.identidad_actual()
   ORDER BY r.creado_en
   LIMIT 1;
$$;

-- Devuelve true si se ha concedido la pausa (solo la primera vez).
CREATE OR REPLACE FUNCTION dk.tutorial_pausar()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE n int;
BEGIN
  UPDATE public.restaurantes SET tutorial_pausas = tutorial_pausas + 1
   WHERE propietario = dk.identidad_actual() AND tutorial_pausas = 0
  RETURNING tutorial_pausas INTO n;
  RETURN n IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION dk.formacion_marcar(p_seccion text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF p_seccion IS NULL OR p_seccion !~ '^[a-z_]{2,20}$' THEN RAISE EXCEPTION 'sección no válida' USING ERRCODE = '22023'; END IF;
  UPDATE public.restaurantes SET formacion_vista = array_append(formacion_vista, p_seccion)
   WHERE propietario = dk.identidad_actual() AND NOT (p_seccion = ANY (formacion_vista)) AND cardinality(formacion_vista) < 40;
END;
$$;

REVOKE ALL ON FUNCTION dk.formacion_estado(), dk.tutorial_pausar(), dk.formacion_marcar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.formacion_estado(), dk.tutorial_pausar(), dk.formacion_marcar(text) TO dk_auth;

COMMIT;
