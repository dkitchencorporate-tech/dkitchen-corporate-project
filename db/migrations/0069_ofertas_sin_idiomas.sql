-- 0069 (10/10/2026): tras la 0068, mi_uso_plan devuelve también «idiomas» (1 incluido); no debe contar
-- como «tope lleno» para proponer subir de plan. Solo cambia esa línea de dk.ofertas_para_mi.
BEGIN;
CREATE OR REPLACE FUNCTION dk.ofertas_para_mi()
 RETURNS TABLE(oferta text, motivo text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE r public.restaurantes%ROWTYPE; v_esc int; v_lleno boolean; cand text[] := '{}'; c text;
BEGIN
  SELECT * INTO r FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  IF NOT FOUND THEN RETURN; END IF;
  IF r.estado_acceso <> 'activo' THEN RETURN; END IF;
  v_esc := dk.escaneos_sostenidos(r.id);
  SELECT coalesce(bool_or(u.usados >= u.tope), false) INTO v_lleno FROM dk.mi_uso_plan() u WHERE u.que NOT IN ('banners', 'idiomas');

  IF r.plan = 'basico' THEN
    IF v_esc >= 150 OR v_lleno THEN cand := cand || 'plan_ampliado'::text; END IF;
  ELSIF r.plan = 'ampliado' THEN
    IF v_esc >= 600 OR v_lleno THEN cand := cand || 'plan_sala'::text; END IF;
    IF v_esc >= 250 THEN
      FOREACH c IN ARRAY ARRAY['comandero_pro', 'conexion_tpv'] LOOP
        IF NOT dk.tiene_servicio(r.id, c) THEN cand := cand || c; END IF;
      END LOOP;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.servicios_contratados s WHERE s.restaurante_id = r.id
                 AND s.servicio IN ('setup_esencial','setup_experto') AND s.estado <> 'cancelado')
     AND r.nivel_diseno = 'esencial' THEN
    cand := cand || 'setup_experto'::text;
  END IF;
  IF NOT dk.tiene_servicio(r.id, 'idiomas') THEN cand := cand || 'idiomas'::text; END IF;

  FOREACH c IN ARRAY cand LOOP
    CONTINUE WHEN c NOT IN ('plan_ampliado', 'plan_sala', 'nucleo') AND dk.tiene_servicio(r.id, c);
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.ofertas_eventos e WHERE e.restaurante_id = r.id AND e.oferta = c
                          AND e.tipo = 'cerrada' AND e.ocurrido_en > now() - interval '30 days');
    CONTINUE WHEN (SELECT count(*) FROM public.ofertas_eventos e WHERE e.restaurante_id = r.id AND e.oferta = c AND e.tipo = 'cerrada') >= 3;
    oferta := c;
    motivo := CASE c
      WHEN 'plan_ampliado' THEN CASE WHEN v_lleno THEN 'tope' ELSE 'escaneos' END
      WHEN 'plan_sala' THEN CASE WHEN v_lleno THEN 'tope' ELSE 'volumen' END
      WHEN 'nucleo' THEN 'volumen'
      WHEN 'setup_experto' THEN 'diseno'
      WHEN 'idiomas' THEN 'turismo'
      ELSE 'escaneos' END;
    RETURN NEXT;
    RETURN;
  END LOOP;
END;
$function$;

COMMIT;
