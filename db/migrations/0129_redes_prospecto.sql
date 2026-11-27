-- 0129 (27/11, Alex): canales de cada local para el Francotirador multicanal.
-- Instagram ya existía; se añaden Facebook y TikTok. El correo queda fuera a propósito (LSSI).
ALTER TABLE public.prospectos ADD COLUMN IF NOT EXISTS facebook text
  CHECK (facebook IS NULL OR (facebook ~ '^https://(www\.|m\.)?facebook\.com/' AND char_length(facebook) <= 200));
ALTER TABLE public.prospectos ADD COLUMN IF NOT EXISTS tiktok text
  CHECK (tiktok IS NULL OR (tiktok ~ '^[A-Za-z0-9._]{2,40}$'));

INSERT INTO public.dk_migraciones (nombre) VALUES ('0129_redes_prospecto.sql') ON CONFLICT DO NOTHING;
