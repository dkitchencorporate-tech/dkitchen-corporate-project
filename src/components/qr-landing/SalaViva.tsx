'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Tu sala, organizada: plano animado con mesas que llaman, el camarero que las
 * atiende y la comanda que viaja al TPV. Presenta los Módulos de Sala sin
 * precios públicos (se contratan desde el panel).
 */
const MESAS = [
  { n: '1', x: 8, y: 14 }, { n: '2', x: 30, y: 14 }, { n: '3', x: 52, y: 14 },
  { n: '4', x: 8, y: 50 }, { n: '5', x: 30, y: 50 }, { n: '6', x: 52, y: 50 },
  { n: '7', x: 78, y: 22 }, { n: '8', x: 78, y: 58 },
];
const SECUENCIA = [
  { mesa: '4', texto: 'Mesa 4 llama al camarero', quien: 'Lucía la atiende' },
  { mesa: '7', texto: 'Mesa 7 pide la cuenta', quien: 'Marcos la atiende' },
  { mesa: '2', texto: 'Mesa 2 · 3 platos anotados', quien: 'Enviado al TPV' },
];
const BENEFICIOS = [
  ['Plano de tu local', 'Dibuja tu sala y terraza, crea zonas y asígnaselas a cada camarero.'],
  ['App de sala', 'Cada camarero ve sus mesas y los avisos en su móvil, y anota las comandas.'],
  ['Conexión con tu TPV', 'Lo que anota el camarero llega solo a tu TPV. Sin teclear dos veces.'],
];

export default function SalaViva() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % SECUENCIA.length), 2800); return () => clearInterval(t); }, []);
  const ev = SECUENCIA[i];
  return (
    <section className="bg-[#F7F7F5] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8592A]">Módulos de sala</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.02] text-[#17191E] md:text-6xl">Ninguna mesa esperando. Ninguna comanda perdida.</h2>
          <p className="mt-5 text-lg text-[#6B7079]">Cuando tu sala crece, la carta se conecta con tu equipo. Se activan desde tu panel, cuando los necesites.</p>
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] border border-[#E6E6E2] bg-white [background-image:linear-gradient(rgba(23,25,30,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(23,25,30,.04)_1px,transparent_1px)] [background-size:5%_7%]">
            <div className="absolute left-[4%] top-[6%] h-[82%] w-[66%] rounded-2xl border-2 border-dashed border-[#E8592A]/40"><span className="m-3 inline-block rounded-md bg-[#E8592A]/10 px-2 py-1 text-[11px] font-semibold text-[#E8592A]">Salón · Lucía</span></div>
            <div className="absolute right-[4%] top-[10%] h-[76%] w-[22%] rounded-2xl border-2 border-dashed border-[#2F8F6B]/40"><span className="m-3 inline-block rounded-md bg-[#2F8F6B]/10 px-2 py-1 text-[11px] font-semibold text-[#2F8F6B]">Terraza · Marcos</span></div>
            <div className="absolute bottom-[4%] left-[4%] h-[6%] w-[40%] rounded bg-[#3F434B]" />
            {MESAS.map((m) => {
              const activa = m.n === ev.mesa;
              return (
                <div key={m.n} className="absolute flex h-[17%] w-[13%] items-center justify-center" style={{ left: `${m.x + 4}%`, top: `${m.y + 12}%` }}>
                  {activa && <span className="absolute inset-0 rounded-xl bg-[#E8592A]" style={{ animation: 'latido 1.4s ease-in-out infinite' }} />}
                  <span className={`relative flex h-full w-full items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-colors ${activa ? 'bg-[#E8592A] text-white' : 'bg-[#F3F3F0] text-[#1B1D22]'}`}>{m.n}</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] bg-[#17191E] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">En directo</p>
              <AnimatePresence mode="wait">
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                  <p className="mt-3 text-lg font-semibold">{ev.texto}</p>
                  <p className="mt-1 text-sm text-white/55">{ev.quien}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            {BENEFICIOS.map(([t, d]) => (
              <div key={t} className="rounded-[24px] border border-[#E6E6E2] bg-white p-5">
                <p className="font-semibold text-[#17191E]">{t}</p>
                <p className="mt-1 text-sm text-[#6B7079]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
