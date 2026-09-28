import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Te están buscando. ¿Te están encontrando?';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('Auditoría de canales', 'Te están buscando. ¿Te están encontrando?', 'Tu ficha de Google, tus redes y tu carta, revisadas 1 a 1 por 47 €.');
}
