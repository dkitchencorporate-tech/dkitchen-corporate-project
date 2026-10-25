-- 0006 · Corrige el esquema de dk.limite_frecuencia
--
-- MOTIVO: 0005 puso esta tabla en el esquema `dk`, rompiendo la convención de
-- 0001 —las tablas viven en `public`; `dk` es solo para funciones, así el
-- search_path de las funciones SECURITY DEFINER puede fijarse a un esquema
-- que solo la aplicación controla—. La consecuencia no fue solo estética: el
-- barrido de db/verificar-blindaje.mjs que comprueba "toda tabla tiene RLS
-- forzado" solo miraba `public`, así que esta tabla quedó fuera de la vista
-- sin que nadie se diera cuenta. El propio test decía "todas las tablas
-- tienen RLS" con una tabla sin RLS delante.
--
-- No era explotable —ni dk_anon ni dk_auth tenían ningún privilegio directo
-- sobre ella, el acceso ya estaba cerrado antes de que RLS entrara en
-- juego—, pero es exactamente el descuido que un barrido automático existe
-- para atrapar, y aquí no lo atrapó. Se corrige el hueco y se corrige el
-- barrido en el mismo cambio.

ALTER TABLE dk.limite_frecuencia SET SCHEMA public;

ALTER TABLE limite_frecuencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE limite_frecuencia FORCE ROW LEVEL SECURITY;

-- La función se redefine con referencias sin cualificar, en el mismo estilo
-- que dk.es_admin() o dk.escaneos_del_mes(): el search_path de la función ya
-- incluye `public`, así que no hace falta repetir el prefijo, y así deja de
-- haber una sola función en todo el esquema que nombre `dk.<tabla>`.
CREATE OR REPLACE FUNCTION dk.limite_superado(p_clave text, p_limite int, p_ventana interval)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_fila limite_frecuencia;
BEGIN
  INSERT INTO limite_frecuencia (clave) VALUES (p_clave)
  ON CONFLICT (clave) DO UPDATE SET
    contador = CASE
                 WHEN limite_frecuencia.ventana_desde < now() - p_ventana THEN 1
                 ELSE limite_frecuencia.contador + 1
               END,
    ventana_desde = CASE
                      WHEN limite_frecuencia.ventana_desde < now() - p_ventana THEN now()
                      ELSE limite_frecuencia.ventana_desde
                    END
  RETURNING * INTO v_fila;

  IF random() < 0.005 THEN
    DELETE FROM limite_frecuencia WHERE ventana_desde < now() - interval '1 day';
  END IF;

  RETURN v_fila.contador > p_limite;
END;
$$;
