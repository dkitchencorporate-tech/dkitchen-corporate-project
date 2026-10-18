-- 0085 · Central → Ruta de lanzamiento (18/10/2026, decisión de karc0): termómetro, hitos con meta y dato real,
-- matriz de productos (qué está automatizado y qué no) y KPIs en vivo. Las metas y la matriz NO viven aquí (el repo
-- es público): las carga Claude con q.cjs. Los valores automáticos se calculan en la base en cada lectura.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ruta_hitos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden         int NOT NULL DEFAULT 100,
  codigo        text NOT NULL CHECK (char_length(codigo) BETWEEN 1 AND 12),
  fase          text NOT NULL DEFAULT '' CHECK (char_length(fase) <= 60),
  titulo        text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 160),
  detalle       text CHECK (detalle IS NULL OR char_length(detalle) <= 1000),
  fecha_objetivo date NOT NULL,
  meta          numeric NOT NULL CHECK (meta > 0),
  unidad        text NOT NULL DEFAULT '' CHECK (char_length(unidad) <= 40),
  -- Métrica automática (se calcula en dk.admin_ruta) o NULL = valor manual.
  metrica       text CHECK (metrica IS NULL OR metrica IN ('clientes_pago', 'mrr_euros', 'propuestas_enviadas', 'propuestas_vistas',
                  'locales_visitados', 'contactos_web', 'leads', 'ventas_proyectos', 'ventas_alto_valor')),
  valor_manual  numeric NOT NULL DEFAULT 0 CHECK (valor_manual >= 0),
  responsable   text NOT NULL DEFAULT 'karc0' CHECK (responsable IN ('karc0', 'claude', 'antigravity', 'ambos')),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  cambiado_en   timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ruta_hitos_codigo_uq ON public.ruta_hitos (codigo, titulo);

CREATE TABLE IF NOT EXISTS public.ruta_productos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden       int NOT NULL DEFAULT 100,
  producto    text NOT NULL CHECK (char_length(producto) BETWEEN 2 AND 60),
  capacidad   text NOT NULL CHECK (char_length(capacidad) BETWEEN 2 AND 80),
  estado      text NOT NULL CHECK (estado IN ('auto', 'parcial', 'manual', 'falta')),
  nota        text CHECK (nota IS NULL OR char_length(nota) <= 400),
  cambiado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (producto, capacidad)
);

ALTER TABLE public.ruta_hitos ENABLE ROW LEVEL SECURITY;  ALTER TABLE public.ruta_hitos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_productos ENABLE ROW LEVEL SECURITY;  ALTER TABLE public.ruta_productos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ruta_hitos, public.ruta_productos FROM PUBLIC, dk_app, dk_auth, dk_anon;

-- KPIs reales. Excluye demos internas, archivados y la compra de prueba de karc0 (seven-food-fries).
CREATE OR REPLACE FUNCTION dk.ruta_kpis()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
  WITH c AS (
    SELECT r.plan, r.fundador_desde IS NOT NULL AND r.fundador_perdido_en IS NULL AS fundador
      FROM public.restaurantes r
     WHERE r.activo AND NOT coalesce(r.demo_interna, false) AND r.archivado_en IS NULL
       AND r.stripe_subscription_id IS NOT NULL AND r.slug NOT IN ('seven-food-fries')
  ), contactados AS (
    SELECT DISTINCT e.prospecto_id FROM public.prospecto_eventos e WHERE e.tipo IN ('whatsapp', 'dm', 'correo', 'llamada', 'visita')
  )
  SELECT jsonb_build_object(
    'clientes_pago', (SELECT count(*) FROM c),
    'mrr_euros', (SELECT coalesce(sum(CASE WHEN fundador THEN 41.40 ELSE dk.precio_plan(plan) / 100.0 END), 0) FROM c),
    'propuestas_enviadas', (SELECT count(*) FROM contactados),
    'propuestas_vistas', (SELECT count(*) FROM public.prospectos p WHERE coalesce(p.propuesta_vistas, 0) > 0),
    'locales_visitados', (SELECT count(DISTINCT e.prospecto_id) FROM public.prospecto_eventos e WHERE e.tipo = 'visita'),
    'contactos_web', (SELECT count(*) FROM public.contactos_web w WHERE w.creado_en >= '2026-10-17'),
    'leads', (SELECT count(*) FROM public.prospectos p WHERE p.fuente = 'script'),
    'ventas_proyectos', (SELECT count(*) FROM public.proyectos pr WHERE pr.referencia_pago IS NOT NULL OR pr.stripe_factura IS NOT NULL),
    'ventas_alto_valor', (SELECT count(*) FROM public.proyectos pr WHERE (pr.referencia_pago IS NOT NULL OR pr.stripe_factura IS NOT NULL) AND coalesce(pr.importe_centimos, 0) >= 100000),
    'prospectos', (SELECT count(*) FROM public.prospectos),
    'fundadores', (SELECT count(*) FROM c WHERE fundador)
  );
$$;

CREATE OR REPLACE FUNCTION dk.admin_ruta()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE k jsonb;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  k := dk.ruta_kpis();
  RETURN jsonb_build_object(
    'hoy', (now() AT TIME ZONE 'Europe/Madrid')::date,
    'kpis', k,
    'hitos', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', h.id, 'orden', h.orden, 'codigo', h.codigo, 'fase', h.fase, 'titulo', h.titulo, 'detalle', h.detalle,
        'fecha', h.fecha_objetivo, 'meta', h.meta, 'unidad', h.unidad, 'metrica', h.metrica, 'responsable', h.responsable,
        'valor', CASE WHEN h.metrica IS NULL THEN h.valor_manual ELSE coalesce((k ->> h.metrica)::numeric, 0) END)
        ORDER BY h.fecha_objetivo, h.orden) FROM public.ruta_hitos h), '[]'::jsonb),
    'productos', coalesce((SELECT jsonb_agg(to_jsonb(p) - 'id' ORDER BY p.orden, p.producto, p.capacidad) FROM public.ruta_productos p), '[]'::jsonb)
  );
END;
$$;

-- karc0 (o Claude desde Central) actualiza un hito manual.
CREATE OR REPLACE FUNCTION dk.admin_ruta_valor(p_id uuid, p_valor numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_valor IS NULL OR p_valor < 0 OR p_valor > 1000000 THEN RAISE EXCEPTION 'valor no válido' USING ERRCODE = '22023'; END IF;
  UPDATE public.ruta_hitos SET valor_manual = p_valor, cambiado_en = now() WHERE id = p_id AND metrica IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'hito no encontrado o automático' USING ERRCODE = 'P0002'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.ruta_kpis(), dk.admin_ruta(), dk.admin_ruta_valor(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_ruta(), dk.admin_ruta_valor(uuid, numeric) TO dk_auth;

COMMIT;
