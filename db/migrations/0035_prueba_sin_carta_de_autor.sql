-- 0035 · La Carta de Autor (Setup Experto, 199 €) nunca entra gratis (karc0, 30/09/2026)
-- «Todo incluido» = plan Ampliado + idiomas + Pack Sala. El cliente elige su
-- plantilla, colores y letra (nivel esencial); la Carta de Autor se paga aparte.
CREATE OR REPLACE FUNCTION dk.admin_regalar_todo(p_restaurante uuid, p_dias int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE s text;
BEGIN
  PERFORM dk.exigir_admin();
  IF p_dias IS NOT NULL AND (p_dias < 1 OR p_dias > 120) THEN
    RAISE EXCEPTION 'la prueba debe durar entre 1 y 120 días' USING ERRCODE = '22023';
  END IF;
  UPDATE public.restaurantes
     SET plan = 'ampliado', estado_acceso = 'activo', pago_fallido_desde = NULL,
         prueba_hasta = CASE WHEN p_dias IS NULL THEN NULL ELSE current_date + p_dias END
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  FOREACH s IN ARRAY ARRAY['idiomas', 'pack_sala'] LOOP
    INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen)
    VALUES (p_restaurante, s, 'regalo') ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.regalar_todo', jsonb_build_object('dias', p_dias), p_restaurante);
END;
$$;

-- Corrige las pruebas ya abiertas: se retira la Carta de Autor regalada y vuelven al diseño esencial.
UPDATE public.servicios_contratados s SET estado = 'cancelado', cancelado_en = now()
  FROM public.restaurantes r
 WHERE s.restaurante_id = r.id AND r.prueba_hasta IS NOT NULL
   AND s.servicio = 'setup_experto' AND s.origen = 'regalo' AND s.estado <> 'cancelado';
UPDATE public.restaurantes SET nivel_diseno = 'esencial'
 WHERE prueba_hasta IS NOT NULL AND nivel_diseno = 'autor';
