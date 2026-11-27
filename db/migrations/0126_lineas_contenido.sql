-- =============================================================================
-- 0126 · Ideas y contenido: catálogo de líneas editoriales y creativas (27/11/2026, Alex)
-- Cada ficha elige una línea editorial (qué contamos) y una creativa (cómo se ve);
-- no se puede aprobar sin las dos. Medición agrega la retención por línea.
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.lineas_contenido (
  codigo        text PRIMARY KEY CHECK (codigo ~ '^[EC][0-9]{1,2}$'),
  tipo          text NOT NULL CHECK (tipo IN ('editorial', 'creativa')),
  nombre        text NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 80),
  para_que      text NOT NULL CHECK (char_length(para_que) <= 1000),
  como          text CHECK (como IS NULL OR char_length(como) <= 2000),
  quien         text NOT NULL DEFAULT 'claude' CHECK (quien IN ('claude', 'mixto', 'herramienta')),
  herramienta   text CHECK (herramienta IS NULL OR char_length(herramienta) <= 200),
  etiqueta_ia   text NOT NULL DEFAULT 'no' CHECK (etiqueta_ia IN ('no', 'si', 'segun')),
  referencias   text CHECK (referencias IS NULL OR char_length(referencias) <= 1000),
  estado        text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'en_prueba', 'pausada')),
  orden         integer NOT NULL DEFAULT 100,
  CHECK ((tipo = 'editorial') = (codigo LIKE 'E%'))
);
ALTER TABLE public.lineas_contenido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineas_contenido FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.lineas_contenido FROM PUBLIC, dk_app, dk_auth, dk_anon, dk_webhook;

ALTER TABLE public.ideas_contenido
  ADD COLUMN IF NOT EXISTS linea_editorial text REFERENCES public.lineas_contenido(codigo) ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS linea_creativa  text REFERENCES public.lineas_contenido(codigo) ON UPDATE CASCADE;

INSERT INTO public.lineas_contenido (codigo, tipo, nombre, para_que, como, quien, herramienta, etiqueta_ia, referencias, estado, orden) VALUES
 ('E1','editorial','Operativa real (recreación)','Enseñar una noche de trabajo de un micro-nicho y cómo cambia con DKitchen. Local ficticio, problema real.','Gancho con hora concreta («Viernes, 21:15»), el dolor, la app real resolviéndolo y el cierre.','claude',NULL,'no','Kavuo («Sábado, 21:40»), @avatarhype (situaciones cotidianas)','activa',1),
 ('E2','editorial','Dinero y dolor','Abrir con la cifra o el problema que duele: comisiones, pedidos perdidos, mesas vacías.','«¿Sigues pagando…?» en el primer segundo, dato con fuente y salida.','claude',NULL,'no','@blackdarketing («¿Sigues pagando CapCut Pro?»)','activa',2),
 ('E3','editorial','Cliente final','Que el comensal le pida a su bar la app propia y la reenvíe.','Beneficio para quien pide (puntos, sin comisión) y cierre «Mándale este vídeo a tu bar».','claude',NULL,'no','Reel pide-directo-v1','activa',3),
 ('E4','editorial','Serie en directo','Un evento o un proyecto contado por capítulos, para que sigan la cuenta.','Capítulos de 20 s que acaban con «Sigue para ver el capítulo…».','claude',NULL,'no','@blackdarketing (series de niveles)','activa',4),
 ('E5','editorial','Enseñar y regalar','Un truco o recurso útil que se guarda y lleva a /kit o /carta-de-autor.','Una sola idea útil, portada de 2 a 5 palabras y llamada al recurso gratis.','claude',NULL,'no','@blackdarketing (Arsenal de blackdark.club)','activa',5),
 ('E6','editorial','Respuesta y detrás de cámaras','Responder comentarios con vídeo y enseñar cómo se hace.','Captura del comentario y respuesta en 15 s.','claude',NULL,'no','@avatarhype («¿Cómo hacéis que sean tan realistas?»)','en_prueba',6),
 ('C1','creativa','Motion con la app real','Gráficos, tipografía cinética y la demo real grabada en el móvil 3D.','HyperFrames, grabación de la demo en la máquina virtual y render en GitHub Actions.','claude','HyperFrames + GitHub Actions','no','Reel pide-directo-v1','activa',11),
 ('C2','creativa','Pixel art y videojuego','Contar la operativa como un juego: niveles, jefe final, poderes, puntos.','Sprites y escenarios dibujados en código dentro de HyperFrames, con la app real al cierre.','claude','HyperFrames + GitHub Actions','no','@blackdarketing («Jefe final»), anuncio de @avatarhype (pixel art)','en_prueba',12),
 ('C3','creativa','Cómic e ilustración','Viñetas ilustradas con bocadillos, con humor, para contar algo serio.','Viñetas generadas en Flow o Nano Banana, animadas y montadas en HyperFrames.','mixto','Flow (imagen) + HyperFrames','segun','Anuncio de @avatarhype (cómic, cortometraje)','en_prueba',13),
 ('C4','creativa','Cine IA ultrarrealista','Escenas realistas de una pizzería o un bar ficticio, con la app real encima.','Clips de Flow (Veo) generados por Alex con prompts cerrados; montaje, textos, app y sonido de Agente DK.','mixto','Flow (Veo) + HyperFrames; fal.ai en el futuro','si','@avatarhype (realismo UGC)','en_prueba',14),
 ('C5','creativa','Presentador IA a cámara','Una persona IA que habla a cámara como en un vídeo casero.','Avatar con voz desde una API; se dice que es IA.','herramienta','HeyGen API (pendiente de decidir)','si','@avatarhype («Soy un clon IA»)','pausada',15),
 ('C6','creativa','Mascota DKitchen','Un personaje fijo que se repite en todas las líneas y da cara a la marca.','Se diseña una vez en Flow y se reutiliza en C2, C3 y C4.','mixto','Flow (imagen) + HyperFrames','no','@blackdarketing (el personaje del sombrero)','pausada',16)
ON CONFLICT (codigo) DO NOTHING;

-- Lectura del catálogo con la medición agregada de cada línea.
CREATE OR REPLACE FUNCTION dk.lineas_listar()
RETURNS TABLE (codigo text, tipo text, nombre text, para_que text, como text, quien text, herramienta text,
               etiqueta_ia text, referencias text, estado text, orden integer,
               piezas bigint, publicadas bigint, retencion_media numeric, compartidos bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  RETURN QUERY
  SELECT l.codigo, l.tipo, l.nombre, l.para_que, l.como, l.quien, l.herramienta, l.etiqueta_ia, l.referencias, l.estado, l.orden,
         count(i.id), count(i.id) FILTER (WHERE i.estado = 'publicada'),
         round(avg(i.retencion_seg) FILTER (WHERE i.estado = 'publicada'), 1),
         coalesce(sum(i.compartidos) FILTER (WHERE i.estado = 'publicada'), 0)::bigint
    FROM public.lineas_contenido l
    LEFT JOIN public.ideas_contenido i ON i.linea_editorial = l.codigo OR i.linea_creativa = l.codigo
   GROUP BY l.codigo
   ORDER BY l.orden;
END;
$$;

-- ideas_guardar acepta las dos líneas.
CREATE OR REPLACE FUNCTION dk.ideas_lineas(p_id uuid, p_editorial text, p_creativa text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
BEGIN
  PERFORM dk.exigir_direccion();
  IF p_editorial IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lineas_contenido WHERE codigo = p_editorial AND tipo = 'editorial') THEN
    RAISE EXCEPTION 'línea editorial no válida' USING ERRCODE = '22023';
  END IF;
  IF p_creativa IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lineas_contenido WHERE codigo = p_creativa AND tipo = 'creativa') THEN
    RAISE EXCEPTION 'línea creativa no válida' USING ERRCODE = '22023';
  END IF;
  UPDATE public.ideas_contenido SET linea_editorial = p_editorial, linea_creativa = p_creativa, actualizado_en = now() WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'idea no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$$;

-- No se aprueba sin las dos líneas.
CREATE OR REPLACE FUNCTION dk.ideas_estado(p_id uuid, p_estado text, p_nota text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $$
DECLARE v_nota text := nullif(left(btrim(coalesce(p_nota, '')), 4000), '');
BEGIN
  PERFORM dk.exigir_direccion();
  IF p_estado NOT IN ('idea', 'propuesta', 'aprobada', 'produccion', 'programada', 'publicada', 'descartada') THEN
    RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023';
  END IF;
  IF p_estado = 'aprobada' AND EXISTS (SELECT 1 FROM public.ideas_contenido WHERE id = p_id AND (linea_editorial IS NULL OR linea_creativa IS NULL)) THEN
    RAISE EXCEPTION 'faltan las líneas' USING ERRCODE = '22023';
  END IF;
  UPDATE public.ideas_contenido
     SET estado = p_estado,
         nota_alex = CASE WHEN v_nota IS NULL THEN nota_alex
                          ELSE left(coalesce(nota_alex || E'\n\n', '') || '— ' || to_char(now() AT TIME ZONE 'Europe/Madrid', 'DD/MM HH24:MI') || ' — ' || v_nota, 4000) END,
         actualizado_en = now()
   WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'idea no encontrada' USING ERRCODE = 'P0002'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.lineas_listar(), dk.ideas_lineas(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.lineas_listar(), dk.ideas_lineas(uuid, text, text) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0126_lineas_contenido.sql') ON CONFLICT DO NOTHING;

COMMIT;
