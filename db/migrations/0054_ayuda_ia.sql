-- 0054 · Soporte nivel 1: ayuda con IA dentro del panel (decisiones de karc0, 07/10; ESTADO §6 entrada 77).
-- Gratis para el local (no gasta créditos de imágenes), máximo 30 mensajes al día por local
-- (día de Madrid) y su coste real cuenta para el tope mensual global de IA (dk.ia_tope_mensual_usd),
-- el mismo que frena las imágenes. Lo usan el dueño y su socio en puesta a punto (dk.gestiona, 0052).

BEGIN;

CREATE TABLE IF NOT EXISTS public.ayuda_ia_uso (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  identidad      uuid,
  coste_usd      numeric(8,5) NOT NULL DEFAULT 0 CHECK (coste_usd BETWEEN 0 AND 1),
  creado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ayuda_ia_uso_rest_idx ON public.ayuda_ia_uso (restaurante_id, creado_en);
CREATE INDEX IF NOT EXISTS ayuda_ia_uso_mes_idx ON public.ayuda_ia_uso (creado_en);
ALTER TABLE public.ayuda_ia_uso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ayuda_ia_uso FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ayuda_ia_uso FROM PUBLIC, dk_anon, dk_auth, dk_app;

CREATE OR REPLACE FUNCTION dk.ayuda_ia_tope_diario() RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT 30 $$;
-- Reserva prudente por mensaje hasta conocer el coste real (Flash-Lite: ≈0,003 $ por mensaje).
CREATE OR REPLACE FUNCTION dk.ayuda_ia_reserva_usd() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.01::numeric $$;

-- Gasto del mes: imágenes (0038) + ayuda IA
CREATE OR REPLACE FUNCTION dk.ia_gasto_mes_usd()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
  SELECT coalesce((SELECT sum(CASE WHEN tipo = 'uso' THEN coste_usd ELSE -coste_usd END)
                     FROM public.ia_movimientos
                    WHERE tipo IN ('uso', 'devolucion') AND creado_en >= date_trunc('month', now())), 0)
       + coalesce((SELECT sum(coste_usd) FROM public.ayuda_ia_uso WHERE creado_en >= date_trunc('month', now())), 0);
$$;

-- Antes de cada mensaje: permiso, tope diario del local y tope global. Devuelve el id y cuántos quedan hoy.
CREATE OR REPLACE FUNCTION dk.ayuda_ia_reservar(p_restaurante uuid)
RETURNS TABLE (uso uuid, quedan int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE v_hoy int; v_id uuid;
BEGIN
  IF NOT dk.gestiona(p_restaurante) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.restaurantes WHERE id = p_restaurante FOR UPDATE;
  SELECT count(*)::int INTO v_hoy FROM public.ayuda_ia_uso
   WHERE restaurante_id = p_restaurante
     AND creado_en >= date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';
  IF v_hoy >= dk.ayuda_ia_tope_diario() THEN RAISE EXCEPTION 'ayuda_tope_diario' USING ERRCODE = 'P0001'; END IF;
  IF dk.ia_gasto_mes_usd() + dk.ayuda_ia_reserva_usd() > dk.ia_tope_mensual_usd() THEN
    RAISE EXCEPTION 'ia_tope_global' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.ayuda_ia_uso (restaurante_id, identidad, coste_usd)
  VALUES (p_restaurante, dk.identidad_actual(), dk.ayuda_ia_reserva_usd()) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, dk.ayuda_ia_tope_diario() - v_hoy - 1;
END;
$$;

-- Después: el coste real que devuelve AI Gateway (si la IA falla, 0: no cuenta).
CREATE OR REPLACE FUNCTION dk.ayuda_ia_coste(p_uso uuid, p_coste numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  UPDATE public.ayuda_ia_uso u SET coste_usd = least(greatest(coalesce(p_coste, 0), 0), 1)
   WHERE u.id = p_uso AND u.identidad = dk.identidad_actual() AND dk.gestiona(u.restaurante_id);
END;
$$;

REVOKE ALL ON FUNCTION dk.ayuda_ia_reservar(uuid), dk.ayuda_ia_coste(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.ayuda_ia_reservar(uuid), dk.ayuda_ia_coste(uuid, numeric) TO dk_auth;

COMMIT;
