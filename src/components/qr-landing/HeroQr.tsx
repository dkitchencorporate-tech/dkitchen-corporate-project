'use client';

import { motion, useReducedMotion } from 'framer-motion';
import DispositivoVivo from '@/components/dk/DispositivoVivo';
import { FondoVivo, Contador } from '@/components/dk/Movimiento';

const CURVA = [0.22, 1, 0.36, 1] as [number, number, number, number];

function Titular({ texto, retraso, className }: { texto: string; retraso: number; className?: string }) {
  const quieto = useReducedMotion();
  return (
    <span className={className}>
      {texto.split(' ').map((p, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top">
          <motion.span className="inline-block" initial={quieto ? false : { y: '110%' }} animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: retraso + i * 0.07, ease: CURVA }}>{p}&nbsp;</motion.span>
        </span>
      ))}
    </span>
  );
}

/** Hero de /qr (rediseño 29/09/2026): promesa, prueba numérica y el producto en 3D. */
export default function HeroQr() {

  return (
    <section className="relative overflow-hidden bg-[#0A080C] pb-16 pt-32 text-white md:pb-24 md:pt-40">
      <FondoVivo />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-[1.15fr_1fr] md:px-8">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2F8F6B]" /> Carta digital QR para hostelería
          </motion.p>
          <h1 className="font-display mt-6 text-[46px] font-semibold leading-[0.98] sm:text-7xl lg:text-[84px]">
            <Titular texto="Tu carta cambia." retraso={0.15} className="block" />
            <Titular texto="Tu QR, nunca." retraso={0.45} className="block text-[#6E0C2B]" />
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.7, ease: CURVA }}
            className="mt-7 max-w-lg text-lg leading-relaxed text-white/65">
            Precios, platos, fotos y alérgenos al día desde tu móvil, en segundos. Sin imprenta, sin diseñador y sin tocar las mesas.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95, duration: 0.7, ease: CURVA }}
            className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#planes" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#6E0C2B] px-7 py-4 text-[15px] font-semibold transition hover:bg-[#4A0819]">
              Empieza por 1 € <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a href="#como-funciona" className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-4 text-[15px] font-semibold hover:border-white/40">Ver cómo funciona</a>
          </motion.div>
          <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {([[1, ' €', 'el primer mes'], [0, '', 'reimpresiones'], [14, '', 'alérgenos UE']] as [number, string, string][]).map(([n, suf, t]) => (
              <div key={t}><dt className="font-display text-3xl font-semibold"><Contador hasta={n} sufijo={suf} /></dt><dd className="mt-1 text-xs text-white/50">{t}</dd></div>
            ))}
          </motion.dl>
        </div>

        <div className="relative">
          <DispositivoVivo ancho={290} />
        </div>
      </div>
    </section>
  );
}
