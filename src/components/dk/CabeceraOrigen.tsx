import Link from 'next/link';
import DispositivoVivo from '@/components/dk/DispositivoVivo';
import { FondoVivo, BotonMagnetico } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { QR_MENU } from '@/lib/pricing-config';

/**
 * Portada según la procedencia (27/10/2026, decisión de karc0 del 17/10): quien llega con utm de
 * flyer, tarjeta, propuesta o anuncio ve primero la carta QR a 1 € en vez del hero de marca.
 * Flyer y tarjeta van a las demos (allí, y solo allí, sale la invitación de montaje gratis).
 */
export const ORIGENES = ['flyer', 'tarjeta', 'propuesta', 'anuncio'] as const;
export type Origen = (typeof ORIGENES)[number];

const L = QR_MENU.planes.ampliado;
const TEXTO: Record<Origen, { sello: string; sub: string; cta: { t: string; href: string } }> = {
  flyer: { sello: 'Del flyer que te dejamos', sub: 'La carta que tienes en la mano, pero en el móvil de tus clientes: cambia precios y platos en segundos, con alérgenos y tu propio estilo.', cta: { t: 'Ver cartas de ejemplo', href: '/demos/carta?utm_source=flyer&utm_medium=portada' } },
  tarjeta: { sello: 'De la tarjeta que te dimos', sub: 'Tu carta en el móvil de tus clientes: cambia precios y platos en segundos, con alérgenos y tu propio estilo.', cta: { t: 'Ver cartas de ejemplo', href: '/demos/carta?utm_source=tarjeta&utm_medium=portada' } },
  propuesta: { sello: 'Tu propuesta de DKitchen', sub: 'Lo que viste en tu propuesta, listo para tu local: carta digital con pedido desde la mesa, reseñas de toda la mesa y reservas.', cta: { t: `Empezar por ${QR_MENU.primerMes} €`, href: '/qr#planes' } },
  anuncio: { sello: 'Carta digital QR para hostelería', sub: 'Mándanos una foto de tu carta y te la devolvemos digital, con tus platos y tu estilo. Cambia precios desde el móvil, sin reimprimir.', cta: { t: 'Mandar la foto de mi carta', href: '/carta-de-autor?utm_source=anuncio&utm_medium=portada' } },
};

export default function CabeceraOrigen({ origen }: { origen: Origen }) {
  const t = TEXTO[origen];
  return (
    <section className="relative overflow-hidden bg-noche pb-24 pt-36 text-white md:pb-32 md:pt-44">
      <FondoVivo />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-[1.15fr_1fr] md:px-8">
        <div>
          <Aparecer><p className="inline-flex items-center gap-2 rounded-full border border-oro/40 bg-white/5 px-3 py-1.5 text-xs text-oro backdrop-blur"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-oro" /> {t.sello}</p></Aparecer>
          <h1 className="font-display mt-6 text-[46px] font-semibold leading-[0.98] sm:text-7xl lg:text-[82px]">
            <span className="block">Tu carta digital,</span>
            <span className="block">el primer mes <span className="acento-serif">por {QR_MENU.primerMes} €</span>.</span>
          </h1>
          <Aparecer retraso={0.2}><p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">{t.sub}</p></Aparecer>
          <Aparecer retraso={0.3} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <BotonMagnetico href={t.cta.href} className="inline-flex items-center justify-center gap-2 rounded-full bg-vino px-8 py-4 text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)] hover:bg-vino-hondo">{t.cta.t} →</BotonMagnetico>
            <BotonMagnetico href="/qr" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-semibold backdrop-blur hover:border-white/50">Cómo funciona</BotonMagnetico>
          </Aparecer>
          <Aparecer retraso={0.4}>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {([[`${QR_MENU.primerMes} €`, `primer mes del plan ${L.nombre}`], ['0', 'reimpresiones'], ['Sin', 'permanencia']] as [string, string][]).map(([n, d]) => (
                <div key={d}><dt className="font-display text-3xl font-semibold">{n}</dt><dd className="mt-1 text-xs text-white/50">{d}</dd></div>
              ))}
            </dl>
          </Aparecer>
          <Aparecer retraso={0.5}><p className="mt-6 text-sm text-white/60">¿Buscas tu propia app con tu marca? <Link href="/signature" className="font-semibold text-white underline decoration-vino decoration-2 underline-offset-4">Mira Signature</Link></p></Aparecer>
        </div>
        <DispositivoVivo ancho={280} />
      </div>
    </section>
  );
}
