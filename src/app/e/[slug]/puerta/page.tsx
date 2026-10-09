import type { Metadata } from 'next';
import Puerta from '@/components/entradas/Puerta';

export const metadata: Metadata = { title: 'Control de entradas', robots: { index: false, follow: false } };

/** Control de acceso del evento. La clave va en el fragmento (#k=…): nunca llega al servidor en la URL. */
export default async function PuertaEvento({ params }: { params: Promise<{ slug: string }> }) {
  return <Puerta slug={(await params).slug} />;
}
