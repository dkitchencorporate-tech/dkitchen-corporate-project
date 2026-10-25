-- 0048 · Reservas en tiempo real para el encargado (07/10/2026, B4 de karc0)
-- El panel del dueño ya lee sus reservas con su sesión (0023). Decisión de karc0 (07/10):
-- el aviso de reserva nueva suena en el panel Y en la app de sala del ENCARGADO (no en la
-- de los camareros). El encargado solo LEE: confirmar o cancelar sigue siendo del panel.
-- Datos mínimos: sin teléfono ni correo del cliente (los ve el dueño en su ficha).
-- Mismo patrón que dk.sala_equipo (0047): token validado dentro; si no es de un encargado
-- activo de un local con plan Ampliado, devuelve NULL.

CREATE OR REPLACE FUNCTION dk.sala_reservas(p_token_hash text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_e public.camareros;
BEGIN
  v_e := dk.sala_encargado(p_token_hash);
  IF v_e.id IS NULL THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurantes WHERE id = v_e.restaurante_id AND plan = 'ampliado') THEN RETURN NULL; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'id', r.id, 'nombre', r.nombre, 'fecha', to_char(r.fecha, 'YYYY-MM-DD'), 'hora', to_char(r.hora, 'HH24:MI'),
             'personas', r.personas, 'notas', r.notas, 'estado', r.estado, 'creada_en', r.creada_en)
           ORDER BY r.fecha, r.hora)
      FROM (SELECT * FROM public.reservas
             WHERE restaurante_id = v_e.restaurante_id AND fecha >= current_date AND estado <> 'cancelada'
             ORDER BY fecha, hora LIMIT 100) r
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION dk.sala_reservas(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.sala_reservas(text) TO dk_anon;
