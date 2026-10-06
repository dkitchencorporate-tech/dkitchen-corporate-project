'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';

/**
 * «El problema» (v2, 29/09/2026): en escritorio, sección fijada corta con dos
 * estados claros (papel → digital) que cambian de golpe al pasar la mitad, sin
 * textos superpuestos. En móvil, sin fijar: antes y después uno debajo del otro.
 */
const PLATOS: [string, string, string][] = [['Croquetas de jamón', '8,50', '9,50'], ['Arroz de marisco', '16', '18'], ['Presa ibérica', '18', '19,50'], ['Tarta de queso', '5,50', '6,50']];
const serif = { fontFamily: 'var(--fuente-serif-web), Georgia, serif' };
const CURVA = [0.22, 1, 0.36, 1] as [number, number, number, number];

function Papel() {
  return (
    <div className="relative h-[400px] w-[290px] -rotate-3 rounded-sm bg-[#FBF7EE] p-7 shadow-[0_30px_60px_rgba(23,25,30,.18)] [background-image:repeating-linear-gradient(0deg,transparent,transparent_27px,rgba(0,0,0,.035)_28px)]">
      <p className="text-center text-2xl text-[#221D17]" style={serif}>Carta</p>
      <div className="mt-6 space-y-5">
        {PLATOS.map(([n, viejo, nuevo]) => (
          <div key={n} className="flex items-baseline justify-between gap-2 text-[15px] text-[#221D17]" style={serif}>
            <span>{n}</span>
            <span className="relative">
              <span className="line-through decoration-[#B23A48] decoration-2">{viejo}</span>
              <span className="absolute -right-3 -top-5 rotate-6 text-sm text-[#B23A48]" aria-hidden="true">{nuevo}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="absolute bottom-6 left-7 right-7 text-center text-[11px] text-ceniza">Versión 7 · reimpresa el martes · 45 €</p>
    </div>
  );
}

function Digital() {
  return (
    <div className="h-[400px] w-[290px] rounded-[40px] bg-tinta p-2.5 shadow-[0_40px_90px_rgba(23,25,30,.3)]">
      <div className="flex h-full flex-col rounded-[32px] bg-white p-5">
        <div className="flex items-center justify-between text-xs text-niebla"><span>Mi carta</span><span className="rounded-full bg-exito/10 px-2 py-0.5 text-exito">Publicada</span></div>
        <div className="mt-4 space-y-2.5">
          {PLATOS.map(([n, , nuevo]) => (
            <div key={n} className="flex items-center justify-between rounded-xl border border-linea px-3 py-2.5 text-sm">
              <span className="text-carbon">{n}</span>
              <span className="rounded-lg bg-crema px-2 py-1 font-semibold tabular-nums text-tinta">{nuevo} €</span>
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-xl bg-vino py-3 text-center text-sm font-semibold text-white">Guardado · ya está en las mesas</div>
      </div>
    </div>
  );
}

const TEXTOS = [
  { eti: 'El problema', color: '#A3184A', t: 'Cada subida de precio te cuesta imprenta.', d: 'Tachones, fotocopias y cartas que no dicen la verdad. El cliente lo nota y tú lo pagas cada vez.' },
  { eti: 'Con DKitchen', color: '#2F8F6B', t: 'Lo cambias en el móvil. Ya está en todas las mesas.', d: 'El QR no cambia nunca. La carta, cuando tú quieras. Coste de reimprimir: 0 €.' },
];

export default function ProblemaQr() {
  const ref = useRef<HTMLElement>(null);
  const [fase, setFase] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setFase(v < 0.5 ? 0 : 1));

  return (
    <>
      {/* Escritorio: fijado, dos estados claros */}
      <section ref={ref} className="relative hidden h-[190vh] bg-crema md:block">
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-8 md:grid-cols-2">
            <AnimatePresence mode="wait">
              <motion.div key={fase} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease: CURVA }}>
                <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: TEXTOS[fase].color }}>{TEXTOS[fase].eti}</p>
                <h2 className="font-display mt-4 text-6xl font-semibold leading-[1.02] text-tinta">{TEXTOS[fase].t}</h2>
                <p className="mt-5 max-w-md text-lg text-niebla">{TEXTOS[fase].d}</p>
                <div className="mt-8 flex items-center gap-3 text-sm text-ceniza">
                  <span className={`h-1.5 w-8 rounded-full ${fase === 0 ? 'bg-vino' : 'bg-linea-fuerte'}`} />
                  <span className={`h-1.5 w-8 rounded-full ${fase === 1 ? 'bg-exito' : 'bg-linea-fuerte'}`} />
                  <span>{fase === 0 ? 'Sigue bajando' : ''}</span>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="relative flex h-[440px] items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div key={fase} initial={{ opacity: 0, rotate: fase ? 4 : -2, y: 40 }} animate={{ opacity: 1, rotate: 0, y: 0 }} exit={{ opacity: 0, rotate: -8, y: 60 }} transition={{ duration: 0.55, ease: CURVA }}>
                  {fase === 0 ? <Papel /> : <Digital />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Móvil: antes y después, sin fijar el scroll */}
      <section className="bg-crema px-6 py-20 md:hidden">
        {TEXTOS.map((x, i) => (
          <div key={x.eti} className={i ? 'mt-20' : ''}>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: x.color }}>{x.eti}</p>
            <h2 className="font-display mt-3 text-4xl font-semibold leading-[1.05] text-tinta">{x.t}</h2>
            <p className="mt-4 text-niebla">{x.d}</p>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: CURVA }} className="mt-10 flex justify-center">
              {i === 0 ? <Papel /> : <Digital />}
            </motion.div>
          </div>
        ))}
      </section>
    </>
  );
}
