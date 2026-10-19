-- 0096 (19/10/2026, karc0, R3): «los diseños de las cartas deben ser premium, de autor, con capacidades de
-- diseño real, no plantillas idénticas siempre repetibles, ya sea que el cliente quiera configurarlas por sí
-- mismo o que nos pida que la montemos; tanto para el admin del cliente como para nosotros en Central».
--  · Tres composiciones nuevas al nivel de las 3 demos: gastro (alta cocina), taberna (bar de tapas) y
--    urbano (hamburguesería / street food). Cada una con su propia tipografía, maquetación y ritmo.
--  · «firma»: lo que hace única cada carta aunque compartan composición (lema, título de los destacados,
--    nota del chef y quién la firma, adorno). La edita el cliente (nivel esencial) y DKitchen desde Central.
--  · dk.admin_guardar_diseno: Central asigna TODO el diseño (composición, nivel, fondo, letra, color libre y firma).
BEGIN;

ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_plantilla_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_plantilla_check
  CHECK (plantilla IN ('clasica', 'visual', 'express', 'editorial', 'premium', 'gastro', 'taberna', 'urbano'));

ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS firma jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_firma_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_firma_check CHECK (
  jsonb_typeof(firma) = 'object' AND pg_column_size(firma) <= 2048
  AND coalesce(char_length(firma->>'lema'), 0) <= 120
  AND coalesce(char_length(firma->>'destacados'), 0) <= 40
  AND coalesce(char_length(firma->>'nota'), 0) <= 400
  AND coalesce(char_length(firma->>'autor'), 0) <= 60
  AND coalesce(firma->>'adorno', 'rombo') IN ('rombo', 'estrella', 'ola', 'sello', 'ninguno')
);
GRANT SELECT (firma) ON public.restaurantes TO dk_anon, dk_auth, dk_sincronizacion;
GRANT UPDATE (firma) ON public.restaurantes TO dk_auth;

-- El cliente cambia su firma igual que su estilo: solo si su carta no la ha diseñado DKitchen.
CREATE OR REPLACE FUNCTION dk.control_diseno_cliente()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF dk.es_admin() OR dk.identidad_actual() IS NULL THEN RETURN NEW; END IF;
  IF NEW.nivel_diseno IS DISTINCT FROM OLD.nivel_diseno THEN
    RAISE EXCEPTION 'El nivel de diseño lo asigna DKitchen.' USING ERRCODE = '42501';
  END IF;
  IF NEW.color_marca IS DISTINCT FROM OLD.color_marca OR NEW.plantilla IS DISTINCT FROM OLD.plantilla
     OR NEW.estilo_fondo IS DISTINCT FROM OLD.estilo_fondo OR NEW.estilo_letra IS DISTINCT FROM OLD.estilo_letra
     OR NEW.firma IS DISTINCT FROM OLD.firma THEN
    IF OLD.nivel_diseno <> 'esencial' THEN
      RAISE EXCEPTION 'El diseño de tu carta lo ha hecho DKitchen. Pídenos cualquier cambio en Soporte.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.color_marca IS NOT NULL AND NEW.color_marca IS DISTINCT FROM OLD.color_marca
       AND NOT (upper(NEW.color_marca) = ANY (dk.paleta_esencial())) THEN
      RAISE EXCEPTION 'Elige uno de los colores de la paleta.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- El asignador antiguo de Central acepta también las composiciones nuevas.
CREATE OR REPLACE FUNCTION dk.admin_asignar_diseno(p_restaurante uuid, p_plantilla text, p_nivel text, p_color text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  PERFORM dk.admin_guardar_diseno(p_restaurante, p_plantilla, p_nivel, p_color, NULL, NULL, NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION dk.admin_guardar_diseno(p_restaurante uuid, p_plantilla text, p_nivel text, p_color text,
                                                   p_fondo text, p_letra text, p_firma jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  PERFORM dk.exigir_admin();
  IF p_plantilla NOT IN ('clasica', 'visual', 'express', 'editorial', 'premium', 'gastro', 'taberna', 'urbano')
     OR p_nivel NOT IN ('esencial', 'autor', 'signature')
     OR (p_color IS NOT NULL AND p_color !~ '^#[0-9a-fA-F]{6}$')
     OR (p_fondo IS NOT NULL AND p_fondo NOT IN ('papel', 'blanco', 'oscuro'))
     OR (p_letra IS NOT NULL AND p_letra NOT IN ('sans', 'serif')) THEN
    RAISE EXCEPTION 'valores no permitidos' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes
     SET plantilla = p_plantilla, nivel_diseno = p_nivel, color_marca = coalesce(upper(p_color), color_marca),
         estilo_fondo = coalesce(p_fondo, estilo_fondo), estilo_letra = coalesce(p_letra, estilo_letra),
         firma = coalesce(p_firma, firma)
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.asignar_diseno',
          jsonb_build_object('plantilla', p_plantilla, 'nivel', p_nivel, 'color', p_color, 'fondo', p_fondo, 'letra', p_letra, 'firma', p_firma), p_restaurante);
END;
$function$;
REVOKE ALL ON FUNCTION dk.admin_guardar_diseno(uuid, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_guardar_diseno(uuid, text, text, text, text, text, jsonb) TO dk_auth;

COMMIT;
