-- 0128 (27/11, Alex): etapas lógicas en la prospección.
-- Nuevos estados: enviada (Propuesta enviada), seguimiento (En seguimiento), negociacion (En negociación).
-- Un envío digital (WhatsApp, DM, correo...) con resultado «demo» deja el local en «Propuesta enviada».

ALTER TABLE public.prospectos DROP CONSTRAINT IF EXISTS prospectos_estado_check;
ALTER TABLE public.prospectos ADD CONSTRAINT prospectos_estado_check CHECK (estado = ANY (ARRAY[
  'por_revisar','por_visitar','muestra','visitado','demo','enviada','seguimiento','interesado','negociacion','cliente','descartado']));

DO $mig$
DECLARE
  f record; def text; nuevo text;
BEGIN
  FOR f IN SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'dk' AND p.proname IN ('prosp_estado','admin_lote_accion','prosp_registrar','admin_prosp_metricas') LOOP
    def := pg_get_functiondef(f.oid);
    nuevo := def;
    IF f.proname = 'prosp_estado' THEN
      nuevo := replace(nuevo, $a$('por_revisar','por_visitar','muestra','visitado','demo','interesado','cliente','descartado')$a$,
                              $a$('por_revisar','por_visitar','muestra','visitado','demo','enviada','seguimiento','interesado','negociacion','cliente','descartado')$a$);
    ELSIF f.proname = 'admin_lote_accion' THEN
      nuevo := replace(nuevo, $a$('por_revisar', 'por_visitar', 'muestra', 'visitado', 'demo', 'interesado', 'cliente', 'descartado')$a$,
                              $a$('por_revisar', 'por_visitar', 'muestra', 'visitado', 'demo', 'enviada', 'seguimiento', 'interesado', 'negociacion', 'cliente', 'descartado')$a$);
    ELSIF f.proname = 'prosp_registrar' THEN
      nuevo := replace(nuevo, $a$ARRAY['por_revisar','por_visitar','muestra','visitado','demo','interesado','cliente']$a$,
                              $a$ARRAY['por_revisar','por_visitar','muestra','visitado','demo','enviada','seguimiento','interesado','negociacion','cliente']$a$);
      nuevo := replace(nuevo, $a$WHEN 'demo' THEN 'demo'$a$,
                              $a$WHEN 'demo' THEN CASE WHEN v_canal <> 'fisico' THEN 'enviada' ELSE 'demo' END$a$);
    ELSIF f.proname = 'admin_prosp_metricas' THEN
      nuevo := replace(nuevo, $a$p.estado IN ('visitado','demo','interesado','cliente','descartado')$a$,
                              $a$p.estado IN ('visitado','demo','enviada','seguimiento','interesado','negociacion','cliente','descartado')$a$);
    END IF;
    IF nuevo = def THEN RAISE EXCEPTION '0128: no se pudo adaptar %', f.proname; END IF;
    EXECUTE nuevo;
  END LOOP;
END
$mig$;

-- Locales que ya recibieron el WhatsApp
UPDATE public.prospectos p SET estado = 'enviada', actualizado_en = now()
 WHERE p.estado = 'demo'
   AND EXISTS (SELECT 1 FROM public.prospecto_contactos c WHERE c.prospecto_id = p.id AND c.canal = 'whatsapp');

INSERT INTO public.dk_migraciones (nombre) VALUES ('0128_estados_prospeccion.sql') ON CONFLICT DO NOTHING;
