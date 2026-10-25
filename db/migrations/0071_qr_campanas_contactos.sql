-- 0071 · QR de campaña editables con seguimiento + formulario previo a WhatsApp (karc0, 12/10; ESTADO §6 entrada 136).
-- Los QR impresos de DKitchen (flyer, tarjeta…) apuntan a /q/<codigo>, nunca al destino final: el
-- destino se cambia desde Central sin reimprimir y cada escaneo, clic de botonera, formulario y salto a
-- WhatsApp queda registrado. Los contactos del formulario quedan guardados antes de abrir WhatsApp.

BEGIN;

CREATE TABLE IF NOT EXISTS public.qr_campanas (
  codigo text PRIMARY KEY CHECK (codigo ~ '^[a-z0-9-]{3,32}$'),
  nombre text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 80),
  destino text NOT NULL CHECK (destino ~ '^/[A-Za-z0-9/_?&=%.,-]*$' AND length(destino) <= 300),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qr_campana_eventos (
  id bigserial PRIMARY KEY,
  codigo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('escaneo', 'clic', 'formulario', 'whatsapp')),
  detalle text CHECK (length(detalle) <= 120),
  ocurrido_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qr_campana_eventos_codigo ON public.qr_campana_eventos (codigo, tipo, ocurrido_en);

CREATE TABLE IF NOT EXISTS public.contactos_web (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origen text NOT NULL CHECK (length(origen) <= 40),
  nombre text NOT NULL CHECK (length(nombre) BETWEEN 2 AND 80),
  negocio text CHECK (length(negocio) <= 100),
  tipo_negocio text NOT NULL CHECK (length(tipo_negocio) <= 40),
  localidad text CHECK (length(localidad) <= 60),
  interes text NOT NULL CHECK (interes IN ('carta', 'signature', 'experience', 'no_se')),
  consulta text NOT NULL CHECK (length(consulta) BETWEEN 3 AND 600),
  franja text CHECK (franja IN ('manana', 'tarde', 'noche', 'cuando_sea')),
  estado text NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'atendido', 'descartado')),
  creado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qr_campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_campanas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qr_campana_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_campana_eventos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.contactos_web ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos_web FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.qr_campanas, public.qr_campana_eventos, public.contactos_web FROM PUBLIC, dk_anon, dk_auth, dk_app;

-- Códigos del flyer v5 (los destinos se cambian después desde Central).
INSERT INTO public.qr_campanas (codigo, nombre, destino) VALUES
  ('f-carta',   'Flyer · Carta QR · demos',        '/demos/carta?utm_source=flyer&utm_medium=print&utm_campaign=baza_oct26'),
  ('f-carta-wa','Flyer · Carta QR · WhatsApp',     '/contacto?i=carta&utm_source=flyer&utm_medium=print&utm_campaign=baza_oct26'),
  ('f-sig',     'Flyer · Signature · demos',       '/demos/signature?utm_source=flyer&utm_medium=print&utm_campaign=baza_oct26'),
  ('f-sig-wa',  'Flyer · Signature · WhatsApp',    '/contacto?i=signature&utm_source=flyer&utm_medium=print&utm_campaign=baza_oct26')
ON CONFLICT (codigo) DO NOTHING;

-- Público: resolver el QR (cuenta el escaneo). NULL si no existe o está apagado.
CREATE OR REPLACE FUNCTION dk.qr_campana_resolver(p_codigo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v text;
BEGIN
  SELECT destino INTO v FROM public.qr_campanas WHERE codigo = p_codigo AND activo;
  IF v IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.qr_campana_eventos (codigo, tipo) VALUES (p_codigo, 'escaneo');
  RETURN v;
END;
$$;

-- Público: clic en botonera, formulario o salto a WhatsApp. Solo códigos existentes.
CREATE OR REPLACE FUNCTION dk.qr_campana_evento(p_codigo text, p_tipo text, p_detalle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  IF p_tipo NOT IN ('clic', 'formulario', 'whatsapp') THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.qr_campanas WHERE codigo = p_codigo) THEN RETURN; END IF;
  INSERT INTO public.qr_campana_eventos (codigo, tipo, detalle) VALUES (p_codigo, p_tipo, left(p_detalle, 120));
END;
$$;

-- Público: guarda el formulario previo a WhatsApp. Devuelve el id (referencia corta en el mensaje).
CREATE OR REPLACE FUNCTION dk.contacto_registrar(p_origen text, p_nombre text, p_negocio text, p_tipo text, p_localidad text,
                                                 p_interes text, p_consulta text, p_franja text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v uuid;
BEGIN
  INSERT INTO public.contactos_web (origen, nombre, negocio, tipo_negocio, localidad, interes, consulta, franja)
  VALUES (left(coalesce(nullif(p_origen, ''), 'web'), 40), btrim(p_nombre), nullif(btrim(p_negocio), ''), btrim(p_tipo),
          nullif(btrim(p_localidad), ''), p_interes, btrim(p_consulta), nullif(p_franja, ''))
  RETURNING id INTO v;
  IF EXISTS (SELECT 1 FROM public.qr_campanas WHERE codigo = p_origen) THEN
    INSERT INTO public.qr_campana_eventos (codigo, tipo, detalle) VALUES (p_origen, 'formulario', p_interes);
  END IF;
  RETURN v;
END;
$$;

-- Central: QR con sus cifras.
CREATE OR REPLACE FUNCTION dk.admin_qr_campanas()
RETURNS TABLE (codigo text, nombre text, destino text, activo boolean, escaneos bigint, escaneos_7d bigint, clics bigint, formularios bigint, whatsapp bigint, ultimo timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
  SELECT q.codigo, q.nombre, q.destino, q.activo,
         count(*) FILTER (WHERE e.tipo = 'escaneo'),
         count(*) FILTER (WHERE e.tipo = 'escaneo' AND e.ocurrido_en > now() - interval '7 days'),
         count(*) FILTER (WHERE e.tipo = 'clic'),
         count(*) FILTER (WHERE e.tipo = 'formulario'),
         count(*) FILTER (WHERE e.tipo = 'whatsapp'),
         max(e.ocurrido_en)
    FROM public.qr_campanas q LEFT JOIN public.qr_campana_eventos e ON e.codigo = q.codigo
   GROUP BY q.codigo ORDER BY q.creado_en;
END;
$$;

-- Central: clics por botón de un QR.
CREATE OR REPLACE FUNCTION dk.admin_qr_campana_clics(p_codigo text)
RETURNS TABLE (detalle text, total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY SELECT e.detalle, count(*) FROM public.qr_campana_eventos e
   WHERE e.codigo = p_codigo AND e.tipo = 'clic' GROUP BY e.detalle ORDER BY 2 DESC;
END;
$$;

-- Central: crear o editar un QR (el código no cambia nunca: es lo impreso).
CREATE OR REPLACE FUNCTION dk.admin_qr_campana_guardar(p_codigo text, p_nombre text, p_destino text, p_activo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  INSERT INTO public.qr_campanas (codigo, nombre, destino, activo) VALUES (lower(p_codigo), p_nombre, p_destino, p_activo)
  ON CONFLICT (codigo) DO UPDATE SET nombre = excluded.nombre, destino = excluded.destino, activo = excluded.activo, actualizado_en = now();
  INSERT INTO public.auditoria (identidad, accion, detalle)
  VALUES (dk.identidad_actual(), 'admin.qr_campana', jsonb_build_object('codigo', lower(p_codigo), 'destino', p_destino, 'activo', p_activo));
END;
$$;

-- Central: contactos del formulario.
CREATE OR REPLACE FUNCTION dk.admin_contactos_web(p_limite int)
RETURNS SETOF public.contactos_web
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY SELECT * FROM public.contactos_web ORDER BY creado_en DESC LIMIT least(greatest(p_limite, 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_contacto_estado(p_id uuid, p_estado text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.contactos_web SET estado = p_estado WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION dk.qr_campana_resolver(text), dk.qr_campana_evento(text, text, text),
  dk.contacto_registrar(text, text, text, text, text, text, text, text), dk.admin_qr_campanas(), dk.admin_qr_campana_clics(text),
  dk.admin_qr_campana_guardar(text, text, text, boolean), dk.admin_contactos_web(int), dk.admin_contacto_estado(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.qr_campana_resolver(text), dk.qr_campana_evento(text, text, text),
  dk.contacto_registrar(text, text, text, text, text, text, text, text) TO dk_anon, dk_auth;
GRANT EXECUTE ON FUNCTION dk.admin_qr_campanas(), dk.admin_qr_campana_clics(text), dk.admin_qr_campana_guardar(text, text, text, boolean),
  dk.admin_contactos_web(int), dk.admin_contacto_estado(uuid, text) TO dk_auth;

COMMIT;
