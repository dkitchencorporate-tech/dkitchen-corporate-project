-- =============================================================================
-- 0121 · Demos de Autor x56 + Vista Previa en Propuesta + Panel Completo (20/11/2026)
-- 1. dk.propuesta_ver: devuelve también demo_logo, demo_portada, demo_color,
--    demo_plantilla, demo_lema y demo_platos (3 destacados con foto y precio).
-- 2. dk.demo_panel_datos: devuelve también logoUrl, portadaUrl, portadaConNombre,
--    urlResenas, firma y promociones activas del local.
-- 3. dk.prosp_crear_demo: crea siempre composiciones de autor ('gastro', 'taberna'
--    o 'urbano'), asigna emblema vectorial propio (/api/emblema/<slug>), portada
--    panorámica, enlace a Google Reseñas, 1 banner promocional en public.promociones,
--    menú adaptado al perfil del negocio (100 % con foto_url y >= 4 destacados).
-- =============================================================================

CREATE OR REPLACE FUNCTION dk.propuesta_ver(
  p_token text,
  p_contar boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  p public.prospectos%ROWTYPE;
  v_rest public.restaurantes%ROWTYPE;
  v_tiene_rest boolean := false;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{32}$' THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.prospectos WHERE propuesta_token = p_token;
  IF NOT FOUND OR p.no_contactar THEN RETURN NULL; END IF;

  IF coalesce(p_contar, true)
     AND (p.propuesta_vista_en IS NULL OR p.propuesta_vista_en < now() - interval '30 minutes') THEN
    UPDATE public.prospectos
       SET propuesta_vistas = propuesta_vistas + 1,
           propuesta_vista_en = now()
     WHERE id = p.id;
    INSERT INTO public.prospecto_eventos (prospecto_id, tipo) VALUES (p.id, 'propuesta_vista');
  END IF;

  IF p.restaurante_id IS NOT NULL THEN
    SELECT * INTO v_rest
      FROM public.restaurantes r
     WHERE r.id = p.restaurante_id
       AND r.archivado_en IS NULL;
    v_tiene_rest := FOUND;
  END IF;

  RETURN jsonb_build_object(
    'nombre', p.nombre,
    'tipo', p.tipo,
    'zona', p.zona,
    'texto', p.propuesta_texto,
    'muestra_url', p.muestra_url,
    'oferta', p.oferta,
    'comercial', (SELECT coalesce(c.nombre_publico, s.nombre, i.nombre, 'DKitchen') FROM public.identidades i
                    LEFT JOIN public.socios s ON s.id = i.id LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
                   WHERE i.id = p.comercial_id),
    'telefono', (SELECT c.telefono FROM public.comerciales_contacto c WHERE c.identidad = p.comercial_id),
    'codigo', (SELECT s.codigo FROM public.socios s WHERE s.id = p.comercial_id AND s.activo),
    'demo_slug', CASE WHEN v_tiene_rest THEN v_rest.slug END,
    'pago_url', (SELECT e.url FROM public.enlaces_pago e WHERE e.restaurante_id = p.restaurante_id AND e.estado = 'pendiente' AND e.url IS NOT NULL
                  ORDER BY e.creado_en DESC LIMIT 1),
    'demo_logo', CASE WHEN v_tiene_rest THEN v_rest.logo_url END,
    'demo_portada', CASE WHEN v_tiene_rest THEN v_rest.portada_url END,
    'demo_color', CASE WHEN v_tiene_rest THEN v_rest.color_marca END,
    'demo_plantilla', CASE WHEN v_tiene_rest THEN v_rest.plantilla END,
    'demo_lema', CASE WHEN v_tiene_rest THEN (v_rest.firma ->> 'lema') END,
    'demo_platos', CASE WHEN v_tiene_rest THEN coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'nombre', q.nombre,
        'precio', to_char(q.precio, 'FM999990.00'),
        'foto_url', q.foto_url
      ))
      FROM (
        SELECT mi.nombre, dk.precio_vigente(mi) AS precio, mi.foto_url
          FROM public.menu_items mi
         WHERE mi.restaurante_id = v_rest.id
           AND mi.disponible
           AND mi.foto_url IS NOT NULL
         ORDER BY (mi.etiqueta IN ('recomendado', 'especial')) DESC, mi.orden, mi.nombre
         LIMIT 3
      ) q
    ), '[]'::jsonb) ELSE '[]'::jsonb END
  );
END;
$function$;

REVOKE ALL ON FUNCTION dk.propuesta_ver(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.propuesta_ver(text, boolean) TO dk_anon, dk_auth;

CREATE OR REPLACE FUNCTION dk.demo_panel_datos(
  p_slug text,
  p_contar boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  r public.restaurantes%ROWTYPE;
  v_prosp uuid;
BEGIN
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN RETURN NULL; END IF;
  SELECT * INTO r
    FROM public.restaurantes
   WHERE slug = lower(btrim(p_slug))
     AND demo_interna = true
     AND archivado_en IS NULL
   LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Solo contabiliza aperturas externas reales (p_contar = true; máx. 1 cada 30 min)
  IF coalesce(p_contar, true) THEN
    SELECT id INTO v_prosp FROM public.prospectos WHERE restaurante_id = r.id LIMIT 1;
    IF v_prosp IS NOT NULL THEN
      UPDATE public.prospectos
         SET demo_vistas = coalesce(demo_vistas, 0) + 1,
             demo_vista_en = now()
       WHERE id = v_prosp
         AND (demo_vista_en IS NULL OR demo_vista_en < now() - interval '30 minutes');
      IF FOUND THEN
        INSERT INTO public.prospecto_eventos (prospecto_id, tipo) VALUES (v_prosp, 'demo_vista');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', r.id,
    'slug', r.slug,
    'nombre', r.nombre,
    'logoUrl', r.logo_url,
    'portadaUrl', r.portada_url,
    'portadaConNombre', coalesce(r.portada_con_nombre, false),
    'urlResenas', r.url_resenas,
    'colorMarca', coalesce(r.color_marca, '#6E0C2B'),
    'plantilla', coalesce(r.plantilla, 'taberna'),
    'estiloFondo', coalesce(r.estilo_fondo, 'papel'),
    'estiloLetra', coalesce(r.estilo_letra, 'sans'),
    'firma', coalesce(r.firma, '{}'::jsonb),
    'descripcion', coalesce(r.descripcion, 'Cocina de temporada'),
    'telefono', coalesce(r.telefono, '+34 600 000 000'),
    'direccion', coalesce(r.direccion, 'España'),
    'horario', coalesce(r.horario, 'Martes a domingo · 13:00–16:30 y 20:00–23:30'),
    'instagram', r.instagram,
    'secciones', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', s.id::text, 'nombre', s.nombre, 'orden', s.orden) ORDER BY s.orden)
        FROM public.menu_secciones s WHERE s.restaurante_id = r.id
    ), '[]'::jsonb),
    'platos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id::text,
        'seccionId', i.seccion_id::text,
        'nombre', i.nombre,
        'descripcion', coalesce(i.descripcion, ''),
        'precio', to_char(i.precio, 'FM999990.00'),
        'fotoUrl', i.foto_url,
        'alergenos', coalesce(to_jsonb(i.alergenos), '[]'::jsonb),
        'disponible', i.disponible,
        'orden', i.orden
      ) ORDER BY i.orden)
        FROM public.menu_items i WHERE i.restaurante_id = r.id
    ), '[]'::jsonb),
    'promociones', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id::text,
        'titulo', pr.titulo,
        'texto', pr.texto,
        'imagenUrl', pr.imagen_url,
        'botonTexto', pr.boton_texto,
        'botonSeccion', pr.boton_seccion::text,
        'botonDestino', coalesce(pr.boton_destino, 'inicio'),
        'botonPlato', pr.boton_plato::text,
        'inicio', to_char(pr.inicio, 'YYYY-MM-DD'),
        'fin', to_char(pr.fin, 'YYYY-MM-DD'),
        'dias', pr.dias,
        'horaInicio', to_char(pr.hora_inicio, 'HH24:MI'),
        'horaFin', to_char(pr.hora_fin, 'HH24:MI'),
        'prioridad', pr.prioridad,
        'activa', pr.activa,
        'vistas', pr.vistas,
        'clics', pr.clics
      ) ORDER BY pr.activa DESC, pr.prioridad DESC, pr.creado_en DESC)
        FROM public.promociones pr WHERE pr.restaurante_id = r.id
    ), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION dk.demo_panel_datos(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.demo_panel_datos(text, boolean) TO dk_anon, dk_auth;

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
  v_plantilla text;
  v_color text := CASE WHEN p_color ~ '^#[0-9a-fA-F]{6}$' THEN upper(p_color) ELSE '#6E0C2B' END;
  v_fondo text := CASE WHEN p_fondo IN ('papel', 'blanco', 'oscuro') THEN p_fondo ELSE 'papel' END;
  v_slug_base text;
  v_slug text;
  v_idn uuid;
  v_rest uuid;
  v_socio uuid;
  v_token text;
  v_firma jsonb;
  v_logo text;
  v_portada text;
  v_resenas text;
  v_carta_json jsonb;
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

  v_plantilla := CASE
    WHEN p_plantilla IN ('gastro', 'taberna', 'urbano') THEN p_plantilla
    WHEN p.tipo IN ('hamburgueseria', 'pizzeria', 'kebab') THEN 'urbano'
    WHEN p.oferta = 'experience' OR p.tipo = 'asador' THEN 'gastro'
    ELSE 'taberna'
  END;

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

  IF v_rest IS NULL THEN
    v_slug_base := coalesce(nullif(left(regexp_replace(lower(translate(p.nombre, 'áéíóúàèìòùäëïöüñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ', 'aeiouaeiouaeiounAEIOUAEIOUAEIOUN')), '[^a-z0-9]+', '-', 'g'), 34), ''), 'local');
    v_slug_base := trim(both '-' from v_slug_base);
    IF v_slug_base = '' THEN v_slug_base := 'local'; END IF;
    v_slug := dk.slug_disponible(v_slug_base);
  END IF;

  v_logo := 'https://dkitchencorporate.es/api/emblema/' || v_slug || '?c=' || substr(v_color, 2) || '&e=' || v_plantilla;
  v_portada := CASE
    WHEN v_plantilla = 'urbano' THEN 'https://dkitchencorporate.es/images/demo/especial/portada-urbano.webp'
    WHEN v_plantilla = 'gastro' THEN 'https://dkitchencorporate.es/images/experience/experience-mesa-del-chef-16x9.webp'
    ELSE 'https://dkitchencorporate.es/images/demo/especial/portada-taberna.webp'
  END;
  v_resenas := left('https://www.google.com/maps/search/?api=1&query=' || regexp_replace(btrim(p.nombre || ' ' || p.zona), '\s+', '+', 'g'), 295);

  v_firma := jsonb_build_object(
    'lema', left(coalesce(
      CASE WHEN v_plantilla = 'urbano' THEN 'Recién hecho al momento en ' || p.zona
           WHEN v_plantilla = 'gastro' THEN 'Cocina de autor y producto en ' || p.zona
           ELSE 'Tapas, raciones y sabor en ' || p.zona END,
      'Nuestra carta digital'
    ), 120),
    'nota', 'Elaboramos cada plato al momento con producto seleccionado. Pregunta a nuestro equipo por las sugerencias del día.',
    'autor', left(p.nombre, 60),
    'adorno', CASE WHEN v_plantilla = 'gastro' THEN 'rombo' WHEN v_plantilla = 'urbano' THEN 'sello' ELSE 'estrella' END,
    'destacados', CASE WHEN v_plantilla = 'urbano' THEN 'Los que más piden' WHEN v_plantilla = 'gastro' THEN 'Selección del chef' ELSE 'De la pizarra hoy' END
  );

  IF v_rest IS NULL THEN
    INSERT INTO public.identidades (id, email, nombre, rol)
    VALUES (gen_random_uuid(), 'demo+' || v_slug || '@dkitchencorporate.es', 'Demo · ' || left(p.nombre, 80), 'cliente')
    RETURNING id INTO v_idn;

    INSERT INTO public.restaurantes (
      propietario, slug, nombre, plan, plantilla, nivel_diseno, estilo_fondo, estilo_letra, color_marca, firma,
      logo_url, portada_url, portada_con_nombre, url_resenas,
      demo_interna, comercial_id, socio_id, socio_puede_editar, ciudad, direccion, telefono, instagram, idiomas, estado_acceso, activo,
      descripcion, horario
    )
    VALUES (
      v_idn, v_slug, p.nombre, 'sala', v_plantilla, 'autor', v_fondo,
      CASE WHEN v_plantilla = 'urbano' THEN 'sans' ELSE 'serif' END,
      v_color, v_firma, v_logo, v_portada, false, v_resenas,
      true, p.comercial_id, v_socio, true, p.zona, p.direccion, p.telefono, p.instagram, '{en}', 'activo', true,
      left(coalesce('Carta de especialidad en ' || p.zona || ' con alérgenos detallados y servicio en mesa.', 'Cocina de temporada'), 280),
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
           logo_url = coalesce(logo_url, v_logo),
           portada_url = coalesce(portada_url, v_portada),
           portada_con_nombre = false,
           url_resenas = coalesce(url_resenas, v_resenas),
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

  -- Banner promocional activo si no existe
  IF NOT EXISTS (SELECT 1 FROM public.promociones WHERE restaurante_id = v_rest) THEN
    INSERT INTO public.promociones (restaurante_id, titulo, texto, imagen_url, boton_texto, boton_destino, prioridad, activa)
    VALUES (
      v_rest,
      left('Sugerencias de hoy en ' || p.nombre, 60),
      left('Carta digital interactiva en ' || p.zona || ' con reserva directa sin esperas.', 160),
      v_portada,
      'Reservar mesa',
      'reservar',
      5,
      true
    );
  END IF;

  -- Cargar carta de demostración adaptada por composición (100 % con foto_url y >= 4 destacados)
  IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE restaurante_id = v_rest) THEN
    IF v_plantilla = 'urbano' THEN
      v_carta_json := $ju$[
        {"s":"Para picar","p":[
          ["Patatas bravas con cheddar","Corte casero con salsa cheddar fundida y bacon crujiente.",7.5,["LE","SO"],"https://dkitchencorporate.es/images/demo/burger/b01_entrantes_fries.jpeg","recomendado"],
          ["Alitas glaseadas","Ocho unidades con toque dulce y sésamo tostado.",8.5,["SO"],"https://dkitchencorporate.es/images/demo/burger/b02_entrantes_wings.jpeg",null],
          ["Tequeños fundentes","Cinco unidades rellenas de queso blanco tierno con salsa de miel.",7.0,["GL","LE"],"https://dkitchencorporate.es/images/demo/burger/b03_entrantes_tequenos.jpeg",null]]},
        {"s":"Especialidades de la casa","p":[
          ["Smash burger doble con bacon","Doble disco de vaca madurada, doble cheddar y pan brioche.",12.5,["GL","LE","MO"],"https://dkitchencorporate.es/images/demo/burger/b06_smash_double.jpeg","recomendado"],
          ["Oklahoma fried onion","Carne prensada con cebolla caramelizada a la plancha y salsa de la casa.",11.5,["GL","LE","MO"],"https://dkitchencorporate.es/images/demo/burger/b07_smash_oklahoma.jpeg","especial"],
          ["Pizza Margarita de búfala","Masa madre fermentada 72 h, tomate San Marzano y albahaca.",11.0,["GL","LE"],"https://dkitchencorporate.es/images/demo/burger/b13_pizza_bufala.jpeg","recomendado"],
          ["Pizza trufa y setas","Crema de trufa negra, setas de temporada y parmesano.",13.5,["GL","LE"],"https://dkitchencorporate.es/images/demo/burger/b15_pizza_trufa.jpeg",null]]},
        {"s":"Postres","p":[
          ["Tarta cremosa Biscoff","Base crujiente y crema fundente de galleta caramelizada.",5.8,["GL","LE","SO"],"https://dkitchencorporate.es/images/demo/burger/b22_postre_biscoff.jpeg","recomendado"],
          ["Brownie caliente con helado","Chocolate belga 70 % con bola de vainilla.",5.5,["GL","LE","HU","FR"],"https://dkitchencorporate.es/images/demo/burger/b23_postre_brownie.jpeg",null]]},
        {"s":"Bebidas frías","p":[
          ["Limonada artesana","Exprimida al momento con hielo picado.",3.5,[],"https://dkitchencorporate.es/images/demo/burger/b25_bebida_limonada.jpeg",null],
          ["Refresco frío","33 cl bien frío.",2.5,[],"https://dkitchencorporate.es/images/demo/burger/b26_bebida_cola.jpeg",null],
          ["Agua mineral con gas","Botella fría.",2.4,[],"https://dkitchencorporate.es/images/demo/burger/b28_bebida_perrier.jpeg",null]]}
      ]$ju$::jsonb;
    ELSIF v_plantilla = 'gastro' THEN
      v_carta_json := $jg$[
        {"s":"Para empezar","p":[
          ["Alcachofas confitadas a la plancha","Con lascas de curado y aceite de oliva virgen extra.",12.5,["PE"],"https://dkitchencorporate.es/images/demo/flow/cuevas-al-jatib-0fd7ff2e.jpg","recomendado"],
          ["Croquetas melosas de la casa","Receta tradicional de cocción lenta (6 uds.).",10.0,["GL","LE","HU"],"https://dkitchencorporate.es/images/demo/t5.jpeg",null],
          ["Ensalada templada de queso de cabra","Con nueces caramelizadas y brotes tiernos.",11.0,["LE","FR"],"https://dkitchencorporate.es/images/demo/flow/cuevas-al-jatib-068ed3cd.jpg",null]]},
        {"s":"Carnes, mar y arroces","p":[
          ["Presa ibérica a la brasa","Con patatas panaderas al romero y pimientos asados.",19.5,[],"https://dkitchencorporate.es/images/demo/t18.jpeg","recomendado"],
          ["Pulpo a la brasa con cachelos","Sobre patata rota y pimentón de la Vera.",21.0,["MU"],"https://dkitchencorporate.es/images/demo/t19.jpeg","especial"],
          ["Arroz al horno de presa ibérica","Terminado al fuego lento en cazuela tradicional.",17.5,[],"https://dkitchencorporate.es/images/demo/flow/jardines-las-conchas-56875e06.jpg",null],
          ["Chuletillas de cordero segureño","Al sarmiento con guarnición de temporada.",19.0,[],"https://dkitchencorporate.es/images/demo/flow/dama-de-baza-3b36cf8b.jpg",null]]},
        {"s":"Postres de obrador","p":[
          ["Tarta de queso al horno","Cremosa por dentro, horneada cada mañana.",6.5,["LE","HU","GL"],"https://dkitchencorporate.es/images/demo/t21.jpeg","recomendado"],
          ["Coulant de chocolate negro","Con corazón fluido y helado artesanal.",6.8,["GL","LE","HU"],"https://dkitchencorporate.es/images/demo/flow/cuevas-al-jatib-30eb285a.jpg",null]]},
        {"s":"Bodega","p":[
          ["Vino tinto Ribera del Duero (botella)","Selección de la cava.",24.0,["SU"],"https://dkitchencorporate.es/images/demo/flow/cuevas-al-jatib-a015c786.jpg",null],
          ["Vino blanco Verdejo (botella)","Fresco y aromático.",20.0,["SU"],"https://dkitchencorporate.es/images/demo/flow/cuevas-al-jatib-481d06dd.jpg",null],
          ["Copa de vino tinto Crianza","Servicio por copa.",4.0,["SU"],"https://dkitchencorporate.es/images/demo/t27.png",null]]}
      ]$jg$::jsonb;
    ELSE
      v_carta_json := $jt$[
        {"s":"Para compartir","p":[
          ["Croquetas caseras de jamón","Seis unidades cremosas por dentro.",8.5,["GL","LE","HU"],"https://dkitchencorporate.es/images/demo/t5.jpeg","recomendado"],
          ["Ensaladilla rusa de la casa","Con mayonesa suave y gambas.",7.5,["HU","CR"],"https://dkitchencorporate.es/images/demo/t1.jpeg",null],
          ["Patatas bravas ahumadas","Con nuestra salsa brava casera y alioli.",6.5,["HU"],"https://dkitchencorporate.es/images/demo/t4.jpeg",null],
          ["Tabla de quesos y embutidos","Selección de la tierra con picos camperos.",15.0,["LE"],"https://dkitchencorporate.es/images/demo/t11.jpeg",null]]},
        {"s":"De cocina y brasa","p":[
          ["Huevos rotos con jamón ibérico","Patata frita casera y huevo de corral.",12.0,["HU"],"https://dkitchencorporate.es/images/demo/t17.jpeg","recomendado"],
          ["Carrillada ibérica al Pedro Ximénez","Cocinada a fuego lento en su salsa.",14.5,["SU","LE"],"https://dkitchencorporate.es/images/demo/t13.jpeg","especial"],
          ["Pluma ibérica a la brasa","Corte jugoso al punto con sal en escamas.",17.5,[],"https://dkitchencorporate.es/images/demo/t18.jpeg","recomendado"],
          ["Calamares fritos a la andaluza","Rebozado ligero y limón fresco.",13.0,["MO","GL"],"https://dkitchencorporate.es/images/demo/t8.jpeg",null]]},
        {"s":"Postres caseros","p":[
          ["Tarta de queso fluida","Hecha en casa cada día.",5.5,["LE","HU","GL"],"https://dkitchencorporate.es/images/demo/t21.jpeg","recomendado"],
          ["Torrija caramelizada","En pan brioche al momento.",5.5,["GL","LE","HU"],"https://dkitchencorporate.es/images/demo/t22.jpeg",null]]},
        {"s":"Bodega y barra","p":[
          ["Cerveza Alhambra 1925","Botella bien fría.",3.0,["GL"],"https://dkitchencorporate.es/images/demo/t25.png",null],
          ["Caña de barril","Tirada bien fría.",2.2,["GL"],"https://dkitchencorporate.es/images/demo/t26.png",null],
          ["Copa de vino tinto Crianza","Selección de barra.",3.2,["SU"],"https://dkitchencorporate.es/images/demo/t27.png",null]]}
      ]$jt$::jsonb;
    END IF;

    FOR v_s IN SELECT * FROM jsonb_array_elements(v_carta_json) LOOP
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

REVOKE ALL ON FUNCTION dk.prosp_crear_demo(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.prosp_crear_demo(uuid, text, text, text) TO dk_auth;
