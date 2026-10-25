-- 0103 (26/10/2026, tarea 1 de la cola de Claude): /mi-experience completa.
-- El cliente de Experience ve en su zona lo que contrató, la cronología desde la
-- solicitud, el briefing guiado (menú por pases y fotos) y, cuando su evento está
-- montado, las ventas en directo, las entradas usadas y los compradores. Todo se
-- lee de SU proyecto (correo verificado de la cuenta, como en 0088); el evento es
-- el de eventos_entradas.proyecto_id (las muestras no cuentan).
BEGIN;

-- Fotos del briefing: URLs de Vercel Blob en experience/<proyecto>/ (máx. 8).
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS fotos jsonb NOT NULL DEFAULT '[]'::jsonb;
DO $$ BEGIN
  ALTER TABLE public.proyectos ADD CONSTRAINT proyectos_fotos_lista CHECK (jsonb_typeof(fotos) = 'array' AND jsonb_array_length(fotos) <= 8);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP FUNCTION IF EXISTS dk.mi_experience();
CREATE FUNCTION dk.mi_experience()
 RETURNS TABLE(id uuid, fase text, origen text, negocio text, nombre text, importe_centimos integer, datos jsonb,
               briefing jsonb, briefing_en timestamptz, llamada_en timestamptz, siguiente_paso text, creado_en timestamptz,
               fotos jsonb, contrato_estado text, cronologia jsonb, evento jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
  SELECT p.id, p.fase, p.origen, p.negocio, p.nombre, p.importe_centimos, p.datos, p.briefing, p.briefing_en, p.llamada_en, p.siguiente_paso, p.creado_en,
         p.fotos, p.contrato_estado,
         -- Solo hitos (tipo, fase y fecha): las notas y los textos internos de Central no salen.
         (SELECT coalesce(jsonb_agg(jsonb_build_object('tipo', e.tipo, 'fase', e.fase, 'en', e.creado_en) ORDER BY e.creado_en), '[]'::jsonb)
            FROM public.proyecto_eventos e
           WHERE e.proyecto_id = p.id AND e.tipo IN ('alta', 'solicitud', 'pago', 'fase', 'contrato')),
         (SELECT jsonb_build_object('slug', v.slug, 'titulo', v.titulo, 'fecha', v.fecha, 'estado', v.estado, 'aforo', v.aforo,
                                    'precio_centimos', v.precio_centimos, 'tiene_clave', v.clave_puerta_hash IS NOT NULL,
                                    'vendidas', (SELECT count(*) FROM public.entradas x WHERE x.evento_id = v.id AND x.estado <> 'anulada'),
                                    'usadas', (SELECT count(*) FROM public.entradas x WHERE x.evento_id = v.id AND x.estado = 'usada'),
                                    'ingresos_centimos', (SELECT coalesce(sum(x.importe_centimos), 0) FROM public.entradas x WHERE x.evento_id = v.id AND x.estado <> 'anulada'),
                                    'hoy', (SELECT count(*) FROM public.entradas x WHERE x.evento_id = v.id AND x.estado <> 'anulada'
                                              AND x.creado_en >= date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'))
            FROM public.eventos_entradas v
           WHERE v.proyecto_id = p.id AND NOT v.muestra
           ORDER BY v.creado_en DESC LIMIT 1)
    FROM public.proyectos p
   WHERE p.producto = 'experience' AND dk.mi_correo() IS NOT NULL AND lower(p.email) = dk.mi_correo()
   ORDER BY p.creado_en DESC
$function$;

-- Compradores del evento del proyecto (una fila por compra). Solo el dueño del proyecto.
CREATE OR REPLACE FUNCTION dk.mi_experience_compradores(p_id uuid)
 RETURNS TABLE(nombre text, email text, entradas integer, usadas integer, importe_centimos bigint, comprado_en timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF dk.mi_correo() IS NULL OR NOT EXISTS (SELECT 1 FROM public.proyectos p WHERE p.id = p_id AND p.producto = 'experience' AND lower(p.email) = dk.mi_correo()) THEN
    RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT max(x.nombre), max(x.email), count(*)::int, count(*) FILTER (WHERE x.estado = 'usada')::int, sum(x.importe_centimos)::bigint, min(x.creado_en)
      FROM public.entradas x JOIN public.eventos_entradas v ON v.id = x.evento_id
     WHERE v.proyecto_id = p_id AND NOT v.muestra AND x.estado <> 'anulada'
     GROUP BY x.stripe_sesion
     ORDER BY min(x.creado_en) DESC
     LIMIT 500;
END;
$function$;

-- Fotos del briefing: sustituye la lista entera; cada URL tiene que estar en la carpeta de ESTE proyecto.
CREATE OR REPLACE FUNCTION dk.mi_experience_fotos(p_id uuid, p_fotos jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE v jsonb := coalesce(p_fotos, '[]'::jsonb);
BEGIN
  IF dk.mi_correo() IS NULL THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(v) <> 'array' OR jsonb_array_length(v) > 8 OR EXISTS (
       SELECT 1 FROM jsonb_array_elements(v) e WHERE jsonb_typeof(e) <> 'string'
          OR (e #>> '{}') !~ ('^https://[a-z0-9.-]+\.public\.blob\.vercel-storage\.com/experience/' || p_id::text || '/[A-Za-z0-9_-]+\.(jpg|png|webp)$')) THEN
    RAISE EXCEPTION 'fotos no válidas' USING ERRCODE = '22023';
  END IF;
  UPDATE public.proyectos p SET fotos = v, actualizado_en = now()
   WHERE p.id = p_id AND p.producto = 'experience' AND lower(p.email) = dk.mi_correo();
  IF NOT FOUND THEN RAISE EXCEPTION 'proyecto no encontrado' USING ERRCODE = 'P0002'; END IF;
END;
$function$;

REVOKE ALL ON FUNCTION dk.mi_experience(), dk.mi_experience_compradores(uuid), dk.mi_experience_fotos(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.mi_experience(), dk.mi_experience_compradores(uuid), dk.mi_experience_fotos(uuid, jsonb) TO dk_auth;

COMMIT;
