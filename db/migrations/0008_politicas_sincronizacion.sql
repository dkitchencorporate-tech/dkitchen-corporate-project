-- 0008 · Políticas de lectura para dk_sincronizacion
--
-- MOTIVO: 0007 concedió GRANT SELECT sobre restaurantes, menu_secciones y
-- menu_items a dk_sincronizacion, y eso no basta. Con RLS forzado, una
-- política solo se aplica a los roles que nombra explícitamente en su
-- cláusula TO. Las políticas existentes nombran dk_anon o dk_auth; ninguna
-- nombraba a dk_sincronizacion, así que RLS filtraba todas las filas en
-- silencio —sin error de permisos, cero filas— y la primera sincronización
-- real escribió "0 restaurantes" sin que nada avisara del motivo.
--
-- Las políticas nuevas son una copia exacta, predicado por predicado, de las
-- que ya rigen para dk_anon: dk_sincronizacion no debe ver nada que un
-- visitante anónimo no pudiera ya ver por su cuenta. Si algún día una de las
-- políticas de dk_anon cambia, esta tiene que cambiar con ella para no
-- desincronizarse en silencio.

CREATE POLICY restaurante_visible_para_sincronizacion ON restaurantes
  FOR SELECT TO dk_sincronizacion
  USING (activo);

CREATE POLICY seccion_visible_para_sincronizacion ON menu_secciones
  FOR SELECT TO dk_sincronizacion
  USING (EXISTS (SELECT 1 FROM restaurantes r WHERE r.id = restaurante_id AND r.activo));

CREATE POLICY item_visible_para_sincronizacion ON menu_items
  FOR SELECT TO dk_sincronizacion
  USING (disponible AND EXISTS (SELECT 1 FROM restaurantes r
                                WHERE r.id = restaurante_id AND r.activo));
