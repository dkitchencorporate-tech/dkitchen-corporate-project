import type { AdjuntoMedia } from '@/lib/media-central';

/** Tipos y etiquetas de Central → Analítica de Redes (0123); sin dependencias de servidor. */
export type RedSocial = 'instagram' | 'facebook' | 'tiktok' | 'general';
export type EstadoAnaliticaRed = 'pendiente_analisis' | 'analizado' | 'aplicado';

export interface CapturaRed extends AdjuntoMedia {
  tipo: 'imagen';
}

export interface EntradaRedAnalitica {
  id: string;
  fecha: string;
  red: RedSocial;
  titulo: string;
  notasAlex: string | null;
  capturas: CapturaRed[];
  analisisDk: string | null;
  rumboDiario: string | null;
  estado: EstadoAnaliticaRed;
  autorNombre: string;
  creadoEn: string;
  actualizadoEn: string;
}

export const REDES_SOCIALES: Record<RedSocial, { nombre: string; chip: string }> = {
  instagram: { nombre: 'Instagram', chip: 'bg-vino/10 text-vino' },
  facebook: { nombre: 'Facebook', chip: 'bg-blue-50 text-blue-800' },
  tiktok: { nombre: 'TikTok', chip: 'bg-noche text-oro' },
  general: { nombre: 'General', chip: 'bg-papel text-carbon' },
};

export const ESTADOS_ANALITICA: Record<EstadoAnaliticaRed, { nombre: string; chip: string }> = {
  pendiente_analisis: { nombre: 'Pendiente de análisis', chip: 'bg-amber-500/15 text-amber-800' },
  analizado: { nombre: 'Analizado', chip: 'bg-vino/10 text-vino' },
  aplicado: { nombre: 'Aplicado', chip: 'bg-exito/15 text-exito' },
};
