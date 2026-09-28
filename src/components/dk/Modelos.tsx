'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { CURVA } from './Movimiento';

/**
 * Modelos reales y cartas de autor (29/09/2026).
 * - Las apps de Seven Food Fries y Wing Boss no se pueden incrustar (su propio
 *   servidor lo impide): se muestran con una captura completa de su web en
 *   móvil, que se desplaza sola y con el dedo, más el enlace a la web real.
 * - Las 3 cartas de autor de /demo/carta sí se incrustan en vivo (misma web).
 */
export const MODELOS = [
  { id: 'sevenfood', nombre: 'Seven Food Fries', tipo: 'App de pedidos · loaded fries', color: '#F5A30A', url: 'https://sevenfood.dkitchencorporate.es/',
    puntos: ['Club VIP con puntos por pedido', 'Carta con fotos y pedido directo', 'Se instala como una app'] },
  { id: 'wingboss', nombre: 'Wing Boss', tipo: 'App de pedidos · alitas', color: '#E0162B', url: 'https://wingboss.dkitchencorporate.es/',
    puntos: ['Combos y packs para compartir', 'Club VIP con alitas y postres gratis', 'Marca oscura, pensada para la noche'] },
];
const wa = (t: string) => `https://wa.me/34622652659?text=${encodeURIComponent(`Hola, quiero un modelo como ${t} para mi negocio.`)}`;

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[46px] p-[3px] shadow-[0_50px_100px_-20px_rgba(0,0,0,.55)] [background:linear-gradient(145deg,#6b707b,#1b1d22_35%,#0b0c0f_70%,#4a4e57)]">
      <div className="rounded-[43px] bg-[#0B0C0F] p-[9px]"><div className="relative aspect-[9/19.5] overflow-hidden rounded-[35px] bg-black">{children}<div className="pointer-events-none absolute left-1/2 top-2 z-10 h-[20px] w-[84px] -translate-x-1/2 rounded-full bg-black" /></div></div>
    </div>
  );
}

function PantallaDesplazable({ id, alt, activa = true }: { id: string; alt: string; activa?: boolean }) {
  const [tocado, setTocado] = useState(false);
  return (
    <div data-lenis-prevent className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none]" onPointerDown={() => setTocado(true)} onWheel={() => setTocado(true)}>
      <div className={!tocado && activa ? 'animate-[recorrido_38s_ease-in-out_infinite_alternate]' : ''}>
        <Image src={`/images/modelos/${id}-movil.jpg`} alt={alt} width={780} height={14000} sizes="300px" className="h-auto w-full" />
      </div>
    </div>
  );
}

export function ModelosReales({ oscuro = true }: { oscuro?: boolean }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  useEffect(() => { document.body.style.overflow = abierto ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [abierto]);
  const m = MODELOS.find((x) => x.id === abierto);
  return (
    <>
      <div className="mt-14 grid gap-10 md:grid-cols-2">
        {MODELOS.map((x, i) => (
          <motion.div key={x.id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: i * 0.1, ease: CURVA }}
            className={`grid items-center gap-6 rounded-[32px] p-6 sm:grid-cols-[220px_1fr] md:p-8 ${oscuro ? 'border border-white/10 bg-white/[0.04] text-white' : 'border border-[#E6E6E2] bg-white text-[#17191E]'}`}>
            <div className="mx-auto w-[220px]"><Marco><PantallaDesplazable id={x.id} alt={`Web de ${x.nombre} en el móvil`} /></Marco><p className={`mt-3 text-center text-xs ${oscuro ? 'text-white/40' : 'text-[#9A9EA6]'}`}>Desliza dentro del móvil</p></div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em]" style={{ color: x.color }}>{x.tipo}</p>
              <p className="font-display mt-2 text-3xl font-semibold">{x.nombre}</p>
              <ul className={`mt-4 space-y-2 text-[15px] ${oscuro ? 'text-white/70' : 'text-[#3F434B]'}`}>{x.puntos.map((p) => <li key={p} className="flex gap-2"><span style={{ color: x.color }}>✓</span>{p}</li>)}</ul>
              <div className="mt-6 flex flex-col gap-2">
                <a href={wa(x.nombre)} className="rounded-full bg-[#E8592A] px-5 py-3 text-center text-sm font-semibold text-white">Quiero este modelo</a>
                <div className="flex gap-2">
                  <button onClick={() => setAbierto(x.id)} className={`flex-1 rounded-full border px-4 py-3 text-sm font-semibold ${oscuro ? 'border-white/20 hover:border-white/50' : 'border-[#D6D6D1] hover:border-[#17191E]'}`}>Abrir en grande</button>
                  <a href={x.url} target="_blank" rel="noopener" className={`flex-1 rounded-full border px-4 py-3 text-center text-sm font-semibold ${oscuro ? 'border-white/20 hover:border-white/50' : 'border-[#D6D6D1] hover:border-[#17191E]'}`}>Ver web real ↗</a>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {m && (
          <motion.div className="fixed inset-0 z-[200] flex justify-center bg-black/75 backdrop-blur-sm sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierto(null)}>
            <motion.div role="dialog" aria-modal="true" aria-label={m.nombre} onClick={(e) => e.stopPropagation()} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.45, ease: CURVA }}
              className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-black sm:rounded-[32px]">
              <div className="flex items-center justify-between bg-[#17191E] px-5 py-3 text-sm text-white"><span>{m.nombre} · así lo ve tu cliente</span><button onClick={() => setAbierto(null)} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold">Cerrar</button></div>
              <div className="relative flex-1"><PantallaDesplazable id={m.id} alt={`Web de ${m.nombre}`} activa={false} /></div>
              <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10">
                <a href={wa(m.nombre)} className="flex-1 rounded-full bg-[#E8592A] py-4 text-center text-[15px] font-semibold text-white shadow-lg">Quiero este modelo</a>
                <a href={m.url} target="_blank" rel="noopener" className="rounded-full bg-white px-5 py-4 text-[15px] font-semibold text-[#17191E] shadow-lg">Web real ↗</a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const CARTAS = [
  { id: 'sushi', nombre: 'Alta cocina', d: 'Editorial y minimalista, para cocina de autor.' },
  { id: 'tapas', nombre: 'Bar y tapas', d: 'Lista clara y cálida, de toda la vida.' },
  { id: 'burger', nombre: 'Fast food', d: 'Cuadrícula de fotos que empuja a pedir.' },
];

/** Las 3 cartas de autor de la demo, en vivo dentro de móviles (iframe de nuestra propia web). */
export function CartasAutorDemo() {
  const [cargar, setCargar] = useState(false);
  return (
    <motion.div className="mt-14 grid gap-8 md:grid-cols-3" onViewportEnter={() => setCargar(true)} viewport={{ once: true, margin: '200px' }}>
      {CARTAS.map((c, i) => (
        <motion.div key={c.id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: i * 0.1, ease: CURVA }} className="text-center">
          <div className="mx-auto w-[250px]">
            <Marco>
              {cargar ? <iframe src={`/demo/carta?plantilla=${c.id}&embed=1`} title={`Carta de autor: ${c.nombre}`} loading="lazy" className="absolute inset-0 h-full w-full border-0" /> : <div className="absolute inset-0 animate-pulse bg-white/5" />}
            </Marco>
          </div>
          <p className="font-display mt-5 text-2xl font-semibold">{c.nombre}</p>
          <p className="mt-1 text-sm text-white/55">{c.d}</p>
          <div className="mt-4 flex justify-center gap-2">
            <a href={`/demo/carta?plantilla=${c.id}`} className="rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold hover:border-white/50">Abrir en grande</a>
            <a href="#planes" className="rounded-full bg-[#E8592A] px-4 py-2.5 text-sm font-semibold">Quiero esta</a>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
