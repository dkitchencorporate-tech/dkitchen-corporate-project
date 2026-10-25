-- 0025 — Reservas: correo del cliente + marca del restaurante en los avisos (28/09/2026)
--
-- - El cliente puede dejar su correo al reservar: al confirmar o cancelar, el
--   restaurante le envía un correo con SU marca (logo, nombre, color).
-- - dk.crear_reserva devuelve logo y color del local para el aviso al dueño.

BEGIN;

ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS reservas_email_check;
ALTER TABLE public.reservas ADD CONSTRAINT reservas_email_check
  CHECK (email IS NULL OR (char_length(email) <= 120 AND email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'));
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS avisado_en timestamptz;
GRANT UPDATE (avisado_en) ON public.reservas TO dk_auth;

DROP FUNCTION IF EXISTS dk.crear_reserva(text, text, text, date, time, integer, text);
CREATE FUNCTION dk.crear_reserva(
  p_slug text, p_nombre text, p_telefono text, p_email text, p_fecha date, p_hora time, p_personas integer, p_notas text
) RETURNS TABLE (resultado text, reserva_id uuid, restaurante text, email_negocio text, whatsapp text, logo_url text, color_marca text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE r record; v_id uuid; v_hoy date := (now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
  SELECT x.id, x.nombre, x.whatsapp, x.propietario, x.logo_url, x.color_marca INTO r
  FROM public.restaurantes x
  WHERE x.slug = lower(p_slug) AND x.activo AND x.plan = 'ampliado' AND x.estado_acceso IN ('activo', 'gracia');
  IF r.id IS NULL THEN RETURN QUERY SELECT 'no_disponible', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text; RETURN; END IF;
  IF p_fecha IS NULL OR p_fecha < v_hoy OR p_fecha > v_hoy + 180 THEN
    RETURN QUERY SELECT 'fecha_invalida', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservas
             WHERE restaurante_id = r.id AND telefono = btrim(p_telefono) AND creada_en > now() - interval '2 minutes') THEN
    RETURN QUERY SELECT 'duplicada', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text; RETURN;
  END IF;
  INSERT INTO public.reservas (restaurante_id, nombre, telefono, email, fecha, hora, personas, notas)
  VALUES (r.id, btrim(p_nombre), btrim(p_telefono), nullif(lower(btrim(p_email)), ''), p_fecha, p_hora, p_personas, nullif(btrim(p_notas), ''))
  RETURNING id INTO v_id;
  RETURN QUERY SELECT 'ok', v_id, r.nombre,
    (SELECT u.email::text FROM neon_auth."user" u WHERE u.id = r.propietario), r.whatsapp, r.logo_url, r.color_marca;
EXCEPTION WHEN check_violation THEN
  RETURN QUERY SELECT 'datos_invalidos', NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text;
END;
$$;
REVOKE ALL ON FUNCTION dk.crear_reserva(text, text, text, text, date, time, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.crear_reserva(text, text, text, text, date, time, integer, text) TO dk_anon;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0025_reservas_email_marca.sql');

COMMIT;
