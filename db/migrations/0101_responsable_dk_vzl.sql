-- 0101 (25/10/2026, karc0): DKitchen pasa a los operadores de Venezuela (dk-vzl). Nuevo responsable «dk-vzl»
-- en Mis tareas y en la Ruta; lo abierto de karc0 pasa a dk-vzl salvo el reparto de flyers, la recarga de
-- AI Gateway del lunes y los datos de la empresa (lo sigue haciendo karc0). «ambos» = dk-vzl + Claude.
BEGIN;

ALTER TABLE public.tareas_karc0 DROP CONSTRAINT IF EXISTS tareas_karc0_responsable_check;
ALTER TABLE public.tareas_karc0 ADD CONSTRAINT tareas_karc0_responsable_check
  CHECK (responsable IN ('karc0', 'claude', 'antigravity', 'ambos', 'dk-vzl'));
ALTER TABLE public.tareas_karc0 ALTER COLUMN responsable SET DEFAULT 'dk-vzl';

DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.ruta_hitos'::regclass
            AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%responsable%'
  LOOP EXECUTE format('ALTER TABLE public.ruta_hitos DROP CONSTRAINT %I', c); END LOOP;
END $$;
ALTER TABLE public.ruta_hitos ADD CONSTRAINT ruta_hitos_responsable_check
  CHECK (responsable IN ('karc0', 'claude', 'antigravity', 'ambos', 'dk-vzl'));
ALTER TABLE public.ruta_hitos ALTER COLUMN responsable SET DEFAULT 'dk-vzl';

UPDATE public.tareas_karc0 SET responsable = 'dk-vzl'
 WHERE estado <> 'hecha' AND responsable = 'karc0'
   AND id NOT IN ('abbf92e7-1eee-47dc-8f1d-35c1ba7ab057',   -- reparto de flyers
                  '45151e8a-c466-472d-9a5a-0b765b614475')   -- recarga de AI Gateway (lunes 26)
   AND titulo NOT LIKE 'Migración · Pásame los datos%';
UPDATE public.ruta_hitos SET responsable = 'dk-vzl' WHERE responsable = 'karc0';

COMMIT;
