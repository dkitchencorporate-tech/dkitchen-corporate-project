-- 0102 (25/10/2026, karc0): versión para correo de la propuesta. Central necesita los mismos datos que
-- dk.propuesta_ver SIN contar una visita en el CRM (la cuenta solo debe subir cuando el local la abre).
-- Solo administradores (dk.exigir_admin).
BEGIN;

CREATE OR REPLACE FUNCTION dk.admin_propuesta_correo(p_prospecto uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE p public.prospectos%ROWTYPE;
BEGIN
  PERFORM dk.exigir_admin();
  SELECT * INTO p FROM public.prospectos WHERE id = p_prospecto;
  IF NOT FOUND OR p.no_contactar OR p.propuesta_token IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('token', p.propuesta_token, 'nombre', p.nombre, 'tipo', p.tipo, 'zona', p.zona,
    'texto', p.propuesta_texto, 'muestra_url', p.muestra_url, 'oferta', p.oferta,
    'comercial', (SELECT coalesce(c.nombre_publico, s.nombre, 'DKitchen') FROM public.identidades i
                    LEFT JOIN public.socios s ON s.id = i.id LEFT JOIN public.comerciales_contacto c ON c.identidad = i.id
                   WHERE i.id = p.comercial_id),
    'telefono', (SELECT c.telefono FROM public.comerciales_contacto c WHERE c.identidad = p.comercial_id),
    'codigo', (SELECT s.codigo FROM public.socios s WHERE s.id = p.comercial_id AND s.activo),
    'demo_slug', (SELECT r.slug FROM public.restaurantes r WHERE r.id = p.restaurante_id AND r.archivado_en IS NULL),
    'pago_url', (SELECT e.url FROM public.enlaces_pago e WHERE e.restaurante_id = p.restaurante_id AND e.estado = 'pendiente' AND e.url IS NOT NULL
                  ORDER BY e.creado_en DESC LIMIT 1));
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_propuesta_correo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_propuesta_correo(uuid) TO dk_auth;

COMMIT;
