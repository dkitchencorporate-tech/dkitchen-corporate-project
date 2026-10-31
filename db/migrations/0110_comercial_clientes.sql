-- 0110 · Comercial en clientes y central segregada por rol (P1 Central)
--
-- Añade rol_admin a identidades ('direccion' | 'comercial'), comercial_id a restaurantes
-- y proyectos, y bloquea/filtra en el servidor las funciones dk.admin_* según el rol.
-- Las funciones de Dirección devuelven 42501 si quien llama es comercial.
-- Las de clientes y proyectos filtran por el comercial asignado.

BEGIN;

-- 1. Rol de administración en identidades
-- Actualizamos primero a 'direccion' los administradores existentes para no degradar accesos
ALTER TABLE public.identidades ADD COLUMN IF NOT EXISTS rol_admin text;
UPDATE public.identidades SET rol_admin = 'direccion' WHERE rol = 'admin' AND rol_admin IS NULL;
ALTER TABLE public.identidades ALTER COLUMN rol_admin SET DEFAULT 'comercial';
ALTER TABLE public.identidades DROP CONSTRAINT IF EXISTS identidades_rol_admin_check;
ALTER TABLE public.identidades ADD CONSTRAINT identidades_rol_admin_check CHECK (rol_admin IN ('direccion', 'comercial'));

-- 2. Comercial asignado en restaurantes y proyectos
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS comercial_id uuid REFERENCES public.identidades(id);
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS ciudad text;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS siguiente_paso text;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS siguiente_fecha date;

ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS comercial_id uuid REFERENCES public.identidades(id);

-- 3. Funciones auxiliares de rol
CREATE OR REPLACE FUNCTION dk.rol_admin_actual()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT coalesce((SELECT rol_admin FROM public.identidades WHERE id = dk.identidad_actual()), 'comercial');
$$;

CREATE OR REPLACE FUNCTION dk.es_direccion()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  SELECT dk.es_admin() AND (dk.rol_admin_actual() = 'direccion');
$$;

CREATE OR REPLACE FUNCTION dk.exigir_direccion()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF dk.rol_admin_actual() <> 'direccion' THEN
    RAISE EXCEPTION 'no autorizado: requiere direccion' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.rol_admin_actual(), dk.es_direccion(), dk.exigir_direccion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.rol_admin_actual(), dk.es_direccion(), dk.exigir_direccion() TO dk_auth;

-- 4. Alta y cambio de roles de administradores (solo direccion puede asignar/cambiar a direccion)
CREATE OR REPLACE FUNCTION dk.admin_admin_alta(p_email text, p_nombre text, p_rol_admin text DEFAULT 'comercial')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_id uuid;
  v_rol_limpio text := lower(trim(coalesce(p_rol_admin, 'comercial')));
BEGIN
  PERFORM dk.exigir_admin();
  IF v_rol_limpio NOT IN ('direccion', 'comercial') THEN
    v_rol_limpio := 'comercial';
  END IF;
  IF v_rol_limpio = 'direccion' AND NOT dk.es_direccion() THEN
    RAISE EXCEPTION 'solo direccion puede nombrar administradores de direccion' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_id FROM public.identidades WHERE lower(email) = lower(trim(p_email));
  IF v_id IS NOT NULL THEN
    UPDATE public.identidades SET rol = 'admin', rol_admin = v_rol_limpio, nombre = coalesce(nullif(trim(p_nombre), ''), nombre), activo = true WHERE id = v_id;
  ELSE
    INSERT INTO public.identidades (email, nombre, rol, rol_admin, activo)
    VALUES (lower(trim(p_email)), nullif(trim(p_nombre), ''), 'admin', v_rol_limpio, true)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_cambiar_rol_admin(p_identidad uuid, p_nuevo_rol text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_rol_limpio text := lower(trim(coalesce(p_nuevo_rol, 'comercial')));
BEGIN
  PERFORM dk.exigir_direccion();
  IF v_rol_limpio NOT IN ('direccion', 'comercial') THEN
    RAISE EXCEPTION 'rol no valido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.identidades SET rol_admin = v_rol_limpio WHERE id = p_identidad AND rol = 'admin';
END;
$$;

-- 5. Asignar comercial y siguiente paso
CREATE OR REPLACE FUNCTION dk.admin_asignar_comercial(p_restaurante uuid, p_comercial uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_rol text := dk.rol_admin_actual();
  v_actual uuid;
BEGIN
  PERFORM dk.exigir_admin();
  IF v_rol = 'comercial' THEN
    SELECT comercial_id INTO v_actual FROM public.restaurantes WHERE id = p_restaurante;
    IF v_actual IS NOT NULL AND v_actual <> v_yo THEN
      RAISE EXCEPTION 'un comercial no puede reasignar un cliente de otro comercial' USING ERRCODE = '42501';
    END IF;
    IF p_comercial IS NOT NULL AND p_comercial <> v_yo THEN
      RAISE EXCEPTION 'un comercial solo puede autoasignarse a si mismo' USING ERRCODE = '42501';
    END IF;
  END IF;
  UPDATE public.restaurantes SET comercial_id = p_comercial WHERE id = p_restaurante;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_asignar_siguiente_paso(p_restaurante uuid, p_paso text, p_fecha date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_rol text := dk.rol_admin_actual();
  v_com uuid;
BEGIN
  PERFORM dk.exigir_admin();
  IF v_rol = 'comercial' THEN
    SELECT comercial_id INTO v_com FROM public.restaurantes WHERE id = p_restaurante;
    IF v_com IS NOT NULL AND v_com <> v_yo THEN
      RAISE EXCEPTION 'solo puedes modificar el siguiente paso de tus clientes' USING ERRCODE = '42501';
    END IF;
  END IF;
  UPDATE public.restaurantes SET siguiente_paso = nullif(trim(p_paso), ''), siguiente_fecha = p_fecha WHERE id = p_restaurante;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. LAS 8 FUNCIONES DK.ADMIN_* CON SUS FIRMAS Y CUERPOS REALES
-- ─────────────────────────────────────────────────────────────

-- 6.1 admin_decisiones () -> jsonb (Producción: 0083)
CREATE OR REPLACE FUNCTION dk.admin_decisiones()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF dk.rol_admin_actual() <> 'direccion' THEN RAISE EXCEPTION 'no autorizado: requiere direccion' USING ERRCODE = '42501'; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(d) - 'leido_claude_en'
             ORDER BY CASE d.estado WHEN 'pendiente' THEN 0 WHEN 'aplazada' THEN 1 ELSE 2 END, d.orden, d.creado_en)
      FROM public.decisiones d), '[]'::jsonb);
END;
$$;

-- 6.2 admin_tareas () -> TABLE(27 columnas) (Producción: 0095)
CREATE OR REPLACE FUNCTION dk.admin_tareas()
 RETURNS TABLE(id uuid, orden integer, bloque text, titulo text, detalle text, enlace text, para_cuando date, estado text, nota_karc0 text, nota_claude text, cambiado_en timestamptz, leido_claude boolean, responsable text, estimado text, urgencia text, doc_escritorio text, doc_central text, nota_enviada_en timestamptz, traspasada_en timestamptz, hecha_en timestamptz,
               com_estado text, com_resultado text, respuesta_en timestamptz, resuelta_en timestamptz, hito text, creado_en timestamptz, implementar_ya_en timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF dk.rol_admin_actual() <> 'direccion' THEN RAISE EXCEPTION 'no autorizado: requiere direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT t.id, t.orden, t.bloque, t.titulo, t.detalle, t.enlace, t.para_cuando, t.estado, t.nota_karc0, t.nota_claude, t.cambiado_en,
         coalesce(t.cambiado_en IS NULL OR t.leido_claude_en >= t.cambiado_en, false), t.responsable, t.estimado,
         t.urgencia, t.doc_escritorio, t.doc_central, t.nota_enviada_en, t.traspasada_en, t.hecha_en,
         t.com_estado, t.com_resultado, t.respuesta_en, t.resuelta_en, h.codigo || ' · ' || h.titulo, t.creado_en, t.implementar_ya_en
    FROM public.tareas_karc0 t LEFT JOIN public.ruta_hitos h ON h.id = t.hito_id
   ORDER BY (t.estado = 'hecha'), (t.implementar_ya_en IS NULL), t.implementar_ya_en,
            CASE t.urgencia WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, t.orden, t.creado_en;
END;
$function$;

-- 6.3 admin_resumen_clientes () -> TABLE(25 columnas) (Producción: 0061)
CREATE OR REPLACE FUNCTION dk.admin_resumen_clientes()
RETURNS TABLE (
  restaurante_id uuid, nombre text, slug text, plan text, estado_acceso text,
  activo boolean, creado_en timestamptz, email text, contacto text,
  codigo_qr text, platos bigint, escaneos_mes bigint, escaneos_total bigint,
  tickets_abiertos bigint, solicitudes_qr_pendientes bigint,
  escaneos_14d bigint, prueba_hasta date, demo_interna boolean, archivado_en timestamptz,
  baja_programada_en date, baja_desde date, pago_fallido_desde timestamptz, cuota_centimos integer,
  tutorial_paso smallint, tutorial_completado boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_rol text := dk.rol_admin_actual();
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN
    RAISE EXCEPTION 'solo admin' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.id, r.nombre, r.slug, r.plan, r.estado_acceso, r.activo, r.creado_en,
         i.email::text, i.nombre,
         c.codigo,
         (SELECT count(*) FROM menu_items m WHERE m.restaurante_id = r.id),
         (SELECT count(*) FROM escaneos e WHERE e.codigo = c.codigo
            AND e.ocurrido_en >= date_trunc('month', now())),
         (SELECT count(*) FROM escaneos e WHERE e.codigo = c.codigo),
         (SELECT count(*) FROM tickets_soporte t WHERE t.restaurante_id = r.id AND t.estado <> 'cerrado'),
         (SELECT count(*) FROM solicitudes_qr_fisico s WHERE s.restaurante_id = r.id AND s.estado = 'solicitado'),
         (SELECT count(*) FROM escaneos e JOIN codigos_qr q ON q.codigo = e.codigo
            WHERE q.restaurante_id = r.id AND e.ocurrido_en > now() - interval '14 days'),
         r.prueba_hasta, r.demo_interna, r.archivado_en, r.baja_programada_en, r.baja_desde, r.pago_fallido_desde,
         dk.cuota_real(r.id), r.tutorial_paso, r.tutorial_completado_en IS NOT NULL
  FROM restaurantes r
  LEFT JOIN identidades i ON i.id = r.propietario
  LEFT JOIN LATERAL (SELECT q.codigo FROM codigos_qr q WHERE q.restaurante_id = r.id AND q.activo
                     ORDER BY q.creado_en LIMIT 1) c ON true
  WHERE (v_rol = 'direccion' OR r.comercial_id = v_yo)
  ORDER BY r.creado_en DESC;
END;
$$;

-- 6.4 admin_documentos (p_tipo text) -> TABLE(8 columnas) (Producción: 0083)
CREATE OR REPLACE FUNCTION dk.admin_documentos(p_tipo text)
RETURNS TABLE (ruta text, carpeta text, titulo text, resumen text, fecha date, bytes int, archivado boolean, actualizado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF dk.rol_admin_actual() <> 'direccion' THEN RAISE EXCEPTION 'no autorizado: requiere direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT d.ruta, d.carpeta, d.titulo, d.resumen, d.fecha, octet_length(d.contenido), d.archivado, d.actualizado_en
    FROM public.documentos d
   WHERE d.tipo = p_tipo
   ORDER BY d.archivado, d.carpeta, d.fecha DESC NULLS LAST, d.ruta;
END;
$$;

-- 6.5 admin_partes (p_limite integer) -> TABLE(3 columnas) (Producción: 0056)
CREATE OR REPLACE FUNCTION dk.admin_partes(p_limite integer)
RETURNS TABLE(fecha date, datos jsonb, enviado_en timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF dk.rol_admin_actual() <> 'direccion' THEN RAISE EXCEPTION 'no autorizado: requiere direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT p.fecha, p.datos, p.enviado_en FROM public.partes_diarios p
    ORDER BY p.fecha DESC LIMIT least(greatest(coalesce(p_limite, 14), 1), 90);
END;
$$;

-- 6.6 admin_embudo (p_dias int) -> TABLE(7 columnas) (Producción: 0032)
CREATE OR REPLACE FUNCTION dk.admin_embudo(p_dias int)
RETURNS TABLE (producto text, visitas bigint, interes bigint, checkout bigint, salidas bigint, pagados bigint, segundos_medios int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_admin();
  IF dk.rol_admin_actual() <> 'direccion' THEN RAISE EXCEPTION 'no autorizado: requiere direccion' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT e.producto,
    count(DISTINCT e.sesion) FILTER (WHERE e.evento = 'vista'),
    count(DISTINCT e.sesion) FILTER (WHERE e.evento = 'interes'),
    count(DISTINCT e.sesion) FILTER (WHERE e.evento = 'checkout'),
    count(DISTINCT e.sesion) FILTER (WHERE e.evento = 'salida'),
    count(*) FILTER (WHERE e.evento = 'pagado'),
    coalesce(round(avg(e.segundos) FILTER (WHERE e.evento = 'salida'))::int, 0)
  FROM dk.embudo_eventos e
  WHERE e.creado_en > now() - make_interval(days => greatest(1, least(p_dias, 365)))
  GROUP BY e.producto
  ORDER BY 2 DESC;
END;
$$;

-- 6.7 admin_mapa (p_id uuid) -> jsonb (Producción: 0106)
CREATE OR REPLACE FUNCTION dk.admin_mapa(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM dk.exigir_admin();
  IF dk.rol_admin_actual() <> 'direccion' THEN RAISE EXCEPTION 'no autorizado: requiere direccion' USING ERRCODE = '42501'; END IF;
  v_id := coalesce(p_id, (SELECT id FROM public.mapa_recorridos ORDER BY creado_en DESC LIMIT 1));
  RETURN jsonb_build_object(
    'recorridos', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'creado_en', creado_en, 'paginas', paginas, 'callejones', callejones, 'rotos', rotos) ORDER BY creado_en DESC)
      FROM (SELECT * FROM public.mapa_recorridos ORDER BY creado_en DESC LIMIT 30) r), '[]'::jsonb),
    'recorrido', (SELECT to_jsonb(r) FROM public.mapa_recorridos r WHERE id = v_id),
    'nodos', coalesce((SELECT jsonb_agg(jsonb_build_object('url', url, 'zona', zona, 'titulo', titulo, 'estado_http', estado_http, 'ms', ms,
        'callejon', callejon, 'roto', roto, 'externo', externo) ORDER BY zona, url) FROM public.mapa_nodos WHERE recorrido_id = v_id), '[]'::jsonb),
    'aristas', coalesce((SELECT jsonb_agg(jsonb_build_object('o', origen, 'd', destino, 't', texto, 'f', tipo = 'formulario', 'g', global))
      FROM public.mapa_aristas WHERE recorrido_id = v_id), '[]'::jsonb));
END;
$$;

-- 6.8 admin_proyectos (p_producto text, p_fase text, p_hoy boolean) -> jsonb (Producción: 0060)
CREATE OR REPLACE FUNCTION dk.admin_proyectos(p_producto text, p_fase text, p_hoy boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE
  v_yo uuid := dk.identidad_actual();
  v_rol text := dk.rol_admin_actual();
  v_nombre text := (SELECT nombre FROM public.identidades WHERE id = v_yo);
BEGIN
  PERFORM dk.proyecto_exigir_admin();
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.vencido DESC, t.siguiente_fecha NULLS LAST, t.actualizado_en DESC) FROM (
    SELECT p.id, p.producto, p.fase, p.origen, p.email, p.nombre, p.telefono, p.negocio, p.siguiente_paso, p.siguiente_fecha,
           p.importe_centimos, p.contrato_estado, p.comercial, p.creado_en, p.actualizado_en,
           (p.siguiente_fecha IS NOT NULL AND p.siguiente_fecha <= current_date AND dk.proyecto_abierto(p.producto, p.fase)) AS vencido
      FROM public.proyectos p
     WHERE (nullif(p_producto, '') IS NULL OR p.producto = p_producto)
       AND (CASE WHEN nullif(p_fase, '') IS NULL THEN true
                 WHEN p_fase = 'abiertos' THEN dk.proyecto_abierto(p.producto, p.fase)
                 ELSE p.fase = p_fase END)
       AND (NOT coalesce(p_hoy, false) OR (p.siguiente_fecha IS NOT NULL AND p.siguiente_fecha <= current_date AND dk.proyecto_abierto(p.producto, p.fase)))
       AND (v_rol = 'direccion' OR p.comercial = v_nombre OR p.comercial_id = v_yo OR p.comercial = v_yo::text)
     LIMIT 300) t), '[]'::jsonb);
END;
$$;

-- 7. Permisos
REVOKE ALL ON FUNCTION dk.admin_admin_alta(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_admin_alta(text, text, text) TO dk_auth;

REVOKE ALL ON FUNCTION dk.admin_cambiar_rol_admin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_cambiar_rol_admin(uuid, text) TO dk_auth;

REVOKE ALL ON FUNCTION dk.admin_asignar_comercial(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_asignar_comercial(uuid, uuid) TO dk_auth;

REVOKE ALL ON FUNCTION dk.admin_asignar_siguiente_paso(uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_asignar_siguiente_paso(uuid, text, date) TO dk_auth;

REVOKE ALL ON FUNCTION dk.admin_decisiones(), dk.admin_tareas(), dk.admin_resumen_clientes(),
                       dk.admin_documentos(text), dk.admin_partes(integer), dk.admin_embudo(int),
                       dk.admin_mapa(uuid), dk.admin_proyectos(text, text, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION dk.admin_decisiones(), dk.admin_tareas(), dk.admin_resumen_clientes(),
                          dk.admin_documentos(text), dk.admin_partes(integer), dk.admin_embudo(int),
                          dk.admin_mapa(uuid), dk.admin_proyectos(text, text, boolean) TO dk_auth;

COMMIT;
