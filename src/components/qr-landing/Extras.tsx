'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Elementos de firma de la web (29/09/2026):
 * - LineaServicio: el trazo naranja que se dibuja al bajar, como el recorrido
 *   de un camarero por la sala (escritorio).
 * - BarraCtaMovil: CTA fijo abajo en móvil, que aparece tras el hero.
 */
export function LineaServicio() {
  const { scrollYProgress } = useScroll();
  const y = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-6 top-1/2 z-40 hidden h-[46vh] -translate-y-1/2 xl:block">
      <div className="h-full w-px border-l border-dotted border-[#9A9EA6]/60" />
      <motion.div className="absolute left-0 top-0 h-full w-[2px] -translate-x-[0.5px] origin-top rounded-full bg-[#E8592A]" style={{ scaleY: y }} />
    </div>
  );
}

export function BarraCtaMovil() {
  const [ver, setVer] = useState(false);
  useEffect(() => {
    const f = () => setVer(window.scrollY > window.innerHeight * 0.8 && window.innerHeight + window.scrollY < document.body.scrollHeight - 400);
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <motion.div initial={false} animate={{ y: ver ? 0 : 120 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-x-3 bottom-3 z-[90] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-[#17191E]/90 py-2 pl-5 pr-2 text-white shadow-2xl backdrop-blur-xl">
        <span className="text-sm"><span className="font-semibold">1 €</span> <span className="text-white/55">el primer mes</span></span>
        <Link href="#planes" className="rounded-full bg-[#E8592A] px-5 py-2.5 text-sm font-semibold">Empezar</Link>
      </div>
    </motion.div>
  );
}
