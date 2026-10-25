-- 0033 · Capacidad de la base para Central (29/09/2026)
-- Tamaño de la base, conexiones en uso y volumen de datos, para que Central
-- avise de cuándo subir de plan en Neon. Solo el super admin.

CREATE OR REPLACE FUNCTION dk.admin_capacidad()
RETURNS TABLE (bytes_base bigint, conexiones int, max_conexiones int, restaurantes bigint, platos bigint, escaneos_30d bigint, escaneos_total bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY SELECT
    pg_database_size(current_database()),
    (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()),
    current_setting('max_connections')::int,
    (SELECT count(*) FROM public.restaurantes),
    (SELECT count(*) FROM public.menu_items),
    (SELECT count(*) FROM public.escaneos WHERE ocurrido_en > now() - interval '30 days'),
    (SELECT count(*) FROM public.escaneos);
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_capacidad() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_capacidad() TO dk_auth;
