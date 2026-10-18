-- 0086 (18/10/2026, decisiones 42 y 43 de karc0): Sala pasa a 79 € + IVA al mes,
-- sus comandas al TPV bajan a 1.500 al mes (por encima, Enterprise a medida) e
-- idiomas por plan: Carta solo español (0 extra), Local español + inglés (1),
-- Sala español + inglés + uno a elegir (2). Los idiomas comprados (idioma_extra,
-- pack antiguo) se siguen sumando en dk.idiomas_permitidos. Espejo de pricing-config.
-- Fundador (49 €/mes, 147 € por trimestre) se cobra desde pricing-config.

CREATE OR REPLACE FUNCTION dk.precio_plan(p_plan text)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog'
AS $function$
  SELECT CASE p_plan WHEN 'sala' THEN 7900 WHEN 'ampliado' THEN 2900 WHEN 'basico' THEN 900 ELSE 0 END
$function$;

CREATE OR REPLACE FUNCTION dk.plan_tope(p_plan text, p_que text)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog'
AS $function$
  SELECT CASE p_que
    WHEN 'productos'        THEN CASE p_plan WHEN 'sala' THEN 120  WHEN 'ampliado' THEN 80  ELSE 40 END
    WHEN 'mesas'            THEN CASE p_plan WHEN 'sala' THEN 30   WHEN 'ampliado' THEN 15  ELSE 6 END
    WHEN 'camareros'        THEN CASE p_plan WHEN 'sala' THEN 6    WHEN 'ampliado' THEN 3   ELSE 1 END
    WHEN 'reservas_mes'     THEN CASE p_plan WHEN 'sala' THEN 350  WHEN 'ampliado' THEN 120 ELSE 30 END
    WHEN 'banners'          THEN CASE p_plan WHEN 'sala' THEN 3    WHEN 'ampliado' THEN 2   ELSE 1 END
    WHEN 'comandas_tpv_mes' THEN CASE p_plan WHEN 'sala' THEN 1500 WHEN 'ampliado' THEN 600 ELSE 150 END
    WHEN 'historial_dias'   THEN CASE p_plan WHEN 'sala' THEN 90   WHEN 'ampliado' THEN 30  ELSE 7 END
    WHEN 'idiomas'          THEN CASE p_plan WHEN 'sala' THEN 2    WHEN 'ampliado' THEN 1   ELSE 0 END
  END
$function$;
