import { redirect } from 'next/navigation';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { obtenerMiRestaurante } from '@/lib/mi-restaurante';
import { obtenerCarta, obtenerBanners, type Banner } from '@/lib/menu';
import CartaAutor from '@/components/carta/CartaAutor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vista previa · Carta de Autor', robots: { index: false, follow: false } };

/**
 * Vista previa privada de la Carta de Autor (upsell del Setup Experto): la
 * carta REAL del cliente (sus platos, logo y color) renderizada con el diseño
 * de autor, sin publicarla ni cambiar nada. Solo para el dueño con sesión.
 */
export default async function VistaPreviaAutor() {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');
  const restaurante = await obtenerMiRestaurante(jwt).catch(() => null);
  if (!restaurante) redirect('/panel');

  const carta = await obtenerCarta(restaurante.slug);
  if (!carta) redirect('/panel');
  let banners: Banner[] = [];
  try { banners = await obtenerBanners(restaurante.slug); } catch { banners = []; }

  return (
    <>
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-[#1C1712] px-4 py-3 text-center text-sm text-white">
        <span><strong>Vista previa</strong> · Así quedaría tu carta con el diseño de autor (no está publicada).</span>
        <a href={`/panel?pestana=soporte&asunto=${encodeURIComponent('Quiero la Carta de Autor (Setup Experto)')}`}
           className="rounded-full bg-[#6E0C2B] px-4 py-1.5 font-bold">Lo quiero · 199 €</a>
        <a href="/panel?pestana=local" className="text-white/60 underline">Volver</a>
      </div>
      <CartaAutor carta={{ ...carta, colorMarca: carta.colorMarca }} banners={banners} vistaPrevia />
    </>
  );
}
