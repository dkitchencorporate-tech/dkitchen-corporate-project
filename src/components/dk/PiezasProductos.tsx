'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { CURVA } from './Movimiento';

/* =================================================================== EXPERIENCE: taquilla en vivo */
const ENTRADAS = ['Alex · 2 entradas', 'Marcos · 4 entradas', 'Ana · 2 entradas', 'Javi · 3 entradas', 'Sara · 2 entradas', 'Pablo · 6 entradas'];
export function TaquillaViva() {
  const quieto = useReducedMotion();
  const [vendidas, setVendidas] = useState(62);
  const [ultima, setUltima] = useState(0);
  const aforo = 120, precio = 35;
  useEffect(() => {
    if (quieto) return;
    const t = setInterval(() => { setVendidas((v) => (v >= aforo ? 62 : v + 2 + Math.floor(Math.random() * 3))); setUltima((u) => (u + 1) % ENTRADAS.length); }, 1600);
    return () => clearInterval(t);
  }, [quieto]);
  const v = Math.min(aforo, vendidas);
  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      <div aria-hidden="true" className="absolute inset-[-15%] rounded-full bg-[radial-gradient(closest-side,rgba(232,89,42,.28),transparent)] blur-2xl" />
      <motion.div initial={{ opacity: 0, y: 60, rotateX: 20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 1.1, ease: CURVA }} style={{ transformPerspective: 1400 }}
        className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[#1B1D22]/90 p-6 text-white shadow-2xl backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[#E8592A]">Noche de Asado · sábado 21:00</p>
        <p className="font-display mt-2 text-3xl font-semibold">Taquilla en directo</p>
        <div className="mt-6 flex items-end justify-between">
          <div><p className="text-xs text-white/50">Entradas vendidas</p><p className="font-display text-5xl font-semibold tabular-nums">{v}<span className="text-xl text-white/40">/{aforo}</span></p></div>
          <div className="text-right"><p className="text-xs text-white/50">En tu cuenta</p><p className="font-display whitespace-nowrap text-3xl font-semibold text-[#7FD1AE] tabular-nums">{(v * precio).toLocaleString('es-ES')} €</p></div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#E8592A] to-[#D99A1E]" animate={{ width: `${(v / aforo) * 100}%` }} transition={{ duration: 0.8, ease: CURVA }} /></div>
        <div className="mt-6 h-12">
          <AnimatePresence mode="wait">
            <motion.div key={ultima} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}
              className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-[#2F8F6B] opacity-60" /><span className="relative h-2.5 w-2.5 rounded-full bg-[#2F8F6B]" /></span>
              {ENTRADAS[ultima]} <span className="ml-auto text-white/40">ahora</span>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-4 text-xs text-white/40">0 € de comisión para DKitchen. Cada euro cae en tu cuenta.</p>
      </motion.div>
    </div>
  );
}

/** Escalera de precios que baja según repites. */
export function EscaleraPrecios({ tramos }: { tramos: [number, string, string][] }) {
  const ref = useRef<HTMLDivElement>(null);
  const visto = useInView(ref, { once: true, amount: 0.3 });
  return (
    <div ref={ref} className="mt-14 grid items-end gap-3 sm:grid-cols-4">
      {tramos.map(([p, t, d], i) => (
        <motion.div key={t} initial={{ height: 0, opacity: 0 }} animate={visto ? { height: 'auto', opacity: 1 } : undefined} transition={{ duration: 0.7, delay: i * 0.12, ease: CURVA }}
          className="overflow-hidden rounded-[24px] border border-[#E6E6E2] bg-white" style={{ marginTop: `${i * 26}px` }}>
          <div className="p-6">
            <p className="font-display text-5xl font-semibold text-[#17191E]">{p} €</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E8592A]">{t}</p>
            <p className="mt-2 text-sm text-[#6B7079]">{d}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* =================================================================== DARK KITCHEN: una cocina, siete marcas */
const PEDIDOS = [
  { m: 'Santa Brazza', p: 'Parrilla mixta', c: '#B23A48', canal: 'App propia' },
  { m: 'Wing Boss', p: 'Pro Pack · 15 alitas', c: '#D99A1E', canal: 'App propia' },
  { m: 'Seven Food Fries', p: 'Pulled Beef', c: '#E8592A', canal: 'Delivery' },
  { m: 'My Latin Bowl', p: 'Bowl Salmón', c: '#2F8F6B', canal: 'App propia' },
  { m: 'Bokadipan', p: 'Boka-Mar', c: '#3B6EA5', canal: 'Recoger' },
  { m: 'Natureza Brunch', p: 'Bagel de salmón', c: '#5B3E8A', canal: 'App propia' },
];
export function CocinaMultimarca() {
  const quieto = useReducedMotion();
  const [lista, setLista] = useState(PEDIDOS.slice(0, 4).map((p, i) => ({ ...p, id: 400 + i })));
  const sig = useRef(4);
  useEffect(() => {
    if (quieto) return;
    const t = setInterval(() => { const p = PEDIDOS[sig.current % PEDIDOS.length]; const id = 400 + sig.current; sig.current += 1; setLista((l) => [{ ...p, id }, ...l].slice(0, 4)); }, 1800);
    return () => clearInterval(t);
  }, [quieto]);
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div aria-hidden="true" className="absolute inset-[-15%] rounded-full bg-[radial-gradient(closest-side,rgba(59,110,165,.35),transparent)] blur-2xl" />
      <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: CURVA }} className="relative rounded-[28px] border border-white/15 bg-[#0B0C0F] p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between"><p className="font-display text-xl font-semibold">Pantalla de cocina</p><span className="flex items-center gap-2 text-xs text-white/50"><span className="h-2 w-2 animate-pulse rounded-full bg-[#2F8F6B]" />6 marcas · 1 cocina</span></div>
        <ul className="mt-4 space-y-2.5">
          <AnimatePresence initial={false}>
            {lista.map((p, i) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: -24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: CURVA }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span className="h-10 w-1.5 rounded-full" style={{ background: p.c }} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">#{p.id} · {p.p}</p><p className="text-xs text-white/50">{p.m} · {p.canal}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${i === 0 ? 'bg-[#E8592A] text-white' : i === 3 ? 'bg-[#2F8F6B]/20 text-[#7FD1AE]' : 'bg-white/10 text-white/70'}`}>{i === 0 ? 'Nuevo' : i === 3 ? 'Listo' : 'En marcha'}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </motion.div>
    </div>
  );
}

/* =================================================================== AUDITORÍA: informe que se rellena */
const PUNTOS: [string, number][] = [['Reseñas respondidas', 38], ['Fotos de la ficha', 52], ['Categorías y horarios', 71], ['Posición en tu zona', 44], ['Redes sociales activas', 60], ['Rentabilidad de la carta', 47]];
export function InformeVivo() {
  const ref = useRef<HTMLDivElement>(null);
  const visto = useInView(ref, { amount: 0.3 });
  const color = (n: number) => (n < 50 ? '#E8592A' : n < 65 ? '#D99A1E' : '#2F8F6B');
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[420px]">
      <div aria-hidden="true" className="absolute inset-[-15%] rounded-full bg-[radial-gradient(closest-side,rgba(232,89,42,.25),transparent)] blur-2xl" />
      <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: CURVA }} className="relative rounded-[28px] bg-white p-6 text-[#17191E] shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#E8592A]">Informe de ejemplo</p>
        <p className="font-display mt-1 text-2xl font-semibold">Dónde se te escapan clientes</p>
        <ul className="mt-5 space-y-3.5">
          {PUNTOS.map(([t, n], i) => (
            <li key={t}>
              <div className="flex justify-between text-sm"><span>{t}</span><span className="font-semibold tabular-nums" style={{ color: color(n) }}>{n}/100</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3F3F0]"><motion.div className="h-full rounded-full" style={{ background: color(n) }} initial={{ width: 0 }} animate={{ width: visto ? `${n}%` : 0 }} transition={{ duration: 1, delay: 0.2 + i * 0.12, ease: CURVA }} /></div>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl bg-[#17191E] px-4 py-3 text-sm text-white">Con cada punto: qué falla, cuánto te cuesta y cómo arreglarlo.</p>
        <p className="mt-3 text-[11px] text-[#9A9EA6]">Valores ilustrativos. El tuyo se hace con los datos reales de tu negocio.</p>
      </motion.div>
    </div>
  );
}
