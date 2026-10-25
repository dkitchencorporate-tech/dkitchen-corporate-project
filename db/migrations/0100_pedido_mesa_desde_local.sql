-- 0100 (25/10/2026, karc0): el pedido desde la mesa entra también en el plan Local (29 €, y por tanto en el mes a 1 €).
-- Sin él, Local se degradaba demasiado. Solo se queda fuera Carta (9 €). Corrige 0099, que lo dejaba solo en Sala.
BEGIN;

CREATE OR REPLACE FUNCTION dk.mesa_pedido_modo(p_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT CASE WHEN r.demo_interna THEN 'demo' WHEN dk.plan_nivel(r.plan) >= 2 THEN 'real' END
    FROM public.restaurantes r
   WHERE r.slug = lower(p_slug) AND r.activo AND r.estado_acceso IN ('activo', 'gracia') AND r.archivado_en IS NULL;
$$;

DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('dk.mesa_pedir(text, text, jsonb, text)'::regprocedure);
  IF position('dk.plan_nivel(v_rest.plan) >= 3' IN v_def) = 0 THEN RAISE EXCEPTION 'mesa_pedir no tiene el tope de 0099'; END IF;
  EXECUTE replace(v_def, 'dk.plan_nivel(v_rest.plan) >= 3', 'dk.plan_nivel(v_rest.plan) >= 2');
END $$;

COMMIT;
