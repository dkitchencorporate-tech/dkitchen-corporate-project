import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Portada from '@/components/dk/Portada';
import CabeceraOrigen, { ORIGENES, type Origen } from '@/components/dk/CabeceraOrigen';
import { QR_MENU } from '@/lib/pricing-config';

/**
 * Variante de la portada para quien llega con utm de flyer, tarjeta, propuesta o anuncio.
 * next.config reescribe /?utm_source=… aquí (la dirección no cambia); nunca se indexa.
 */
export const dynamicParams = false;
export function generateStaticParams() {
  return ORIGENES.map((origen) => ({ origen }));
}

export const metadata: Metadata = {
  title: { absolute: 'DKitchen Corporate · Carta digital QR para tu local' },
  description: `Carta digital QR para bares y restaurantes: el primer mes por ${QR_MENU.primerMes} €, sin permanencia.`,
  alternates: { canonical: 'https://dkitchencorporate.es' },
  robots: { index: false, follow: true },
};

export default async function PortadaOrigen({ params }: { params: Promise<{ origen: string }> }) {
  const { origen } = await params;
  if (!(ORIGENES as readonly string[]).includes(origen)) notFound();
  return <Portada cabecera={<CabeceraOrigen origen={origen as Origen} />} />;
}
