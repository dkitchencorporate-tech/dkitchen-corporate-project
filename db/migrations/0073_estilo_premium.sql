-- 0073 · Estilo «Premium» de la carta, incluido en todos los planes (karc0, 12/10; sustituye a la Carta de Autor de pago).
BEGIN;
ALTER TABLE public.restaurantes DROP CONSTRAINT IF EXISTS restaurantes_plantilla_check;
ALTER TABLE public.restaurantes ADD CONSTRAINT restaurantes_plantilla_check CHECK (plantilla IN ('clasica', 'visual', 'express', 'editorial', 'premium'));
COMMIT;
