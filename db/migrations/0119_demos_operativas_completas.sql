-- =============================================================================
-- 0119 · Demos operativas completas (20/11/2026)
-- 1. dk.prosp_crear_demo:
--    - Corrige etiqueta 'estrella' -> 'recomendado' (cumple menu_items_etiqueta_check
--      al crear demos para cualquier prospecto nuevo desde cero o en Calle Express).
--    - Retira 'setup_experto' (servicio cancelado) de servicios_contratados de demo.
--    - Crea automáticamente 2 miembros de equipo en public.camareros (Lucía encargada
--      y Marcos camarero) y los asigna a las 4 mesas del plano para que las pestañas
--      Sala, Equipo y Pedidos del panel real (/panel) funcionen al 100 % en el acto.
-- 2. dk.mesa_pedir:
--    - En demos internas (v_modo = 'demo'), además de devolver 'demo' al móvil del
--      comensal, registra el pedido real en public.pedidos_mesa, abre o reutiliza
--      la cuenta en public.cuentas_mesa e inserta la ronda entrante en
--      public.registros_sala y public.lineas_cuenta. Así el pedido entra en vivo
--      con alarma sonora en la pestaña Pedidos (/panel) durante la demostración.
-- =============================================================================

CREATE OR REPLACE FUNCTION dk.prosp_crear_demo(
  p_prospecto uuid,
  p_plantilla text DEFAULT 'taberna'::text,
  p_color text DEFAULT '#6E0C2B'::text,
  p_fondo text DEFAULT 'papel'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'dk', 'public', 'pg_catalog'
AS $function$
DECLARE
  v_rol text := dk.prosp_exigir(p_prospecto);
  v_rol_admin text := dk.rol_admin_actual();
  v_cfg jsonb;
  v_tope_demos int := 10;
  v_tope_img int := 10;
  v_demos_usadas int := 0;
  p public.prospectos%ROWTYPE;
  v_plantilla text := CASE WHEN p_plantilla IN ('clasica', 'visual', 'express', 'editorial', 'premium', 'gastro', 'taberna', 'urbano') THEN p_plantilla ELSE 'taberna' END;
  v_color text := CASE WHEN p_color ~ '^#[0-9a-fA-F]{6}$' THEN upper(p_color) ELSE '#6E0C2B' END;
  v_fondo text := CASE WHEN p_fondo IN ('papel', 'blanco', 'oscuro') THEN p_fondo ELSE 'papel' END;
  v_slug_base text;
  v_slug text;
  v_idn uuid;
  v_rest uuid;
  v_socio uuid;
  v_token text;
  v_firma jsonb;
  v_sec uuid;
  v_s jsonb;
  v_p jsonb;
  v_orden int := 0;
  v_op int;
  v_cam1 uuid;
  v_cam2 uuid;
BEGIN
  IF coalesce(dk.es_admin_academia(), false) THEN
    v_cfg := dk.mi_config_comercial();
    IF NOT coalesce((v_cfg ->> 'puede_crear_demos')::boolean, true) THEN
      RAISE EXCEPTION 'no autorizado: creacion de demos desactivada en tu perfil' USING ERRCODE = '42501';
    END IF;
    v_tope_demos := coalesce((v_cfg ->> 'tope_demos')::int, 10);
    v_tope_img := coalesce((v_cfg ->> 'tope_imagenes_demo')::int, 10);
  END IF;

  SELECT * INTO p FROM public.prospectos WHERE id = p_prospecto FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'prospecto no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF p.restaurante_id IS NOT NULL THEN
    SELECT id, slug INTO v_rest, v_slug FROM public.restaurantes WHERE id = p.restaurante_id;
  END IF;

  IF v_rest IS NULL AND v_rol_admin <> 'direccion' THEN
    SELECT count(*)::int INTO v_demos_usadas
      FROM public.prospectos
     WHERE comercial_id = dk.identidad_actual() AND restaurante_id IS NOT NULL;
    IF v_demos_usadas >= v_tope_demos THEN
      RAISE EXCEPTION 'tope_demos_comercial' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT id INTO v_socio FROM public.socios WHERE id = p.comercial_id AND activo;

  v_firma := jsonb_build_object(
    'lema', coalesce('Cocina con identidad propia en ' || p.zona, 'Nuestra carta digital'),
    'nota', 'Elaboramos cada plato al momento con producto seleccionado. Pregunta a nuestro equipo por las sugerencias de hoy.',
    'autor', p.nombre,
    'adorno', CASE WHEN v_plantilla = 'gastro' THEN 'rombo' WHEN v_plantilla = 'urbano' THEN 'sello' ELSE 'estrella' END,
    'destacados', 'Recomendados de la casa'
  );

  IF v_rest IS NULL THEN
    v_slug_base := coalesce(nullif(left(regexp_replace(lower(translate(p.nombre, 'áéíóúàèìòùäëïöüñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ', 'aeiouaeiouaeiounAEIOUAEIOUAEIOUN')), '[^a-z0-9]+', '-', 'g'), 34), ''), 'local');
    v_slug_base := trim(both '-' from v_slug_base);
    IF v_slug_base = '' THEN v_slug_base := 'local'; END IF;
    v_slug := dk.slug_disponible(v_slug_base);

    INSERT INTO public.identidades (id, email, nombre, rol)
    VALUES (gen_random_uuid(), 'demo+' || v_slug || '@dkitchencorporate.es', 'Demo · ' || left(p.nombre, 80), 'cliente')
    RETURNING id INTO v_idn;

    INSERT INTO public.restaurantes (
      propietario, slug, nombre, plan, plantilla, nivel_diseno, estilo_fondo, color_marca, firma,
      demo_interna, comercial_id, socio_id, socio_puede_editar, ciudad, direccion, telefono, instagram, idiomas, estado_acceso, activo,
      descripcion, horario
    )
    VALUES (
      v_idn, v_slug, p.nombre, 'sala', v_plantilla, 'autor', v_fondo, v_color, v_firma,
      true, p.comercial_id, v_socio, true, p.zona, p.direccion, p.telefono, p.instagram, '{en}', 'activo', true,
      coalesce('Cocina y especialidad en ' || p.zona, 'Cocina de temporada'),
      'Martes a domingo · 13:00–16:30 y 20:00–23:30'
    )
    RETURNING id INTO v_rest;

    INSERT INTO public.codigos_qr (codigo, restaurante_id)
    VALUES (left(replace(gen_random_uuid()::text, '-', ''), 12), v_rest);
  ELSE
    UPDATE public.restaurantes
       SET plantilla = v_plantilla,
           nivel_diseno = 'autor',
           estilo_fondo = v_fondo,
           color_marca = v_color,
           firma = coalesce(firma, v_firma),
           comercial_id = coalesce(comercial_id, p.comercial_id),
           socio_id = coalesce(socio_id, v_socio),
           socio_puede_editar = true,
           plan = 'sala',
           estado_acceso = 'activo',
           activo = true,
           archivado_en = NULL
     WHERE id = v_rest;
  END IF;

  -- Servicios activos en la demo (sin setup_experto cancelado)
  DELETE FROM public.servicios_contratados WHERE restaurante_id = v_rest AND servicio = 'setup_experto';
  INSERT INTO public.servicios_contratados (restaurante_id, servicio, estado, origen)
  SELECT v_rest, s, 'activo', 'regalo'
    FROM unnest(ARRAY['plano_mesas', 'app_sala', 'conexion_tpv', 'pack_sala', 'idiomas']) AS s
   WHERE NOT EXISTS (
     SELECT 1 FROM public.servicios_contratados sc WHERE sc.restaurante_id = v_rest AND sc.servicio = s
   );
  UPDATE public.servicios_contratados SET estado = 'activo'
   WHERE restaurante_id = v_rest AND servicio IN ('plano_mesas', 'app_sala', 'conexion_tpv', 'pack_sala', 'idiomas');

  -- Créditos visuales iniciales para personalizar la demo
  IF NOT EXISTS (SELECT 1 FROM public.ia_movimientos WHERE referencia = 'demo-' || v_rest::text) THEN
    INSERT INTO public.ia_movimientos (restaurante_id, tipo, cantidad, coste_usd, referencia, detalle)
    VALUES (
      v_rest,
      'compra',
      CASE WHEN v_rol_admin = 'direccion' THEN 100 ELSE greatest(1, v_tope_img - dk.ia_gratis()) END,
      0,
      'demo-' || v_rest::text,
      'Créditos visuales incluidos para personalizar la demo comercial'
    );
  END IF;

  -- Crear equipo de sala de muestra (Lucía encargada y Marcos camarero) si no tiene
  IF NOT EXISTS (SELECT 1 FROM public.camareros WHERE restaurante_id = v_rest) THEN
    INSERT INTO public.camareros (restaurante_id, nombre, token_hash, activo, rol, ultimo_acceso)
    VALUES (v_rest, 'Lucía', md5('demo-cam1-' || v_rest::text) || md5('sal-' || v_rest::text), true, 'encargado', now() - interval '12 minutes')
    RETURNING id INTO v_cam1;

    INSERT INTO public.camareros (restaurante_id, nombre, token_hash, activo, rol, ultimo_acceso)
    VALUES (v_rest, 'Marcos', md5('demo-cam2-' || v_rest::text) || md5('sal2-' || v_rest::text), true, 'camarero', now() - interval '5 minutes')
    RETURNING id INTO v_cam2;
  ELSE
    SELECT id INTO v_cam1 FROM public.camareros WHERE restaurante_id = v_rest ORDER BY (rol = 'encargado') DESC, creado_en LIMIT 1;
    SELECT id INTO v_cam2 FROM public.camareros WHERE restaurante_id = v_rest AND id IS DISTINCT FROM v_cam1 ORDER BY creado_en LIMIT 1;
    v_cam2 := coalesce(v_cam2, v_cam1);
  END IF;

  -- Crear 4 mesas de muestra en el plano de sala si aún no tiene mesas
  IF NOT EXISTS (SELECT 1 FROM public.mesas WHERE restaurante_id = v_rest) THEN
    INSERT INTO public.mesas (restaurante_id, numero, zona, plazas, forma, x, y, ancho, alto, camarero_id)
    VALUES
      (v_rest, '1', 'Sala', 4, 'cuadrada', 18, 22, 12, 12, v_cam1),
      (v_rest, '2', 'Sala', 4, 'cuadrada', 42, 22, 12, 12, v_cam1),
      (v_rest, '3', 'Sala', 6, 'rectangular', 68, 22, 16, 12, v_cam2),
      (v_rest, '4', 'Terraza', 4, 'redonda', 30, 58, 12, 12, v_cam2);
  ELSE
    UPDATE public.mesas SET camarero_id = coalesce(camarero_id, CASE WHEN zona = 'Terraza' OR numero IN ('3','4') THEN v_cam2 ELSE v_cam1 END)
     WHERE restaurante_id = v_rest AND camarero_id IS NULL;
  END IF;

  -- Cargar carta de demostración con fotos si aún no tiene platos (etiqueta 'recomendado' válida en CHECK)
  IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE restaurante_id = v_rest) THEN
    FOR v_s IN SELECT * FROM jsonb_array_elements($j$[
      {"s":"Para compartir","p":[
        ["Croquetas de jamón ibérico","Cremosas, de receta de la casa. Seis unidades.",9.5,["GL","LE","HU"],"https://dkitchencorporate.es/images/demo/s5.png","recomendado"],
        ["Tartar de atún rojo","Con aguacate, lima y sésamo tostado.",16.0,["PE","SE"],"https://dkitchencorporate.es/images/demo/s1.png","nuevo"],
        ["Patatas bravas ahumadas","Con nuestra salsa brava casera y alioli suave.",6.5,["HU"],"https://dkitchencorporate.es/images/demo/t1.jpeg",null],
        ["Tabla de quesos artesanos","Selección nacional con membrillo y nueces.",14.0,["LE","FR"],"https://dkitchencorporate.es/images/demo/t4.jpeg",null]]},
      {"s":"Principales","p":[
        ["Presa ibérica a la brasa","Con patata asada al romero y pimientos confitados.",19.5,[],"https://dkitchencorporate.es/images/demo/s18.jpeg","recomendado"],
        ["Bacalao negro glaseado","Lomo confitado a baja temperatura con emulsión suave.",22.0,["PE","SO"],"https://dkitchencorporate.es/images/demo/s17.png",null],
        ["Arroz meloso de marisco","Con gamba roja y mejillones de roca.",18.5,["CR","MU","PE"],"https://dkitchencorporate.es/images/demo/s12.png",null],
        ["Brioche de costilla asada","Cocinada 12 horas en su jugo con queso fundido.",15.0,["GL","LE","HU","SE"],"https://dkitchencorporate.es/images/demo/t7.jpeg","nuevo"]]},
      {"s":"Postres caseros","p":[
        ["Tarta de queso al horno","Cremosa por dentro, con base de galleta artesana.",6.5,["LE","HU","GL"],"https://dkitchencorporate.es/images/demo/s22.jpeg","recomendado"],
        ["Coulant de chocolate 70%","Recién horneado con helado de vainilla Bourbon.",7.0,["GL","LE","HU"],"https://dkitchencorporate.es/images/demo/s21.png",null]]},
      {"s":"Bodega y bebidas","p":[
        ["Copa de vino tinto Crianza","Selección de la casa.",3.8,["SU"],"https://dkitchencorporate.es/images/demo/s25.jpeg",null],
        ["Cerveza de barril bien fría","Tirada maestra.",2.6,["GL"],"https://dkitchencorporate.es/images/demo/s26.jpeg",null],
        ["Agua mineral natural","50 cl.",2.2,[],null,null]]}
    ]$j$::jsonb) LOOP
      v_orden := v_orden + 1; v_op := 0;
      INSERT INTO public.menu_secciones (restaurante_id, nombre, orden)
      VALUES (v_rest, v_s->>'s', v_orden)
      RETURNING id INTO v_sec;
      FOR v_p IN SELECT * FROM jsonb_array_elements(v_s->'p') LOOP
        v_op := v_op + 1;
        INSERT INTO public.menu_items (restaurante_id, seccion_id, nombre, descripcion, precio, alergenos, foto_url, etiqueta, orden)
        VALUES (
          v_rest, v_sec, v_p->>0, nullif(v_p->>1, ''), (v_p->>2)::numeric,
          ARRAY(SELECT jsonb_array_elements_text(v_p->3)), nullif(v_p->>4, ''), nullif(v_p->>5, ''), v_op
        );
      END LOOP;
    END LOOP;
  END IF;

  v_token := coalesce(p.propuesta_token, replace(gen_random_uuid()::text, '-', ''));

  UPDATE public.prospectos
     SET restaurante_id = v_rest,
         propuesta_token = v_token,
         muestra_url = NULL,
         estado = CASE WHEN estado IN ('por_revisar', 'por_visitar', 'muestra', 'visitado') THEN 'demo' ELSE estado END,
         actualizado_en = now()
   WHERE id = p_prospecto;

  INSERT INTO public.prospecto_eventos (prospecto_id, identidad, tipo, texto)
  VALUES (p_prospecto, dk.identidad_actual(), 'nota', 'Demo de autor lista (Carta + Panel Admin): /m/' || v_slug);

  RETURN jsonb_build_object(
    'restaurante_id', v_rest,
    'slug', v_slug,
    'propuesta_token', v_token
  );
END;
$function$;

CREATE OR REPLACE FUNCTION dk.mesa_pedir(
  p_slug text,
  p_mesa text,
  p_lineas jsonb,
  p_nota text DEFAULT NULL::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_rest public.restaurantes%ROWTYPE;
  v_modo text;
  v_lineas jsonb;
  v_n int;
  v_cuenta uuid;
  v_reg uuid;
  v_cam uuid;
  v_nota_limpia text := nullif(left(btrim(coalesce(p_nota, '')), 200), '');
BEGIN
  IF p_mesa IS NULL OR p_mesa !~ '^[A-Za-z0-9-]{1,12}$' OR jsonb_typeof(p_lineas) <> 'array'
     OR jsonb_array_length(p_lineas) NOT BETWEEN 1 AND 30 THEN RETURN 'datos'; END IF;
  SELECT * INTO v_rest FROM public.restaurantes r
   WHERE r.slug = lower(p_slug) AND r.activo AND r.estado_acceso IN ('activo', 'gracia') AND r.archivado_en IS NULL;
  IF NOT FOUND THEN RETURN 'no_disponible'; END IF;
  v_modo := CASE WHEN v_rest.demo_interna THEN 'demo' WHEN dk.plan_nivel(v_rest.plan) >= 2 THEN 'real' END;
  IF v_modo IS NULL THEN RETURN 'no_disponible'; END IF;

  -- Solo platos disponibles de ESTE local; cantidades y notas acotadas; el precio lo pone la base.
  SELECT jsonb_agg(jsonb_build_object('plato_id', i.id, 'nombre', i.nombre,
           'cantidad', least(20, greatest(1, (l->>'cantidad')::int)),
           'nota', coalesce(nullif(left(coalesce(l->>'nota', ''), 120), ''), coalesce(v_nota_limpia, '')),
           'precio', dk.precio_vigente(i))), count(*)
    INTO v_lineas, v_n
    FROM jsonb_array_elements(p_lineas) l
    JOIN public.menu_items i ON i.id = (l->>'plato_id')::uuid AND i.restaurante_id = v_rest.id AND i.disponible;
  IF v_lineas IS NULL OR v_n <> jsonb_array_length(p_lineas) THEN RETURN 'datos'; END IF;

  IF v_modo = 'demo' THEN
    -- En demos comerciales: purgar pruebas de más de 24 h, permitir pedidos seguidos sin espera de 60 s,
    -- e impactar tanto en pedidos_mesa como en cuentas_mesa/registros_sala para que suene en vivo en /panel -> Pedidos.
    DELETE FROM public.pedidos_mesa WHERE restaurante_id = v_rest.id AND creado_en < now() - interval '24 hours';
    DELETE FROM public.cuentas_mesa WHERE restaurante_id = v_rest.id AND abierta_en < now() - interval '24 hours';
    IF (SELECT count(*) FROM public.registros_sala s WHERE s.restaurante_id = v_rest.id AND s.revisado_en IS NULL
          AND s.creado_en > now() - interval '3 hours') >= 40 THEN
      RETURN 'demo';
    END IF;

    SELECT coalesce(m.camarero_id, (SELECT c.id FROM public.camareros c WHERE c.restaurante_id = v_rest.id AND c.activo ORDER BY (c.rol = 'encargado') DESC, c.creado_en LIMIT 1))
      INTO v_cam
      FROM (SELECT 1) d
      LEFT JOIN public.mesas m ON m.restaurante_id = v_rest.id AND m.numero = p_mesa
      LIMIT 1;

    SELECT id INTO v_cuenta FROM public.cuentas_mesa WHERE restaurante_id = v_rest.id AND mesa = p_mesa AND estado = 'abierta' LIMIT 1;
    IF v_cuenta IS NULL THEN
      INSERT INTO public.cuentas_mesa (restaurante_id, mesa, comensales, abierta_por)
      VALUES (v_rest.id, p_mesa, 4, v_cam)
      RETURNING id INTO v_cuenta;
    END IF;

    INSERT INTO public.registros_sala (restaurante_id, mesa, camarero_id, lineas, cuenta_id)
    VALUES (v_rest.id, p_mesa, v_cam, v_lineas, v_cuenta)
    RETURNING id INTO v_reg;

    INSERT INTO public.lineas_cuenta (cuenta_id, restaurante_id, registro_id, plato_id, nombre, cantidad, precio_unitario, nota, camarero_id)
    SELECT v_cuenta, v_rest.id, v_reg, (x->>'plato_id')::uuid, x->>'nombre', (x->>'cantidad')::smallint,
           (x->>'precio')::numeric, coalesce(x->>'nota', ''), v_cam
      FROM jsonb_array_elements(v_lineas) x;

    INSERT INTO public.pedidos_mesa (restaurante_id, mesa, lineas, nota, estado, registro_id, camarero_id, resuelto_en)
    VALUES (v_rest.id, p_mesa, v_lineas, v_nota_limpia, 'confirmado', v_reg, v_cam, now());

    RETURN 'demo';
  END IF;

  -- Modo real: un pedido pendiente por mesa cada 60 s y como mucho 40 pendientes por local a la vez.
  IF EXISTS (SELECT 1 FROM public.pedidos_mesa p WHERE p.restaurante_id = v_rest.id AND p.mesa = p_mesa
              AND p.estado = 'pendiente' AND p.creado_en > now() - interval '60 seconds') THEN RETURN 'espera'; END IF;
  IF (SELECT count(*) FROM public.pedidos_mesa p WHERE p.restaurante_id = v_rest.id AND p.estado = 'pendiente'
        AND p.creado_en > now() - interval '3 hours') >= 40 THEN RETURN 'limite'; END IF;
  INSERT INTO public.pedidos_mesa (restaurante_id, mesa, lineas, nota)
  VALUES (v_rest.id, p_mesa, v_lineas, v_nota_limpia);
  DELETE FROM public.pedidos_mesa WHERE restaurante_id = v_rest.id AND creado_en < now() - interval '30 days';
  RETURN 'ok';
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN 'datos';
END;
$function$;

-- Saneamiento retroactivo de todas las demos internas existentes:
-- 1) Retirar 'setup_experto' cancelado de servicios_contratados en demos internas.
DELETE FROM public.servicios_contratados sc
 USING public.restaurantes r
 WHERE sc.restaurante_id = r.id AND r.demo_interna = true AND sc.servicio = 'setup_experto';

-- 2) Poblar equipo de sala (Lucía encargada y Marcos camarero) en demos internas que aún no tenían camareros.
DO $$
DECLARE
  r RECORD;
  v_c1 uuid;
  v_c2 uuid;
BEGIN
  FOR r IN SELECT id FROM public.restaurantes WHERE demo_interna = true AND archivado_en IS NULL LOOP
    IF NOT EXISTS (SELECT 1 FROM public.camareros WHERE restaurante_id = r.id) THEN
      INSERT INTO public.camareros (restaurante_id, nombre, token_hash, activo, rol, ultimo_acceso)
      VALUES (r.id, 'Lucía', md5('demo-cam1-' || r.id::text) || md5('sal-' || r.id::text), true, 'encargado', now() - interval '12 minutes')
      RETURNING id INTO v_c1;

      INSERT INTO public.camareros (restaurante_id, nombre, token_hash, activo, rol, ultimo_acceso)
      VALUES (r.id, 'Marcos', md5('demo-cam2-' || r.id::text) || md5('sal2-' || r.id::text), true, 'camarero', now() - interval '5 minutes')
      RETURNING id INTO v_c2;

      UPDATE public.mesas
         SET camarero_id = CASE WHEN zona = 'Terraza' OR numero IN ('3','4') THEN v_c2 ELSE v_c1 END
       WHERE restaurante_id = r.id AND camarero_id IS NULL;
    END IF;
  END LOOP;
END;
$$;
