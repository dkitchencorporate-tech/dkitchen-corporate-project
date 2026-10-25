-- 0099 (25/10/2026, karc0, tarea G): pedido del comensal desde la mesa (pide en la mesa, paga en la barra).
-- Solo plan Sala (decisión del 18/10: Sala 79 € incluye el pedido desde la mesa). El pedido NO va a cocina ni al TPV:
-- entra como «por confirmar» en la app del camarero y, al confirmarlo, se registra como una ronda normal con
-- dk.sala_registrar (misma cuenta de mesa, importes de la base y mismo envío al TPV). Precios siempre de la base.
-- En las demos internas (demo_interna) el pedido se simula: se validan los platos y no se guarda nada.
BEGIN;

CREATE TABLE IF NOT EXISTS public.pedidos_mesa (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  mesa           text NOT NULL CHECK (mesa ~ '^[A-Za-z0-9-]{1,12}$'),
  lineas         jsonb NOT NULL CHECK (jsonb_typeof(lineas) = 'array'),
  nota           text CHECK (nota IS NULL OR char_length(nota) <= 200),
  estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'rechazado')),
  registro_id    uuid,
  camarero_id    uuid,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  resuelto_en    timestamptz
);
CREATE INDEX IF NOT EXISTS pedidos_mesa_pend_idx ON public.pedidos_mesa (restaurante_id, estado, creado_en);
ALTER TABLE public.pedidos_mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_mesa FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.pedidos_mesa FROM PUBLIC, dk_anon, dk_auth, dk_app;

-- ¿La carta deja pedir desde la mesa? 'real' (plan Sala), 'demo' (demo interna: se simula) o NULL.
CREATE OR REPLACE FUNCTION dk.mesa_pedido_modo(p_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT CASE WHEN r.demo_interna THEN 'demo' WHEN dk.plan_nivel(r.plan) >= 3 THEN 'real' END
    FROM public.restaurantes r
   WHERE r.slug = lower(p_slug) AND r.activo AND r.estado_acceso IN ('activo', 'gracia') AND r.archivado_en IS NULL;
$$;

-- Pedido del comensal. Devuelve ok | demo | espera | limite | datos | no_disponible.
CREATE OR REPLACE FUNCTION dk.mesa_pedir(p_slug text, p_mesa text, p_lineas jsonb, p_nota text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest public.restaurantes%ROWTYPE; v_modo text; v_lineas jsonb; v_n int;
BEGIN
  IF p_mesa IS NULL OR p_mesa !~ '^[A-Za-z0-9-]{1,12}$' OR jsonb_typeof(p_lineas) <> 'array'
     OR jsonb_array_length(p_lineas) NOT BETWEEN 1 AND 30 THEN RETURN 'datos'; END IF;
  SELECT * INTO v_rest FROM public.restaurantes r
   WHERE r.slug = lower(p_slug) AND r.activo AND r.estado_acceso IN ('activo', 'gracia') AND r.archivado_en IS NULL;
  IF NOT FOUND THEN RETURN 'no_disponible'; END IF;
  v_modo := CASE WHEN v_rest.demo_interna THEN 'demo' WHEN dk.plan_nivel(v_rest.plan) >= 3 THEN 'real' END;
  IF v_modo IS NULL THEN RETURN 'no_disponible'; END IF;
  -- Solo platos disponibles de ESTE local; cantidades y notas acotadas; el precio lo pone la base.
  SELECT jsonb_agg(jsonb_build_object('plato_id', i.id, 'nombre', i.nombre,
           'cantidad', least(20, greatest(1, (l->>'cantidad')::int)),
           'nota', left(coalesce(l->>'nota', ''), 120), 'precio', dk.precio_vigente(i))), count(*)
    INTO v_lineas, v_n
    FROM jsonb_array_elements(p_lineas) l
    JOIN public.menu_items i ON i.id = (l->>'plato_id')::uuid AND i.restaurante_id = v_rest.id AND i.disponible;
  IF v_lineas IS NULL OR v_n <> jsonb_array_length(p_lineas) THEN RETURN 'datos'; END IF;
  IF v_modo = 'demo' THEN RETURN 'demo'; END IF;
  -- Antiabuso: un pedido pendiente por mesa cada 60 s y como mucho 40 pendientes por local a la vez.
  IF EXISTS (SELECT 1 FROM public.pedidos_mesa p WHERE p.restaurante_id = v_rest.id AND p.mesa = p_mesa
              AND p.estado = 'pendiente' AND p.creado_en > now() - interval '60 seconds') THEN RETURN 'espera'; END IF;
  IF (SELECT count(*) FROM public.pedidos_mesa p WHERE p.restaurante_id = v_rest.id AND p.estado = 'pendiente'
        AND p.creado_en > now() - interval '3 hours') >= 40 THEN RETURN 'limite'; END IF;
  INSERT INTO public.pedidos_mesa (restaurante_id, mesa, lineas, nota)
  VALUES (v_rest.id, p_mesa, v_lineas, nullif(left(btrim(coalesce(p_nota, '')), 200), ''));
  -- Purga: lo de hace más de 30 días.
  DELETE FROM public.pedidos_mesa WHERE restaurante_id = v_rest.id AND creado_en < now() - interval '30 days';
  RETURN 'ok';
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN 'datos';
END;
$$;

-- El camarero confirma (→ ronda normal con dk.sala_registrar) o rechaza un pedido de la mesa.
-- Devuelve el id de la ronda al confirmar, el del pedido al rechazar o NULL si no puede.
CREATE OR REPLACE FUNCTION dk.sala_pedido_resolver(p_token_hash text, p_pedido uuid, p_aceptar boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros; v_p public.pedidos_mesa%ROWTYPE; v_reg uuid;
BEGIN
  v_cam := dk.comandero_camarero(p_token_hash);
  IF v_cam.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_p FROM public.pedidos_mesa p
   WHERE p.id = p_pedido AND p.restaurante_id = v_cam.restaurante_id AND p.estado = 'pendiente' FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT p_aceptar THEN
    UPDATE public.pedidos_mesa SET estado = 'rechazado', camarero_id = v_cam.id, resuelto_en = now() WHERE id = v_p.id;
    RETURN v_p.id;
  END IF;
  v_reg := dk.sala_registrar(p_token_hash, v_p.mesa,
             (SELECT jsonb_agg(jsonb_build_object('plato_id', x->>'plato_id', 'cantidad', x->'cantidad', 'nota', x->>'nota'))
                FROM jsonb_array_elements(v_p.lineas) x));
  IF v_reg IS NULL THEN RETURN NULL; END IF;
  UPDATE public.pedidos_mesa SET estado = 'confirmado', registro_id = v_reg, camarero_id = v_cam.id, resuelto_en = now()
   WHERE id = v_p.id;
  RETURN v_reg;
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_contexto(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_cam public.camareros%ROWTYPE; v_rest public.restaurantes%ROWTYPE;
BEGIN
  SELECT * INTO v_cam FROM public.camareros WHERE token_hash = p_token_hash AND activo;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_rest FROM public.restaurantes WHERE id = v_cam.restaurante_id AND activo AND estado_acceso IN ('activo','gracia');
  IF NOT FOUND OR NOT dk.tiene_servicio(v_rest.id, 'app_sala') THEN RETURN NULL; END IF;
  UPDATE public.camareros SET ultimo_acceso = now() WHERE id = v_cam.id;
  RETURN jsonb_build_object(
    'camarero', jsonb_build_object('id', v_cam.id, 'nombre', v_cam.nombre, 'rol', v_cam.rol),
    'restaurante', jsonb_build_object('nombre', v_rest.nombre, 'color', v_rest.color_marca,
                                      'tpv', dk.tiene_servicio(v_rest.id, 'conexion_tpv')),
    'mesas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'numero', m.numero, 'zona', m.zona, 'forma', m.forma,
                'plazas', m.plazas, 'x', m.x, 'y', m.y, 'ancho', m.ancho, 'alto', m.alto, 'mia', m.camarero_id = v_cam.id,
                'camarero', (SELECT c.nombre FROM public.camareros c WHERE c.id = m.camarero_id)) ORDER BY m.zona, m.numero), '[]')
              FROM public.mesas m WHERE m.restaurante_id = v_rest.id),
    'elementos', (SELECT coalesce(jsonb_agg(jsonb_build_object('tipo', e.tipo, 'x', e.x, 'y', e.y, 'ancho', e.ancho, 'alto', e.alto,
                'etiqueta', e.etiqueta, 'color', e.color, 'mia', e.camarero_id = v_cam.id)), '[]')
              FROM public.elementos_plano e WHERE e.restaurante_id = v_rest.id),
    -- 0099: pedidos que hace el comensal desde la mesa, por confirmar por el camarero.
    'pedidos', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'mesa', p.mesa, 'lineas', p.lineas, 'nota', p.nota,
                'creado_en', p.creado_en) ORDER BY p.creado_en), '[]')
              FROM public.pedidos_mesa p WHERE p.restaurante_id = v_rest.id AND p.estado = 'pendiente'
                AND p.creado_en > now() - interval '3 hours'),
    'llamadas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'mesa', l.mesa, 'motivo', l.motivo, 'creada_en', l.creada_en)
                ORDER BY l.creada_en), '[]')
              FROM public.llamadas_camarero l WHERE l.restaurante_id = v_rest.id AND l.atendida_en IS NULL
                AND l.creada_en > now() - interval '3 hours'),
    'cuentas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'mesa', k.mesa, 'comensales', k.comensales,
                'minutos', (extract(epoch FROM (now() - k.abierta_en)) / 60)::int,
                'importe', (SELECT coalesce(sum(l.cantidad * l.precio_unitario), 0) FROM public.lineas_cuenta l
                             WHERE l.cuenta_id = k.id AND l.anulada_en IS NULL))), '[]')
              FROM public.cuentas_mesa k WHERE k.restaurante_id = v_rest.id AND k.estado = 'abierta'),
    'secciones', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre) ORDER BY s.orden, s.nombre), '[]')
              FROM public.menu_secciones s WHERE s.restaurante_id = v_rest.id),
    'carta', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'nombre', i.nombre, 'precio', dk.precio_vigente(i),
                'seccion_id', i.seccion_id,
                'seccion', (SELECT s.nombre FROM public.menu_secciones s WHERE s.id = i.seccion_id)) ORDER BY i.orden, i.nombre), '[]')
              FROM public.menu_items i WHERE i.restaurante_id = v_rest.id AND i.disponible)
  );
END;
$$;

REVOKE ALL ON FUNCTION dk.mesa_pedido_modo(text), dk.mesa_pedir(text, text, jsonb, text), dk.sala_pedido_resolver(text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.mesa_pedido_modo(text), dk.mesa_pedir(text, text, jsonb, text), dk.sala_pedido_resolver(text, uuid, boolean) TO dk_anon;

COMMIT;
