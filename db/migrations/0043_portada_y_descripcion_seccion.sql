-- 0043 · Feedback de la probadora (01/10/2026)
-- 1) Foto de portada propia: la cabecera del estilo Visual usaba la primera foto de un plato sin avisar.
-- 2) Descripción opcional de cada categoría (se ve bajo su título en la carta).
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS portada_url text
  CHECK (portada_url IS NULL OR (char_length(portada_url) <= 500 AND portada_url ~ '^https://'));
GRANT SELECT (portada_url) ON public.restaurantes TO dk_anon, dk_auth, dk_sincronizacion;
GRANT UPDATE (portada_url) ON public.restaurantes TO dk_auth;

ALTER TABLE public.menu_secciones ADD COLUMN IF NOT EXISTS descripcion text
  CHECK (descripcion IS NULL OR char_length(descripcion) <= 200);
