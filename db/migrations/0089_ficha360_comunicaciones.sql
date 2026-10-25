-- 0089 (18/10/2026, karc0): ficha 360 del cliente en Central.
-- 1) dk.admin_uso_plan(restaurante): lo que usa frente a los topes de su plan (espejo de dk.mi_uso_plan).
-- 2) public.cliente_comunicaciones: correos y WhatsApp enviados con plantilla, notas internas,
--    llamadas y recordatorios («llámale el día X», que salen en Inicio). Todo queda en la ficha.

CREATE OR REPLACE FUNCTION dk.admin_uso_plan(p_restaurante uuid)
 RETURNS TABLE(que text, usados integer, tope integer, tope_max integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE r public.restaurantes; v_mes timestamptz := date_trunc('month', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM public.restaurantes WHERE id = p_restaurante;
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT q.que, q.n::int,
         CASE WHEN q.que = 'idiomas' THEN dk.idiomas_permitidos(r.id) ELSE dk.plan_tope(r.plan, q.que) END,
         CASE WHEN q.que = 'idiomas' THEN dk.idiomas_permitidos(r.id) ELSE dk.plan_tope_max(r.plan, q.que) END
  FROM (VALUES
    ('productos',        (SELECT count(*) FROM public.menu_items WHERE restaurante_id = r.id)),
    ('mesas',            (SELECT count(*) FROM public.mesas WHERE restaurante_id = r.id)),
    ('camareros',        (SELECT count(*) FROM public.camareros WHERE restaurante_id = r.id AND activo)),
    ('reservas_mes',     (SELECT count(*) FROM public.reservas WHERE restaurante_id = r.id AND creada_en >= v_mes)),
    ('banners',          (SELECT count(*) FROM public.promociones WHERE restaurante_id = r.id AND activa)),
    ('comandas_tpv_mes', dk.comandas_tpv_mes(r.id)::bigint),
    ('idiomas',          cardinality(coalesce(r.idiomas, '{}'))::bigint)
  ) AS q(que, n);
END;
$function$;

CREATE TABLE IF NOT EXISTS public.cliente_comunicaciones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  proyecto_id    uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
  canal          text NOT NULL CHECK (canal IN ('email', 'whatsapp', 'nota', 'llamada', 'recordatorio')),
  plantilla      text CHECK (plantilla IS NULL OR char_length(plantilla) <= 40),
  asunto         text CHECK (asunto IS NULL OR char_length(asunto) <= 200),
  cuerpo         text CHECK (cuerpo IS NULL OR char_length(cuerpo) <= 8000),
  recordar_en    date,
  hecho          boolean NOT NULL DEFAULT false,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  creado_por     uuid,
  CHECK (restaurante_id IS NOT NULL OR proyecto_id IS NOT NULL),
  CHECK (canal <> 'recordatorio' OR recordar_en IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS cliente_com_rest_idx ON public.cliente_comunicaciones (restaurante_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS cliente_com_recordar_idx ON public.cliente_comunicaciones (recordar_en) WHERE canal = 'recordatorio' AND NOT hecho;
ALTER TABLE public.cliente_comunicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_comunicaciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.cliente_comunicaciones FROM PUBLIC, dk_app, dk_auth, dk_anon;

CREATE OR REPLACE FUNCTION dk.admin_comunicaciones(p_restaurante uuid)
 RETURNS SETOF public.cliente_comunicaciones LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM public.cliente_comunicaciones c WHERE c.restaurante_id = p_restaurante ORDER BY c.creado_en DESC LIMIT 200;
END;
$function$;

CREATE OR REPLACE FUNCTION dk.admin_comunicacion_anotar(p_restaurante uuid, p_canal text, p_plantilla text, p_asunto text, p_cuerpo text, p_recordar_en date)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.cliente_comunicaciones (restaurante_id, canal, plantilla, asunto, cuerpo, recordar_en, creado_por)
  VALUES (p_restaurante, p_canal, nullif(p_plantilla, ''), nullif(left(p_asunto, 200), ''), nullif(left(p_cuerpo, 8000), ''), p_recordar_en, dk.identidad_actual())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION dk.admin_recordatorio_hecho(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.cliente_comunicaciones SET hecho = true WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION dk.admin_recordatorios_pendientes()
 RETURNS TABLE(id uuid, restaurante_id uuid, local text, cuerpo text, recordar_en date)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT c.id, c.restaurante_id, r.nombre, c.cuerpo, c.recordar_en
    FROM public.cliente_comunicaciones c LEFT JOIN public.restaurantes r ON r.id = c.restaurante_id
   WHERE c.canal = 'recordatorio' AND NOT c.hecho AND c.recordar_en <= (now() AT TIME ZONE 'Europe/Madrid')::date + 1
   ORDER BY c.recordar_en LIMIT 50;
END;
$function$;

REVOKE ALL ON FUNCTION dk.admin_uso_plan(uuid), dk.admin_comunicaciones(uuid), dk.admin_comunicacion_anotar(uuid, text, text, text, text, date), dk.admin_recordatorio_hecho(uuid), dk.admin_recordatorios_pendientes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_uso_plan(uuid), dk.admin_comunicaciones(uuid), dk.admin_comunicacion_anotar(uuid, text, text, text, text, date), dk.admin_recordatorio_hecho(uuid), dk.admin_recordatorios_pendientes() TO dk_auth;
