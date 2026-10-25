import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Seis marcas probadas. Listas para tu cocina.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('Marcas virtuales', 'Seis marcas probadas. Listas para tu cocina.', 'Carta, precios y procesos que ya funcionaron en una cocina real.');
}
