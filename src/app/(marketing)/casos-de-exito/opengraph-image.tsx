import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Esto no es una promesa. Ya está funcionando.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('Casos de éxito', 'Esto no es una promesa. Ya está funcionando.', 'Restaurantes que venden con su propia app, sin comisiones.');
}
