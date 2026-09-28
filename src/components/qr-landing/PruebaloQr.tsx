'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CartaDemo from './CartaDemo';
import type { EstiloMini } from './CartaMini';

/**
 * «Pruébalo tú» (v2): carta demo con fotos reales que cambia de estilo en vivo
 * y se puede abrir a pantalla completa; desde ahí, «Quiero esta carta» lleva a
 * los planes y al pago.
 */
const ESTILOS: [EstiloMini['plantilla'], string][] = [['editorial', 'Editorial'], ['visual', 'Visual'], ['clasica', 'Clásico'], ['express', 'Express']];
const FONDOS: [EstiloMini['fondo'], string, string][] = [['papel', 'Papel', '#F7F3EA'], ['blanco', 'Blanco', '#FFFFFF'], ['oscuro', 'Oscuro', '#15161A']];
const COLORES = ['#6E0C2B', '#B23A48', '#C58B2A', '#2F5D50', '#1F4E79', '#5B3E8A'];
const CURVA = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function PruebaloQr() {
  const [e, setE] = useState<EstiloMini>({ plantilla: 'editorial', fondo: 'papel', letra: 'serif', color: '#E8592A' });
  const [abierta, setAbierta] = useState(false);
  useEffect(() => { document.body.style.overflow = abierta ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [abierta]);
  const chip = (on: boolean) => `rounded-full px-4 py-2 text-sm font-medium transition ${on ? 'bg-white text-[#17191E]' : 'bg-white/[0.07] text-white/70 hover:bg-white/[0.12]'}`;

  function quiero() {
    setAbierta(false);
    setTimeout(() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' }), 250);
  }

  return (
    <section className="relative overflow-hidden bg-[#17191E] py-24 text-white md:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 bottom-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.18),transparent)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-[1fr_320px] md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6E0C2B]">Pruébalo tú</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.02] md:text-6xl">Tu carta no se parece a la de nadie.</h2>
          <p className="mt-5 max-w-lg text-lg text-white/60">Toca y mira cómo cambia. Después ábrela en grande, como la verán tus clientes.</p>
          <div className="mt-10 space-y-6">
            <div><p className="text-xs uppercase tracking-[0.2em] text-white/40">Estilo</p>
              <div className="mt-3 flex flex-wrap gap-2">{ESTILOS.map(([id, n]) => <button key={id} onClick={() => setE({ ...e, plantilla: id })} className={chip(e.plantilla === id)}>{n}</button>)}</div></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-white/40">Fondo</p>
              <div className="mt-3 flex flex-wrap gap-2">{FONDOS.map(([id, n, c]) => <button key={id} onClick={() => setE({ ...e, fondo: id })} className={`${chip(e.fondo === id)} inline-flex items-center gap-2`}><span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: c }} />{n}</button>)}</div></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-white/40">Letra</p>
              <div className="mt-3 flex gap-2">{([['serif', 'Clásica'], ['sans', 'Moderna']] as const).map(([id, n]) => <button key={id} onClick={() => setE({ ...e, letra: id })} className={chip(e.letra === id)} style={{ fontFamily: id === 'serif' ? 'var(--fuente-serif-web), Georgia, serif' : undefined }}>{n}</button>)}</div></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-white/40">Color</p>
              <div className="mt-3 flex gap-2.5">{COLORES.map((c) => <button key={c} aria-label={`Color ${c}`} onClick={() => setE({ ...e, color: c })} className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-[#17191E] transition ${e.color === c ? 'ring-2 ring-white' : ''}`} style={{ background: c }} />)}</div></div>
          </div>
          <button onClick={() => setAbierta(true)} className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-[15px] font-semibold text-[#17191E]">
            Abrir la carta en grande <span aria-hidden="true">↗</span>
          </button>
        </div>

        <button onClick={() => setAbierta(true)} aria-label="Abrir la carta demo en grande" className="mx-auto block w-[290px] text-left">
          <div className="rounded-[46px] bg-[#0E0F12] p-3 shadow-[0_40px_120px_rgba(0,0,0,.55)] ring-1 ring-white/10 transition hover:-translate-y-1">
            <div className="aspect-[9/19] overflow-hidden rounded-[36px]"><CartaDemo e={e} /></div>
          </div>
          <p className="mt-4 text-center text-xs text-white/40">Toca para abrirla</p>
        </button>
      </div>

      <AnimatePresence>
        {abierta && (
          <motion.div className="fixed inset-0 z-[200] flex justify-center bg-black/70 backdrop-blur-sm sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierta(false)}>
            <motion.div role="dialog" aria-modal="true" aria-label="Carta demo" onClick={(ev) => ev.stopPropagation()}
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.45, ease: CURVA }}
              className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-white sm:rounded-[32px]">
              <div className="flex items-center justify-between bg-[#17191E] px-5 py-3 text-sm text-white">
                <span>Carta demo · así la verá tu cliente</span>
                <button onClick={() => setAbierta(false)} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold">Cerrar</button>
              </div>
              <div className="flex-1 overflow-y-auto" data-lenis-prevent><CartaDemo e={e} completa /></div>
              <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/40 to-transparent p-4 pt-10">
                <button onClick={quiero} className="flex-1 rounded-full bg-[#6E0C2B] py-4 text-[15px] font-semibold text-white shadow-lg">Quiero esta carta</button>
                <button onClick={quiero} className="rounded-full bg-white px-5 py-4 text-[15px] font-semibold text-[#17191E] shadow-lg">Ver precios</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
