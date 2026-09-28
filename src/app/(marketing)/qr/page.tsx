import type { Metadata } from 'next';
import HeroQr from '@/components/qr-landing/HeroQr';
import QrLoQueIncluye from '@/components/sections/QrLoQueIncluye';
import PlanesQr from '@/components/qr-landing/PlanesQr';
import PreguntasQr from '@/components/qr-landing/PreguntasQr';

export const metadata: Metadata = {
  title: 'QR Menú | DKitchen',
  description:
    'Carta digital con QR estable: cambia tu carta las veces que quieras sin reimprimir. Plan Básico 9 €/mes o Ampliado 25 €/mes, primer mes a 1 €.',
  alternates: { canonical: 'https://dkitchencorporate.es/qr' },
};

/** /qr — rediseño 29/09/2026 (guía H3: una promesa, el producto como imagen, sin iconos de relleno). */
export default function PaginaQr() {
  return (
    <div className="bg-white">
      <HeroQr />
      <QrLoQueIncluye />
      <PlanesQr />
      <PreguntasQr />
    </div>
  );
}
