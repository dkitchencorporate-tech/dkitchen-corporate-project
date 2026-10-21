-- 0097 (21/10/2026, karc0): Central → Prospección más visual. Cada tarjeta enseña la demo ligada al local
-- (prospectos.restaurante_id, tanda 1 del 19/10): slug, color, composición, fondo y número de platos.
-- Solo lectura y solo admin; prospectos tiene RLS sin políticas, por eso va por SECURITY DEFINER.
BEGIN;

CREATE OR REPLACE FUNCTION dk.admin_prosp_demos()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN coalesce((
    SELECT jsonb_object_agg(p.id, jsonb_build_object(
             'slug', r.slug, 'color', r.color_marca, 'plantilla', r.plantilla, 'fondo', r.estilo_fondo,
             'platos', (SELECT count(*) FROM public.menu_items i WHERE i.restaurante_id = r.id)))
      FROM public.prospectos p
      JOIN public.restaurantes r ON r.id = p.restaurante_id AND r.archivado_en IS NULL
  ), '{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_prosp_demos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_prosp_demos() TO dk_auth;

COMMIT;
