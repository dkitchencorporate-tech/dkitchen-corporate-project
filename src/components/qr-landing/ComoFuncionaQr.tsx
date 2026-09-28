'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import CartaMini from './CartaMini';

/**
 * Cómo funciona: 3 pasos fijados al hacer scroll. La pantalla de la derecha
 * cambia con cada paso y enseña la interfaz REAL (alta, panel, carta).
 */
const PASOS = [
  { n: '01', t: 'Te das de alta en 2 minutos', d: 'Eliges plan, pagas 1 € y entras en tu panel. Sin instalaciones ni llamadas comerciales.' },
  { n: '02', t: 'Subes tu carta y eliges su estilo', d: 'Platos, precios, fotos y alérgenos desde el móvil. Cuatro estilos, fondos y colores para que sea tuya.' },
  { n: '03', t: 'Imprimes tu QR una sola vez', d: 'Tus clientes escanean y ven la carta al momento. Cambias lo que quieras y el QR sigue valiendo para siempre.' },
];
const CURVA = [0.22, 1, 0.36, 1] as [number, number, number, number];

function PantallaAlta() {
  return (
    <div className="flex h-full flex-col bg-[#FBF8F3] p-6 text-[#1A1714]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8592A]">QR Menú · Plan Ampliado</p>
      <p className="font-display mt-2 text-2xl font-semibold">Activa tu carta</p>
      <div className="mt-4 flex items-baseline justify-between rounded-2xl border border-[#E7E1D8] bg-white px-4 py-3">
        <span className="text-sm font-semibold">Primer mes</span><span className="font-display text-2xl font-semibold">1 €</span>
      </div>
      {['Nombre del restaurante', 'Tu nombre', 'Tu correo'].map((c, i) => (
        <div key={c} className="mt-3">
          <p className="text-xs font-medium">{c}</p>
          <div className="mt-1 h-10 rounded-xl border border-[#E7E1D8] bg-white px-3 py-2.5 text-sm text-[#1A1714]/70">{['Casa Brasa', 'Laura', 'laura@casabrasa.es'][i]}</div>
        </div>
      ))}
      <div className="mt-auto rounded-full bg-[#17191E] py-3.5 text-center text-sm font-semibold text-white">Continuar al pago seguro</div>
    </div>
  );
}

function PantallaPanel() {
  const platos: [string, string, boolean][] = [['Croquetas de jamón', '9,50', true], ['Arroz meloso', '18', true], ['Presa ibérica', '19,50', false]];
  return (
    <div className="flex h-full flex-col bg-[#F7F7F5] p-5 text-[#1B1D22]">
      <p className="text-xs text-[#6B7079]">Buenas tardes</p>
      <p className="font-display text-xl font-semibold">Casa Brasa</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-[#E6E6E2] bg-white p-3"><p className="text-[10px] text-[#6B7079]">Escaneos</p><p className="font-display text-2xl font-semibold">1.284</p></div>
        <div className="rounded-2xl bg-[#E8592A] p-3 text-white"><p className="text-[10px] text-white/80">Estilo</p><p className="text-sm font-semibold">Editorial · papel</p></div>
      </div>
      <p className="mt-4 text-xs font-semibold">Mi carta</p>
      <div className="mt-2 space-y-2">
        {platos.map(([n, pr, foto]) => (
          <div key={n} className="flex items-center gap-3 rounded-xl border border-[#E6E6E2] bg-white p-2.5">
            <div className={`h-9 w-9 rounded-lg ${foto ? 'bg-[linear-gradient(135deg,#E8592A55,#C58B2A44)]' : 'border border-dashed border-[#D6D6D1]'}`} />
            <span className="flex-1 text-sm">{n}</span><span className="text-sm font-semibold tabular-nums">{pr} €</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex gap-2 text-[10px]">{['Gluten', 'Lácteos', 'Huevos'].map((a) => <span key={a} className="rounded-full bg-white px-2 py-1 text-[#6B7079]">{a}</span>)}</div>
    </div>
  );
}

export default function ComoFuncionaQr() {
  const ref = useRef<HTMLElement>(null);
  const [paso, setPaso] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setPaso(v < 0.34 ? 0 : v < 0.67 ? 1 : 2));

  return (
    <section id="como-funciona" ref={ref} className="relative bg-white md:h-[300vh]">
      <div className="md:sticky md:top-0 md:flex md:h-screen md:items-center">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1fr_340px] md:px-8 md:py-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8592A]">Cómo funciona</p>
            <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.02] text-[#17191E] md:text-6xl">De cero a tu carta en las mesas, hoy.</h2>
            <ol className="mt-10 space-y-2">
              {PASOS.map((s, i) => (
                <li key={s.n} className={`rounded-3xl border p-5 transition-all duration-500 md:p-6 ${paso === i ? 'border-[#17191E] bg-[#F7F7F5]' : 'border-transparent md:opacity-40'}`}>
                  <div className="flex gap-5">
                    <span className="font-display text-sm font-semibold text-[#E8592A]">{s.n}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-[#17191E]">{s.t}</h3>
                      <p className="mt-2 text-[#6B7079]">{s.d}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="mx-auto w-[300px] md:w-[340px]">
            <div className="rounded-[46px] bg-[#17191E] p-3 shadow-[0_40px_100px_rgba(23,25,30,.3)]">
              <div className="relative aspect-[9/18] overflow-hidden rounded-[36px]">
                <AnimatePresence mode="wait">
                  <motion.div key={paso} className="absolute inset-0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.45, ease: CURVA }}>
                    {paso === 0 ? <PantallaAlta /> : paso === 1 ? <PantallaPanel /> : <CartaMini e={{ plantilla: 'editorial', fondo: 'papel', letra: 'serif', color: '#E8592A' }} desplazar />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-[#9A9EA6]">{['Alta y pago seguro', 'Tu panel', 'Lo que ve tu cliente'][paso]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
