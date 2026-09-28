import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Tu restaurante, con sistema propio.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('Tecnología para hostelería', 'Tu restaurante, con sistema propio.', 'Carta QR desde 1 €, app propia sin comisiones, eventos y dark kitchen.');
}
