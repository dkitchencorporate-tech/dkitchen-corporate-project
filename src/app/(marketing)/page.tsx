import type { Metadata } from 'next';
import Portada from '@/components/dk/Portada';
import { QR_MENU } from '@/lib/pricing-config';

export const metadata: Metadata = {
  title: { absolute: 'DKitchen Corporate · Carta digital QR y app propia para restaurantes' },
  description: `Carta digital QR desde ${QR_MENU.planes.basico.mensual} €/mes, tu propia app de pedidos sin comisiones con Signature, eventos llave en mano y dark kitchen multimarca.`,
  alternates: { canonical: 'https://dkitchencorporate.es' },
};

/** Portada de marca. Con utm de flyer, propuesta o anuncio, next.config reescribe a /portada-qr/<origen>. */
export default function Home() {
  return <Portada />;
}
