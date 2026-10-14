-- 0078 · Seguimiento en vivo de cuentas piloto (14/10/2026, encargo de karc0).
-- Solo para cuentas marcadas en seguimiento_cuentas (piloto Casa Caracas): el panel manda
-- clics, pantallas, tiempos y errores; Central los ve en la ficha. Nunca se guarda lo que
-- el cliente escribe en los campos. La tabla no tiene permisos para la app: todo por funciones.
BEGIN;

CREATE TABLE IF NOT EXISTS public.seguimiento_cuentas (
  restaurante_id uuid PRIMARY KEY REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  motivo         text NOT NULL DEFAULT 'piloto' CHECK (char_length(motivo) <= 200),
  desde          timestamptz NOT NULL DEFAULT now(),
  hasta          timestamptz
);

CREATE TABLE IF NOT EXISTS public.seguimiento_eventos (
  id             bigserial PRIMARY KEY,
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  sesion         text NOT NULL CHECK (char_length(sesion) <= 40),
  tipo           text NOT NULL CHECK (tipo IN ('inicio', 'vista', 'clic', 'error', 'tiempo', 'salida')),
  pantalla       text CHECK (pantalla IS NULL OR char_length(pantalla) <= 200),
  objetivo       text CHECK (objetivo IS NULL OR char_length(objetivo) <= 200),
  detalle        text CHECK (detalle IS NULL OR char_length(detalle) <= 600),
  ms             int CHECK (ms IS NULL OR ms BETWEEN 0 AND 86400000),
  en_cliente     timestamptz,
  creado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seguimiento_eventos_idx ON public.seguimiento_eventos (restaurante_id, id DESC);

ALTER TABLE public.seguimiento_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimiento_cuentas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.seguimiento_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimiento_eventos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.seguimiento_cuentas, public.seguimiento_eventos FROM PUBLIC, dk_app, dk_auth, dk_anon;

-- El panel pregunta si su cuenta está en seguimiento (si no, no manda nada).
CREATE OR REPLACE FUNCTION dk.seguimiento_activo()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT s.restaurante_id
    FROM public.seguimiento_cuentas s
    JOIN public.restaurantes r ON r.id = s.restaurante_id
   WHERE r.propietario = dk.identidad_actual()
     AND (s.hasta IS NULL OR s.hasta > now())
   LIMIT 1;
$$;

-- Lote de eventos del propio cliente (máx. 60 por llamada y 20.000 por cuenta).
CREATE OR REPLACE FUNCTION dk.seguimiento_registrar(p_eventos jsonb)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_rest uuid := dk.seguimiento_activo();
  n int;
BEGIN
  IF v_rest IS NULL THEN RETURN 0; END IF;
  IF jsonb_typeof(p_eventos) IS DISTINCT FROM 'array' OR jsonb_array_length(p_eventos) > 60 THEN
    RAISE EXCEPTION 'lote no válido' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.seguimiento_eventos WHERE restaurante_id = v_rest) > 20000 THEN RETURN 0; END IF;
  INSERT INTO public.seguimiento_eventos (restaurante_id, sesion, tipo, pantalla, objetivo, detalle, ms, en_cliente)
  SELECT v_rest,
         left(coalesce(e->>'sesion', '?'), 40),
         e->>'tipo',
         left(e->>'pantalla', 200),
         left(e->>'objetivo', 200),
         left(e->>'detalle', 600),
         CASE WHEN (e->>'ms') ~ '^[0-9]{1,8}$' THEN least((e->>'ms')::int, 86400000) END,
         CASE WHEN (e->>'t') ~ '^[0-9]{13}$' THEN to_timestamp((e->>'t')::bigint / 1000.0) END
    FROM jsonb_array_elements(p_eventos) e
   WHERE e->>'tipo' IN ('inicio', 'vista', 'clic', 'error', 'tiempo', 'salida');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Central: eventos de una cuenta (los más recientes primero).
CREATE OR REPLACE FUNCTION dk.admin_seguimiento(p_restaurante uuid, p_limite int DEFAULT 400)
RETURNS TABLE (id bigint, sesion text, tipo text, pantalla text, objetivo text, detalle text, ms int, creado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT e.id, e.sesion, e.tipo, e.pantalla, e.objetivo, e.detalle, e.ms, e.creado_en
    FROM public.seguimiento_eventos e
   WHERE e.restaurante_id = p_restaurante
   ORDER BY e.id DESC
   LIMIT least(greatest(coalesce(p_limite, 400), 1), 2000);
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_seguimiento_cuenta(p_restaurante uuid)
RETURNS TABLE (activo boolean, desde timestamptz, hasta timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT (s.hasta IS NULL OR s.hasta > now()), s.desde, s.hasta FROM public.seguimiento_cuentas s WHERE s.restaurante_id = p_restaurante;
END;
$$;

REVOKE ALL ON FUNCTION dk.seguimiento_activo(), dk.seguimiento_registrar(jsonb), dk.admin_seguimiento(uuid, int), dk.admin_seguimiento_cuenta(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.seguimiento_activo(), dk.seguimiento_registrar(jsonb), dk.admin_seguimiento(uuid, int), dk.admin_seguimiento_cuenta(uuid) TO dk_auth;

-- Piloto Casa Caracas (Yerli, Venezuela): seguimiento hasta el 22/10.
INSERT INTO public.seguimiento_cuentas (restaurante_id, motivo, hasta)
SELECT id, 'Piloto Casa Caracas (Venezuela)', '2026-10-22 00:00+02' FROM public.restaurantes WHERE id = 'f977c58d-5a1c-4849-9a49-ed97256ab017'
ON CONFLICT (restaurante_id) DO NOTHING;

COMMIT;
