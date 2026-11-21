import type { AdjuntoMedia } from '@/lib/media-central';

/** Tipos, estados y adjuntos del buzón para Agente DK (0065 / 0123); sin dependencias de servidor. */
export type TipoBuzon = 'encargo' | 'idea' | 'fallo' | 'pregunta';
export type EstadoBuzon = 'nuevo' | 'leido' | 'hecho' | 'descartado';
export type AdjuntoBuzon = AdjuntoMedia;

export interface MensajeBuzon {
  id: string;
  autorNombre: string;
  autorTipo: 'admin' | 'socio';
  tipo: TipoBuzon;
  mensaje: string;
  pantalla: string | null;
  estado: EstadoBuzon;
  respuesta: string | null;
  creadoEn: string;
  respondidoEn: string | null;
  adjuntos: AdjuntoBuzon[];
}

export const TIPOS_BUZON: Record<TipoBuzon, string> = {
  encargo: 'Encargo',
  idea: 'Idea',
  fallo: 'Fallo',
  pregunta: 'Pregunta',
};

export const ESTADOS_BUZON: Record<EstadoBuzon, [string, string]> = {
  nuevo: ['Sin leer', 'bg-vino/10 text-vino'],
  leido: ['Leído por Agente DK', 'bg-amber-500/15 text-amber-700'],
  hecho: ['Hecho', 'bg-exito/15 text-exito'],
  descartado: ['Descartado', 'bg-papel text-niebla'],
};
