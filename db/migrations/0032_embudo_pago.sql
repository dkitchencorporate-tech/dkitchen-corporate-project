-- 0032 · Embudo de las páginas de pago (29/09/2026)
-- Mide, por producto, cuántos visitan /pagar/<producto>, cuántos empiezan a
-- rellenar, cuántos van a la pasarela, cuántos se van sin pagar y cuántos
-- pagan. Anónimo: solo un identificador de sesión aleatorio del navegador,
-- nunca IP, correo ni nombre. Solo el super admin puede leerlo.

CREATE TABLE IF NOT EXISTS dk.embudo_eventos (
  id bigserial PRIMARY KEY,
  producto text NOT NULL CHECK (producto ~ '^[a-z0-9-]{2,30}$'),
  evento text NOT NULL CHECK (evento IN ('vista', 'interes', 'checkout', 'salida', 'pagado')),
  sesion text CHECK (sesion ~ '^[a-z0-9]{8,40}$'),
  segundos int CHECK (segundos BETWEEN 0 AND 86400),
  creado_en timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON dk.embudo_eventos FROM PUBLIC;
CREATE INDEX IF NOT EXISTS embudo_eventos_producto_fecha_idx ON dk.embudo_eventos (producto, creado_en);

-- Visitante: registra vista, interés, paso a pasarela o salida. Nunca «pagado».
CREATE OR REPLACE FUNCTION dk.embudo_registrar(p_producto text, p_evento text, p_sesion text, p_segundos int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  IF p_evento NOT IN ('vista', 'interes', 'checkout', 'salida') THEN
    RAISE EXCEPTION 'evento no válido' USING ERRCODE = '22023';
  END IF;
  INSERT INTO dk.embudo_eventos (producto, evento, sesion, segundos)
  VALUES (p_producto, p_evento, p_sesion, CASE WHEN p_segundos BETWEEN 0 AND 86400 THEN p_segundos END);
END;
$$;
REVOKE ALL ON FUNCTION dk.embudo_registrar(text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.embudo_registrar(text, text, text, int) TO dk_anon, dk_auth;

-- Webhook de pago: marca el pago confirmado.
CREATE OR REPLACE FUNCTION dk.embudo_pagado(p_producto text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  INSERT INTO dk.embudo_eventos (producto, evento) VALUES (p_producto, 'pagado');
END;
$$;
REVOKE ALL ON FUNCTION dk.embudo_pagado(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.embudo_pagado(text) TO dk_aprovisionamiento;

-- Super admin: resumen por producto en los últimos p_dias días.
CREATE OR REPLACE FUNCTION dk.admin_embudo(p_dias int)
RETURNS TABLE (producto text, visitas bigint, interes bigint, checkout bigint, salidas bigint, pagados bigint, segundos_medios int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_admin();
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
REVOKE ALL ON FUNCTION dk.admin_embudo(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_embudo(int) TO dk_auth;

-- Super admin: visitas y pagos por día (para la gráfica).
CREATE OR REPLACE FUNCTION dk.admin_embudo_diario(p_dias int)
RETURNS TABLE (dia date, visitas bigint, pagados bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_admin();
  RETURN QUERY
  SELECT d::date,
    (SELECT count(DISTINCT e.sesion) FROM dk.embudo_eventos e WHERE e.evento = 'vista' AND e.creado_en::date = d::date),
    (SELECT count(*) FROM dk.embudo_eventos e WHERE e.evento = 'pagado' AND e.creado_en::date = d::date)
  FROM generate_series(current_date - (greatest(1, least(p_dias, 90)) - 1), current_date, interval '1 day') d
  ORDER BY 1;
END;
$$;
REVOKE ALL ON FUNCTION dk.admin_embudo_diario(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_embudo_diario(int) TO dk_auth;
