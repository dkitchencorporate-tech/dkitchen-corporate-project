-- 0098 (22/10/2026, karc0): área Fiscal en Central. Nuevo bloque «fiscal» en Mis tareas (las tareas fiscales
-- se ven en Central → Fiscal y no en Mis tareas). Solo amplía el CHECK: no toca datos.
ALTER TABLE public.tareas_karc0 DROP CONSTRAINT IF EXISTS tareas_karc0_bloque_check;
ALTER TABLE public.tareas_karc0 ADD CONSTRAINT tareas_karc0_bloque_check
  CHECK (bloque IN ('redes', 'propuestas', 'anuncios', 'cobro', 'legal', 'flyers', 'otro',
                    'central', 'producto', 'desarrollo', 'auditoria', 'fiscal'));
