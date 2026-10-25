import type { Metadata } from 'next';
import Botonera from '@/components/demos/Botonera';
import { QR_MENU } from '@/lib/pricing-config';
import { wa } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Demos de carta QR · DKitchen Corporate',
  description: 'Cartas digitales QR de autor en modo demo.',
  robots: { index: false, follow: false },
};

export default async function DemosCarta({ searchParams }: { searchParams: Promise<{ utm_source?: string; qr?: string }> }) {
  const sp = await searchParams;
  const qr = sp.qr ? String(sp.qr).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || null : null;
  const origen = String(sp.utm_source ?? 'qr').replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'qr';
  // 17/10 (karc0): el montaje gratis es una invitación de los flyers y tarjetas en mano; no se anuncia en la web.
  const deImpreso = origen === 'flyer' || origen === 'tarjeta';
  const impreso = origen === 'tarjeta' ? 'esta tarjeta' : 'este flyer';
  return (
    <Botonera
      origen={origen}
      qr={qr}
      etiqueta="Carta digital QR · invitación de lanzamiento"
      titulo="Así se ve tu carta en la mesa."
      sub={`Toca una demo y pruébala como un cliente. Tu carta, con el plan ${QR_MENU.planes.ampliado.nombre}, cuesta ${QR_MENU.primerMes} € + IVA el primer mes.`}
      botones={[
        { titulo: 'Demo · Cocina japonesa', texto: 'Carta de autor con fotos, alérgenos e idiomas.', href: '/demo/carta?plantilla=sushi&muestra=local', imagen: '/demos/carta-sushi.png', etiqueta: 'Carta de autor' },
        { titulo: 'Demo · Bar de tapas', texto: 'Raciones, medias y llamada al camarero.', href: '/demo/carta?plantilla=tapas&muestra=local', imagen: '/demos/carta-tapas.png', etiqueta: 'Carta de autor' },
        { titulo: 'Demo · Hamburguesería', texto: 'Combos y extras, con fotos que venden.', href: '/demo/carta?plantilla=burger&muestra=local', imagen: '/demos/carta-burger.png', etiqueta: 'Carta de autor' },
        { titulo: `Quiero mi carta por ${QR_MENU.primerMes} €`, texto: `Plan ${QR_MENU.planes.ampliado.nombre}: el primer mes a ${QR_MENU.primerMes} € + IVA, sin permanencia.`, href: '/qr', destacado: true, imagen: '/demos/carta-tapas.png', etiqueta: 'Invitación de lanzamiento' },
        ...(deImpreso ? [{ titulo: 'Te la montamos gratis', texto: `Invitación de ${impreso}: mándanos una foto de tu carta por WhatsApp y en 48 horas la tienes lista, con tu estilo.`, href: wa(`Hola, vengo ${origen === 'tarjeta' ? 'de la tarjeta' : 'del flyer'} de DKitchen. Os mando la foto de mi carta para que me la montéis.`), externo: true, accion: 'Enviar foto', charla: true, etiqueta: `Solo con ${impreso}` }] : []),
        { titulo: 'Pide una demo en vivo con tu carta', contacto: true, texto: 'Cuéntanos tu caso y te la preparamos con tus platos.', href: `/contacto?i=carta${qr ? `&o=${qr}` : ''}` },
      ]}
    />
  );
}
