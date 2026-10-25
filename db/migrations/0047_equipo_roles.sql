-- 0047 · Equipo de sala con roles (07/10/2026, B3 de karc0)
-- Cada acceso de sala tiene un ROL: 'camarero' o 'encargado'. Decisión de karc0 (07/10):
--   · El encargado entra con su enlace personal, como un camarero (sin cuenta ni contraseña).
--   · Supervisor de sala: ve todas las mesas y llamadas, anula líneas o cuentas con motivo,
--     cambia cantidades, mueve o junta mesas y cierra cualquier mesa.
--   · Y gestiona el equipo: da de alta camareros, los da de baja o los reactiva, regenera su
--     enlace y asigna zonas. NO toca a otros encargados ni cambia roles: eso es del dueño.
-- El dueño (panel → Servicio → Equipo) lo hace todo, incluido el rol.
-- Mismas reglas que 0045/0046: el precio lo pone el servidor, nada se borra y todo queda en
-- auditoría (identidad NULL + camarero en el detalle cuando actúa un encargado).
-- Las operaciones del panel (anular, cambiar cantidad, mover) pasan a usar los mismos núcleos
-- que el encargado: mismas firmas y mismo comportamiento que en 0045/0046.

-- =====================================================================
-- 1. Datos
-- =====================================================================
ALTER TABLE public.camareros ADD COLUMN IF NOT EXISTS rol text NOT NULL DEFAULT 'camarero'
  CHECK (rol IN ('camarero', 'encargado'));
-- Quién anuló, cuando lo hace un encargado desde la app (anulada_por sigue siendo la identidad del dueño)
ALTER TABLE public.lineas_cuenta ADD COLUMN IF NOT EXISTS anulada_por_camarero uuid REFERENCES public.camareros(id) ON DELETE SET NULL;

-- El dueño ya no cambia camareros con UPDATE directo: todo pasa por las funciones de abajo
REVOKE UPDATE ON public.camareros FROM dk_auth;

-- =====================================================================
-- 2. Piezas comunes
-- =====================================================================
-- Encargado válido por su token (o NULL)
CREATE OR REPLACE FUNCTION dk.sala_encargado(p_token_hash text)
RETURNS public.camareros LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT c.* FROM public.camareros c
    JOIN public.restaurantes r ON r.id = c.restaurante_id AND r.activo AND r.estado_acceso IN ('activo', 'gracia')
   WHERE c.token_hash = p_token_hash AND c.activo AND c.rol = 'encargado' AND dk.tiene_servicio(c.restaurante_id, 'app_sala');
$$;

CREATE OR REPLACE FUNCTION dk.equipo_motivo(p_motivo text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path TO pg_catalog AS $$
BEGIN
  IF char_length(btrim(coalesce(p_motivo, ''))) NOT BETWEEN 3 AND 200 THEN
    RAISE EXCEPTION 'Indica un motivo (de 3 a 200 caracteres).' USING ERRCODE = 'P0001';
  END IF;
  RETURN btrim(p_motivo);
END;
$$;

-- Tope de accesos activos por local (igual que crear_camarero en 0027)
CREATE OR REPLACE FUNCTION dk.equipo_comprobar_tope(p_rest uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF (SELECT count(*) FROM public.camareros WHERE restaurante_id = p_rest AND activo) >= 20 THEN
    RAISE EXCEPTION 'Máximo 20 accesos activos.' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- =====================================================================
-- 3. Núcleos de equipo (sin GRANT: solo los llaman las funciones de dueño y encargado)
--    p_actor = camarero encargado que actúa (NULL = el dueño)
-- =====================================================================
CREATE OR REPLACE FUNCTION dk.equipo_listado(p_rest uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT jsonb_build_object(
    'camareros', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'nombre', c.nombre, 'rol', c.rol, 'activo', c.activo,
        'creado_en', c.creado_en, 'ultimo_acceso', c.ultimo_acceso,
        'mesas', (SELECT coalesce(jsonb_agg(m.numero ORDER BY m.zona, m.numero), '[]') FROM public.mesas m WHERE m.camarero_id = c.id),
        'zonas', (SELECT coalesce(jsonb_agg(DISTINCT m.zona), '[]') FROM public.mesas m WHERE m.camarero_id = c.id))
      ORDER BY c.activo DESC, c.rol DESC, c.nombre), '[]')
      FROM public.camareros c WHERE c.restaurante_id = p_rest),
    'zonas', (SELECT coalesce(jsonb_agg(jsonb_build_object('nombre', z.zona, 'mesas', z.mesas, 'camareros', z.camareros) ORDER BY z.zona), '[]')
      FROM (SELECT m.zona, count(*) AS mesas,
                   coalesce(jsonb_agg(DISTINCT m.camarero_id) FILTER (WHERE m.camarero_id IS NOT NULL), '[]') AS camareros
              FROM public.mesas m WHERE m.restaurante_id = p_rest GROUP BY m.zona) z)
  );
$$;

CREATE OR REPLACE FUNCTION dk.equipo_crear_en(p_rest uuid, p_nombre text, p_token_hash text, p_rol text, p_actor uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid;
BEGIN
  IF p_rol NOT IN ('camarero', 'encargado') THEN RAISE EXCEPTION 'Rol no válido.' USING ERRCODE = 'P0001'; END IF;
  IF char_length(btrim(coalesce(p_nombre, ''))) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'Pon un nombre (máximo 40 caracteres).' USING ERRCODE = 'P0001';
  END IF;
  PERFORM dk.equipo_comprobar_tope(p_rest);
  INSERT INTO public.camareros (restaurante_id, nombre, token_hash, rol) VALUES (p_rest, btrim(p_nombre), p_token_hash, p_rol)
  RETURNING id INTO v_id;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'equipo.alta', jsonb_build_object('camarero', v_id, 'nombre', btrim(p_nombre), 'rol', p_rol, 'por_encargado', p_actor), p_rest);
  RETURN v_id;
END;
$$;

-- Cambia nombre, rol y/o activo (NULL = no cambiar). Reactivar respeta el tope.
CREATE OR REPLACE FUNCTION dk.equipo_editar_en(p_rest uuid, p_id uuid, p_nombre text, p_rol text, p_activo boolean, p_actor uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_c public.camareros;
BEGIN
  SELECT * INTO v_c FROM public.camareros WHERE id = p_id AND restaurante_id = p_rest FOR UPDATE;
  IF v_c.id IS NULL THEN RETURN false; END IF;
  IF p_nombre IS NOT NULL AND char_length(btrim(p_nombre)) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'Pon un nombre (máximo 40 caracteres).' USING ERRCODE = 'P0001';
  END IF;
  IF p_rol IS NOT NULL AND p_rol NOT IN ('camarero', 'encargado') THEN RAISE EXCEPTION 'Rol no válido.' USING ERRCODE = 'P0001'; END IF;
  IF p_activo AND NOT v_c.activo THEN PERFORM dk.equipo_comprobar_tope(p_rest); END IF;
  UPDATE public.camareros SET nombre = coalesce(btrim(p_nombre), nombre), rol = coalesce(p_rol, rol), activo = coalesce(p_activo, activo)
   WHERE id = p_id;
  -- Quien deja el equipo suelta sus mesas y zonas (quedan libres para los demás)
  IF p_activo = false AND v_c.activo THEN
    UPDATE public.mesas SET camarero_id = NULL WHERE camarero_id = p_id;
    UPDATE public.elementos_plano SET camarero_id = NULL WHERE camarero_id = p_id;
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'equipo.editar', jsonb_build_object('camarero', p_id, 'nombre', p_nombre, 'rol', p_rol, 'activo', p_activo, 'por_encargado', p_actor), p_rest);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION dk.equipo_regenerar_en(p_rest uuid, p_id uuid, p_token_hash text, p_actor uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  UPDATE public.camareros SET token_hash = p_token_hash WHERE id = p_id AND restaurante_id = p_rest AND activo;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'equipo.regenerar_enlace', jsonb_build_object('camarero', p_id, 'por_encargado', p_actor), p_rest);
  RETURN true;
END;
$$;

-- Asigna TODAS las mesas de una zona (y su recuadro del plano) a un camarero; NULL = libres
CREATE OR REPLACE FUNCTION dk.equipo_zona_en(p_rest uuid, p_zona text, p_camarero uuid, p_actor uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_n integer;
BEGIN
  IF p_camarero IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.camareros WHERE id = p_camarero AND restaurante_id = p_rest AND activo) THEN
    RAISE EXCEPTION 'Ese camarero no está activo.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.mesas SET camarero_id = p_camarero WHERE restaurante_id = p_rest AND zona = p_zona;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  UPDATE public.elementos_plano SET camarero_id = p_camarero WHERE restaurante_id = p_rest AND tipo = 'zona' AND etiqueta = p_zona;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'equipo.zona', jsonb_build_object('zona', p_zona, 'camarero', p_camarero, 'mesas', v_n, 'por_encargado', p_actor), p_rest);
  RETURN v_n;
END;
$$;

-- =====================================================================
-- 4. Núcleos del comandero (sin GRANT). p_actor = encargado de la app (NULL = dueño)
-- =====================================================================
CREATE OR REPLACE FUNCTION dk.comandero_anular_linea_en(p_rest uuid, p_linea uuid, p_motivo text, p_actor uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_l public.lineas_cuenta; v_motivo text;
BEGIN
  v_motivo := dk.equipo_motivo(p_motivo);
  UPDATE public.lineas_cuenta l SET anulada_en = now(), anulada_por = dk.identidad_actual(), anulada_por_camarero = p_actor,
         motivo_anulacion = v_motivo
    FROM public.cuentas_mesa k
   WHERE l.id = p_linea AND l.restaurante_id = p_rest AND l.anulada_en IS NULL
     AND k.id = l.cuenta_id AND k.estado = 'abierta'
  RETURNING l.* INTO v_l;
  IF v_l.id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'comandero.anular_linea',
          jsonb_build_object('linea', v_l.id, 'cuenta', v_l.cuenta_id, 'plato', v_l.nombre, 'cantidad', v_l.cantidad,
                             'importe', v_l.cantidad * v_l.precio_unitario, 'motivo', v_motivo, 'por_encargado', p_actor), p_rest);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION dk.comandero_anular_cuenta_en(p_rest uuid, p_cuenta uuid, p_motivo text, p_actor uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_motivo text;
BEGIN
  v_motivo := dk.equipo_motivo(p_motivo);
  UPDATE public.cuentas_mesa SET estado = 'anulada', cerrada_en = now(), cerrada_por = dk.identidad_actual(),
         cerrada_por_camarero = p_actor, motivo_anulacion = v_motivo
   WHERE id = p_cuenta AND restaurante_id = p_rest AND estado = 'abierta';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'comandero.anular_cuenta', jsonb_build_object('cuenta', p_cuenta, 'motivo', v_motivo, 'por_encargado', p_actor), p_rest);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION dk.comandero_cambiar_cantidad_en(p_rest uuid, p_linea uuid, p_cantidad int, p_motivo text, p_actor uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_l public.lineas_cuenta; v_motivo text;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad NOT BETWEEN 0 AND 50 THEN
    RAISE EXCEPTION 'Cantidad no válida (de 0 a 50).' USING ERRCODE = 'P0001';
  END IF;
  SELECT l.* INTO v_l FROM public.lineas_cuenta l JOIN public.cuentas_mesa k ON k.id = l.cuenta_id AND k.estado = 'abierta'
   WHERE l.id = p_linea AND l.restaurante_id = p_rest AND l.anulada_en IS NULL FOR UPDATE OF l;
  IF v_l.id IS NULL OR v_l.cantidad = p_cantidad THEN RETURN false; END IF;
  v_motivo := coalesce(nullif(btrim(coalesce(p_motivo, '')), ''), format('Cantidad cambiada de %s a %s', v_l.cantidad, p_cantidad));
  v_motivo := dk.equipo_motivo(v_motivo);
  UPDATE public.lineas_cuenta SET anulada_en = now(), anulada_por = dk.identidad_actual(), anulada_por_camarero = p_actor,
         motivo_anulacion = v_motivo
   WHERE id = v_l.id;
  IF p_cantidad > 0 THEN
    INSERT INTO public.lineas_cuenta (cuenta_id, restaurante_id, registro_id, plato_id, nombre, cantidad, precio_unitario, nota, camarero_id, creada_en)
    VALUES (v_l.cuenta_id, p_rest, v_l.registro_id, v_l.plato_id, v_l.nombre, p_cantidad, v_l.precio_unitario, v_l.nota, v_l.camarero_id, v_l.creada_en);
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'comandero.cambiar_cantidad',
          jsonb_build_object('linea', v_l.id, 'cuenta', v_l.cuenta_id, 'plato', v_l.nombre, 'de', v_l.cantidad, 'a', p_cantidad,
                             'motivo', v_motivo, 'por_encargado', p_actor), p_rest);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION dk.comandero_mover_cuenta_en(p_rest uuid, p_cuenta uuid, p_mesa text, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_k public.cuentas_mesa; v_dest uuid;
BEGIN
  IF p_mesa !~ '^[A-Za-z0-9-]{1,12}$' THEN RAISE EXCEPTION 'Número de mesa no válido.' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v_k FROM public.cuentas_mesa WHERE id = p_cuenta AND restaurante_id = p_rest AND estado = 'abierta' FOR UPDATE;
  IF v_k.id IS NULL OR v_k.mesa = p_mesa THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT id INTO v_dest FROM public.cuentas_mesa WHERE restaurante_id = p_rest AND mesa = p_mesa AND estado = 'abierta' FOR UPDATE;
  IF v_dest IS NULL THEN
    UPDATE public.cuentas_mesa SET mesa = p_mesa WHERE id = v_k.id;
    INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
    VALUES (dk.identidad_actual(), 'comandero.mover_cuenta', jsonb_build_object('cuenta', v_k.id, 'de', v_k.mesa, 'a', p_mesa, 'por_encargado', p_actor), p_rest);
    RETURN jsonb_build_object('ok', true, 'juntada', false, 'cuenta', v_k.id);
  END IF;
  UPDATE public.lineas_cuenta SET cuenta_id = v_dest WHERE cuenta_id = v_k.id;
  UPDATE public.registros_sala SET cuenta_id = v_dest WHERE cuenta_id = v_k.id;
  UPDATE public.cuentas_mesa d SET comensales = CASE WHEN d.comensales IS NULL AND v_k.comensales IS NULL THEN NULL
                                                     ELSE least(99, coalesce(d.comensales, 0) + coalesce(v_k.comensales, 0)) END
   WHERE d.id = v_dest;
  UPDATE public.cuentas_mesa SET estado = 'anulada', cerrada_en = now(), cerrada_por = dk.identidad_actual(),
         cerrada_por_camarero = p_actor, motivo_anulacion = format('Juntada con la mesa %s', p_mesa)
   WHERE id = v_k.id;
  INSERT INTO public.auditoria (identidad, accion, detalle, restaurante_id)
  VALUES (dk.identidad_actual(), 'comandero.juntar_cuentas',
          jsonb_build_object('origen', v_k.id, 'destino', v_dest, 'de', v_k.mesa, 'a', p_mesa, 'por_encargado', p_actor), p_rest);
  RETURN jsonb_build_object('ok', true, 'juntada', true, 'cuenta', v_dest);
END;
$$;

-- Las funciones del panel (0045/0046) delegan en los núcleos: mismas firmas y resultado
CREATE OR REPLACE FUNCTION dk.anular_linea(p_linea uuid, p_motivo text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.comandero_anular_linea_en(dk.comandero_restaurante_propio(), p_linea, p_motivo, NULL);
$$;
CREATE OR REPLACE FUNCTION dk.anular_cuenta(p_cuenta uuid, p_motivo text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.comandero_anular_cuenta_en(dk.comandero_restaurante_propio(), p_cuenta, p_motivo, NULL);
$$;
CREATE OR REPLACE FUNCTION dk.panel_cambiar_cantidad(p_linea uuid, p_cantidad int, p_motivo text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.comandero_cambiar_cantidad_en(dk.comandero_restaurante_propio(), p_linea, p_cantidad, p_motivo, NULL);
$$;
CREATE OR REPLACE FUNCTION dk.panel_mover_cuenta(p_cuenta uuid, p_mesa text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.comandero_mover_cuenta_en(dk.comandero_restaurante_propio(), p_cuenta, p_mesa, NULL);
$$;

-- =====================================================================
-- 5. Dueño (panel → Servicio → Equipo)
-- =====================================================================
CREATE OR REPLACE FUNCTION dk.equipo() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.equipo_listado(dk.comandero_restaurante_propio());
$$;
CREATE OR REPLACE FUNCTION dk.equipo_crear(p_nombre text, p_token_hash text, p_rol text) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.equipo_crear_en(dk.comandero_restaurante_propio(), p_nombre, p_token_hash, p_rol, NULL);
$$;
CREATE OR REPLACE FUNCTION dk.equipo_editar(p_id uuid, p_nombre text, p_rol text, p_activo boolean) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.equipo_editar_en(dk.comandero_restaurante_propio(), p_id, p_nombre, p_rol, p_activo, NULL);
$$;
CREATE OR REPLACE FUNCTION dk.equipo_regenerar(p_id uuid, p_token_hash text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.equipo_regenerar_en(dk.comandero_restaurante_propio(), p_id, p_token_hash, NULL);
$$;
CREATE OR REPLACE FUNCTION dk.equipo_zona(p_zona text, p_camarero uuid) RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.equipo_zona_en(dk.comandero_restaurante_propio(), p_zona, p_camarero, NULL);
$$;
-- Alta antigua (0027): ahora pasa por el núcleo (mismo tope y auditoría), siempre como camarero
CREATE OR REPLACE FUNCTION dk.crear_camarero(p_nombre text, p_token_hash text) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.equipo_crear_en(dk.comandero_restaurante_propio(), p_nombre, p_token_hash, 'camarero', NULL);
$$;

-- =====================================================================
-- 6. Encargado (app de sala, acceso por token). Si el token no es de un encargado activo:
--    NULL / false (como el resto de funciones sala_*). Solo gestiona CAMAREROS, nunca encargados.
-- =====================================================================
CREATE OR REPLACE FUNCTION dk.sala_equipo(p_token_hash text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN NULL; END IF;
  RETURN dk.equipo_listado(v_e.restaurante_id);
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_equipo_crear(p_token_hash text, p_nombre text, p_nuevo_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN NULL; END IF;
  RETURN dk.equipo_crear_en(v_e.restaurante_id, p_nombre, p_nuevo_hash, 'camarero', v_e.id);
END;
$$;

-- Nombre y alta/baja de un camarero (no de un encargado; el rol no se toca)
CREATE OR REPLACE FUNCTION dk.sala_equipo_editar(p_token_hash text, p_id uuid, p_nombre text, p_activo boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.camareros WHERE id = p_id AND restaurante_id = v_e.restaurante_id AND rol = 'camarero') THEN
    RETURN false;
  END IF;
  RETURN dk.equipo_editar_en(v_e.restaurante_id, p_id, p_nombre, NULL, p_activo, v_e.id);
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_equipo_regenerar(p_token_hash text, p_id uuid, p_nuevo_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.camareros WHERE id = p_id AND restaurante_id = v_e.restaurante_id AND rol = 'camarero') THEN
    RETURN false;
  END IF;
  RETURN dk.equipo_regenerar_en(v_e.restaurante_id, p_id, p_nuevo_hash, v_e.id);
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_equipo_zona(p_token_hash text, p_zona text, p_camarero uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN NULL; END IF;
  RETURN dk.equipo_zona_en(v_e.restaurante_id, p_zona, p_camarero, v_e.id);
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_anular_linea(p_token_hash text, p_linea uuid, p_motivo text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN false; END IF;
  RETURN dk.comandero_anular_linea_en(v_e.restaurante_id, p_linea, p_motivo, v_e.id);
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_anular_cuenta(p_token_hash text, p_cuenta uuid, p_motivo text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN false; END IF;
  RETURN dk.comandero_anular_cuenta_en(v_e.restaurante_id, p_cuenta, p_motivo, v_e.id);
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_cambiar_cantidad(p_token_hash text, p_linea uuid, p_cantidad int, p_motivo text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN false; END IF;
  RETURN dk.comandero_cambiar_cantidad_en(v_e.restaurante_id, p_linea, p_cantidad, p_motivo, v_e.id);
END;
$$;

CREATE OR REPLACE FUNCTION dk.sala_mover_cuenta(p_token_hash text, p_cuenta uuid, p_mesa text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  RETURN dk.comandero_mover_cuenta_en(v_e.restaurante_id, p_cuenta, p_mesa, v_e.id);
END;
$$;

-- Contexto del camarero (sobre 0045): añade su ROL
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

-- =====================================================================
-- 7. Permisos
-- =====================================================================
DO $$
DECLARE f text;
BEGIN
  -- Núcleos e internas: nadie de fuera
  FOREACH f IN ARRAY ARRAY['dk.sala_encargado(text)', 'dk.equipo_motivo(text)', 'dk.equipo_comprobar_tope(uuid)',
                           'dk.equipo_listado(uuid)', 'dk.equipo_crear_en(uuid,text,text,text,uuid)',
                           'dk.equipo_editar_en(uuid,uuid,text,text,boolean,uuid)', 'dk.equipo_regenerar_en(uuid,uuid,text,uuid)',
                           'dk.equipo_zona_en(uuid,text,uuid,uuid)', 'dk.comandero_anular_linea_en(uuid,uuid,text,uuid)',
                           'dk.comandero_anular_cuenta_en(uuid,uuid,text,uuid)', 'dk.comandero_cambiar_cantidad_en(uuid,uuid,integer,text,uuid)',
                           'dk.comandero_mover_cuenta_en(uuid,uuid,text,uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
  END LOOP;
  -- Dueño con sesión
  FOREACH f IN ARRAY ARRAY['dk.equipo()', 'dk.equipo_crear(text,text,text)', 'dk.equipo_editar(uuid,text,text,boolean)',
                           'dk.equipo_regenerar(uuid,text)', 'dk.equipo_zona(text,uuid)', 'dk.crear_camarero(text,text)',
                           'dk.anular_linea(uuid,text)', 'dk.anular_cuenta(uuid,text)',
                           'dk.panel_cambiar_cantidad(uuid,integer,text)', 'dk.panel_mover_cuenta(uuid,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_auth', f);
  END LOOP;
  -- App de sala (visitante con token; el token se valida dentro)
  FOREACH f IN ARRAY ARRAY['dk.sala_equipo(text)', 'dk.sala_equipo_crear(text,text,text)', 'dk.sala_equipo_editar(text,uuid,text,boolean)',
                           'dk.sala_equipo_regenerar(text,uuid,text)', 'dk.sala_equipo_zona(text,text,uuid)',
                           'dk.sala_anular_linea(text,uuid,text)', 'dk.sala_anular_cuenta(text,uuid,text)',
                           'dk.sala_cambiar_cantidad(text,uuid,integer,text)', 'dk.sala_mover_cuenta(text,uuid,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dk_anon', f);
  END LOOP;
END $$;
