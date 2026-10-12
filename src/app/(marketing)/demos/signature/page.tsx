import type { Metadata } from 'next';
import Botonera from '@/components/demos/Botonera';

export const metadata: Metadata = {
  title: 'Demos de Signature · DKitchen Corporate',
  description: 'Apps de pedidos reales con marca propia, en modo demo.',
  robots: { index: false, follow: false },
};

export default async function DemosSignature({ searchParams }: { searchParams: Promise<{ utm_source?: string; qr?: string }> }) {
  const sp = await searchParams;
  const qr = sp.qr ? String(sp.qr).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || null : null;
  const origen = String(sp.utm_source ?? 'qr').replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'qr';
  return (
    <Botonera
      origen={origen}
      qr={qr}
      etiqueta="DKitchen Signature · apps reales en modo demo"
      titulo="Tu propia app de pedidos, con tu marca."
      sub="Ábrelas en tu móvil como lo haría tu cliente: carta, pedido, pago y puntos. Son apps reales en modo demo."
      botones={[
        { titulo: 'Todo sobre Signature', texto: 'Qué incluye, cómo funciona y precio de fundador.', href: '/signature', destacado: true },
        { titulo: 'Ver demo Seven Food Fries', texto: 'Comida rápida · app de pedidos con su marca.', href: 'https://sevenfood.dkitchencorporate.es/', externo: true },
        { titulo: 'Ver demo Wing Boss', texto: 'Alitas y combos · app de pedidos con su marca.', href: 'https://wingboss.dkitchencorporate.es/', externo: true },
        { titulo: 'Ver demo Bokadipan', texto: 'Bocadillería · app de pedidos con su marca.', href: 'https://bokadipan.dkitchencorporate.es/', externo: true },
        { titulo: 'Hablar con DKitchen', texto: 'WhatsApp 622 652 659 · te enseñamos cómo quedaría la tuya.', href: `/contacto?i=signature${qr ? `&o=${qr}` : ''}` },
      ]}
    />
  );
}
