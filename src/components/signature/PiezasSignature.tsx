'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';
import { CURVA } from '@/components/dk/Movimiento';

/* ------------------------------------------------------------------ Móvil con la app funcionando sola */
const FLUJO = [
  { p: 'pedido', t: 'Nuevo pedido #231', d: 'Mesa 6 · 2 pizzas, 1 bebida', c: '#6E0C2B' },
  { p: 'cocina', t: 'En cocina', d: 'Comanda enviada a la pantalla de cocina', c: '#D99A1E' },
  { p: 'pagado', t: 'Pagado · 24,50 €', d: 'Cobro en tu app, sin comisión de plataforma', c: '#2F8F6B' },
  { p: 'puntos', t: '+25 puntos', d: 'Alex sube a cliente VIP', c: '#3B6EA5' },
];

function PantallaApp({ fase }: { fase: number }) {
  return (
    <div className="flex h-full flex-col bg-[#0F1012] text-white">
      <div className="relative h-[38%]">
        <Image src="/images/demo/burger/b13_pizza_bufala.jpeg" alt="" fill sizes="280px" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1012] via-transparent to-black/30" />
        <div className="absolute inset-x-4 bottom-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#6E0C2B]">Tu marca</p>
          <p className="font-display text-2xl font-semibold">Pizzería Roma</p>
        </div>
      </div>
      <div className="flex gap-2 px-4 pt-3 text-[10px]">{['Pizzas', 'Entrantes', 'Bebidas'].map((c, i) => <span key={c} className={`rounded-full px-2.5 py-1 ${i === 0 ? 'bg-white text-black' : 'bg-white/10'}`}>{c}</span>)}</div>
      <div className="space-y-2 px-4 pt-3">
        {[['Búfala', '12,50', 'b13_pizza_bufala'], ['Detroit', '13,90', 'b14_pizza_detroit'], ['Trufa', '14,50', 'b15_pizza_trufa']].map(([n, p, f]) => (
          <div key={n} className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
            <div className="relative h-10 w-10 overflow-hidden rounded-lg"><Image src={`/images/demo/burger/${f}.jpeg`} alt="" fill sizes="40px" className="object-cover" /></div>
            <span className="flex-1 text-xs font-medium">{n}</span><span className="whitespace-nowrap text-xs font-semibold">{p} €</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6E0C2B] text-sm">+</span>
          </div>
        ))}
      </div>
      <div className="mt-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div key={fase} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.4, ease: CURVA }}
            className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: FLUJO[fase].c }}>
            {FLUJO[fase].t}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function MovilApp() {
  const quieto = useReducedMotion();
  const [fase, setFase] = useState(0);
  useEffect(() => { if (quieto) return; const t = setInterval(() => setFase((f) => (f + 1) % FLUJO.length), 2200); return () => clearInterval(t); }, [quieto]);
  return (
    <div className="relative mx-auto w-[270px]" style={{ perspective: 1600 }}>
      <div aria-hidden="true" className="absolute inset-[-20%] rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.3),transparent)] blur-2xl" />
      <motion.div initial={quieto ? false : { opacity: 0, rotateX: 24, y: 90, scale: 0.88 }} animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }} transition={{ duration: 1.2, delay: 0.2, ease: CURVA }}>
        <motion.div animate={quieto ? undefined : { y: [0, -12, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="rounded-[48px] p-[3px] shadow-[0_60px_120px_-20px_rgba(0,0,0,.7)] [background:linear-gradient(145deg,#6b707b,#1b1d22_35%,#0b0c0f_70%,#4a4e57)]">
            <div className="rounded-[45px] bg-[#0B0C0F] p-[10px]">
              <div className="relative aspect-[9/19.5] overflow-hidden rounded-[36px]">
                <PantallaApp fase={fase} />
                <div className="absolute left-1/2 top-2.5 h-[22px] w-[90px] -translate-x-1/2 rounded-full bg-black" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      <div className="mt-8 space-y-2">
        {FLUJO.map((f, i) => (
          <motion.div key={f.p} animate={{ opacity: i === fase ? 1 : 0.35, x: i === fase ? 0 : 6 }} transition={{ duration: 0.4 }}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white">
            <span className="h-2 w-2 rounded-full" style={{ background: f.c }} />
            <span className="text-xs"><span className="font-semibold">{f.t}</span> <span className="text-white/50">· {f.d}</span></span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Calculadora de comisiones */
export function CalculadoraComisiones() {
  const [pedidos, setPedidos] = useState(600);
  const [ticket, setTicket] = useState(25);
  const [comision, setComision] = useState(25);
  const mensual = Math.round(pedidos * ticket * (comision / 100));
  const anual = mensual * 12;
  const ahorro = Math.max(0, mensual - 69);
  const barra = 'mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#6E0C2B]';
  const fmt = (n: number) => n.toLocaleString('es-ES');
  return (
    <div className="grid gap-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur md:grid-cols-2 md:p-10">
      <div className="space-y-7">
        <label className="block"><span className="flex justify-between text-sm text-white/70"><span>Pedidos a domicilio al mes</span><span className="font-semibold text-white">{fmt(pedidos)}</span></span>
          <input type="range" min={50} max={3000} step={50} value={pedidos} onChange={(e) => setPedidos(+e.target.value)} className={barra} /></label>
        <label className="block"><span className="flex justify-between text-sm text-white/70"><span>Ticket medio</span><span className="font-semibold text-white">{ticket} €</span></span>
          <input type="range" min={10} max={80} value={ticket} onChange={(e) => setTicket(+e.target.value)} className={barra} /></label>
        <label className="block"><span className="flex justify-between text-sm text-white/70"><span>Comisión que te cobra la plataforma</span><span className="font-semibold text-white">{comision} %</span></span>
          <input type="range" min={5} max={40} value={comision} onChange={(e) => setComision(+e.target.value)} className={barra} /></label>
        <p className="text-xs text-white/40">Cálculo orientativo con tus propios datos. Revisa tu contrato para saber tu comisión real.</p>
      </div>
      <div className="flex flex-col justify-center rounded-[24px] bg-[#0B0C0F] p-6 md:p-8">
        <p className="text-sm text-white/60">Pagas en comisiones</p>
        <p className="font-display mt-1 whitespace-nowrap text-5xl font-semibold text-[#6E0C2B] md:text-6xl">{fmt(mensual)} €<span className="text-xl text-white/50">/mes</span></p>
        <p className="mt-1 text-sm text-white/50">{fmt(anual)} € al año</p>
        <div className="my-6 h-px bg-white/10" />
        <p className="text-sm text-white/60">Con DKitchen Signature</p>
        <p className="font-display mt-1 text-3xl font-semibold">69 €<span className="text-base text-white/50">/mes</span></p>
        {ahorro > 0 && <p className="mt-4 rounded-xl bg-[#2F8F6B]/15 px-4 py-3 text-sm text-[#7FD1AE]">Te quedarías con <strong className="text-white">{fmt(ahorro)} € más cada mes</strong> por los pedidos que te llegan por tu propia app.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Del pedido al cierre: capítulos fijados */
const CAPITULOS = [
  { n: '01', t: 'Tu cliente pide en tu app', d: 'Con tu marca, tus fotos y tus precios. En mesa, para recoger o a domicilio. Se instala en su móvil como una app más.' },
  { n: '02', t: 'La comanda llega a cocina', d: 'Sin papel ni gritos: la cocina ve cada pedido en su pantalla y lo marca cuando está listo. Si hay un pico, frenas la entrada con un botón.' },
  { n: '03', t: 'Cobras y cierras el día', d: 'El cobro entra sin comisión de plataforma por pedido y el cierre del día pasa al sistema fiscal que ya usas (Verifactu), conectado con tu TPV y tu gestoría.' },
  { n: '04', t: 'Tu cliente vuelve', d: 'Puntos, niveles y avisos a sus móviles. Los datos son tuyos: sabes quién repite y le invitas a volver.' },
];

function Pantalla({ n }: { n: number }) {
  if (n === 0) return <PantallaApp fase={0} />;
  if (n === 1) return (
    <div className="h-full bg-[#0F1012] p-4 text-white">
      <p className="text-xs text-white/50">Cocina</p><p className="font-display text-xl font-semibold">Comandas</p>
      {[['#231', 'Mesa 6', '2× Búfala · 1× Cola', 'En preparación', '#D99A1E'], ['#232', 'Recoger', '1× Trufa', 'Nuevo', '#6E0C2B'], ['#230', 'Domicilio', '3× Detroit', 'Listo', '#2F8F6B']].map(([id, d, it, e, c]) => (
        <div key={id} className="mt-3 rounded-xl border border-white/10 p-3">
          <div className="flex justify-between text-xs"><span className="font-semibold">{id} · {d}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-black" style={{ background: c }}>{e}</span></div>
          <p className="mt-1 text-xs text-white/60">{it}</p>
        </div>
      ))}
      <div className="mt-4 rounded-xl border border-[#6E0C2B]/50 px-3 py-2 text-center text-xs text-[#6E0C2B]">Pausar pedidos entrantes</div>
    </div>
  );
  if (n === 2) return (
    <div className="h-full bg-[#F7F5F2] p-4 text-[#17191E]">
      <p className="text-xs text-[#6B7079]">Cierre del día</p><p className="font-display text-xl font-semibold">Hoy</p>
      <div className="mt-3 rounded-xl bg-white p-3"><p className="text-[10px] text-[#6B7079]">Ventas</p><p className="font-display text-3xl font-semibold">1.842 €</p></div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white p-3"><p className="text-[#6B7079]">Pedidos</p><p className="font-semibold">74</p></div><div className="rounded-xl bg-white p-3"><p className="text-[#6B7079]">Comisiones</p><p className="font-semibold text-[#2F8F6B]">0 €</p></div></div>
      <div className="mt-3 rounded-xl bg-[#17191E] px-3 py-3 text-center text-xs font-semibold text-white">Enviado a tu sistema fiscal ✓</div>
    </div>
  );
  return (
    <div className="h-full bg-[#0F1012] p-4 text-white">
      <p className="text-xs text-white/50">Clientes</p><p className="font-display text-xl font-semibold">Alex M.</p>
      <div className="mt-3 rounded-2xl bg-gradient-to-br from-[#6E0C2B] to-[#C58B2A] p-4"><p className="text-[10px] uppercase tracking-[0.2em]">Nivel VIP</p><p className="font-display text-3xl font-semibold">1.240 pts</p></div>
      <p className="mt-4 text-xs text-white/60">Pedidos este mes: 6 · Último: ayer</p>
      <div className="mt-3 rounded-xl border border-white/10 p-3 text-xs">Aviso enviado: «Hoy, pizza trufa con un 10 %»</div>
    </div>
  );
}

export function CapitulosSignature() {
  const ref = useRef<HTMLElement>(null);
  const [c, setC] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setC(Math.min(3, Math.floor(v * 4))));
  const marco = (n: number) => (
    <div className="rounded-[46px] p-[3px] [background:linear-gradient(145deg,#6b707b,#1b1d22_35%,#0b0c0f_70%,#4a4e57)]"><div className="rounded-[43px] bg-[#0B0C0F] p-[9px]"><div className="relative aspect-[9/19.5] overflow-hidden rounded-[35px]"><Pantalla n={n} /></div></div></div>
  );
  return (
    <>
      <section ref={ref} className="relative hidden h-[400vh] bg-[#0A080C] text-white md:block">
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_300px_1fr] items-center gap-10 px-8">
            <div className={c % 2 === 0 ? '' : 'order-3'}>
              <AnimatePresence mode="wait">
                <motion.div key={c} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: CURVA }}>
                  <p className="font-display text-sm font-semibold text-[#6E0C2B]">{CAPITULOS[c].n} / 04</p>
                  <h3 className="font-display mt-3 text-5xl font-semibold leading-[1.02]">{CAPITULOS[c].t}</h3>
                  <p className="mt-5 text-lg text-white/60">{CAPITULOS[c].d}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="order-2">
              <AnimatePresence mode="wait"><motion.div key={c} initial={{ opacity: 0, scale: 0.95, rotateY: -12 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5, ease: CURVA }} style={{ transformPerspective: 1200 }}>{marco(c)}</motion.div></AnimatePresence>
              <div className="mt-6 flex justify-center gap-2">{CAPITULOS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === c ? 'w-8 bg-[#6E0C2B]' : 'w-3 bg-white/20'}`} />)}</div>
            </div>
            <div className={c % 2 === 0 ? 'order-3' : ''} />
          </div>
        </div>
      </section>
      <section className="bg-[#0A080C] px-6 py-20 text-white md:hidden">
        {CAPITULOS.map((x, i) => (
          <motion.div key={x.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, ease: CURVA }} className={i ? 'mt-16' : ''}>
            <p className="font-display text-sm font-semibold text-[#6E0C2B]">{x.n} / 04</p>
            <h3 className="font-display mt-2 text-3xl font-semibold leading-[1.05]">{x.t}</h3>
            <p className="mt-3 text-white/60">{x.d}</p>
            <div className="mx-auto mt-8 w-[240px]">{marco(i)}</div>
          </motion.div>
        ))}
      </section>
    </>
  );
}
