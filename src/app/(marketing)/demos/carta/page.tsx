import type { Metadata } from 'next';
import Botonera from '@/components/demos/Botonera';
import { wa } from '@/lib/whatsapp';
import { QR_MENU } from '@/lib/pricing-config';

export const metadata: Metadata = {
  title: 'Demos de carta QR · DKitchen Corporate',
  description: 'Cartas digitales QR de autor en modo demo.',
  robots: { index: false, follow: false },
};

export default async function DemosCarta({ searchParams }: { searchParams: Promise<{ utm_source?: string }> }) {
  const origen = String((await searchParams).utm_source ?? 'qr').replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'qr';
  return (
    <Botonera
      origen={origen}
      etiqueta="Carta digital QR · invitación de lanzamiento"
      titulo="Así se ve tu carta en la mesa."
      sub={`Toca una demo y pruébala como un cliente. Tu carta, con el plan ${QR_MENU.planes.ampliado.nombre}, cuesta ${QR_MENU.primerMes} € + IVA el primer mes.`}
      botones={[
        { titulo: 'Demo · Cocina japonesa', texto: 'Carta de autor con fotos, alérgenos e idiomas.', href: '/demo/carta?plantilla=sushi' },
        { titulo: 'Demo · Bar de tapas', texto: 'Raciones, medias y llamada al camarero.', href: '/demo/carta?plantilla=tapas' },
        { titulo: 'Demo · Hamburguesería', texto: 'Combos y extras, con fotos que venden.', href: '/demo/carta?plantilla=burger' },
        { titulo: `Quiero mi carta por ${QR_MENU.primerMes} €`, texto: `Plan ${QR_MENU.planes.ampliado.nombre}: el primer mes a ${QR_MENU.primerMes} € + IVA, sin permanencia.`, href: '/qr', destacado: true },
        { titulo: 'Pide una demo en vivo con tu carta', texto: 'WhatsApp 622 652 659 · te la preparamos con tus platos.', href: wa(`Hola, vengo del ${origen} y quiero una demo en vivo con la carta de mi local.`), externo: true },
      ]}
    />
  );
}
