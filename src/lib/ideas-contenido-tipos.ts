/** Tipos y etiquetas de Central → Ideas y contenido (0125); sin dependencias de servidor. */
export type EstadoIdea = 'idea' | 'propuesta' | 'aprobada' | 'produccion' | 'programada' | 'publicada' | 'descartada';
export type PublicoIdea = 'dueno' | 'emprendedor' | 'empleado' | 'cliente_final' | 'general';
export type ServicioIdea = 'signature' | 'experience' | 'qr' | 'auditoria' | 'general';
export type RedIdea = 'tiktok' | 'instagram' | 'facebook' | 'todas';
export type ZonaIdeas = 'ideas' | 'aprobar' | 'plan' | 'medicion';

export interface IdeaContenido {
  id: string;
  titulo: string;
  idea: string | null;
  serie: string | null;
  orden: number;
  nicho: string | null;
  publico: PublicoIdea;
  servicio: ServicioIdea;
  red: RedIdea;
  formato: string | null;
  desarrollo: string | null;
  notaAlex: string | null;
  estado: EstadoIdea;
  fechaPrevista: string | null;
  enlace: string | null;
  vistas: number | null;
  retencionSeg: number | null;
  compartidos: number | null;
  guardados: number | null;
  comentarios: number | null;
  aprendizaje: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export const ESTADOS_IDEA: Record<EstadoIdea, { nombre: string; chip: string }> = {
  idea: { nombre: 'Idea', chip: 'bg-papel text-carbon' },
  propuesta: { nombre: 'Por aprobar', chip: 'bg-amber-500/15 text-amber-800' },
  aprobada: { nombre: 'Aprobada', chip: 'bg-vino/10 text-vino' },
  produccion: { nombre: 'En producción', chip: 'bg-blue-50 text-blue-800' },
  programada: { nombre: 'Programada', chip: 'bg-noche text-oro' },
  publicada: { nombre: 'Publicada', chip: 'bg-exito/15 text-exito' },
  descartada: { nombre: 'Descartada', chip: 'bg-papel text-ceniza line-through' },
};

export const PUBLICOS_IDEA: Record<PublicoIdea, string> = {
  dueno: 'Dueño de local',
  emprendedor: 'Va a abrir local',
  empleado: 'Empleado (cocina o sala)',
  cliente_final: 'Cliente final',
  general: 'General',
};

export const SERVICIOS_IDEA: Record<ServicioIdea, string> = {
  signature: 'Signature',
  experience: 'Experience',
  qr: 'Carta QR',
  auditoria: 'Auditoría',
  general: 'DKitchen general',
};

export const REDES_IDEA: Record<RedIdea, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  todas: 'Todas',
};

/** Qué estados se ven en cada pestaña. */
export const ZONAS_IDEAS: Record<ZonaIdeas, { nombre: string; estados: EstadoIdea[] }> = {
  ideas: { nombre: 'Lluvia de ideas', estados: ['idea'] },
  aprobar: { nombre: 'Por aprobar', estados: ['propuesta'] },
  plan: { nombre: 'Planificación', estados: ['aprobada', 'produccion', 'programada'] },
  medicion: { nombre: 'Medición', estados: ['publicada'] },
};
