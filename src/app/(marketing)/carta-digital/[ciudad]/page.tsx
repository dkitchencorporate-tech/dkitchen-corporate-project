import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PaginaCiudad from '@/components/dk/PaginaCiudad';
import { CIUDADES, ciudad } from '@/lib/ciudades';
import { QR_MENU, PLANES_QR } from '@/lib/pricing-config';

/** /carta-digital/[ciudad] — 7 páginas por ciudad (26/10/2026); solo las de lib/ciudades. */
export const dynamicParams = false;

export function generateStaticParams() {
  return CIUDADES.map((c) => ({ ciudad: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ ciudad: string }> }): Promise<Metadata> {
  const c = ciudad((await params).ciudad);
  if (!c) return { title: 'Ciudad no encontrada' };
  const url = `https://dkitchencorporate.es/carta-digital/${c.slug}`;
  return {
    title: c.titulo,
    description: c.descripcion,
    alternates: { canonical: url },
    openGraph: { title: c.titulo, description: c.descripcion, url, type: 'website' },
  };
}

export default async function Page({ params }: { params: Promise<{ ciudad: string }> }) {
  const c = ciudad((await params).ciudad);
  if (!c) notFound();
  const url = `https://dkitchencorporate.es/carta-digital/${c.slug}`;
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `Carta digital QR para bares y restaurantes en ${c.nombre}`,
      serviceType: 'Carta digital QR para hostelería',
      description: c.descripcion,
      url,
      areaServed: { '@type': 'City', name: c.nombre },
      provider: { '@type': 'Organization', name: 'DKitchen', url: 'https://dkitchencorporate.es' },
      offers: PLANES_QR.map((p) => ({ '@type': 'Offer', name: `Plan ${QR_MENU.planes[p].nombre}`, price: String(QR_MENU.planes[p].mensual), priceCurrency: 'EUR', category: 'subscription', url: `${url}#planes` })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://dkitchencorporate.es' },
        { '@type': 'ListItem', position: 2, name: 'Carta digital', item: 'https://dkitchencorporate.es/carta-digital' },
        { '@type': 'ListItem', position: 3, name: c.nombre, item: url },
      ],
    },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PaginaCiudad c={c} />
    </>
  );
}
