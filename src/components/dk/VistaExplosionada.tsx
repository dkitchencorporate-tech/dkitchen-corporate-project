'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import CartaDemo from '@/components/qr-landing/CartaDemo';
import { useAjusteAlto } from './useAjusteAlto';

/**
 * Vista explosionada de la carta (29/09/2026, ref. «Camera» de Scrolltide,
 * hecha solo con HTML): al bajar, el móvil se desmonta en capas flotantes con
 * anotaciones finas; al final se vuelve a montar y queda «publicada».
 * Todo ligado al scroll (funciona igual con el dedo que con la rueda).
 */
type Capa = { id: string; t: string; d: string; x: number; y: number; xm: number; ym: number; contenido: React.ReactNode };

const CAPAS: Capa[] = [
  { id: 'foto', t: 'Fotos que venden', d: 'Cada plato con su foto, optimizada para cargar rápido.', x: -330, y: -170, xm: -112, ym: -205,
    contenido: <div className="relative h-14 w-full overflow-hidden rounded-xl md:h-24"><Image src="/images/demo/s9.png" alt="" fill sizes="200px" className="object-cover" /></div> },
  { id: 'precio', t: 'Precio al momento', d: 'Lo cambias en el móvil y está en todas las mesas.', x: 330, y: -190, xm: 112, ym: -205,
    contenido: <p className="font-display text-lg font-semibold md:text-2xl"><span className="text-ceniza line-through decoration-2">9,50</span> <span className="text-vino">9,90 €</span></p> },
  { id: 'alergenos', t: 'Alérgenos UE', d: 'Los 14 obligatorios, por plato y con aviso legal.', x: -360, y: 30, xm: -112, ym: 0,
    contenido: <div className="flex flex-wrap gap-1.5">{['Gluten', 'Pescado', 'Soja', 'Sésamo'].map((a) => <span key={a} className="rounded-full bg-papel px-2 py-1 text-[11px] font-medium">{a}</span>)}</div> },
  { id: 'qr', t: 'Un QR para siempre', d: 'Lo imprimes una vez. La carta cambia, el QR no.', x: 360, y: 20, xm: 112, ym: 0,
    contenido: <svg viewBox="0 0 21 21" className="h-11 w-11 md:h-16 md:w-16" shapeRendering="crispEdges" aria-hidden="true"><path fill="#17191E" d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0z" /><path fill="#fff" d="M1 1h5v5H1zM15 1h5v5h-5zM1 15h5v5H1z" /><path fill="#17191E" d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM9 0h2v2H9zM8 3h3v2H8zM9 8h3v3H9zM14 9h2v3h-2zM17 8h3v2h-3zM8 13h2v4H8zM12 14h3v2h-3zM16 13h2v2h-2zM13 17h2v3h-2zM17 17h3v3h-3zM3 9h3v2H3z" /><path fill="#6E0C2B" d="M11 11h2v2h-2z" /></svg> },
  { id: 'reservas', t: 'Reservas', d: 'Te avisan al momento y confirmas con un toque.', x: -300, y: 220, xm: -112, ym: 205,
    contenido: <div className="flex flex-wrap items-center justify-between gap-1 rounded-xl bg-papel px-2.5 py-2 text-xs md:text-sm"><span className="font-semibold">21:30 · 4 pers.</span><span className="rounded-full bg-exito/15 px-2 py-0.5 text-[11px] text-exito">Confirmada</span></div> },
  { id: 'idiomas', t: 'En su idioma', d: 'La traducimos nosotros a hasta 3 idiomas.', x: 310, y: 230, xm: 112, ym: 205,
    contenido: <div className="flex gap-1.5">{['ES', 'EN', 'FR', 'DE'].map((l, i) => <span key={l} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${i === 1 ? 'bg-tinta text-white' : 'bg-papel'}`}>{l}</span>)}</div> },
];

function CapaFlotante({ c, p, movil, i }: { c: Capa; p: MotionValue<number>; movil: boolean; i: number }) {
  const ini = 0.12 + i * 0.03;
  const x = useTransform(p, [ini, ini + 0.28, 0.78, 0.92], [0, movil ? c.xm : c.x, movil ? c.xm : c.x, 0]);
  const y = useTransform(p, [ini, ini + 0.28, 0.78, 0.92], [0, movil ? c.ym : c.y, movil ? c.ym : c.y, 0]);
  const op = useTransform(p, [ini, ini + 0.12, 0.8, 0.9], [0, 1, 1, 0]);
  const esc = useTransform(p, [ini, ini + 0.28], [0.6, 1]);
  const rot = useTransform(p, [ini, ini + 0.28], [i % 2 ? 12 : -12, i % 2 ? 2 : -2]);
  return (
    <motion.div style={{ x, y, opacity: op, scale: esc, rotate: rot }} className="pointer-events-none absolute left-1/2 top-1/2 z-20 -ml-[66px] -mt-[48px] w-[132px] md:-ml-[110px] md:-mt-[60px] md:w-[220px]">
      <div className="rounded-2xl border border-linea bg-white p-2.5 text-tinta shadow-[0_24px_60px_rgba(23,25,30,.18)] md:p-4">
        {c.contenido}
        <p className="mt-2 text-xs font-semibold md:mt-2.5 md:text-sm">{c.t}</p>
        <p className="mt-0.5 hidden text-xs leading-snug text-niebla md:block">{c.d}</p>
      </div>
    </motion.div>
  );
}

export default function VistaExplosionada() {
  const ref = useRef<HTMLElement>(null);
  const [movil, setMovil] = useState(false);
  useEffect(() => { const f = () => setMovil(window.innerWidth < 768); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const escMovil = useTransform(p, [0, 0.12, 0.8, 0.95], movil ? [0.85, 0.5, 0.5, 0.8] : [1, 0.82, 0.82, 1]);
  const giro = useTransform(p, [0, 0.12, 0.8, 0.95], [18, 0, 0, 0]);
  const publicada = useTransform(p, [0.9, 0.97], [0, 1]);
  const aviso = useTransform(p, [0, 0.03, 0.8, 0.86], [1, 1, 1, 0]);
  // 08/10: en portátiles de 14" (≈730 px útiles) el móvil y las capas se salían por abajo
  const ajuste = useAjusteAlto(600, 240);
  const [fase, setFase] = useState(0);
  useMotionValueEvent(p, 'change', (v) => setFase(v < 0.12 ? 0 : v < 0.8 ? 1 : 2));
  const titulos = ['Una carta, seis superpoderes.', 'Todo lo que lleva tu carta.', 'Y todo cabe en un QR.'];

  return (
    <section ref={ref} className="relative h-[280vh] bg-crema">
      <div className="sticky top-0 flex h-[100dvh] flex-col items-center overflow-hidden pt-24 md:pt-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(23,25,30,.07)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="relative z-30 px-6 text-center">
          <p className="etiqueta-dk text-vino">Por dentro</p>
          <motion.h2 key={fase} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="font-display mt-3 text-3xl font-semibold leading-[1.05] text-tinta md:text-5xl">{titulos[fase]}</motion.h2>
        </div>
        <motion.div style={{ opacity: aviso }} aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-1 text-niebla md:bottom-8">
          <span className="rounded-full border border-linea bg-white/90 px-4 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">Sigue bajando</span>
          <svg viewBox="0 0 24 24" className="h-6 w-6 animate-bounce text-vino" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
        </motion.div>
        <div className="relative flex w-full flex-1 items-center justify-center" style={{ transform: `scale(${ajuste})` }}>
          <motion.div style={{ scale: escMovil, rotateX: giro, transformPerspective: 1400 }} className="relative z-10 w-[230px] md:w-[270px]">
            <div className="rounded-[46px] p-[3px] shadow-[0_50px_100px_-20px_rgba(23,25,30,.45)] [background:linear-gradient(145deg,#6b707b,#1b1d22_35%,#0b0c0f_70%,#4a4e57)]">
              <div className="rounded-[43px] bg-obsidiana p-[9px]">
                <div className="relative aspect-[9/19.5] overflow-hidden rounded-[35px] bg-white">
                  <CartaDemo e={{ plantilla: 'clasica', fondo: 'blanco', letra: 'sans', color: '#E8592A' }} />
                  <div className="absolute left-1/2 top-2 h-[20px] w-[84px] -translate-x-1/2 rounded-full bg-black" />
                  <motion.div style={{ opacity: publicada }} className="absolute inset-x-4 bottom-4 rounded-2xl bg-tinta px-4 py-3 text-center text-sm font-semibold text-white">Publicada · ya en todas las mesas</motion.div>
                </div>
              </div>
            </div>
          </motion.div>
          {CAPAS.map((c, i) => <CapaFlotante key={c.id} c={c} p={p} movil={movil} i={i} />)}
        </div>
      </div>
    </section>
  );
}
