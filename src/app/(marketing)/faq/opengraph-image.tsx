import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Sin letra pequeña.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('Preguntas frecuentes', 'Sin letra pequeña.', 'Precios, permanencia, datos y comisiones, explicados claro.');
}
