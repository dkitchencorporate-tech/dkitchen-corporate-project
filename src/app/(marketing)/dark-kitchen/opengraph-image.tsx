import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Una cocina. Siete marcas. Cero comisiones.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('Dark Kitchen multimarca', 'Una cocina. Siete marcas. Cero comisiones.', 'Marcas virtuales probadas, pedidos propios y una sola pantalla de cocina.');
}
