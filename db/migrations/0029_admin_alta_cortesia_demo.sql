-- 0029 · Central: clientes de cortesía y carta de demostración
-- · dk.admin_regalar_todo: plan Ampliado + Carta de Autor + idiomas + Pack Sala, gratis.
-- · dk.admin_carta_demo: rellena una carta vacía con una carta de ejemplo (para demos comerciales).
-- El alta manual (cuenta Neon Auth + restaurante) reutiliza dk.aprovisionar_cliente_qr
-- con referencias 'cortesia-…' (no hay pago que seguir, nunca entra en gracia).

CREATE OR REPLACE FUNCTION dk.admin_regalar_todo(p_restaurante uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE s text;
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.restaurantes SET plan = 'ampliado', nivel_diseno = 'autor', estado_acceso = 'activo', pago_fallido_desde = NULL
   WHERE id = p_restaurante;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002'; END IF;
  FOREACH s IN ARRAY ARRAY['setup_experto', 'idiomas', 'pack_sala'] LOOP
    INSERT INTO public.servicios_contratados (restaurante_id, servicio, origen)
    VALUES (p_restaurante, s, 'regalo') ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.regalar_todo', '{}'::jsonb, p_restaurante);
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_carta_demo(p_restaurante uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE v_sec uuid; v_n int := 0; v_s jsonb; v_p jsonb; v_orden int := 0; v_op int;
BEGIN
  PERFORM dk.exigir_admin();
  IF NOT EXISTS (SELECT 1 FROM public.restaurantes WHERE id = p_restaurante) THEN
    RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.menu_items WHERE restaurante_id = p_restaurante) THEN
    RAISE EXCEPTION 'la carta ya tiene platos' USING ERRCODE = '22023';
  END IF;
  FOR v_s IN SELECT * FROM jsonb_array_elements($j$[
    {"s":"Para compartir","p":[
      ["Croquetas de jamón ibérico","Cremosas, de receta de la casa. Seis unidades.",9.5,["GL","LE","HU"]],
      ["Patatas bravas","Con nuestra salsa brava ahumada y alioli suave.",6.5,["HU"]],
      ["Pimientos de Padrón","Fritos al momento con sal en escamas.",7,[]],
      ["Tabla de quesos","Selección de quesos nacionales con membrillo y nueces.",14,["LE","FR"]]]},
    {"s":"Principales","p":[
      ["Arroz meloso de marisco","Con gamba roja y mejillones. Mínimo dos personas, precio por persona.",18,["CR","MU","PE"]],
      ["Presa ibérica a la brasa","Con patata asada y pimientos confitados.",19.5,[]],
      ["Lubina a la espalda","Con refrito de ajo y guindilla.",21,["PE"]],
      ["Hamburguesa de la casa","Vaca madurada, cheddar, cebolla caramelizada y pan brioche.",14.5,["GL","LE","HU","SE"]]]},
    {"s":"Postres","p":[
      ["Tarta de queso","Horneada, con el centro cremoso.",6.5,["LE","HU","GL"]],
      ["Coulant de chocolate","Con helado de vainilla.",7,["GL","LE","HU"]],
      ["Fruta de temporada","",4.5,[]]]},
    {"s":"Bebidas","p":[
      ["Caña","",2.5,["GL"]],
      ["Copa de vino tinto","Ribera del Duero, crianza.",4,["SU"]],
      ["Agua mineral","",2,[]]]}
  ]$j$::jsonb) LOOP
    v_orden := v_orden + 1; v_op := 0;
    INSERT INTO public.menu_secciones (restaurante_id, nombre, orden) VALUES (p_restaurante, v_s->>'s', v_orden) RETURNING id INTO v_sec;
    FOR v_p IN SELECT * FROM jsonb_array_elements(v_s->'p') LOOP
      v_op := v_op + 1;
      INSERT INTO public.menu_items (restaurante_id, seccion_id, nombre, descripcion, precio, alergenos, orden)
      VALUES (p_restaurante, v_sec, v_p->>0, nullif(v_p->>1, ''), (v_p->>2)::numeric,
              ARRAY(SELECT jsonb_array_elements_text(v_p->3)), v_op);
      v_n := v_n + 1;
    END LOOP;
  END LOOP;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'admin.carta_demo', jsonb_build_object('platos', v_n), p_restaurante);
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_regalar_todo(uuid), dk.admin_carta_demo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_regalar_todo(uuid), dk.admin_carta_demo(uuid) TO dk_auth;
