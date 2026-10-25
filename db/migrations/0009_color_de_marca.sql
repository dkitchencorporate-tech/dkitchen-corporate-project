-- 0009 · Color de marca del restaurante
--
-- MOTIVO: el QR impreso que lleva a la carta puede llevar el color y el logo
-- del restaurante en vez de un código en blanco y negro genérico. Es un valor
-- añadido real y de bajo coste —no exige generar arte con IA, solo componer
-- un color y un logo sobre un QR estándar con corrección de errores alta—, y
-- es exactamente la parte de la personalización de QR que tiene sentido
-- construir hoy: la parte fiable, no la que la propia referencia usada al
-- diseñarlo (javiggil.com/56fc9cb32b97) reconoce como costosa e inestable
-- ("la IA no acierta a la primera... hosting gratuito no sirve para
-- producción" —para el modo con IA, no para este).
--
-- Es un dato público del restaurante, del mismo tipo que su logo: quien ya
-- ve la carta puede ver de qué color es. Por eso se concede a dk_anon igual
-- que ya se concede logo_url.

ALTER TABLE restaurantes ADD COLUMN color_marca text
  CHECK (color_marca IS NULL OR color_marca ~ '^#[0-9a-fA-F]{6}$');

GRANT SELECT (color_marca) ON restaurantes TO dk_anon;
GRANT UPDATE (color_marca) ON restaurantes TO dk_auth;
