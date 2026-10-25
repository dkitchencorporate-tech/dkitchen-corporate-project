-- 0067 (09/10/2026, karc0): venta de entradas de DKitchen Experience.
-- El local cobra con SU cuenta de Stripe (Connect Express, cargo directo, 0 % de comisión de DKitchen):
-- el dinero nunca pasa por nosotros. Aquí solo guardamos el evento, las entradas pagadas y su uso en puerta.
-- Permisos: admin (Central) crea y edita eventos; dk_anon lee la ficha pública de un evento en venta;
-- dk_aprovisionamiento registra entradas DESPUÉS de que el servidor haya comprobado el pago en Stripe;
-- la puerta valida con una clave propia del evento (se guarda solo su hash).
BEGIN;

CREATE TABLE IF NOT EXISTS public.eventos_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  local_nombre text NOT NULL CHECK (length(local_nombre) BETWEEN 2 AND 120),
  titulo text NOT NULL CHECK (length(titulo) BETWEEN 3 AND 140),
  descripcion text NOT NULL DEFAULT '' CHECK (length(descripcion) <= 3000),
  lugar text NOT NULL DEFAULT '' CHECK (length(lugar) <= 300),
  fecha timestamptz NOT NULL,
  precio_centimos int NOT NULL CHECK (precio_centimos BETWEEN 100 AND 100000),
  aforo int NOT NULL CHECK (aforo BETWEEN 1 AND 5000),
  max_por_compra int NOT NULL DEFAULT 6 CHECK (max_por_compra BETWEEN 1 AND 20),
  imagen_url text CHECK (imagen_url IS NULL OR imagen_url ~ '^https://'),
  stripe_cuenta text CHECK (stripe_cuenta IS NULL OR stripe_cuenta ~ '^acct_[A-Za-z0-9]+$'),
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'venta', 'cerrado')),
  clave_puerta_hash text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos_entradas(id) ON DELETE RESTRICT,
  codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[A-Za-z0-9_-]{20,40}$'),
  stripe_sesion text NOT NULL,
  numero int NOT NULL CHECK (numero >= 1),
  nombre text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  importe_centimos int NOT NULL CHECK (importe_centimos >= 0),
  estado text NOT NULL DEFAULT 'pagada' CHECK (estado IN ('pagada', 'usada', 'anulada')),
  usada_en timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_sesion, numero)
);
CREATE INDEX IF NOT EXISTS entradas_evento_idx ON public.entradas (evento_id);

ALTER TABLE public.eventos_entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.eventos_entradas, public.entradas FROM PUBLIC;

CREATE OR REPLACE FUNCTION dk.eventos_exigir_admin() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
END $$;

-- Ficha pública (solo eventos en venta, sin datos internos).
CREATE OR REPLACE FUNCTION dk.evento_publico(p_slug text)
RETURNS TABLE (id uuid, slug text, local_nombre text, titulo text, descripcion text, lugar text, fecha timestamptz,
               precio_centimos int, aforo int, vendidas int, max_por_compra int, imagen_url text, stripe_cuenta text, estado text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT e.id, e.slug, e.local_nombre, e.titulo, e.descripcion, e.lugar, e.fecha, e.precio_centimos, e.aforo,
         (SELECT count(*)::int FROM public.entradas x WHERE x.evento_id = e.id AND x.estado <> 'anulada'),
         e.max_por_compra, e.imagen_url, e.stripe_cuenta, e.estado
    FROM public.eventos_entradas e
   WHERE e.slug = p_slug AND e.estado IN ('venta', 'cerrado');
$$;

-- Registro tras comprobar el pago en Stripe (servidor). Idempotente por sesión. Si el aforo se llenó entre
-- el inicio del pago y la confirmación, se registran igualmente (el dinero ya está cobrado) y se marca en auditoría.
CREATE OR REPLACE FUNCTION dk.registrar_entradas(p_evento uuid, p_sesion text, p_cantidad int, p_total_centimos int,
                                                 p_nombre text, p_email text, p_codigos text[])
RETURNS TABLE (codigo text, numero int) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v public.eventos_entradas; v_vendidas int; i int;
BEGIN
  IF p_cantidad < 1 OR p_cantidad > 20 OR array_length(p_codigos, 1) IS DISTINCT FROM p_cantidad THEN
    RAISE EXCEPTION 'cantidad no válida' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v FROM public.eventos_entradas WHERE id = p_evento FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'evento no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.entradas WHERE stripe_sesion = p_sesion) THEN
    SELECT count(*) INTO v_vendidas FROM public.entradas WHERE evento_id = p_evento AND estado <> 'anulada';
    FOR i IN 1..p_cantidad LOOP
      INSERT INTO public.entradas (evento_id, codigo, stripe_sesion, numero, nombre, email, importe_centimos)
      VALUES (p_evento, p_codigos[i], p_sesion, i, left(coalesce(p_nombre, ''), 120), left(lower(coalesce(p_email, '')), 254),
              CASE WHEN i = 1 THEN p_total_centimos - (p_total_centimos / p_cantidad) * (p_cantidad - 1) ELSE p_total_centimos / p_cantidad END);
    END LOOP;
    INSERT INTO public.auditoria (identidad, accion, detalle)
    VALUES (NULL, 'entradas.venta', jsonb_build_object('evento', p_evento, 'cantidad', p_cantidad, 'centimos', p_total_centimos,
            'sobreaforo', v_vendidas + p_cantidad > v.aforo));
  END IF;
  RETURN QUERY SELECT x.codigo, x.numero FROM public.entradas x WHERE x.stripe_sesion = p_sesion ORDER BY x.numero;
END $$;

-- Puerta: valida y marca como usada. Devuelve el resultado para mostrarlo en el móvil del portero.
CREATE OR REPLACE FUNCTION dk.validar_entrada(p_slug text, p_clave text, p_codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog, public AS $$
DECLARE v public.eventos_entradas; x public.entradas;
BEGIN
  SELECT * INTO v FROM public.eventos_entradas WHERE slug = p_slug;
  IF NOT FOUND OR v.clave_puerta_hash IS NULL
     OR v.clave_puerta_hash <> encode(sha256(convert_to(coalesce(p_clave, ''), 'UTF8')), 'hex') THEN
    RETURN jsonb_build_object('r', 'clave');
  END IF;
  SELECT * INTO x FROM public.entradas WHERE codigo = p_codigo AND evento_id = v.id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('r', 'no_existe'); END IF;
  IF x.estado = 'anulada' THEN RETURN jsonb_build_object('r', 'anulada'); END IF;
  IF x.estado = 'usada' THEN RETURN jsonb_build_object('r', 'usada', 'usada_en', x.usada_en, 'nombre', x.nombre, 'numero', x.numero); END IF;
  UPDATE public.entradas SET estado = 'usada', usada_en = now() WHERE id = x.id;
  RETURN jsonb_build_object('r', 'ok', 'nombre', x.nombre, 'numero', x.numero);
END $$;

-- Central: crear/editar evento.
CREATE OR REPLACE FUNCTION dk.admin_evento_guardar(p_id uuid, p_datos jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM dk.eventos_exigir_admin();
  IF p_id IS NULL THEN
    INSERT INTO public.eventos_entradas (slug, local_nombre, titulo, descripcion, lugar, fecha, precio_centimos, aforo, max_por_compra, imagen_url, proyecto_id)
    VALUES (p_datos->>'slug', p_datos->>'local_nombre', p_datos->>'titulo', coalesce(p_datos->>'descripcion', ''), coalesce(p_datos->>'lugar', ''),
            (p_datos->>'fecha')::timestamptz, (p_datos->>'precio_centimos')::int, (p_datos->>'aforo')::int,
            coalesce((p_datos->>'max_por_compra')::int, 6), nullif(p_datos->>'imagen_url', ''), nullif(p_datos->>'proyecto_id', '')::uuid)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.eventos_entradas SET
      local_nombre = p_datos->>'local_nombre', titulo = p_datos->>'titulo', descripcion = coalesce(p_datos->>'descripcion', ''),
      lugar = coalesce(p_datos->>'lugar', ''), fecha = (p_datos->>'fecha')::timestamptz, precio_centimos = (p_datos->>'precio_centimos')::int,
      aforo = (p_datos->>'aforo')::int, max_por_compra = coalesce((p_datos->>'max_por_compra')::int, 6),
      imagen_url = nullif(p_datos->>'imagen_url', ''), actualizado_en = now()
    WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'evento no encontrado' USING ERRCODE = 'P0002'; END IF;
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle) VALUES (dk.identidad_actual(), 'entradas.evento_guardar', jsonb_build_object('evento', v_id));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION dk.admin_evento_estado(p_id uuid, p_estado text, p_cuenta text, p_clave_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.eventos_exigir_admin();
  UPDATE public.eventos_entradas SET
    estado = coalesce(p_estado, estado),
    stripe_cuenta = coalesce(p_cuenta, stripe_cuenta),
    clave_puerta_hash = coalesce(p_clave_hash, clave_puerta_hash),
    actualizado_en = now()
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'evento no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF p_estado = 'venta' AND (SELECT stripe_cuenta FROM public.eventos_entradas WHERE id = p_id) IS NULL THEN
    RAISE EXCEPTION 'sin cuenta de cobro' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle) VALUES (dk.identidad_actual(), 'entradas.evento_estado',
    jsonb_build_object('evento', p_id, 'estado', p_estado, 'cuenta', p_cuenta IS NOT NULL, 'clave', p_clave_hash IS NOT NULL));
END $$;

CREATE OR REPLACE FUNCTION dk.admin_eventos()
RETURNS TABLE (id uuid, slug text, local_nombre text, titulo text, fecha timestamptz, precio_centimos int, aforo int, vendidas int,
               usadas int, ingresos_centimos bigint, estado text, stripe_cuenta text, tiene_clave boolean, descripcion text, lugar text,
               max_por_compra int, imagen_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.eventos_exigir_admin();
  RETURN QUERY SELECT e.id, e.slug, e.local_nombre, e.titulo, e.fecha, e.precio_centimos, e.aforo,
    (SELECT count(*)::int FROM public.entradas x WHERE x.evento_id = e.id AND x.estado <> 'anulada'),
    (SELECT count(*)::int FROM public.entradas x WHERE x.evento_id = e.id AND x.estado = 'usada'),
    (SELECT coalesce(sum(x.importe_centimos), 0) FROM public.entradas x WHERE x.evento_id = e.id AND x.estado <> 'anulada'),
    e.estado, e.stripe_cuenta, e.clave_puerta_hash IS NOT NULL, e.descripcion, e.lugar, e.max_por_compra, e.imagen_url
  FROM public.eventos_entradas e ORDER BY e.fecha DESC;
END $$;

CREATE OR REPLACE FUNCTION dk.admin_entradas(p_evento uuid)
RETURNS TABLE (codigo text, numero int, nombre text, email text, estado text, usada_en timestamptz, creado_en timestamptz, stripe_sesion text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.eventos_exigir_admin();
  RETURN QUERY SELECT x.codigo, x.numero, x.nombre, x.email, x.estado, x.usada_en, x.creado_en, x.stripe_sesion
    FROM public.entradas x WHERE x.evento_id = p_evento ORDER BY x.creado_en DESC, x.numero;
END $$;

REVOKE ALL ON FUNCTION dk.eventos_exigir_admin(), dk.evento_publico(text),
  dk.registrar_entradas(uuid, text, int, int, text, text, text[]), dk.validar_entrada(text, text, text),
  dk.admin_evento_guardar(uuid, jsonb), dk.admin_evento_estado(uuid, text, text, text), dk.admin_eventos(), dk.admin_entradas(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.evento_publico(text), dk.validar_entrada(text, text, text) TO dk_anon;
GRANT EXECUTE ON FUNCTION dk.evento_publico(text), dk.registrar_entradas(uuid, text, int, int, text, text, text[]) TO dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.admin_evento_guardar(uuid, jsonb), dk.admin_evento_estado(uuid, text, text, text),
  dk.admin_eventos(), dk.admin_entradas(uuid) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0067_entradas_experience') ON CONFLICT DO NOTHING;
COMMIT;
