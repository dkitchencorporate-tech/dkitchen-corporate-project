import type { Metadata } from 'next';
import Link from 'next/link';
import FormularioContacto from '@/components/contacto/FormularioContacto';
import { FondoVivo } from '@/components/dk/Movimiento';

export const metadata: Metadata = {
  title: 'Habla con DKitchen · DKitchen Corporate',
  description: 'Cuéntanos tu caso en 30 segundos y te atiende un asesor por WhatsApp.',
  robots: { index: false, follow: false },
};

const INTERESES = ['carta', 'signature', 'experience', 'no_se'] as const;

export default async function Contacto({ searchParams }: { searchParams: Promise<{ i?: string; qr?: string; o?: string }> }) {
  const sp = await searchParams;
  const interes = (INTERESES as readonly string[]).includes(String(sp.i)) ? (sp.i as (typeof INTERESES)[number]) : null;
  const origen = String(sp.qr ?? sp.o ?? 'web').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'web';
  return (
    <div className="relative min-h-screen overflow-hidden bg-noche px-5 pb-24 pt-32 text-white md:pt-40">
      <FondoVivo />
      <div className="relative mx-auto max-w-xl">
        <p className="etiqueta-dk text-oro">Habla con un asesor de DKitchen</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.04] md:text-5xl">Cuéntanos tu caso en 30 segundos.</h1>
        <p className="mt-4 text-lg text-white/70">Así, la persona que te escriba por WhatsApp llega sabiendo quién eres y qué necesitas. Sin repetir nada.</p>
        <FormularioContacto origen={origen} interesInicial={interes} />
        <p className="mt-10 text-sm text-white/55">
          ¿Prefieres mirar antes? <Link href="/demos/carta" className="text-oro underline-offset-4 hover:underline">Ver cartas de muestra</Link> · <Link href="/precios" className="text-oro underline-offset-4 hover:underline">Precios</Link>
        </p>
      </div>
    </div>
  );
}
