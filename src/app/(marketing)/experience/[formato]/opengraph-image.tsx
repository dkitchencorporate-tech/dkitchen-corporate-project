import { imagenOg, OG_TAMANO } from '@/lib/og';
import { formatoPorSlug } from '@/lib/experience-formatos';

// Sin esto, las 7 landings de formato se compartían sin imagen (08/10/2026).
export const alt = 'DKitchen Experience: evento llave en mano para restaurantes';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default async function Imagen({ params }: { params: Promise<{ formato: string }> }) {
  const f = formatoPorSlug((await params).formato);
  return imagenOg('DKitchen Experience', f ? f.nombre : 'Eventos llave en mano', f ? f.frase : 'El 100 % de la taquilla es tuyo.');
}
