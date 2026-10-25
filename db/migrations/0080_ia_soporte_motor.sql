-- 0080 · Motor de la IA de soporte N1 y N2 (decisión de karc0, 17/10/2026; ESTADO §6 entrada 169).
-- Un interruptor por nivel en Central → Soporte:
--   N1 (chat de ayuda del panel): apagado | agente | gateway
--   N2 (tickets):                 reglas  | agente | gateway
-- «agente» = Claude Code atiende una cola SOLO en las ventanas de prueba que abre karc0 (agente_hasta).
-- «gateway» = AI Gateway con Claude Haiku 5.5 (se pasa el mando cuando haya saldo).
-- N2 nunca responde solo: la IA clasifica, diagnostica y redacta un borrador; una persona lo revisa y lo envía.
-- Pagos, plan y baja: siempre una persona. El coste de N2 cuenta en el tope mensual global de IA.

BEGIN;

-- 1. Interruptor (una sola fila)
CREATE TABLE IF NOT EXISTS public.ia_soporte_ajustes (
  id           smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  n1           text NOT NULL DEFAULT 'agente' CHECK (n1 IN ('apagado', 'agente', 'gateway')),
  n2           text NOT NULL DEFAULT 'agente' CHECK (n2 IN ('reglas', 'agente', 'gateway')),
  modelo       text NOT NULL DEFAULT 'anthropic/claude-haiku-5.5' CHECK (modelo ~ '^[a-z0-9-]+/[a-z0-9.-]+$'),
  agente_hasta timestamptz,
  cambiado_en  timestamptz NOT NULL DEFAULT now(),
  cambiado_por uuid
);
INSERT INTO public.ia_soporte_ajustes (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.ia_soporte_ajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_soporte_ajustes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ia_soporte_ajustes FROM PUBLIC, dk_anon, dk_auth, dk_app;

-- 2. Cola de N1 en modo agente (la pregunta, el contexto que vería la IA y la respuesta)
CREATE TABLE IF NOT EXISTS public.ayuda_cola (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  identidad      uuid,
  historial      jsonb NOT NULL CHECK (jsonb_typeof(historial) = 'array' AND pg_column_size(historial) <= 16384),
  sistema        text NOT NULL CHECK (char_length(sistema) <= 60000),
  estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'respondida', 'caducada')),
  respuesta      jsonb CHECK (respuesta IS NULL OR (jsonb_typeof(respuesta) = 'object' AND pg_column_size(respuesta) <= 8192)),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  respondido_en  timestamptz
);
CREATE INDEX IF NOT EXISTS ayuda_cola_estado_idx ON public.ayuda_cola (estado, creado_en);
CREATE INDEX IF NOT EXISTS ayuda_cola_rest_idx ON public.ayuda_cola (restaurante_id, creado_en);
ALTER TABLE public.ayuda_cola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ayuda_cola FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ayuda_cola FROM PUBLIC, dk_anon, dk_auth, dk_app;

-- 3. N2: diagnóstico y borrador de la IA en el ticket
ALTER TABLE public.tickets_soporte ADD COLUMN IF NOT EXISTS ia_n2 jsonb
  CHECK (ia_n2 IS NULL OR (jsonb_typeof(ia_n2) = 'object' AND pg_column_size(ia_n2) <= 16384));

-- 4. Estado del interruptor (lo leen el panel de cada local y Central)
CREATE OR REPLACE FUNCTION dk.ia_soporte_modo()
RETURNS TABLE (n1 text, n2 text, modelo text, agente_activo boolean, agente_hasta timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  SELECT a.n1, a.n2, a.modelo, coalesce(a.agente_hasta > now(), false), a.agente_hasta
    FROM public.ia_soporte_ajustes a WHERE a.id = 1;
$$;

CREATE OR REPLACE FUNCTION dk.admin_ia_soporte_guardar(p_n1 text, p_n2 text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.ia_soporte_ajustes
     SET n1 = p_n1, n2 = p_n2, cambiado_en = now(), cambiado_por = dk.identidad_actual()
   WHERE id = 1;
END;
$$;

-- 5. N1 en modo agente: mismo permiso y mismo tope diario que la IA (30 por local y día de Madrid)
CREATE OR REPLACE FUNCTION dk.ayuda_cola_crear(p_restaurante uuid, p_historial jsonb, p_sistema text)
RETURNS TABLE (cola uuid, quedan int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_hoy int; v_id uuid;
BEGIN
  IF NOT dk.gestiona(p_restaurante) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ia_soporte_ajustes a WHERE a.id = 1 AND a.n1 = 'agente' AND a.agente_hasta > now()) THEN
    RAISE EXCEPTION 'agente_inactivo' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*)::int INTO v_hoy FROM public.ayuda_cola c
   WHERE c.restaurante_id = p_restaurante
     AND c.creado_en >= date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';
  IF v_hoy >= dk.ayuda_ia_tope_diario() THEN RAISE EXCEPTION 'ayuda_tope_diario' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.ayuda_cola (restaurante_id, identidad, historial, sistema)
  VALUES (p_restaurante, dk.identidad_actual(), p_historial, left(p_sistema, 60000)) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, dk.ayuda_ia_tope_diario() - v_hoy - 1;
END;
$$;

-- Respuesta del agente (solo para quien preguntó). p_rendirse: si sigue pendiente, la da por caducada.
CREATE OR REPLACE FUNCTION dk.ayuda_cola_respuesta(p_cola uuid, p_rendirse boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_estado text; v_resp jsonb;
BEGIN
  SELECT c.estado, c.respuesta INTO v_estado, v_resp FROM public.ayuda_cola c
   WHERE c.id = p_cola AND c.identidad IS NOT DISTINCT FROM dk.identidad_actual() AND dk.gestiona(c.restaurante_id);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_estado = 'pendiente' AND p_rendirse THEN
    UPDATE public.ayuda_cola SET estado = 'caducada' WHERE id = p_cola AND estado = 'pendiente';
  END IF;
  RETURN CASE WHEN v_estado = 'respondida' THEN v_resp END;
END;
$$;

-- 6. N2: ¿queda tope global para una llamada? y guardar el resultado (cuenta en el tope mensual de IA)
CREATE OR REPLACE FUNCTION dk.admin_soporte_ia_permitida()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN dk.ia_gasto_mes_usd() + 0.05 <= dk.ia_tope_mensual_usd();
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_soporte_ia_guardar(p_ticket uuid, p_ia jsonb, p_coste numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_rest uuid;
BEGIN
  PERFORM dk.exigir_admin();
  UPDATE public.tickets_soporte SET ia_n2 = p_ia WHERE id = p_ticket RETURNING restaurante_id INTO v_rest;
  IF v_rest IS NULL THEN RAISE EXCEPTION 'ticket no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF coalesce(p_coste, 0) > 0 THEN
    INSERT INTO public.ayuda_ia_uso (restaurante_id, identidad, coste_usd)
    VALUES (v_rest, dk.identidad_actual(), least(greatest(p_coste, 0), 1));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.ia_soporte_modo(), dk.admin_ia_soporte_guardar(text, text), dk.ayuda_cola_crear(uuid, jsonb, text),
  dk.ayuda_cola_respuesta(uuid, boolean), dk.admin_soporte_ia_permitida(), dk.admin_soporte_ia_guardar(uuid, jsonb, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.ia_soporte_modo(), dk.admin_ia_soporte_guardar(text, text), dk.ayuda_cola_crear(uuid, jsonb, text),
  dk.ayuda_cola_respuesta(uuid, boolean), dk.admin_soporte_ia_permitida(), dk.admin_soporte_ia_guardar(uuid, jsonb, numeric) TO dk_auth;

COMMIT;
