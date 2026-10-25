-- 0049 · Tutorial de montaje obligatorio + 10 créditos de IA (07/10/2026, B5 de karc0)
-- Decisiones de karc0 (07/10, AskUserQuestion):
--   · «Aprender haciendo»: el tutorial se hace sobre el panel real y las tareas quedan hechas.
--   · Obligatorio con pausa: el progreso (paso) se guarda aquí para retomarlo en otra visita.
--   · +10 créditos de IA SOLO con tareas reales + primera foto de plato con IA. La base lo
--     comprueba (nunca el navegador) y abona una sola vez (referencia única por local).
--   · Al completarlo, el panel pasa del modo Montaje al modo Día a día.
-- Tareas: logo · dirección y horario · ≥3 platos con precio > 0 · haber abierto su QR ·
-- primera foto de plato con IA que no se devolvió · si tiene plano o app de sala: ≥1 mesa ·
-- si tiene app de sala: ≥1 camarero activo.

-- =====================================================================
-- 1. Datos
-- =====================================================================
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS tutorial_paso smallint NOT NULL DEFAULT 0 CHECK (tutorial_paso BETWEEN 0 AND 50),
  ADD COLUMN IF NOT EXISTS tutorial_qr_visto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tutorial_completado_en timestamptz;

-- Regalo de créditos: tipo propio para no contarlo como compra (ventas en Central)
ALTER TABLE public.ia_movimientos DROP CONSTRAINT IF EXISTS ia_movimientos_tipo_check;
ALTER TABLE public.ia_movimientos ADD CONSTRAINT ia_movimientos_tipo_check CHECK (tipo IN ('compra', 'uso', 'devolucion', 'regalo'));

-- El saldo cuenta los regalos como imágenes disponibles (misma firma que 0038)
CREATE OR REPLACE FUNCTION dk.ia_saldo(p_restaurante uuid)
RETURNS TABLE (restantes int, gratis_restantes int, compradas int, usadas int, hoy int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH m AS (
    SELECT coalesce(sum(cantidad) FILTER (WHERE tipo IN ('compra', 'regalo')), 0)::int compradas,
           (coalesce(sum(cantidad) FILTER (WHERE tipo = 'uso'), 0) - coalesce(sum(cantidad) FILTER (WHERE tipo = 'devolucion'), 0))::int usadas,
           (coalesce(sum(cantidad) FILTER (WHERE tipo = 'uso' AND creado_en >= date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'), 0)
            - coalesce(sum(cantidad) FILTER (WHERE tipo = 'devolucion' AND creado_en >= date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'), 0))::int hoy
      FROM public.ia_movimientos WHERE restaurante_id = p_restaurante
  )
  SELECT greatest(0, dk.ia_gratis() + compradas - usadas), greatest(0, dk.ia_gratis() - usadas), compradas, usadas, hoy FROM m;
$$;

-- =====================================================================
-- 2. Estado de las tareas (interna: sin comprobar propietario)
-- =====================================================================
CREATE OR REPLACE FUNCTION dk.tutorial_tareas(p_rest uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT jsonb_build_object(
    'logo', coalesce(btrim(r.logo_url), '') <> '',
    'local', coalesce(btrim(r.direccion), '') <> '' AND coalesce(btrim(r.horario), '') <> '',
    'platos', (SELECT count(*) FROM public.menu_items i WHERE i.restaurante_id = r.id AND i.precio > 0) >= 3,
    'foto_ia', EXISTS (SELECT 1 FROM public.ia_movimientos u
                        WHERE u.restaurante_id = r.id AND u.tipo = 'uso' AND u.detalle LIKE 'plato:%'
                          AND NOT EXISTS (SELECT 1 FROM public.ia_movimientos d WHERE d.referencia = 'dev-' || u.id)),
    'qr', r.tutorial_qr_visto,
    'pide_mesa', dk.tiene_servicio(r.id, 'plano_mesas') OR dk.tiene_servicio(r.id, 'app_sala'),
    'mesa', EXISTS (SELECT 1 FROM public.mesas m WHERE m.restaurante_id = r.id),
    'pide_camarero', dk.tiene_servicio(r.id, 'app_sala'),
    'camarero', EXISTS (SELECT 1 FROM public.camareros c WHERE c.restaurante_id = r.id AND c.activo),
    'paso', r.tutorial_paso,
    'completado', r.tutorial_completado_en IS NOT NULL
  )
  FROM public.restaurantes r WHERE r.id = p_rest;
$$;

-- =====================================================================
-- 3. Funciones del dueño (sesión)
-- =====================================================================
CREATE OR REPLACE FUNCTION dk.tutorial_estado(p_rest uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.restaurantes WHERE id = p_rest AND propietario = dk.identidad_actual()) THEN
    RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = '42501';
  END IF;
  RETURN dk.tutorial_tareas(p_rest);
END;
$$;

-- Guarda el paso (para retomarlo) y, si p_qr, marca que el dueño abrió su QR
CREATE OR REPLACE FUNCTION dk.tutorial_avanzar(p_rest uuid, p_paso int, p_qr boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  UPDATE public.restaurantes
     SET tutorial_paso = least(50, greatest(0, coalesce(p_paso, tutorial_paso))),
         tutorial_qr_visto = tutorial_qr_visto OR coalesce(p_qr, false)
   WHERE id = p_rest AND propietario = dk.identidad_actual();
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = '42501'; END IF;
  RETURN dk.tutorial_tareas(p_rest);
END;
$$;

-- Completa el tutorial: comprueba TODAS las tareas y abona +10 créditos una sola vez.
-- Devuelve el estado con 'abonado' (true solo en la llamada que abona).
CREATE OR REPLACE FUNCTION dk.tutorial_completar(p_rest uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE t jsonb; v_n int;
BEGIN
  PERFORM 1 FROM public.restaurantes WHERE id = p_rest AND propietario = dk.identidad_actual() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurante no encontrado' USING ERRCODE = '42501'; END IF;
  t := dk.tutorial_tareas(p_rest);
  IF (t->>'completado')::boolean THEN RETURN t || '{"abonado": false}'; END IF;
  IF NOT ((t->>'logo')::boolean AND (t->>'local')::boolean AND (t->>'platos')::boolean AND (t->>'foto_ia')::boolean AND (t->>'qr')::boolean
          AND (NOT (t->>'pide_mesa')::boolean OR (t->>'mesa')::boolean)
          AND (NOT (t->>'pide_camarero')::boolean OR (t->>'camarero')::boolean)) THEN
    RAISE EXCEPTION 'tutorial_incompleto' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.restaurantes SET tutorial_completado_en = now() WHERE id = p_rest;
  INSERT INTO public.ia_movimientos (restaurante_id, tipo, cantidad, coste_usd, referencia, detalle)
  VALUES (p_rest, 'regalo', 10, 0, 'tutorial-' || p_rest, 'Regalo por completar el montaje guiado')
  ON CONFLICT (referencia) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN dk.tutorial_tareas(p_rest) || jsonb_build_object('abonado', v_n > 0);
END;
$$;

-- =====================================================================
-- 4. Permisos
-- =====================================================================
REVOKE ALL ON FUNCTION dk.tutorial_tareas(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.tutorial_estado(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.tutorial_avanzar(uuid, int, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.tutorial_completar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.tutorial_estado(uuid) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.tutorial_avanzar(uuid, int, boolean) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.tutorial_completar(uuid) TO dk_auth;
