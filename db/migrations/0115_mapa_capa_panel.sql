-- 0115 · Mapa de la web, E4 (tarea 9703bd13): el seguimiento del panel de los pilotos (0078) como capa del mapa.
-- Solo lectura: agrega seguimiento_eventos por pantalla del panel (todas las cuentas en seguimiento) en los
-- últimos N días: sesiones, locales, vistas, clics, errores, salidas, tiempo medio y lo más pulsado / el último error.
-- Solo dirección y administradores con 2FA (dk.es_admin). Sin datos personales: pantalla, objetivo y recuentos.

BEGIN;

CREATE OR REPLACE FUNCTION dk.admin_seguimiento_mapa(p_dias int)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_desde timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_dias, 30), 365)));
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY (x ->> 'clics')::int + (x ->> 'vistas')::int DESC) FROM (
    SELECT jsonb_build_object(
      'pantalla', e.pant,
      'sesiones', count(DISTINCT e.sesion),
      'locales', count(DISTINCT e.restaurante_id),
      'vistas', count(*) FILTER (WHERE e.tipo IN ('inicio', 'vista')),
      'clics', count(*) FILTER (WHERE e.tipo = 'clic'),
      'errores', count(*) FILTER (WHERE e.tipo = 'error'),
      'salidas', count(*) FILTER (WHERE e.tipo = 'salida'),
      'ms_medio', coalesce(round(avg(e.ms) FILTER (WHERE e.tipo = 'tiempo'))::int, 0),
      'top', (SELECT o.objetivo FROM public.seguimiento_eventos o
               WHERE coalesce(nullif(o.pantalla, ''), 'inicio') = e.pant
                 AND o.tipo = 'clic' AND o.objetivo IS NOT NULL AND o.creado_en >= v_desde
               GROUP BY o.objetivo ORDER BY count(*) DESC LIMIT 1),
      'ultimo_error', (SELECT left(coalesce(o.detalle, o.objetivo), 160) FROM public.seguimiento_eventos o
               WHERE coalesce(nullif(o.pantalla, ''), 'inicio') = e.pant
                 AND o.tipo = 'error' AND o.creado_en >= v_desde ORDER BY o.id DESC LIMIT 1),
      'ultimo', max(e.creado_en)) AS x
    FROM (SELECT s.*, coalesce(nullif(s.pantalla, ''), 'inicio') AS pant FROM public.seguimiento_eventos s) e
    WHERE e.creado_en >= v_desde
    GROUP BY e.pant) t), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_seguimiento_mapa(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_seguimiento_mapa(int) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0115_mapa_capa_panel.sql') ON CONFLICT DO NOTHING;
COMMIT;
