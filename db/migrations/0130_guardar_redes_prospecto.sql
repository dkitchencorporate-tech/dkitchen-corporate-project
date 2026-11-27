-- 0130 (27/11, Alex): Alex valida a mano la cuenta de cada red y la guarda desde el Francotirador.
-- NULL = no tocar; '' = borrar.
CREATE OR REPLACE FUNCTION dk.prosp_redes(p_id uuid, p_instagram text, p_facebook text, p_tiktok text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_ig text := lower(regexp_replace(regexp_replace(trim(coalesce(p_instagram, '')), '^https?://(www\.)?instagram\.com/', ''), '^@|[/?].*$', '', 'g'));
  v_fb text := trim(coalesce(p_facebook, ''));
  v_tt text := regexp_replace(regexp_replace(trim(coalesce(p_tiktok, '')), '^https?://(www\.)?tiktok\.com/@?', ''), '^@|[/?].*$', '', 'g');
BEGIN
  PERFORM dk.prosp_exigir(p_id);
  IF v_fb <> '' AND v_fb !~ '^https?://' THEN v_fb := 'https://' || v_fb; END IF;
  v_fb := regexp_replace(v_fb, '^http://', 'https://');
  IF p_facebook IS NOT NULL AND v_fb <> '' AND v_fb !~ '^https://(www\.|m\.)?facebook\.com/' THEN
    RAISE EXCEPTION 'el enlace de Facebook no es válido' USING ERRCODE = '22023';
  END IF;
  IF p_tiktok IS NOT NULL AND v_tt <> '' AND v_tt !~ '^[A-Za-z0-9._]{2,40}$' THEN
    RAISE EXCEPTION 'la cuenta de TikTok no es válida' USING ERRCODE = '22023';
  END IF;
  UPDATE public.prospectos SET
    instagram = CASE WHEN p_instagram IS NULL THEN instagram ELSE nullif(left(v_ig, 120), '') END,
    facebook = CASE WHEN p_facebook IS NULL THEN facebook ELSE nullif(left(v_fb, 200), '') END,
    tiktok = CASE WHEN p_tiktok IS NULL THEN tiktok ELSE nullif(v_tt, '') END,
    actualizado_en = now()
  WHERE id = p_id;
END;
$function$;
REVOKE ALL ON FUNCTION dk.prosp_redes(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.prosp_redes(uuid, text, text, text) TO dk_auth;

INSERT INTO public.dk_migraciones (nombre) VALUES ('0130_guardar_redes_prospecto.sql') ON CONFLICT DO NOTHING;
