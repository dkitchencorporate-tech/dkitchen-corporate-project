-- 0111 (01/11/2026, rediseño de Central · Claude, con autorización de karc0):
--   1. dk.admin_admins() devuelve el rol de cada administrador (rol_equipo) → Equipo y comerciales.
--   2. QR de campaña: el destino ya no admite «//dominio» ni barras invertidas (ead848a6).
--   3. dk.mis_servicios(): el cliente ve en su panel sus servicios con seguimiento (Signature, Experience, Auditoría).
--   4. dk.mi_proyecto_datos(): el cliente nos manda lo que necesitamos (marca, carta, fotos, canales, fechas).
BEGIN;

-- 1 ─ Rol de cada administrador
DROP FUNCTION IF EXISTS dk.admin_admins();
CREATE FUNCTION dk.admin_admins()
RETURNS TABLE (id uuid, email text, nombre text, dos_fa boolean, yo boolean, creado_en timestamptz, rol_equipo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT i.id, i.email::text, i.nombre::text,
         EXISTS (SELECT 1 FROM public.admin_totp t WHERE t.identidad = i.id AND t.activado_en IS NOT NULL),
         i.id = dk.identidad_actual(), i.creado_en, coalesce(i.rol_admin, 'comercial')::text
    FROM public.identidades i WHERE i.rol = 'admin' AND i.activo ORDER BY i.creado_en;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_admins() TO dk_auth;

-- 2 ─ QR de campaña: solo rutas internas
UPDATE public.qr_campanas SET destino = '/' WHERE position('//' IN destino) > 0 OR position(chr(92) IN destino) > 0;
ALTER TABLE public.qr_campanas DROP CONSTRAINT IF EXISTS qr_campanas_destino_interno;
ALTER TABLE public.qr_campanas ADD CONSTRAINT qr_campanas_destino_interno
  CHECK (destino !~ '^//' AND position('//' IN destino) = 0 AND position(chr(92) IN destino) = 0);

-- 3 ─ Mis servicios (dk.mis_servicios; dk.mis_proyectos de 0060 queda sin usar) con seguimiento (solo hitos; nada interno de Central)
CREATE OR REPLACE FUNCTION dk.mis_servicios()
 RETURNS TABLE(id uuid, producto text, fase text, negocio text, siguiente_paso text, siguiente_fecha date,
               creado_en timestamptz, datos_cliente jsonb, cronologia jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
  SELECT p.id, p.producto, p.fase, p.negocio, p.siguiente_paso, p.siguiente_fecha, p.creado_en,
         coalesce(p.datos -> 'cliente', '{}'::jsonb),
         (SELECT coalesce(jsonb_agg(jsonb_build_object('tipo', e.tipo, 'fase', e.fase, 'en', e.creado_en) ORDER BY e.creado_en), '[]'::jsonb)
            FROM public.proyecto_eventos e
           WHERE e.proyecto_id = p.id AND e.tipo IN ('alta', 'solicitud', 'pago', 'fase', 'contrato', 'datos'))
    FROM public.proyectos p
   WHERE p.producto IN ('signature', 'experience', 'auditoria') AND p.fase <> 'descartado'
     AND dk.mi_correo() IS NOT NULL AND lower(p.email) = dk.mi_correo()
   ORDER BY p.creado_en DESC
$function$;

-- 4 ─ El cliente nos manda sus datos (claves y tamaños acotados; se guardan en datos.cliente y quedan en el historial)
CREATE OR REPLACE FUNCTION dk.mi_proyecto_datos(p_id uuid, p_datos jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE v_limpio jsonb := '{}'::jsonb; k text; v jsonb;
BEGIN
  IF dk.mi_correo() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.proyectos p WHERE p.id = p_id AND p.producto IN ('signature', 'experience', 'auditoria')
       AND p.fase <> 'descartado' AND lower(p.email) = dk.mi_correo()) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_datos) <> 'object' OR length(p_datos::text) > 12000 THEN
    RAISE EXCEPTION 'datos no válidos' USING ERRCODE = '22023';
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each(p_datos) LOOP
    CONTINUE WHEN k !~ '^[a-z_]{2,30}$';
    IF jsonb_typeof(v) = 'string' THEN
      v_limpio := v_limpio || jsonb_build_object(k, left(v #>> '{}', 2000));
    ELSIF jsonb_typeof(v) = 'array' AND jsonb_array_length(v) <= 20 THEN
      v_limpio := v_limpio || jsonb_build_object(k, (SELECT coalesce(jsonb_agg(left(x #>> '{}', 500)), '[]'::jsonb)
                                                     FROM jsonb_array_elements(v) x WHERE jsonb_typeof(x) = 'string'));
    END IF;
  END LOOP;
  UPDATE public.proyectos
     SET datos = datos || jsonb_build_object('cliente', coalesce(datos -> 'cliente', '{}'::jsonb) || v_limpio || jsonb_build_object('enviado_en', now())),
         actualizado_en = now()
   WHERE id = p_id;
  INSERT INTO public.proyecto_eventos (proyecto_id, tipo, texto) VALUES (p_id, 'datos', 'El cliente envió sus datos desde su panel');
END;
$function$;

REVOKE ALL ON FUNCTION dk.mis_servicios(), dk.mi_proyecto_datos(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.mis_servicios(), dk.mi_proyecto_datos(uuid, jsonb) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0111_rediseno_central.sql') ON CONFLICT DO NOTHING;
COMMIT;
