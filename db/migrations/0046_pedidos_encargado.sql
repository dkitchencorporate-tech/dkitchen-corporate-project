-- 0046 · Pedidos del encargado desde el panel (07/10/2026, B2 de karc0)
-- El panel pasa a ser el centro de los pedidos: además de ver, anular y cerrar (0045),
-- el encargado puede abrir mesa, añadir productos, cambiar cantidades, mover o juntar
-- mesas y reenviar una ronda al TPV. Solo funciones nuevas: no cambia tablas ni datos.
-- Mismas reglas que el comandero: el PRECIO lo pone el servidor (dk.precio_vigente),
-- nada se borra (cambiar cantidad = anular con motivo + línea nueva) y todo queda en
-- auditoría. Frontera Verifactu intacta: ni tickets, ni cobros, ni numeración.

-- Carta para el selector de productos del encargado (precio vigente del servidor)
CREATE OR REPLACE FUNCTION dk.panel_carta()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  RETURN jsonb_build_object(
    'secciones', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre) ORDER BY s.orden, s.nombre), '[]')
                    FROM public.menu_secciones s WHERE s.restaurante_id = v_rest),
    'carta', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'nombre', i.nombre, 'precio', dk.precio_vigente(i),
                'seccion_id', i.seccion_id) ORDER BY i.orden, i.nombre), '[]')
                FROM public.menu_items i WHERE i.restaurante_id = v_rest AND i.disponible));
END;
$$;

-- Abrir mesa (o devolver la cuenta ya abierta). abierta_por queda NULL = el encargado.
CREATE OR REPLACE FUNCTION dk.panel_abrir_cuenta(p_mesa text, p_comensales int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_id uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  IF p_mesa !~ '^[A-Za-z0-9-]{1,12}$' THEN RAISE EXCEPTION 'Número de mesa no válido.' USING ERRCODE = 'P0001'; END IF;
  SELECT id INTO v_id FROM public.cuentas_mesa WHERE restaurante_id = v_rest AND mesa = p_mesa AND estado = 'abierta';
  IF v_id IS NOT NULL THEN
    IF p_comensales BETWEEN 1 AND 99 THEN UPDATE public.cuentas_mesa SET comensales = p_comensales WHERE id = v_id; END IF;
    RETURN v_id;
  END IF;
  INSERT INTO public.cuentas_mesa (restaurante_id, mesa, comensales)
  VALUES (v_rest, p_mesa, CASE WHEN p_comensales BETWEEN 1 AND 99 THEN p_comensales END)
  ON CONFLICT (restaurante_id, mesa) WHERE estado = 'abierta' DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.cuentas_mesa WHERE restaurante_id = v_rest AND mesa = p_mesa AND estado = 'abierta';
  END IF;
  RETURN v_id;
END;
$$;

-- Añadir una ronda desde el panel: solo platos propios; precio del servidor; camarero NULL = encargado.
CREATE OR REPLACE FUNCTION dk.panel_registrar(p_mesa text, p_lineas jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_id uuid; v_cuenta uuid; v_lineas jsonb;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  IF p_mesa !~ '^[A-Za-z0-9-]{1,12}$' OR jsonb_typeof(p_lineas) <> 'array'
     OR jsonb_array_length(p_lineas) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Pedido no válido.' USING ERRCODE = 'P0001';
  END IF;
  SELECT jsonb_agg(jsonb_build_object('plato_id', i.id, 'nombre', i.nombre,
           'cantidad', least(50, greatest(1, (l->>'cantidad')::int)),
           'nota', left(coalesce(l->>'nota', ''), 120),
           'precio', dk.precio_vigente(i)))
    INTO v_lineas
    FROM jsonb_array_elements(p_lineas) l
    JOIN public.menu_items i ON i.id = (l->>'plato_id')::uuid AND i.restaurante_id = v_rest;
  IF v_lineas IS NULL THEN RAISE EXCEPTION 'Pedido no válido.' USING ERRCODE = 'P0001'; END IF;
  v_cuenta := dk.panel_abrir_cuenta(p_mesa, NULL);
  INSERT INTO public.registros_sala (restaurante_id, mesa, camarero_id, lineas, cuenta_id)
  VALUES (v_rest, p_mesa, NULL, v_lineas, v_cuenta) RETURNING id INTO v_id;
  INSERT INTO public.lineas_cuenta (cuenta_id, restaurante_id, registro_id, plato_id, nombre, cantidad, precio_unitario, nota, camarero_id)
  SELECT v_cuenta, v_rest, v_id, (x->>'plato_id')::uuid, x->>'nombre', (x->>'cantidad')::smallint,
         (x->>'precio')::numeric, x->>'nota', NULL
    FROM jsonb_array_elements(v_lineas) x;
  RETURN v_id;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'Pedido no válido.' USING ERRCODE = 'P0001';
END;
$$;

-- Cambiar la cantidad de una línea: se anula con motivo y se crea otra igual con la nueva
-- cantidad (mismo precio, ronda, camarero y nota). Cantidad 0 = solo anular.
CREATE OR REPLACE FUNCTION dk.panel_cambiar_cantidad(p_linea uuid, p_cantidad int, p_motivo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_l public.lineas_cuenta; v_motivo text;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  IF p_cantidad IS NULL OR p_cantidad NOT BETWEEN 0 AND 50 THEN
    RAISE EXCEPTION 'Cantidad no válida (de 0 a 50).' USING ERRCODE = 'P0001';
  END IF;
  SELECT l.* INTO v_l FROM public.lineas_cuenta l JOIN public.cuentas_mesa k ON k.id = l.cuenta_id AND k.estado = 'abierta'
   WHERE l.id = p_linea AND l.restaurante_id = v_rest AND l.anulada_en IS NULL FOR UPDATE OF l;
  IF v_l.id IS NULL OR v_l.cantidad = p_cantidad THEN RETURN false; END IF;
  v_motivo := coalesce(nullif(btrim(coalesce(p_motivo, '')), ''), format('Cantidad cambiada de %s a %s', v_l.cantidad, p_cantidad));
  IF char_length(v_motivo) NOT BETWEEN 3 AND 200 THEN
    RAISE EXCEPTION 'Indica un motivo (de 3 a 200 caracteres).' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.lineas_cuenta SET anulada_en = now(), anulada_por = dk.identidad_actual(), motivo_anulacion = v_motivo
   WHERE id = v_l.id;
  IF p_cantidad > 0 THEN
    INSERT INTO public.lineas_cuenta (cuenta_id, restaurante_id, registro_id, plato_id, nombre, cantidad, precio_unitario, nota, camarero_id, creada_en)
    VALUES (v_l.cuenta_id, v_rest, v_l.registro_id, v_l.plato_id, v_l.nombre, p_cantidad, v_l.precio_unitario, v_l.nota, v_l.camarero_id, v_l.creada_en);
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'comandero.cambiar_cantidad',
          jsonb_build_object('linea', v_l.id, 'cuenta', v_l.cuenta_id, 'plato', v_l.nombre, 'de', v_l.cantidad, 'a', p_cantidad, 'motivo', v_motivo), v_rest);
  RETURN true;
END;
$$;

-- Mover una cuenta a otra mesa. Si la mesa destino ya tiene cuenta abierta, se JUNTAN:
-- las líneas y rondas pasan a la de destino y la de origen queda anulada con el motivo
-- «Juntada con la mesa X» (sin importe: sus líneas ya están en la otra).
CREATE OR REPLACE FUNCTION dk.panel_mover_cuenta(p_cuenta uuid, p_mesa text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_k public.cuentas_mesa; v_dest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  IF p_mesa !~ '^[A-Za-z0-9-]{1,12}$' THEN RAISE EXCEPTION 'Número de mesa no válido.' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v_k FROM public.cuentas_mesa WHERE id = p_cuenta AND restaurante_id = v_rest AND estado = 'abierta' FOR UPDATE;
  IF v_k.id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  IF v_k.mesa = p_mesa THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT id INTO v_dest FROM public.cuentas_mesa WHERE restaurante_id = v_rest AND mesa = p_mesa AND estado = 'abierta' FOR UPDATE;
  IF v_dest IS NULL THEN
    UPDATE public.cuentas_mesa SET mesa = p_mesa WHERE id = v_k.id;
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (dk.identidad_actual(), 'comandero.mover_cuenta', jsonb_build_object('cuenta', v_k.id, 'de', v_k.mesa, 'a', p_mesa), v_rest);
    RETURN jsonb_build_object('ok', true, 'juntada', false, 'cuenta', v_k.id);
  END IF;
  UPDATE public.lineas_cuenta SET cuenta_id = v_dest WHERE cuenta_id = v_k.id;
  UPDATE public.registros_sala SET cuenta_id = v_dest WHERE cuenta_id = v_k.id;
  UPDATE public.cuentas_mesa d SET comensales = CASE WHEN d.comensales IS NULL AND v_k.comensales IS NULL THEN NULL
                                                     ELSE least(99, coalesce(d.comensales, 0) + coalesce(v_k.comensales, 0)) END
   WHERE d.id = v_dest;
  UPDATE public.cuentas_mesa SET estado = 'anulada', cerrada_en = now(), cerrada_por = dk.identidad_actual(),
         motivo_anulacion = format('Juntada con la mesa %s', p_mesa)
   WHERE id = v_k.id;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'comandero.juntar_cuentas', jsonb_build_object('origen', v_k.id, 'destino', v_dest, 'de', v_k.mesa, 'a', p_mesa), v_rest);
  RETURN jsonb_build_object('ok', true, 'juntada', true, 'cuenta', v_dest);
END;
$$;

-- Reenviar una ronda al TPV desde el panel (espejo de sala_destino_tpv / sala_resultado_tpv)
CREATE OR REPLACE FUNCTION dk.panel_destino_tpv(p_registro uuid)
RETURNS TABLE (proveedor text, endpoint_url text, credencial_cifrada text, restaurante text, mesa text, lineas jsonb, creado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  RETURN QUERY
  SELECT t.proveedor, t.endpoint_url, t.credencial_cifrada, r.nombre, s.mesa, s.lineas, s.creado_en
    FROM public.registros_sala s
    JOIN public.restaurantes r ON r.id = s.restaurante_id
    JOIN public.conexiones_tpv t ON t.restaurante_id = s.restaurante_id AND t.activa
   WHERE s.id = p_registro AND s.restaurante_id = v_rest AND dk.tiene_servicio(v_rest, 'conexion_tpv');
END;
$$;

CREATE OR REPLACE FUNCTION dk.panel_resultado_tpv(p_registro uuid, p_ok boolean, p_detalle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid;
BEGIN
  v_rest := dk.comandero_restaurante_propio();
  UPDATE public.registros_sala SET estado = CASE WHEN p_ok THEN 'enviado_tpv' ELSE 'error_tpv' END,
         enviado_en = now(), detalle_tpv = left(p_detalle, 300)
   WHERE id = p_registro AND restaurante_id = v_rest;
  UPDATE public.conexiones_tpv SET ultimo_envio = now(), ultimo_error = CASE WHEN p_ok THEN NULL ELSE left(p_detalle, 300) END
   WHERE restaurante_id = v_rest;
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['dk.panel_carta()', 'dk.panel_abrir_cuenta(text,integer)', 'dk.panel_registrar(text,jsonb)',
                           'dk.panel_cambiar_cantidad(uuid,integer,text)', 'dk.panel_mover_cuenta(uuid,text)',
                           'dk.panel_destino_tpv(uuid)', 'dk.panel_resultado_tpv(uuid,boolean,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_auth', f);
  END LOOP;
END $$;
