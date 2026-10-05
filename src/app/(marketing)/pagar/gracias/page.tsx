import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCTOS_PAGO } from '@/lib/productos-pago';
import { FondoVivo } from '@/components/dk/Movimiento';
import Briefing from '@/components/experience/Briefing';

export const metadata: Metadata = { title: 'Pago recibido · DKitchen', robots: { index: false, follow: false } };

/** Vuelta de Whop tras pagar (29/09/2026): confirma y recuerda qué pasa ahora. */
export default async function Gracias({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const p = PRODUCTOS_PAGO[String((await searchParams).p ?? '')];
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#0A080C] px-6 pb-20 pt-36 text-white md:pt-44">
      <FondoVivo />
      <div className="relative mx-auto max-w-2xl text-center">
        <p className="acento-serif text-6xl md:text-7xl">Gracias.</p>
        <h1 className="font-display mt-5 text-4xl font-semibold leading-tight md:text-5xl">{p ? `Ya estás dentro de ${p.nombre}.` : 'Hemos recibido tu pago.'}</h1>
        <p className="mt-5 text-lg text-white/70">Te hemos enviado la confirmación a tu correo. Si no la ves en unos minutos, revisa la carpeta de spam.</p>
        {p && (
          <ol className="mx-auto mt-12 max-w-lg space-y-5 text-left">
            {p.despues.map(([cuando, que], i) => (
              <li key={cuando} className="grid grid-cols-[36px_1fr] gap-4 border-t border-white/10 pt-5">
                <span className="acento-serif text-3xl leading-none">{i + 1}</span>
                <div><p className="font-semibold">{cuando}</p><p className="mt-1 text-white/60">{que}</p></div>
              </li>
            ))}
          </ol>
        )}
        {p?.id === 'experience' && <Briefing />}
        <Link href="/" className="mt-12 inline-block rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold hover:border-white/50">Volver a la web</Link>
      </div>
    </section>
  );
}
