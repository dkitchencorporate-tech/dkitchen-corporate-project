import type { Metadata } from 'next';
import HeroQr from '@/components/qr-landing/HeroQr';
import ProblemaQr from '@/components/qr-landing/ProblemaQr';
import ComoFuncionaQr from '@/components/qr-landing/ComoFuncionaQr';
import PruebaloQr from '@/components/qr-landing/PruebaloQr';
import SalaViva from '@/components/qr-landing/SalaViva';
import PlanesQr from '@/components/qr-landing/PlanesQr';
import ComparativaQr from '@/components/qr-landing/ComparativaQr';
import PreguntasQr, { PREGUNTAS } from '@/components/qr-landing/PreguntasQr';
import { LineaServicio } from '@/components/qr-landing/Extras';
import { Marquesina } from '@/components/dk/Movimiento';
import VistaExplosionada from '@/components/dk/VistaExplosionada';
import { CartasAutorDemo } from '@/components/dk/Modelos';
import { Titulo, BandaFoto } from '@/components/dk/Bloques';
import { FondoVivo } from '@/components/dk/Movimiento';

export const metadata: Metadata = {
  title: 'Carta digital QR para restaurantes · 1 € el primer mes',
  description:
    'Carta QR para bares y restaurantes: cambia precios, platos, fotos y alérgenos desde el móvil sin reimprimir. Reservas incluidas. Primer mes por 1 €.',
  alternates: { canonical: 'https://dkitchencorporate.es/qr' },
  openGraph: {
    title: 'Tu carta cambia. Tu QR, nunca. · DKitchen',
    description: 'Carta digital QR para hostelería. Primer mes por 1 €, sin permanencia.',
    url: 'https://dkitchencorporate.es/qr',
    type: 'website',
  },
};

const datosEstructurados = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'DKitchen Carta QR',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Carta digital con QR para restaurantes y bares, con alérgenos, estilos personalizables, reservas y llamada al camarero.',
    offers: [
      { '@type': 'Offer', name: 'Plan Básico', price: '9', priceCurrency: 'EUR', category: 'subscription', url: 'https://dkitchencorporate.es/qr#planes' },
      { '@type': 'Offer', name: 'Plan Ampliado', price: '25', priceCurrency: 'EUR', category: 'subscription', url: 'https://dkitchencorporate.es/qr#planes' },
    ],
    provider: { '@type': 'Organization', name: 'DKitchen', url: 'https://dkitchencorporate.es' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PREGUNTAS.map(([p, r]) => ({ '@type': 'Question', name: p, acceptedAnswer: { '@type': 'Answer', text: r } })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://dkitchencorporate.es' },
      { '@type': 'ListItem', position: 2, name: 'Carta QR', item: 'https://dkitchencorporate.es/qr' },
    ],
  },
];

/** /qr — rediseño completo 29/09/2026 (PROPUESTA_REDISENO_WEB_Y_SISTEMA). */
export default function PaginaQr() {
  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }} />
      <LineaServicio />
      <HeroQr />
      <Marquesina oscura items={['Tu carta cambia, tu QR nunca', 'Alérgenos según la UE', 'Cuatro estilos propios', 'Reservas y llamada al camarero', 'Primer mes por 1 €', 'Sin permanencia']} />
      <ProblemaQr />
      <VistaExplosionada />
      <BandaFoto src="/images/demo/s1.png" frase="Tu carta, a la altura de tu cocina. Cambia cuando tú cambias." firma="Carta de autor desde 1 €" />
      <ComoFuncionaQr />
      <PruebaloQr />
      <section className="relative overflow-hidden bg-noche py-24 text-white md:py-32">
        <FondoVivo className="opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <Titulo oscuro etiqueta="Cartas de autor" texto="Tres cartas. Tres personalidades. Pruébalas." sub="Cartas completas y funcionando: tócalas dentro del móvil, ábrelas en grande o elige la tuya." />
          <CartasAutorDemo />
        </div>
      </section>
      <SalaViva />
      <PlanesQr />
      <ComparativaQr />
      <PreguntasQr />
    </div>
  );
}
