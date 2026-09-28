import { imagenOg, OG_TAMANO } from '@/lib/og';

export const alt = 'Tu propia app. Tus clientes. Cero comisiones.';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default function Imagen() {
  return imagenOg('DKitchen Signature', 'Tu propia app. Tus clientes. Cero comisiones.', 'Pedidos, cocina, fidelización y cierre fiscal con tu marca.');
}
