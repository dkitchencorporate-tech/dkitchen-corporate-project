-- 0036 · Chat de ayuda del panel (karc0, 30/09/2026)
-- Los tickets que llegan desde el chat guardan de dónde vienen y el contexto
-- recogido (sección, camino seguido, búsquedas, plan) para no volver a preguntar.
ALTER TABLE public.tickets_soporte
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'formulario',
  ADD COLUMN IF NOT EXISTS contexto jsonb;

ALTER TABLE public.tickets_soporte DROP CONSTRAINT IF EXISTS tickets_soporte_origen_check;
ALTER TABLE public.tickets_soporte ADD CONSTRAINT tickets_soporte_origen_check CHECK (origen IN ('formulario', 'chat'));
ALTER TABLE public.tickets_soporte DROP CONSTRAINT IF EXISTS tickets_soporte_contexto_check;
ALTER TABLE public.tickets_soporte ADD CONSTRAINT tickets_soporte_contexto_check
  CHECK (contexto IS NULL OR (jsonb_typeof(contexto) = 'object' AND pg_column_size(contexto) <= 8192));

-- La bandeja de Central devuelve también el origen y el contexto.
DROP FUNCTION IF EXISTS dk.admin_bandeja_soporte();
CREATE FUNCTION dk.admin_bandeja_soporte()
RETURNS TABLE (id uuid, restaurante_id uuid, restaurante text, asunto text, mensaje text, estado text,
               respuesta text, creado_en timestamptz, respondido_en timestamptz, origen text, contexto jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
    SELECT t.id, t.restaurante_id, r.nombre, t.asunto, t.mensaje, t.estado, t.respuesta, t.creado_en, t.respondido_en,
           t.origen, t.contexto
    FROM public.tickets_soporte t JOIN public.restaurantes r ON r.id = t.restaurante_id
    ORDER BY (t.estado = 'abierto') DESC, t.creado_en DESC
    LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_bandeja_soporte() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_bandeja_soporte() TO dk_auth;
