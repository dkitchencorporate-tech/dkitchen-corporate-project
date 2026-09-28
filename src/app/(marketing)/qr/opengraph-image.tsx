import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Tu carta cambia. Tu QR, nunca.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('Carta digital QR', 'Tu carta cambia. Tu QR, nunca.', 'Precios, fotos y alérgenos al día desde el móvil. Primer mes por 1 €.');
}
