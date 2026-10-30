-- 0108 (30/10, karc0): bloque «planificacion» para Mis tareas → Planificación (DKitchen Venezuela, dk-vzl, pasarelas descartadas).
ALTER TABLE public.tareas_karc0 DROP CONSTRAINT tareas_karc0_bloque_check;
ALTER TABLE public.tareas_karc0 ADD CONSTRAINT tareas_karc0_bloque_check CHECK (bloque = ANY (ARRAY['redes','propuestas','anuncios','cobro','legal','flyers','otro','central','producto','desarrollo','auditoria','fiscal','planificacion']));
