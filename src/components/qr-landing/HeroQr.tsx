'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Hero de /qr (rediseño 29/09/2026): titular grande, una sola promesa y la
 * carta real dentro de un móvil. Sin 3D ni iconos: el producto es la imagen.
 */
const PLATOS = [
  ['Croquetas de jamón', 'Cremosas, seis unidades', '9,50'],
  ['Arroz meloso de marisco', 'Gamba roja y mejillones', '18'],
  ['Presa ibérica a la brasa', 'Patata asada y pimientos', '19,50'],
  ['Tarta de queso', 'Horneada, centro cremoso', '6,50'],
];

export default function HeroQr() {
  const quieto = useReducedMotion();
  const entra = (d: number) => (quieto ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: [0.22, 1, 0.36, 1] } });

  return (
    <section className="relative overflow-hidden bg-[#0F0B08] pb-20 pt-32 text-white md:pb-28 md:pt-40">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[640px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(217,83,30,.28),transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-60 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(197,139,42,.14),transparent)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-[1.1fr_1fr] md:px-8">
        <div>
          <motion.p {...entra(0)} className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E0703F]">QR Menú</motion.p>
          <motion.h1 {...entra(0.08)} className="mt-5 text-[44px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            Tu carta, siempre al día.<br /><span className="text-white/45">Sin reimprimir nunca.</span>
          </motion.h1>
          <motion.p {...entra(0.16)} className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
            Cambias precios, platos y fotos desde el móvil y el QR de tus mesas sigue siendo el mismo. Con alérgenos, idiomas y tu marca.
          </motion.p>
          <motion.div {...entra(0.24)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#planes" className="rounded-full bg-white px-7 py-4 text-center text-[15px] font-semibold text-[#0F0B08] transition hover:bg-white/90">Empieza por 1 €</a>
            <Link href="/demo/carta" className="rounded-full border border-white/20 px-7 py-4 text-center text-[15px] font-semibold text-white transition hover:border-white/50">Ver una carta real</Link>
          </motion.div>
          <motion.p {...entra(0.3)} className="mt-5 text-sm text-white/40">Primer mes a 1 €. Después desde 9 €/mes, sin permanencia.</motion.p>
        </div>

        <motion.div {...(quieto ? {} : { initial: { opacity: 0, y: 60, rotate: 2 }, animate: { opacity: 1, y: 0, rotate: 0 }, transition: { duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] } })}
          className="relative mx-auto w-[280px] sm:w-[310px]">
          <div className="rounded-[46px] border border-white/10 bg-[#1b1510] p-3 shadow-[0_40px_120px_rgba(0,0,0,.6)]">
            <div className="overflow-hidden rounded-[36px] bg-[#F7F3EA] text-[#221D17]">
              <div className="relative h-44 bg-[url('/images/demo/s1.png')] bg-cover bg-center">
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/65" />
                <div className="absolute inset-x-0 bottom-4 text-center text-white">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-white/75">La carta</p>
                  <p className="mt-1 font-serif text-3xl">Casa Brasa</p>
                </div>
              </div>
              <div className="flex gap-4 border-b border-black/10 px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-black/55">
                <span className="text-[#D9531E]">Para compartir</span><span>Principales</span><span>Postres</span>
              </div>
              <div className="space-y-4 px-5 pb-8 pt-5">
                <p className="text-center text-[9px] uppercase tracking-[0.3em] text-[#D9531E]">I</p>
                <p className="-mt-2 text-center font-serif text-2xl">Para compartir</p>
                {PLATOS.map(([n, d, p]) => (
                  <div key={n}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-[15px] font-semibold">{n}</span>
                      <span className="flex-1 border-b border-dotted border-black/25" />
                      <span className="font-serif text-[15px] font-semibold">{p}</span>
                    </div>
                    <p className="font-serif text-[13px] italic text-black/50">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -left-10 top-24 hidden rounded-2xl border border-white/10 bg-[#1b1510]/95 px-4 py-3 text-sm shadow-xl backdrop-blur sm:block">
            <p className="text-white/45 text-xs">Precio actualizado</p>
            <p className="font-semibold">Hace 2 min · mismo QR</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
