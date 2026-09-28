import { imagenOg, OG_TAMANO } from '@/lib/og';
import { articulo } from '@/lib/blog';

export const alt = 'Artículo del blog de DKitchen';
export const size = OG_TAMANO;
export const contentType = 'image/png';

export default async function Imagen({ params }: { params: Promise<{ slug: string }> }) {
  const a = articulo((await params).slug);
  return imagenOg('Blog DKitchen', a?.titulo ?? 'Blog DKitchen', a ? a.lectura + ' de lectura' : '');
}
