-- 0044 · Si la portada ya lleva el nombre del local escrito, la carta no lo repite encima (01/10/2026).
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS portada_con_nombre boolean NOT NULL DEFAULT false;
GRANT SELECT (portada_con_nombre) ON public.restaurantes TO dk_anon, dk_auth, dk_sincronizacion;
GRANT UPDATE (portada_con_nombre) ON public.restaurantes TO dk_auth;
