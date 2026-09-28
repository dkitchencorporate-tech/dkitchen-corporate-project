import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Lo que tu restaurante necesita saber.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('Blog DKitchen', 'Lo que tu restaurante necesita saber.', 'Guías claras sobre carta digital, alérgenos y apps propias.');
}
