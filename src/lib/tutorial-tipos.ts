/** Estado del montaje guiado (0049, B5). Lo calcula la base: el navegador nunca decide si una tarea está hecha. */
export interface TutorialEstado {
  logo: boolean;
  local: boolean;
  platos: boolean;
  foto_ia: boolean;
  qr: boolean;
  pide_mesa: boolean;
  mesa: boolean;
  pide_camarero: boolean;
  camarero: boolean;
  paso: number;
  completado: boolean;
  abonado?: boolean;
}
