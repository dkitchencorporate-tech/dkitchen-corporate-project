'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import CartaMini, { type EstiloMini } from './CartaMini';

/** «Pruébalo tú»: el visitante cambia el estilo de la carta en vivo, como en su panel. */
const ESTILOS: [EstiloMini['plantilla'], string][] = [['editorial', 'Editorial'], ['clasica', 'Clásico'], ['visual', 'Visual'], ['express', 'Express']];
const FONDOS: [EstiloMini['fondo'], string, string][] = [['papel', 'Papel', '#F7F3EA'], ['blanco', 'Blanco', '#FFFFFF'], ['oscuro', 'Oscuro', '#15161A']];
const COLORES = ['#E8592A', '#B23A48', '#C58B2A', '#2F5D50', '#1F4E79', '#5B3E8A'];

export default function PruebaloQr() {
  const [e, setE] = useState<EstiloMini>({ plantilla: 'editorial', fondo: 'papel', letra: 'serif', color: '#E8592A' });
  const chip = (on: boolean) => `rounded-full px-4 py-2 text-sm font-medium transition ${on ? 'bg-white text-[#17191E]' : 'bg-white/[0.07] text-white/70 hover:bg-white/[0.12]'}`;
  return (
    <section className="relative overflow-hidden bg-[#17191E] py-24 text-white md:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 bottom-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(232,89,42,.18),transparent)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-[1fr_320px] md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8592A]">Pruébalo tú</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.02] md:text-6xl">Tu carta no se parece a la de nadie.</h2>
          <p className="mt-5 max-w-lg text-lg text-white/60">Toca y mira cómo cambia. Así de fácil lo harás en tu panel, sin diseñador.</p>
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
        </div>
        <motion.div key={e.plantilla + e.fondo} initial={{ rotateY: -8, opacity: 0.6 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="mx-auto w-[290px]" style={{ perspective: 1200 }}>
          <div className="rounded-[46px] bg-[#0E0F12] p-3 shadow-[0_40px_120px_rgba(0,0,0,.55)] ring-1 ring-white/10">
            <div className="aspect-[9/19] overflow-hidden rounded-[36px]"><CartaMini e={e} /></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
