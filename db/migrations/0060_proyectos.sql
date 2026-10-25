-- 0060 · Bloque 1 de AUTOMATIZACION_PRODUCTOS_2026-10-08.md (§2 y §4, H13): modelo común «proyecto»
-- para Signature, Experience, Auditoría, Dark Kitchen y QR físico. Un proyecto nace de un pago (webhook
-- de Stripe), de una solicitud de la web o a mano desde Central, y avanza por las fases de su producto.
-- Cada cambio queda en proyecto_eventos. Sin GRANT directo a tablas: todo pasa por funciones
-- SECURITY DEFINER (admin = dk.es_admin(); webhook y formularios = dk_aprovisionamiento; cliente = lo suyo).
-- pedidos_nivel_b (0013) se conserva para el intake con token de Signature: el proyecto la enlaza
-- (pedido_id) y guardar_intake avanza también el proyecto. Sus filas se traspasan aquí (hoy 0).

BEGIN;

CREATE TABLE IF NOT EXISTS public.proyectos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto            text NOT NULL CHECK (producto IN ('signature','experience','auditoria','dark_kitchen','qr_fisico')),
  fase                text NOT NULL,
  origen              text NOT NULL CHECK (origen IN ('pago','solicitud','central')),
  cliente_id          uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  email               text NOT NULL CHECK (email ~ '^[^\s@]+@[^\s@]+\.[a-z]{2,}$' AND char_length(email) <= 254),
  nombre              text CHECK (char_length(nombre) <= 120),
  telefono            text CHECK (char_length(telefono) <= 30),
  negocio             text CHECK (char_length(negocio) <= 120),
  siguiente_paso      text CHECK (char_length(siguiente_paso) <= 200),
  siguiente_fecha     date,
  datos               jsonb NOT NULL DEFAULT '{}'::jsonb,
  datos_fiscales      jsonb,
  contrato_estado     text CHECK (contrato_estado IN ('pendiente','enviado','firmado','rechazado','manual')),
  contrato_ref        text CHECK (char_length(contrato_ref) <= 120),
  contrato_firmado_en timestamptz,
  contrato_pdf_url    text CHECK (contrato_pdf_url IS NULL OR (contrato_pdf_url ~ '^https://' AND char_length(contrato_pdf_url) <= 500)),
  stripe_cliente      text CHECK (char_length(stripe_cliente) <= 80),
  stripe_factura      text CHECK (char_length(stripe_factura) <= 80),
  stripe_suscripcion  text CHECK (char_length(stripe_suscripcion) <= 80),
  referencia_pago     text UNIQUE CHECK (char_length(referencia_pago) <= 120),
  importe_centimos    integer CHECK (importe_centimos IS NULL OR importe_centimos >= 0),
  comercial           text CHECK (char_length(comercial) <= 40),
  pedido_id           uuid UNIQUE REFERENCES public.pedidos_nivel_b(id) ON DELETE SET NULL,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proyectos_email_idx ON public.proyectos (lower(email), producto);
CREATE INDEX IF NOT EXISTS proyectos_fase_idx ON public.proyectos (producto, fase);
CREATE INDEX IF NOT EXISTS proyectos_hoy_idx ON public.proyectos (siguiente_fecha) WHERE siguiente_fecha IS NOT NULL;
CREATE INDEX IF NOT EXISTS proyectos_cliente_idx ON public.proyectos (cliente_id) WHERE cliente_id IS NOT NULL;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.proyectos FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.proyecto_eventos (
  id          bigserial PRIMARY KEY,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('alta','solicitud','pago','fase','nota','llamada','correo','contrato','datos')),
  fase        text,
  texto       text CHECK (char_length(texto) <= 1000),
  autor       uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proyecto_eventos_idx ON public.proyecto_eventos (proyecto_id, creado_en DESC);
ALTER TABLE public.proyecto_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_eventos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.proyecto_eventos FROM PUBLIC;

-- Fases de cada producto, en orden. 'descartado' vale en todos. Copia en src/lib/proyectos.ts.
CREATE OR REPLACE FUNCTION dk.proyecto_fases(p_producto text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog AS $$
  SELECT CASE p_producto
    WHEN 'signature'    THEN ARRAY['solicitud','pagado','contrato_enviado','contrato_firmado','datos_recibidos','en_construccion','primera_version','publicado','mantenimiento','descartado']
    WHEN 'experience'   THEN ARRAY['solicitud','llamada','contrato_pago','concepto','evento_montado','venta_abierta','celebrado','cerrado','descartado']
    WHEN 'auditoria'    THEN ARRAY['solicitud','pagada','reunion_fijada','informe_entregado','cerrada','descartado']
    WHEN 'dark_kitchen' THEN ARRAY['solicitud','llamada','propuesta_contrato','en_marcha','cerrada','descartado']
    WHEN 'qr_fisico'    THEN ARRAY['pedido','en_produccion','enviado','entregado','descartado']
  END;
$$;

-- Fase en la que entra un proyecto al pagarse.
CREATE OR REPLACE FUNCTION dk.proyecto_fase_pagada(p_producto text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog AS $$
  SELECT CASE p_producto WHEN 'signature' THEN 'pagado' WHEN 'experience' THEN 'contrato_pago'
    WHEN 'auditoria' THEN 'pagada' WHEN 'dark_kitchen' THEN 'propuesta_contrato' WHEN 'qr_fisico' THEN 'pedido' END;
$$;

-- Siguiente paso por defecto al entrar en cada fase (texto para karc0 + días de plazo; NULL = sin plazo).
CREATE OR REPLACE FUNCTION dk.proyecto_paso(p_producto text, p_fase text, OUT texto text, OUT dias int)
LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog AS $$
  SELECT x.t, x.d FROM (VALUES
    ('signature','solicitud','Llamar y enviar propuesta',1), ('signature','pagado','Enviar contrato y llamar para el intake',1),
    ('signature','contrato_enviado','Comprobar la firma del contrato',2), ('signature','contrato_firmado','Recoger marca, carta y fotos (intake)',2),
    ('signature','datos_recibidos','Empezar la construcción',2), ('signature','en_construccion','Enseñar la primera versión',10),
    ('signature','primera_version','Aplicar cambios y publicar',5), ('signature','publicado','Revisar a los 7 días',7),
    ('experience','solicitud','Llamar: formato, fecha y aforo',2), ('experience','llamada','Enviar contrato y enlace de pago',1),
    ('experience','contrato_pago','Videollamada de arranque',2), ('experience','concepto','Enviar el concepto (día 3)',3),
    ('experience','evento_montado','Abrir la venta de entradas',2), ('experience','celebrado','Liquidación y datos del evento',3),
    ('auditoria','solicitud','Llamar y enviar el enlace de pago',1), ('auditoria','pagada','Fijar la reunión 1 a 1',1),
    ('auditoria','reunion_fijada','Preparar y entregar el informe',5), ('auditoria','informe_entregado','Seguimiento: ¿qué ha aplicado?',14),
    ('dark_kitchen','solicitud','Llamar para la entrevista de admisión',2), ('dark_kitchen','llamada','Enviar propuesta y contrato',3),
    ('dark_kitchen','propuesta_contrato','Confirmar firma y arranque',3),
    ('qr_fisico','pedido','Encargar la impresión',2), ('qr_fisico','en_produccion','Enviar el pedido',5), ('qr_fisico','enviado','Confirmar la entrega',4)
  ) AS x(p, f, t, d) WHERE x.p = p_producto AND x.f = p_fase;
$$;

CREATE OR REPLACE FUNCTION dk.proyecto_fase_valida(p_producto text, p_fase text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog AS $$
  SELECT p_fase = ANY (dk.proyecto_fases(p_producto));
$$;

ALTER TABLE public.proyectos DROP CONSTRAINT IF EXISTS proyectos_fase_check;
ALTER TABLE public.proyectos ADD CONSTRAINT proyectos_fase_check CHECK (dk.proyecto_fase_valida(producto, fase));

-- Proyecto «abierto» = no descartado ni en su última fase útil.
CREATE OR REPLACE FUNCTION dk.proyecto_abierto(p_producto text, p_fase text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog AS $$
  SELECT p_fase NOT IN ('descartado','mantenimiento','cerrado','cerrada','entregado');
$$;

-- ---------------------------------------------------------------------------
-- Alta desde el webhook de Stripe y los formularios (rol dk_aprovisionamiento).
-- p_d: email, nombre, telefono, negocio, referencia, importe, stripe_cliente, stripe_factura,
--      stripe_suscripcion, comercial, pedido_id, datos (jsonb), texto (para el historial).
-- Idempotente: misma referencia de pago → el mismo proyecto. Un pago de alguien con una solicitud
-- abierta del mismo producto convierte esa solicitud; una solicitud repetida en 30 días se anota
-- en la existente en vez de duplicarla. Devuelve el id y qué pasó: 'nuevo' | 'existente' | 'convertido' | 'anotado'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION dk.proyecto_crear(p_producto text, p_origen text, p_d jsonb, OUT id uuid, OUT resultado text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  d jsonb := coalesce(p_d, '{}'::jsonb);
  v_email text := lower(trim(coalesce(d ->> 'email', '')));
  v_ref text := nullif(trim(d ->> 'referencia'), '');
  v_fase text;
  v_paso record;
BEGIN
  IF dk.proyecto_fases(p_producto) IS NULL THEN RAISE EXCEPTION 'producto no válido' USING ERRCODE = '22023'; END IF;
  IF p_origen NOT IN ('pago','solicitud','central') THEN RAISE EXCEPTION 'origen no válido' USING ERRCODE = '22023'; END IF;

  IF v_ref IS NOT NULL THEN
    SELECT p.id INTO id FROM public.proyectos p WHERE p.referencia_pago = v_ref;
    IF FOUND THEN resultado := 'existente'; RETURN; END IF;
  END IF;

  v_fase := CASE WHEN p_origen = 'pago' THEN dk.proyecto_fase_pagada(p_producto)
                 WHEN nullif(d ->> 'fase', '') IS NOT NULL AND dk.proyecto_fase_valida(p_producto, d ->> 'fase') THEN d ->> 'fase'
                 ELSE (dk.proyecto_fases(p_producto))[1] END;
  SELECT * INTO v_paso FROM dk.proyecto_paso(p_producto, v_fase);

  -- ¿Ya hay uno abierto del mismo producto y correo (solicitud o alta de los últimos 30 días)?
  SELECT p.id INTO id FROM public.proyectos p
   WHERE lower(p.email) = v_email AND p.producto = p_producto AND dk.proyecto_abierto(p.producto, p.fase)
     AND (CASE WHEN p_origen = 'pago' THEN p.referencia_pago IS NULL AND p.fase IN ('solicitud','llamada')
               ELSE p.creado_en > now() - interval '30 days' END)
   ORDER BY p.creado_en DESC LIMIT 1;

  IF FOUND AND p_origen = 'pago' THEN
    UPDATE public.proyectos p SET
      fase = v_fase, referencia_pago = v_ref,
      importe_centimos = coalesce(nullif(d ->> 'importe', '')::int, p.importe_centimos),
      stripe_cliente = coalesce(nullif(d ->> 'stripe_cliente', ''), p.stripe_cliente),
      stripe_factura = coalesce(nullif(d ->> 'stripe_factura', ''), p.stripe_factura),
      stripe_suscripcion = coalesce(nullif(d ->> 'stripe_suscripcion', ''), p.stripe_suscripcion),
      comercial = coalesce(p.comercial, nullif(d ->> 'comercial', '')),
      pedido_id = coalesce(p.pedido_id, nullif(d ->> 'pedido_id', '')::uuid),
      nombre = coalesce(p.nombre, nullif(trim(d ->> 'nombre'), '')),
      negocio = coalesce(p.negocio, nullif(trim(d ->> 'negocio'), '')),
      telefono = coalesce(p.telefono, nullif(trim(d ->> 'telefono'), '')),
      datos = p.datos || coalesce(d -> 'datos', '{}'::jsonb),
      siguiente_paso = v_paso.texto,
      siguiente_fecha = CASE WHEN v_paso.dias IS NULL THEN NULL ELSE current_date + v_paso.dias END,
      actualizado_en = now()
     WHERE p.id = proyecto_crear.id;
    INSERT INTO public.proyecto_eventos (proyecto_id, tipo, fase, texto) VALUES (id, 'pago', v_fase, left(d ->> 'texto', 1000));
    resultado := 'convertido'; RETURN;
  ELSIF FOUND AND p_origen = 'solicitud' THEN
    UPDATE public.proyectos p SET datos = p.datos || coalesce(d -> 'datos', '{}'::jsonb),
           telefono = coalesce(nullif(trim(d ->> 'telefono'), ''), p.telefono), actualizado_en = now()
     WHERE p.id = proyecto_crear.id;
    INSERT INTO public.proyecto_eventos (proyecto_id, tipo, texto) VALUES (id, 'solicitud', left(coalesce(d ->> 'texto', 'Nueva solicitud'), 1000));
    resultado := 'anotado'; RETURN;
  END IF;

  INSERT INTO public.proyectos (producto, fase, origen, email, nombre, telefono, negocio, datos, referencia_pago,
                                importe_centimos, stripe_cliente, stripe_factura, stripe_suscripcion, comercial, pedido_id,
                                siguiente_paso, siguiente_fecha, cliente_id)
  VALUES (p_producto, v_fase, p_origen, v_email, nullif(trim(d ->> 'nombre'), ''), nullif(trim(d ->> 'telefono'), ''),
          nullif(trim(d ->> 'negocio'), ''), coalesce(d -> 'datos', '{}'::jsonb), v_ref, nullif(d ->> 'importe', '')::int,
          nullif(d ->> 'stripe_cliente', ''), nullif(d ->> 'stripe_factura', ''), nullif(d ->> 'stripe_suscripcion', ''),
          nullif(d ->> 'comercial', ''), nullif(d ->> 'pedido_id', '')::uuid,
          v_paso.texto, CASE WHEN v_paso.dias IS NULL THEN NULL ELSE current_date + v_paso.dias END,
          (SELECT i.id FROM public.identidades i WHERE lower(i.email::text) = v_email LIMIT 1))
  RETURNING proyectos.id INTO id;
  INSERT INTO public.proyecto_eventos (proyecto_id, tipo, fase, texto, autor)
  VALUES (id, CASE p_origen WHEN 'pago' THEN 'pago' WHEN 'solicitud' THEN 'solicitud' ELSE 'alta' END, v_fase,
          left(d ->> 'texto', 1000), CASE WHEN p_origen = 'central' THEN dk.identidad_actual() END);
  resultado := 'nuevo';
END;
$$;

-- Estado del contrato (webhook de SignWell, bloque 4). Firmado avanza Signature a «contrato_firmado».
CREATE OR REPLACE FUNCTION dk.proyecto_contrato(p_id uuid, p_estado text, p_ref text, p_pdf text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v public.proyectos; v_fase text; v_paso record;
BEGIN
  IF p_estado NOT IN ('pendiente','enviado','firmado','rechazado','manual') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v FROM public.proyectos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proyecto no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF v.contrato_estado IS NOT DISTINCT FROM p_estado THEN RETURN; END IF;
  v_fase := CASE WHEN v.producto = 'signature' AND p_estado = 'enviado' AND v.fase = 'pagado' THEN 'contrato_enviado'
                 WHEN v.producto = 'signature' AND p_estado = 'firmado' AND v.fase IN ('pagado','contrato_enviado') THEN 'contrato_firmado' END;
  SELECT * INTO v_paso FROM dk.proyecto_paso(v.producto, v_fase);
  UPDATE public.proyectos SET contrato_estado = p_estado, contrato_ref = coalesce(nullif(p_ref, ''), contrato_ref),
         contrato_pdf_url = coalesce(nullif(p_pdf, ''), contrato_pdf_url),
         contrato_firmado_en = CASE WHEN p_estado = 'firmado' THEN now() ELSE contrato_firmado_en END,
         fase = coalesce(v_fase, fase),
         siguiente_paso = CASE WHEN v_fase IS NULL THEN siguiente_paso ELSE v_paso.texto END,
         siguiente_fecha = CASE WHEN v_fase IS NULL THEN siguiente_fecha WHEN v_paso.dias IS NULL THEN NULL ELSE current_date + v_paso.dias END,
         actualizado_en = now()
   WHERE id = p_id;
  INSERT INTO public.proyecto_eventos (proyecto_id, tipo, fase, texto) VALUES (p_id, 'contrato', v_fase, 'Contrato ' || p_estado);
END;
$$;

-- El intake de Signature (0013) avanza también el proyecto enlazado.
CREATE OR REPLACE FUNCTION dk.guardar_intake(p_token text, p_datos jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_pedido_id uuid;
BEGIN
  SELECT id INTO v_pedido_id FROM pedidos_nivel_b WHERE token = p_token;
  IF v_pedido_id IS NULL THEN
    RAISE EXCEPTION 'Token de intake no válido' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO intake_formularios (pedido_id, datos)
  VALUES (v_pedido_id, p_datos)
  ON CONFLICT (pedido_id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_en = now();

  UPDATE pedidos_nivel_b SET estado = 'intake_recibido' WHERE id = v_pedido_id AND estado = 'pagado';

  INSERT INTO proyecto_eventos (proyecto_id, tipo, fase, texto)
  SELECT p.id, 'datos', 'datos_recibidos', 'El cliente ha enviado el formulario de datos'
    FROM proyectos p WHERE p.pedido_id = v_pedido_id;
  UPDATE proyectos p SET fase = 'datos_recibidos', siguiente_paso = 'Empezar la construcción',
         siguiente_fecha = current_date + 2, actualizado_en = now()
   WHERE p.pedido_id = v_pedido_id AND p.fase IN ('pagado','contrato_enviado','contrato_firmado');
END;
$$;

-- ---------------------------------------------------------------------------
-- Central (solo super admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION dk.proyecto_exigir_admin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
END;
$$;

-- Lista con filtros. p_hoy = solo los que tienen el siguiente paso vencido o para hoy.
CREATE OR REPLACE FUNCTION dk.admin_proyectos(p_producto text, p_fase text, p_hoy boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.proyecto_exigir_admin();
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.vencido DESC, t.siguiente_fecha NULLS LAST, t.actualizado_en DESC) FROM (
    SELECT p.id, p.producto, p.fase, p.origen, p.email, p.nombre, p.telefono, p.negocio, p.siguiente_paso, p.siguiente_fecha,
           p.importe_centimos, p.contrato_estado, p.comercial, p.creado_en, p.actualizado_en,
           (p.siguiente_fecha IS NOT NULL AND p.siguiente_fecha <= current_date AND dk.proyecto_abierto(p.producto, p.fase)) AS vencido
      FROM public.proyectos p
     WHERE (nullif(p_producto, '') IS NULL OR p.producto = p_producto)
       AND (CASE WHEN nullif(p_fase, '') IS NULL THEN true
                 WHEN p_fase = 'abiertos' THEN dk.proyecto_abierto(p.producto, p.fase)
                 ELSE p.fase = p_fase END)
       AND (NOT coalesce(p_hoy, false) OR (p.siguiente_fecha IS NOT NULL AND p.siguiente_fecha <= current_date AND dk.proyecto_abierto(p.producto, p.fase)))
     LIMIT 300) t), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_proyecto(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.proyecto_exigir_admin();
  RETURN (SELECT to_jsonb(p) || jsonb_build_object(
            'fases', to_jsonb(dk.proyecto_fases(p.producto)),
            'eventos', coalesce((SELECT jsonb_agg(jsonb_build_object('tipo', e.tipo, 'fase', e.fase, 'texto', e.texto, 'creado_en', e.creado_en,
                                                                     'autor', (SELECT i.nombre FROM public.identidades i WHERE i.id = e.autor))
                                          ORDER BY e.creado_en DESC, e.id DESC)
                                  FROM public.proyecto_eventos e WHERE e.proyecto_id = p.id), '[]'::jsonb),
            'intake', (SELECT f.datos FROM public.intake_formularios f WHERE f.pedido_id = p.pedido_id),
            'token_intake', (SELECT b.token FROM public.pedidos_nivel_b b WHERE b.id = p.pedido_id))
            FROM public.proyectos p WHERE p.id = p_id);
END;
$$;

-- Cambio de fase con nota. Pone el siguiente paso por defecto de la fase nueva. Devuelve los datos
-- para que Central mande (si karc0 lo marca) el correo de fase al cliente.
CREATE OR REPLACE FUNCTION dk.admin_proyecto_fase(p_id uuid, p_fase text, p_nota text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v public.proyectos; v_paso record;
BEGIN
  PERFORM dk.proyecto_exigir_admin();
  SELECT * INTO v FROM public.proyectos WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proyecto no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF NOT dk.proyecto_fase_valida(v.producto, p_fase) THEN RAISE EXCEPTION 'fase no válida' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_paso FROM dk.proyecto_paso(v.producto, p_fase);
  UPDATE public.proyectos SET fase = p_fase, siguiente_paso = v_paso.texto,
         siguiente_fecha = CASE WHEN v_paso.dias IS NULL THEN NULL ELSE current_date + v_paso.dias END, actualizado_en = now()
   WHERE id = p_id;
  INSERT INTO public.proyecto_eventos (proyecto_id, tipo, fase, texto, autor)
  VALUES (p_id, 'fase', p_fase, left(nullif(trim(p_nota), ''), 1000), dk.identidad_actual());
  RETURN jsonb_build_object('email', v.email, 'nombre', v.nombre, 'negocio', v.negocio, 'producto', v.producto, 'fase', p_fase, 'anterior', v.fase);
END;
$$;

-- Apunte en el historial (nota, llamada o correo enviado) y, opcional, siguiente paso y fecha.
CREATE OR REPLACE FUNCTION dk.admin_proyecto_anotar(p_id uuid, p_tipo text, p_texto text, p_siguiente text, p_fecha date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.proyecto_exigir_admin();
  IF p_tipo NOT IN ('nota','llamada','correo') THEN RAISE EXCEPTION 'tipo no válido' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.proyectos WHERE id = p_id) THEN RAISE EXCEPTION 'proyecto no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF nullif(trim(p_texto), '') IS NOT NULL THEN
    INSERT INTO public.proyecto_eventos (proyecto_id, tipo, texto, autor) VALUES (p_id, p_tipo, left(trim(p_texto), 1000), dk.identidad_actual());
  END IF;
  IF nullif(trim(p_siguiente), '') IS NOT NULL OR p_fecha IS NOT NULL THEN
    UPDATE public.proyectos SET siguiente_paso = coalesce(left(nullif(trim(p_siguiente), ''), 200), siguiente_paso),
           siguiente_fecha = p_fecha, actualizado_en = now() WHERE id = p_id;
  END IF;
END;
$$;

-- Alta o edición a mano desde Central (datos de contacto y fiscales).
CREATE OR REPLACE FUNCTION dk.admin_proyecto_guardar(p_id uuid, p_producto text, p_d jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE d jsonb := coalesce(p_d, '{}'::jsonb); v_id uuid; r record;
BEGIN
  PERFORM dk.proyecto_exigir_admin();
  IF p_id IS NULL THEN
    SELECT * INTO r FROM dk.proyecto_crear(p_producto, 'central', d || jsonb_build_object('texto', 'Alta a mano en Central'));
    RETURN r.id;
  END IF;
  UPDATE public.proyectos p SET
    nombre   = CASE WHEN d ? 'nombre' THEN nullif(trim(d ->> 'nombre'), '') ELSE p.nombre END,
    telefono = CASE WHEN d ? 'telefono' THEN nullif(trim(d ->> 'telefono'), '') ELSE p.telefono END,
    negocio  = CASE WHEN d ? 'negocio' THEN nullif(trim(d ->> 'negocio'), '') ELSE p.negocio END,
    email    = CASE WHEN nullif(trim(d ->> 'email'), '') IS NOT NULL THEN lower(trim(d ->> 'email')) ELSE p.email END,
    datos_fiscales = CASE WHEN d ? 'datos_fiscales' THEN nullif(d -> 'datos_fiscales', 'null'::jsonb) ELSE p.datos_fiscales END,
    contrato_estado = CASE WHEN d ? 'contrato_estado' THEN nullif(d ->> 'contrato_estado', '') ELSE p.contrato_estado END,
    actualizado_en = now()
  WHERE p.id = p_id RETURNING p.id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'proyecto no encontrado' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.proyecto_eventos (proyecto_id, tipo, texto, autor) VALUES (p_id, 'datos', 'Datos editados en Central', dk.identidad_actual());
  RETURN v_id;
END;
$$;

-- Tarjeta del inicio de Central: abiertos y los que tocan hoy, por producto.
CREATE OR REPLACE FUNCTION dk.admin_proyectos_resumen()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.proyecto_exigir_admin();
  RETURN jsonb_build_object(
    'abiertos', (SELECT count(*) FROM public.proyectos p WHERE dk.proyecto_abierto(p.producto, p.fase)),
    'hoy', (SELECT count(*) FROM public.proyectos p WHERE p.siguiente_fecha <= current_date AND dk.proyecto_abierto(p.producto, p.fase)),
    'nuevos_7d', (SELECT count(*) FROM public.proyectos p WHERE p.creado_en > now() - interval '7 days'));
END;
$$;

-- Área del cliente (bloque 2): solo sus proyectos, sin notas internas.
CREATE OR REPLACE FUNCTION dk.mis_proyectos()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'producto', p.producto, 'fase', p.fase, 'negocio', p.negocio, 'contrato_estado', p.contrato_estado,
           'contrato_pdf_url', p.contrato_pdf_url, 'creado_en', p.creado_en, 'fases', to_jsonb(dk.proyecto_fases(p.producto)),
           'historial', coalesce((SELECT jsonb_agg(jsonb_build_object('fase', e.fase, 'creado_en', e.creado_en) ORDER BY e.creado_en)
                                    FROM public.proyecto_eventos e WHERE e.proyecto_id = p.id AND e.fase IS NOT NULL), '[]'::jsonb))
           ORDER BY p.creado_en DESC), '[]'::jsonb)
    FROM public.proyectos p
   WHERE p.cliente_id IS NOT NULL AND p.cliente_id = dk.identidad_actual() AND p.fase <> 'descartado';
$$;

-- Traspaso de pedidos_nivel_b (hoy vacía en producción).
INSERT INTO public.proyectos (producto, fase, origen, email, nombre, negocio, referencia_pago, importe_centimos, pedido_id, creado_en)
SELECT CASE b.producto WHEN 'nucleo-operativo' THEN 'signature' WHEN 'dark-kitchen-ruta-b' THEN 'dark_kitchen' ELSE b.producto END,
       CASE WHEN b.producto = 'nucleo-operativo' AND b.estado = 'intake_recibido' THEN 'datos_recibidos'
            WHEN b.producto = 'nucleo-operativo' AND b.estado = 'en_ejecucion' THEN 'en_construccion'
            WHEN b.producto = 'nucleo-operativo' AND b.estado = 'completado' THEN 'publicado'
            ELSE dk.proyecto_fase_pagada(CASE b.producto WHEN 'nucleo-operativo' THEN 'signature' WHEN 'dark-kitchen-ruta-b' THEN 'dark_kitchen' ELSE b.producto END) END,
       'pago', lower(b.email::text), b.nombre_contacto, b.restaurante_nombre, b.referencia_pago, b.importe_centimos, b.id, b.creado_en
  FROM public.pedidos_nivel_b b
 WHERE NOT EXISTS (SELECT 1 FROM public.proyectos p WHERE p.pedido_id = b.id OR p.referencia_pago = b.referencia_pago);

-- Permisos
REVOKE ALL ON FUNCTION dk.proyecto_fases(text), dk.proyecto_fase_pagada(text), dk.proyecto_paso(text, text),
  dk.proyecto_fase_valida(text, text), dk.proyecto_abierto(text, text), dk.proyecto_crear(text, text, jsonb),
  dk.proyecto_contrato(uuid, text, text, text), dk.proyecto_exigir_admin(), dk.admin_proyectos(text, text, boolean),
  dk.admin_proyecto(uuid), dk.admin_proyecto_fase(uuid, text, text), dk.admin_proyecto_anotar(uuid, text, text, text, date),
  dk.admin_proyecto_guardar(uuid, text, jsonb), dk.admin_proyectos_resumen(), dk.mis_proyectos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.proyecto_crear(text, text, jsonb), dk.proyecto_contrato(uuid, text, text, text) TO dk_aprovisionamiento;
GRANT EXECUTE ON FUNCTION dk.admin_proyectos(text, text, boolean), dk.admin_proyecto(uuid), dk.admin_proyecto_fase(uuid, text, text),
  dk.admin_proyecto_anotar(uuid, text, text, text, date), dk.admin_proyecto_guardar(uuid, text, jsonb), dk.admin_proyectos_resumen(),
  dk.mis_proyectos() TO dk_auth;

COMMIT;
