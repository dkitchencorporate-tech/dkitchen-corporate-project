/** Tipos y estados del buzón para Claude (0065); sin dependencias de servidor. */
export type TipoBuzon = 'encargo' | 'idea' | 'fallo' | 'pregunta';
export type EstadoBuzon = 'nuevo' | 'leido' | 'hecho' | 'descartado';
export const TIPOS_BUZON: Record<TipoBuzon, string> = { encargo: 'Encargo', idea: 'Idea', fallo: 'Fallo', pregunta: 'Pregunta' };
export const ESTADOS_BUZON: Record<EstadoBuzon, [string, string]> = {
  nuevo: ['Sin leer', 'bg-vino/10 text-vino'],
  leido: ['Leído por Claude', 'bg-amber-500/15 text-amber-700'],
  hecho: ['Hecho', 'bg-exito/15 text-exito'],
  descartado: ['Descartado', 'bg-papel text-niebla'],
};
