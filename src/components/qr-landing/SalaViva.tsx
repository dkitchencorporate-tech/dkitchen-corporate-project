'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TextoRevelado } from '@/components/dk/Movimiento';

/**
 * Tu sala, organizada: plano animado con mesas que llaman, el camarero que las
 * atiende y la comanda que viaja al TPV. Presenta los Módulos de Sala sin
 * precios públicos (se contratan desde el panel).
 */
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
    <section className="bg-[#F7F5F2] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="max-w-2xl">
          <p className="etiqueta-dk text-[#6E0C2B]">Módulos de sala</p>
          <TextoRevelado texto="Ninguna mesa esperando. Ninguna comanda perdida." className="font-display mt-4 text-4xl font-semibold leading-[1.02] text-[#17191E] md:text-6xl" />
          <p className="mt-5 text-lg text-[#6B7079]">Cuando tu sala crece, la carta se conecta con tu equipo. Se activan desde tu panel, cuando los necesites.</p>
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[28px] border border-[#E6E6E2] bg-white p-4 [background-image:linear-gradient(rgba(23,25,30,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(23,25,30,.04)_1px,transparent_1px)] [background-size:24px_24px] sm:p-6">
            <div className="grid grid-cols-[2fr_1fr] gap-3 sm:gap-4">
              <div className="rounded-2xl border-2 border-dashed border-[#6E0C2B]/40 p-3 sm:p-4">
                <span className="inline-block rounded-md bg-[#6E0C2B]/10 px-2 py-1 text-[11px] font-semibold text-[#6E0C2B]">Salón · Lucía</span>
                <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-4">{['1', '2', '3', '4', '5', '6'].map((n: string) => {
                const activa = n === ev.mesa;
                return (
                  <div key={n} className="relative aspect-square">
                    {activa && <span className="absolute inset-0 rounded-xl bg-[#6E0C2B]" style={{ animation: 'latido 1.4s ease-in-out infinite' }} />}
                    <span className={`relative flex h-full w-full items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-colors duration-500 ${activa ? 'bg-[#6E0C2B] text-white' : 'bg-[#F3F3F0] text-[#1B1D22]'}`}>{n}</span>
                  </div>
                );
              })}</div>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-[#2F8F6B]/40 p-3 sm:p-4">
                <span className="inline-block rounded-md bg-[#2F8F6B]/10 px-2 py-1 text-[11px] font-semibold text-[#2F8F6B]">Terraza · Marcos</span>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:gap-4">{['7', '8'].map((n: string) => {
                const activa = n === ev.mesa;
                return (
                  <div key={n} className="relative aspect-square">
                    {activa && <span className="absolute inset-0 rounded-xl bg-[#6E0C2B]" style={{ animation: 'latido 1.4s ease-in-out infinite' }} />}
                    <span className={`relative flex h-full w-full items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-colors duration-500 ${activa ? 'bg-[#6E0C2B] text-white' : 'bg-[#F3F3F0] text-[#1B1D22]'}`}>{n}</span>
                  </div>
                );
              })}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3"><div className="h-3 flex-1 rounded bg-[#3F434B]" /><span className="text-[11px] text-[#6B7079]">Barra</span></div>
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
