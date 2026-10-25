/** Landing del local editable (0076). Los topes por plan los aplica dk.guardar_landing. */
export type EstiloLanding = 'noir' | 'crema' | 'brasa' | 'mar';
export type BloqueLanding = 'historia' | 'destacados' | 'galeria' | 'datos' | 'resenas' | 'faq' | 'reserva';
export const BLOQUES: { id: BloqueLanding; nombre: string }[] = [
  { id: 'historia', nombre: 'La casa' }, { id: 'destacados', nombre: 'Platos de la casa' }, { id: 'galeria', nombre: 'Galería' },
  { id: 'datos', nombre: 'Horario y cómo llegar' }, { id: 'resenas', nombre: 'Reseñas' }, { id: 'faq', nombre: 'Preguntas frecuentes' },
  { id: 'reserva', nombre: 'Reserva' },
];

export interface Landing {
  activa: boolean;
  estilo: EstiloLanding;
  titular: string | null;
  subtitulo: string | null;
  historia: string | null;
  fotoHistoriaUrl: string | null;
  galeria: string[];
  destacados: string[];
  bloques: BloqueLanding[];
  faq: { p: string; r: string }[];
  ctaPrincipal: 'reservar' | 'carta' | 'llamar';
  seoTitulo: string | null;
  seoDescripcion: string | null;
}

export const LANDING_VACIA: Landing = {
  activa: true, estilo: 'noir', titular: null, subtitulo: null, historia: null, fotoHistoriaUrl: null, galeria: [], destacados: [],
  bloques: BLOQUES.map((b) => b.id), faq: [], ctaPrincipal: 'reservar', seoTitulo: null, seoDescripcion: null,
};

