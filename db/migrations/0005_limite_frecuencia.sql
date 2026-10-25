-- 0005 · Freno de frecuencia global
--
-- MOTIVO: el primer freno de /r/{codigo} se probó solo con next start —un único
-- proceso de larga duración— y allí funcionaba. Contra el despliegue real de
-- Vercel, con un secreto de bypass generado a propósito para esta comprobación,
-- 35 peticiones seguidas pasaron 35 de 35: cada función serverless tiene su
-- propia memoria, así que un contador en memoria de proceso no se acumula
-- nunca entre invocaciones. No protegía nada en producción.
--
-- El contador tiene que vivir donde vive la autoridad de este proyecto: aquí.

CREATE TABLE dk.limite_frecuencia (
  clave         text PRIMARY KEY,
  contador      int NOT NULL DEFAULT 1,
  ventana_desde timestamptz NOT NULL DEFAULT now()
);

-- Se accede exclusivamente a través de dk.limite_superado(). No se concede
-- ningún privilegio directo: ni dk_anon ni dk_auth pueden tocar esta tabla,
-- igual que no pueden tocar escaneos ni auditoria.
REVOKE ALL ON dk.limite_frecuencia FROM PUBLIC;

-- Soporta la limpieza de entradas agotadas sin recorrer la tabla entera.
CREATE INDEX limite_frecuencia_ventana_idx ON dk.limite_frecuencia (ventana_desde);

-- Incrementa el contador de `p_clave` y dice si se ha pasado de `p_limite`
-- dentro de la ventana `p_ventana`. Atómico: el UPSERT hace que dos peticiones
-- simultáneas no puedan leer el mismo valor y las dos creerse la primera.
--
-- La clave nunca es la IP en claro: la aplicación entrega un HMAC calculado con
-- un secreto que solo ella conoce (DK_IP_HASH_PEPPER). Sin eso, guardar aquí un
-- hash de la IP sin más sería trivialmente reversible —solo hay 4300 millones
-- de IPv4, se prueban todas en segundos— y equivaldría a guardar la IP en
-- claro, exactamente lo que V-10 eliminó del proyecto.
CREATE FUNCTION dk.limite_superado(p_clave text, p_limite int, p_ventana interval)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dk, public, pg_catalog
AS $$
DECLARE
  v_fila dk.limite_frecuencia;
BEGIN
  INSERT INTO dk.limite_frecuencia (clave) VALUES (p_clave)
  ON CONFLICT (clave) DO UPDATE SET
    contador = CASE
                 WHEN dk.limite_frecuencia.ventana_desde < now() - p_ventana THEN 1
                 ELSE dk.limite_frecuencia.contador + 1
               END,
    ventana_desde = CASE
                      WHEN dk.limite_frecuencia.ventana_desde < now() - p_ventana THEN now()
                      ELSE dk.limite_frecuencia.ventana_desde
                    END
  RETURNING * INTO v_fila;

  -- Limpieza oportunista: 1 de cada 200 llamadas de paso se lleva por delante
  -- las claves ya agotadas hace tiempo. No hace falta una tarea programada
  -- aparte para una tabla que se autolimita en tamaño por diseño.
  IF random() < 0.005 THEN
    DELETE FROM dk.limite_frecuencia WHERE ventana_desde < now() - interval '1 day';
  END IF;

  RETURN v_fila.contador > p_limite;
END;
$$;

REVOKE ALL ON FUNCTION dk.limite_superado(text, int, interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.limite_superado(text, int, interval) TO dk_anon, dk_auth;
