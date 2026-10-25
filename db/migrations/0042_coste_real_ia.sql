-- 0042 · Coste real por imagen (01/10/2026). Medido con el saldo de AI Gateway: FLUX.2 flex ≈ 0,07 $ por imagen
-- (Nano Banana 0,039 $; Grok 0,02 $). Se usa el mayor para que el tope global de 20 $/mes nunca se quede corto.
-- Para cambiar el tope mensual: CREATE OR REPLACE FUNCTION dk.ia_tope_mensual_usd() ... SELECT <nuevo>::numeric.
CREATE OR REPLACE FUNCTION dk.ia_coste_imagen_usd() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.07::numeric $$;
