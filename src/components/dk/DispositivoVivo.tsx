'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import CartaDemo from '@/components/qr-landing/CartaDemo';
import type { EstiloMini } from '@/components/qr-landing/CartaMini';
import { CURVA } from './Movimiento';

/**
 * Pieza de firma del hero (29/09/2026): un móvil real (marco con brillo,
 * isla, reflejo que recorre la pantalla) con la carta demo con fotos que
 * cambia de estilo sola, flotando en 3D, y avisos reales orbitando alrededor.
 */
const ESTILOS: EstiloMini[] = [
  { plantilla: 'visual', fondo: 'oscuro', letra: 'serif', color: '#E8592A' },
  { plantilla: 'editorial', fondo: 'papel', letra: 'serif', color: '#E8592A' },
  { plantilla: 'clasica', fondo: 'blanco', letra: 'sans', color: '#1F4E79' },
];
const AVISOS = [
  { t: 'Mesa 4', d: 'Llama al camarero', c: '#E8592A', pos: 'left-[-14%] top-[14%]', r: -4 },
  { t: 'Precio actualizado', d: 'Croquetas · 9,50 → 9,90 €', c: '#2F8F6B', pos: 'right-[-16%] top-[34%]', r: 3 },
  { t: 'Reserva 21:30', d: '4 personas · confirmada', c: '#3B6EA5', pos: 'left-[-10%] bottom-[20%]', r: 2 },
  { t: 'Carta en inglés', d: 'Traducida por DKitchen', c: '#D99A1E', pos: 'right-[-12%] bottom-[8%]', r: -3 },
];

export default function DispositivoVivo({ ancho = 300 }: { ancho?: number }) {
  const quieto = useReducedMotion();
  const [i, setI] = useState(0);
  const [aviso, setAviso] = useState(0);
  useEffect(() => {
    if (quieto) return;
    const a = setInterval(() => setI((x) => (x + 1) % ESTILOS.length), 4200);
    const b = setInterval(() => setAviso((x) => (x + 1) % AVISOS.length), 1900);
    return () => { clearInterval(a); clearInterval(b); };
  }, [quieto]);

  return (
    <div className="relative mx-auto" style={{ width: ancho, perspective: 1600 }}>
      <div aria-hidden="true" className="absolute inset-[-18%] rounded-full bg-[radial-gradient(closest-side,rgba(232,89,42,.35),transparent)] blur-2xl" />
      <motion.div
        initial={quieto ? false : { opacity: 0, rotateX: 24, y: 90, scale: 0.88 }}
        animate={{ opacity: 1, rotateX: 0, rotateY: 0, y: 0, scale: 1 }}
        transition={{ duration: 1.3, delay: 0.2, ease: CURVA }}
        style={{ transformStyle: 'preserve-3d' }}>
        <motion.div animate={quieto ? undefined : { y: [0, -12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} style={{ transformStyle: 'preserve-3d' }}>
          <div className="relative rounded-[50px] p-[3px] shadow-[0_60px_120px_-20px_rgba(0,0,0,.7)] [background:linear-gradient(145deg,#6b707b,#1b1d22_35%,#0b0c0f_70%,#4a4e57)]">
            <div className="rounded-[47px] bg-[#0B0C0F] p-[10px]">
              <div className="relative aspect-[9/19.5] overflow-hidden rounded-[38px] bg-black">
                <AnimatePresence mode="popLayout">
                  <motion.div key={i} className="absolute inset-0 overflow-hidden" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: CURVA }}>
                    <div className="animate-[subirCarta_14s_ease-in-out_infinite_alternate]"><CartaDemo e={ESTILOS[i]} /></div>
                  </motion.div>
                </AnimatePresence>
                <div className="absolute left-1/2 top-2.5 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 animate-[reflejo_7s_ease-in-out_infinite] [background:linear-gradient(115deg,transparent_35%,rgba(255,255,255,.18)_48%,transparent_60%)] [background-size:250%_100%]" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {AVISOS.map((a, k) => (
        <motion.div key={a.t} className={`absolute z-10 hidden sm:block ${a.pos}`}
          animate={{ opacity: aviso === k ? 1 : 0.35, scale: aviso === k ? 1 : 0.94, y: [0, -8, 0] }}
          transition={{ opacity: { duration: 0.4 }, scale: { duration: 0.4 }, y: { duration: 5 + k, repeat: Infinity, ease: 'easeInOut' } }}
          style={{ rotate: a.r }}>
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#1B1D22]/80 px-4 py-3 text-white shadow-2xl backdrop-blur-xl">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: a.c }} /><span className="relative h-2.5 w-2.5 rounded-full" style={{ background: a.c }} /></span>
            <span><span className="block whitespace-nowrap text-sm font-semibold">{a.t}</span><span className="block whitespace-nowrap text-xs text-white/60">{a.d}</span></span>
          </div>
        </motion.div>
      ))}
      <div className="mt-10 flex justify-center sm:hidden">
        <AnimatePresence mode="wait">
          <motion.div key={aviso} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
            className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#1B1D22]/80 px-4 py-3 text-white backdrop-blur-xl">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: AVISOS[aviso].c }} />
            <span><span className="block text-sm font-semibold">{AVISOS[aviso].t}</span><span className="block text-xs text-white/60">{AVISOS[aviso].d}</span></span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
