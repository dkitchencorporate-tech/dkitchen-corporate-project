/**
 * Los catorce alérgenos de declaración obligatoria.
 *
 * Esto no es una lista de comodidad: el Reglamento (UE) 1169/2011 obliga a
 * informar de estas catorce sustancias en cualquier alimento que se sirva, y en
 * España el RD 126/2015 lo aplica también a los establecimientos sin envasar.
 * Una carta digital que los omite deja al restaurante expuesto a sanción, así
 * que la lista es fija y cerrada: no se edita desde la interfaz.
 *
 * El código corto es lo que se guarda en la columna `alergenos` de `menu_items`.
 */

export const ALERGENOS: Record<string, string> = {
  GL: 'Gluten',
  CR: 'Crustáceos',
  HU: 'Huevos',
  PE: 'Pescado',
  CA: 'Cacahuetes',
  SO: 'Soja',
  LE: 'Lácteos',
  FR: 'Frutos de cáscara',
  AP: 'Apio',
  MO: 'Mostaza',
  SE: 'Sésamo',
  SU: 'Sulfitos',
  AL: 'Altramuces',
  MU: 'Moluscos',
};

export const CODIGOS_ALERGENOS = Object.keys(ALERGENOS);

/** Un código desconocido se muestra tal cual antes que desaparecer en silencio. */
export function nombreAlergeno(codigo: string): string {
  return ALERGENOS[codigo.toUpperCase()] ?? codigo;
}
