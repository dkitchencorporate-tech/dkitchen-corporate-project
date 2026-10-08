-- 0065 (08/10/2026, karc0, tarea 1 de la entrada 124): menú de usuario de Central y /socio.
-- 1. Varios administradores: un admin puede dar acceso de admin COMPLETO a otra cuenta. El 2FA sigue
--    siendo obligatorio (dk.es_admin() exige TOTP en la sesión; al entrar por primera vez se configura).
--    Nunca se puede retirar a uno mismo ni dejar Central sin ningún admin activo. Todo va a auditoría.
-- 2. Buzón para Claude: encargos, ideas, fallos y preguntas de admins y socios. Claude Code lo lee al
--    arrancar cada sesión (herramientas-claude/buzon.cjs, permiso permanente de karc0 solo para esto)
--    y deja su respuesta, que se ve en Central y en /socio.
BEGIN;

-- 1. Administradores
CREATE OR REPLACE FUNCTION dk.admin_admins()
RETURNS TABLE (id uuid, email text, nombre text, dos_fa boolean, yo boolean, creado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT i.id, i.email::text, i.nombre::text,
         EXISTS (SELECT 1 FROM public.admin_totp t WHERE t.identidad = i.id AND t.activado_en IS NOT NULL),
         i.id = dk.identidad_actual(), i.creado_en
    FROM public.identidades i WHERE i.rol = 'admin' AND i.activo ORDER BY i.creado_en;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_admin_alta(p_email text, p_nombre text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_id uuid; v_email text := lower(btrim(p_email)); v_nombre text := btrim(p_nombre);
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF char_length(coalesce(v_nombre, '')) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'nombre no válido' USING ERRCODE = '22023'; END IF;
  SELECT u.id INTO v_id FROM neon_auth."user" u WHERE lower(u.email) = v_email;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'la cuenta % no existe: créala primero en Neon Auth', v_email USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.identidades WHERE id = v_id AND rol = 'admin' AND activo) THEN
    RAISE EXCEPTION 'esa cuenta ya es administradora' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.identidades WHERE id = v_id AND rol = 'socio') THEN
    RAISE EXCEPTION 'esa cuenta es de un socio: el administrador necesita una cuenta propia' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.restaurantes WHERE propietario = v_id) THEN
    RAISE EXCEPTION 'esa cuenta es dueña de un local: el administrador necesita una cuenta propia' USING ERRCODE = '42501';
  END IF;
  -- Un 2FA anterior (de cuando fue admin y se le retiró) no vale: se configura de nuevo.
  DELETE FROM public.admin_totp WHERE identidad = v_id;
  DELETE FROM public.admin_2fa_sesiones WHERE identidad = v_id;
  INSERT INTO public.identidades (id, email, nombre, rol, activo)
  VALUES (v_id, v_email, v_nombre, 'admin', true)
  ON CONFLICT (id) DO UPDATE SET rol = 'admin', activo = true, nombre = excluded.nombre;
  INSERT INTO public.auditoria (identidad, accion, detalle)
  VALUES (dk.identidad_actual(), 'admin.admin_alta', jsonb_build_object('admin', v_id, 'email', v_email));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION dk.admin_admin_retirar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_email text;
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_id = dk.identidad_actual() THEN RAISE EXCEPTION 'no puedes retirarte el acceso a ti mismo' USING ERRCODE = '42501'; END IF;
  -- Bloqueo para que dos retiradas a la vez no dejen Central sin nadie.
  PERFORM 1 FROM public.identidades WHERE rol = 'admin' AND activo FOR UPDATE;
  SELECT email INTO v_email FROM public.identidades WHERE id = p_id AND rol = 'admin' AND activo;
  IF v_email IS NULL THEN RAISE EXCEPTION 'administrador no encontrado' USING ERRCODE = 'P0002'; END IF;
  IF (SELECT count(*) FROM public.identidades WHERE rol = 'admin' AND activo AND id <> p_id) < 1 THEN
    RAISE EXCEPTION 'Central no puede quedarse sin administradores' USING ERRCODE = '42501';
  END IF;
  UPDATE public.identidades SET rol = 'cliente' WHERE id = p_id;
  DELETE FROM public.admin_2fa_sesiones WHERE identidad = p_id;
  DELETE FROM public.admin_totp WHERE identidad = p_id;
  INSERT INTO public.auditoria (identidad, accion, detalle)
  VALUES (dk.identidad_actual(), 'admin.admin_retirar', jsonb_build_object('admin', p_id, 'email', v_email));
END;
$$;

-- 2. Buzón para Claude
CREATE TABLE IF NOT EXISTS public.buzon_claude (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor         uuid REFERENCES public.identidades(id) ON DELETE SET NULL,
  autor_tipo    text NOT NULL CHECK (autor_tipo IN ('admin', 'socio')),
  tipo          text NOT NULL CHECK (tipo IN ('encargo', 'idea', 'fallo', 'pregunta')),
  mensaje       text NOT NULL CHECK (char_length(mensaje) BETWEEN 3 AND 4000),
  pantalla      text CHECK (pantalla IS NULL OR char_length(pantalla) <= 300),
  estado        text NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'leido', 'hecho', 'descartado')),
  respuesta     text CHECK (respuesta IS NULL OR char_length(respuesta) <= 2000),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  leido_en      timestamptz,
  respondido_en timestamptz
);
CREATE INDEX IF NOT EXISTS buzon_claude_idx ON public.buzon_claude (estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS buzon_claude_autor_idx ON public.buzon_claude (autor, creado_en DESC);
ALTER TABLE public.buzon_claude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buzon_claude FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.buzon_claude FROM PUBLIC, dk_app, dk_auth, dk_anon;

CREATE OR REPLACE FUNCTION dk.buzon_escribir(p_tipo text, p_mensaje text, p_pantalla text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v uuid; v_yo uuid := dk.identidad_actual(); v_tipo text;
BEGIN
  IF coalesce(dk.es_admin(), false) THEN v_tipo := 'admin';
  ELSIF coalesce(dk.es_socio(), false) THEN v_tipo := 'socio';
  ELSE RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_tipo NOT IN ('encargo', 'idea', 'fallo', 'pregunta') THEN RAISE EXCEPTION 'tipo no válido' USING ERRCODE = '22023'; END IF;
  IF char_length(btrim(coalesce(p_mensaje, ''))) NOT BETWEEN 3 AND 4000 THEN RAISE EXCEPTION 'mensaje no válido' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.buzon_claude WHERE autor = v_yo AND creado_en > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'demasiados mensajes en una hora' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public.buzon_claude (autor, autor_tipo, tipo, mensaje, pantalla)
  VALUES (v_yo, v_tipo, p_tipo, btrim(p_mensaje), left(nullif(btrim(p_pantalla), ''), 300))
  RETURNING id INTO v;
  RETURN v;
END;
$$;

-- Admin: todo el buzón (con autor). Socio: solo lo suyo.
CREATE OR REPLACE FUNCTION dk.buzon_ver(p_limite int)
RETURNS TABLE (id uuid, autor_nombre text, autor_tipo text, tipo text, mensaje text, pantalla text, estado text,
               respuesta text, creado_en timestamptz, respondido_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog AS $$
DECLARE v_admin boolean := coalesce(dk.es_admin(), false);
BEGIN
  IF NOT (v_admin OR coalesce(dk.es_socio(), false)) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT b.id, coalesce(i.nombre, '(cuenta borrada)')::text, b.autor_tipo, b.tipo, b.mensaje, b.pantalla, b.estado,
         b.respuesta, b.creado_en, b.respondido_en
    FROM public.buzon_claude b LEFT JOIN public.identidades i ON i.id = b.autor
   WHERE v_admin OR b.autor = dk.identidad_actual()
   ORDER BY (b.estado IN ('hecho', 'descartado')), b.creado_en DESC
   LIMIT greatest(1, least(coalesce(p_limite, 50), 200));
END;
$$;

-- Admin: cerrar o reabrir un mensaje desde Central.
CREATE OR REPLACE FUNCTION dk.admin_buzon_estado(p_id uuid, p_estado text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog AS $$
BEGIN
  IF NOT coalesce(dk.es_admin(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('nuevo', 'leido', 'hecho', 'descartado') THEN RAISE EXCEPTION 'estado no válido' USING ERRCODE = '22023'; END IF;
  UPDATE public.buzon_claude SET estado = p_estado WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'mensaje no encontrado' USING ERRCODE = 'P0002'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION dk.admin_admins(), dk.admin_admin_alta(text, text), dk.admin_admin_retirar(uuid),
  dk.buzon_escribir(text, text, text), dk.buzon_ver(int), dk.admin_buzon_estado(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dk.admin_admins(), dk.admin_admin_alta(text, text), dk.admin_admin_retirar(uuid),
  dk.buzon_escribir(text, text, text), dk.buzon_ver(int), dk.admin_buzon_estado(uuid, text) TO dk_auth;

COMMIT;
