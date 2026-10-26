-- 0104 (27/10/2026, karc0): contador de los 20 montajes gratis, solo en Central.
-- El montaje gratis es una invitación de los flyers, las tarjetas y las visitas (no se anuncia en la web)
-- y se pide por WhatsApp, así que no dejaba rastro. Central lo marca en la ficha del local (Prospección)
-- o del cliente (QR) y la portada enseña «X de 20». El cupo lo hace cumplir la base (bloqueo por
-- transacción), no la pantalla. Solo administradores con 2FA (dk.exigir_admin).
BEGIN;

CREATE TABLE IF NOT EXISTS public.montajes_gratis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id uuid UNIQUE REFERENCES public.prospectos(id) ON DELETE SET NULL,
  restaurante_id uuid UNIQUE REFERENCES public.restaurantes(id) ON DELETE SET NULL,
  nombre text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 160),
  origen text NOT NULL CHECK (origen IN ('flyer', 'tarjeta', 'visita')),
  nota text CHECK (nota IS NULL OR length(nota) <= 300),
  creado_por uuid,
  creado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.montajes_gratis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.montajes_gratis FROM PUBLIC;

CREATE OR REPLACE FUNCTION dk.montajes_gratis_cupo()
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog AS $$ SELECT 20 $$;

CREATE OR REPLACE FUNCTION dk.admin_montajes_gratis()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN jsonb_build_object(
    'cupo', dk.montajes_gratis_cupo(),
    'usados', (SELECT count(*) FROM public.montajes_gratis),
    'lista', coalesce((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'nombre', m.nombre, 'origen', m.origen, 'nota', m.nota,
        'prospecto_id', m.prospecto_id, 'restaurante_id', m.restaurante_id, 'creado_en', m.creado_en) ORDER BY m.creado_en DESC)
      FROM public.montajes_gratis m), '[]'::jsonb));
END;
$$;

-- Marca un montaje gratis para un local de Prospección o un cliente (uno de los dos).
CREATE OR REPLACE FUNCTION dk.admin_montaje_gratis_marcar(p_prospecto uuid, p_restaurante uuid, p_origen text, p_nota text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_nombre text; v_id uuid;
BEGIN
  PERFORM dk.exigir_admin();
  IF (p_prospecto IS NULL) = (p_restaurante IS NULL) THEN RAISE EXCEPTION 'datos: un local o un cliente' USING ERRCODE = '22023'; END IF;
  IF p_origen NOT IN ('flyer', 'tarjeta', 'visita') THEN RAISE EXCEPTION 'datos: origen' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('dk.montajes_gratis'));
  IF p_prospecto IS NOT NULL THEN
    SELECT nombre INTO v_nombre FROM public.prospectos WHERE id = p_prospecto;
    IF EXISTS (SELECT 1 FROM public.montajes_gratis WHERE prospecto_id = p_prospecto) THEN RAISE EXCEPTION 'ya marcado' USING ERRCODE = '23505'; END IF;
  ELSE
    SELECT nombre INTO v_nombre FROM public.restaurantes WHERE id = p_restaurante;
    IF EXISTS (SELECT 1 FROM public.montajes_gratis WHERE restaurante_id = p_restaurante) THEN RAISE EXCEPTION 'ya marcado' USING ERRCODE = '23505'; END IF;
  END IF;
  IF v_nombre IS NULL THEN RAISE EXCEPTION 'no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF (SELECT count(*) FROM public.montajes_gratis) >= dk.montajes_gratis_cupo() THEN
    RAISE EXCEPTION 'cupo completo' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.montajes_gratis (prospecto_id, restaurante_id, nombre, origen, nota, creado_por)
  VALUES (p_prospecto, p_restaurante, left(v_nombre, 160), p_origen, nullif(left(btrim(coalesce(p_nota, '')), 300), ''), dk.identidad_actual())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_montaje_gratis_quitar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  DELETE FROM public.montajes_gratis WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_montajes_gratis() FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.admin_montaje_gratis_marcar(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION dk.admin_montaje_gratis_quitar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_montajes_gratis() TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.admin_montaje_gratis_marcar(uuid, uuid, text, text) TO dk_auth;
GRANT EXECUTE ON FUNCTION dk.admin_montaje_gratis_quitar(uuid) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0104_montajes_gratis.sql') ON CONFLICT DO NOTHING;

COMMIT;
