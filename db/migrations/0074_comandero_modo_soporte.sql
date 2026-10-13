-- 0074 (13/10/2026): el comandero (Pedidos, plano en vivo, resumen de sala)
-- también funciona en el modo soporte de Central.
-- Antes: dk.comandero_restaurante_propio() solo aceptaba al dueño, así que el
-- super admin en modo soporte recibía «no autorizado» en Pedidos y Sala.
-- Ahora: se mira primero el local en
-- soporte que el panel pasa en dk.soporte_rest (cookie dk_puesta) y se acepta
-- SOLO si dk.es_admin() (identidad admin + 2FA de ESTA sesión). El socio en
-- puesta a punto sigue sin operativa de sala (decisión de 0052).
BEGIN;

CREATE OR REPLACE FUNCTION dk.comandero_restaurante_propio()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_rest uuid; v_soporte text;
BEGIN
  -- Modo soporte primero: un admin con 2FA que abre un local desde Central.
  IF coalesce(dk.es_admin(), false) THEN
    v_soporte := nullif(current_setting('dk.soporte_rest', true), '');
    IF v_soporte ~* '^[0-9a-f-]{36}$' THEN
      SELECT id INTO v_rest FROM public.restaurantes WHERE id = v_soporte::uuid;
    END IF;
  END IF;
  IF v_rest IS NULL THEN
    SELECT id INTO v_rest FROM public.restaurantes WHERE propietario = dk.identidad_actual();
  END IF;
  IF v_rest IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF NOT dk.tiene_servicio(v_rest, 'app_sala') THEN
    RAISE EXCEPTION 'El comandero es parte de la App de sala.' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_rest;
END;
$$;

COMMIT;
