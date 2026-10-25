-- 0084 · Landing de venta de cada evento de Experience + eventos de muestra (17/10/2026, decisión de karc0).
-- La página /e/<slug> pasa de ficha de compra a landing de autor: subtítulo, historia, menú por pases con su
-- bebida, programa, qué incluye, anfitrión, dirección y mapa, preguntas y avisos. Todo va en `landing` (jsonb,
-- validado aquí) para no multiplicar columnas. `muestra`: evento de enseñanza (uno por formato), visible pero
-- nunca a la venta; las fotos de muestra viven en la web (/images/...), por eso imagen_url admite rutas propias.
BEGIN;

ALTER TABLE public.eventos_entradas ADD COLUMN IF NOT EXISTS landing jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.eventos_entradas ADD COLUMN IF NOT EXISTS muestra boolean NOT NULL DEFAULT false;
ALTER TABLE public.eventos_entradas ADD COLUMN IF NOT EXISTS formato text CHECK (formato IS NULL OR formato ~ '^[a-z0-9-]{3,40}$');

DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.eventos_entradas'::regclass AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%imagen_url%'
  LOOP EXECUTE format('ALTER TABLE public.eventos_entradas DROP CONSTRAINT %I', c); END LOOP;
END $$;
ALTER TABLE public.eventos_entradas ADD CONSTRAINT eventos_entradas_imagen_url_check
  CHECK (imagen_url IS NULL OR imagen_url ~ '^(https://|/images/)[^\s<>"]+$');
ALTER TABLE public.eventos_entradas DROP CONSTRAINT IF EXISTS eventos_entradas_landing_check;
ALTER TABLE public.eventos_entradas ADD CONSTRAINT eventos_entradas_landing_check
  CHECK (jsonb_typeof(landing) = 'object' AND octet_length(landing::text) <= 24000);

-- Una muestra nunca vende: ni estado «venta» ni entradas.
ALTER TABLE public.eventos_entradas DROP CONSTRAINT IF EXISTS eventos_entradas_muestra_check;
ALTER TABLE public.eventos_entradas ADD CONSTRAINT eventos_entradas_muestra_check CHECK (NOT muestra OR estado <> 'venta');

DROP FUNCTION IF EXISTS dk.evento_publico(text);
CREATE FUNCTION dk.evento_publico(p_slug text)
RETURNS TABLE (id uuid, slug text, local_nombre text, titulo text, descripcion text, lugar text, fecha timestamptz,
               precio_centimos int, aforo int, vendidas int, max_por_compra int, imagen_url text, stripe_cuenta text, estado text,
               landing jsonb, muestra boolean, formato text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT e.id, e.slug, e.local_nombre, e.titulo, e.descripcion, e.lugar, e.fecha, e.precio_centimos, e.aforo,
         (SELECT count(*)::int FROM public.entradas x WHERE x.evento_id = e.id AND x.estado <> 'anulada'),
         e.max_por_compra, e.imagen_url, CASE WHEN e.muestra THEN NULL ELSE e.stripe_cuenta END, e.estado,
         e.landing, e.muestra, e.formato
    FROM public.eventos_entradas e
   WHERE e.slug = p_slug AND (e.estado IN ('venta', 'cerrado') OR e.muestra);
$$;
REVOKE ALL ON FUNCTION dk.evento_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.evento_publico(text) TO dk_anon, dk_aprovisionamiento;

-- Las entradas de una muestra no se registran nunca (defensa en la base, además de la web).
CREATE OR REPLACE FUNCTION dk.muestra_sin_entradas() RETURNS trigger LANGUAGE plpgsql SET search_path TO pg_catalog AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.eventos_entradas WHERE id = NEW.evento_id AND muestra) THEN
    RAISE EXCEPTION 'evento de muestra: no vende entradas' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS entradas_muestra ON public.entradas;
CREATE TRIGGER entradas_muestra BEFORE INSERT ON public.entradas FOR EACH ROW EXECUTE FUNCTION dk.muestra_sin_entradas();

-- Central: guardar también landing, formato y muestra.
CREATE OR REPLACE FUNCTION dk.admin_evento_guardar(p_id uuid, p_datos jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid; v_landing jsonb := coalesce(p_datos->'landing', '{}'::jsonb);
BEGIN
  PERFORM dk.eventos_exigir_admin();
  IF jsonb_typeof(v_landing) <> 'object' THEN RAISE EXCEPTION 'landing no válida' USING ERRCODE = '22023'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.eventos_entradas (slug, local_nombre, titulo, descripcion, lugar, fecha, precio_centimos, aforo, max_por_compra, imagen_url, proyecto_id,
                                         landing, formato, muestra)
    VALUES (p_datos->>'slug', p_datos->>'local_nombre', p_datos->>'titulo', coalesce(p_datos->>'descripcion', ''), coalesce(p_datos->>'lugar', ''),
            (p_datos->>'fecha')::timestamptz, (p_datos->>'precio_centimos')::int, (p_datos->>'aforo')::int,
            coalesce((p_datos->>'max_por_compra')::int, 6), nullif(p_datos->>'imagen_url', ''), nullif(p_datos->>'proyecto_id', '')::uuid,
            v_landing, nullif(p_datos->>'formato', ''), coalesce((p_datos->>'muestra')::boolean, false))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.eventos_entradas SET
      local_nombre = p_datos->>'local_nombre', titulo = p_datos->>'titulo', descripcion = coalesce(p_datos->>'descripcion', ''),
      lugar = coalesce(p_datos->>'lugar', ''), fecha = (p_datos->>'fecha')::timestamptz, precio_centimos = (p_datos->>'precio_centimos')::int,
      aforo = (p_datos->>'aforo')::int, max_por_compra = coalesce((p_datos->>'max_por_compra')::int, 6),
      imagen_url = nullif(p_datos->>'imagen_url', ''), landing = v_landing, formato = nullif(p_datos->>'formato', ''),
      muestra = coalesce((p_datos->>'muestra')::boolean, muestra), actualizado_en = now()
    WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'evento no encontrado' USING ERRCODE = 'P0002'; END IF;
  END IF;
  INSERT INTO public.auditoria (identidad, accion, detalle) VALUES (dk.identidad_actual(), 'entradas.evento_guardar', jsonb_build_object('evento', v_id));
  RETURN v_id;
END $$;

DROP FUNCTION IF EXISTS dk.admin_eventos();
CREATE FUNCTION dk.admin_eventos()
RETURNS TABLE (id uuid, slug text, local_nombre text, titulo text, fecha timestamptz, precio_centimos int, aforo int, vendidas int,
               usadas int, ingresos_centimos bigint, estado text, stripe_cuenta text, tiene_clave boolean, descripcion text, lugar text,
               max_por_compra int, imagen_url text, landing jsonb, muestra boolean, formato text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.eventos_exigir_admin();
  RETURN QUERY SELECT e.id, e.slug, e.local_nombre, e.titulo, e.fecha, e.precio_centimos, e.aforo,
    (SELECT count(*)::int FROM public.entradas x WHERE x.evento_id = e.id AND x.estado <> 'anulada'),
    (SELECT count(*)::int FROM public.entradas x WHERE x.evento_id = e.id AND x.estado = 'usada'),
    (SELECT coalesce(sum(x.importe_centimos), 0) FROM public.entradas x WHERE x.evento_id = e.id AND x.estado <> 'anulada'),
    e.estado, e.stripe_cuenta, e.clave_puerta_hash IS NOT NULL, e.descripcion, e.lugar, e.max_por_compra, e.imagen_url,
    e.landing, e.muestra, e.formato
  FROM public.eventos_entradas e ORDER BY e.muestra, e.fecha DESC;
END $$;
REVOKE ALL ON FUNCTION dk.admin_eventos(), dk.admin_evento_guardar(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_eventos(), dk.admin_evento_guardar(uuid, jsonb) TO dk_auth;

COMMIT;
