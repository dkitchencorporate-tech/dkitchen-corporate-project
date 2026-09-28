import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Tu martes vacío, convertido en taquilla llena.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('DKitchen Experience', 'Tu martes vacío, convertido en taquilla llena.', 'Eventos llave en mano. El 100 % de la taquilla es tuyo.');
}
