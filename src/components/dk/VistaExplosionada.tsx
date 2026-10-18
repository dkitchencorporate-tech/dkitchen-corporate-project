'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import CartaDemo from '@/components/qr-landing/CartaDemo';
import GuiaScroll from './GuiaScroll';

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
  { id: 'idiomas', t: 'En su idioma', d: 'Hasta 3 idiomas según tu plan; más, a la carta.', x: 310, y: 230, xm: 112, ym: 205,
    contenido: <div className="flex gap-1.5">{['ES', 'EN', 'FR', 'DE'].map((l, i) => <span key={l} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${i === 1 ? 'bg-tinta text-white' : 'bg-papel'}`}>{l}</span>)}</div> },
];

function CapaFlotante({ c, p, movil, i }: { c: Capa; p: MotionValue<number>; movil: boolean; i: number }) {
  const ini = 0.12 + i * 0.03;
  const x = useTransform(p, [ini, ini + 0.26, 0.64, 0.76], [0, movil ? c.xm : c.x, movil ? c.xm : c.x, 0]);
  const y = useTransform(p, [ini, ini + 0.26, 0.64, 0.76], [0, movil ? c.ym : c.y, movil ? c.ym : c.y, 0]);
  const op = useTransform(p, [ini, ini + 0.12, 0.66, 0.74], [0, 1, 1, 0]);
  const esc = useTransform(p, [ini, ini + 0.26], [0.6, 1]);
  const rot = useTransform(p, [ini, ini + 0.26], [i % 2 ? 12 : -12, i % 2 ? 2 : -2]);
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
  // 18/10: la animación termina en el 82 % y el resto es reposo, para que el móvil se vea entero ANTES de soltar la sección (antes acababa a escala 1 justo al final y la sección siguiente lo cortaba)
  const escMovil = useTransform(p, [0, 0.12, 0.66, 0.8], movil ? [0.85, 0.5, 0.5, 0.78] : [1, 0.86, 0.86, 1]);
  const giro = useTransform(p, [0, 0.12], [18, 0]);
  const publicada = useTransform(p, [0.76, 0.84], [0, 1]);
  // 18/10 (2.ª vuelta, fotos de karc0): la escala sale de MEDIR el hueco real del escenario (no de fórmulas):
  // móvil + capas miden ~620 × 980 px a escala 1 en escritorio (560 × 370 en móvil). Así siempre cabe entero,
  // también al final, y en escritorio el título va a la izquierda para dejar todo el alto al móvil.
  const escenario = useRef<HTMLDivElement>(null);
  const [ajuste, setAjuste] = useState(1);
  useEffect(() => {
    const el = escenario.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      setAjuste(window.innerWidth < 768 ? Math.max(0.45, Math.min(1, h / 560, w / 370)) : Math.max(0.45, Math.min(1.3, h / 620, w / 980)));
    });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const [fase, setFase] = useState(0);
  useMotionValueEvent(p, 'change', (v) => setFase(v < 0.12 ? 0 : v < 0.7 ? 1 : 2));
  const titulos = ['Una carta, seis superpoderes.', 'Todo lo que lleva tu carta.', 'Y todo cabe en un QR.'];

  return (
    <section ref={ref} className="relative h-[280vh] bg-crema">
      <div className="sticky top-0 flex h-[100dvh] flex-col items-center overflow-hidden pb-14 pt-24 md:flex-row md:items-stretch md:pb-4 md:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(23,25,30,.07)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="relative z-30 px-6 text-center md:w-[34%] md:shrink-0 md:self-center md:pl-[5vw] md:pr-4 md:text-left">
          <p className="etiqueta-dk text-vino">Por dentro</p>
          <motion.h2 key={fase} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="font-display mt-3 text-3xl font-semibold leading-[1.05] text-tinta md:text-5xl">{titulos[fase]}</motion.h2>
          <p className="mt-4 hidden max-w-xs text-niebla md:block">{['Así la ven tus clientes al escanear el QR de la mesa.', 'Fotos, precios al momento, alérgenos, reservas, idiomas y un QR para siempre.', 'Lo cambias en tu móvil y ya está en todas las mesas.'][fase]}</p>
        </div>
        <GuiaScroll progreso={p} pasos={['Tu carta', 'Por dentro', 'Publicada']} cortes={[0.12, 0.7]} movil />
        <div ref={escenario} className="relative w-full flex-1 md:pr-20">
        <div className="absolute inset-0 flex items-center justify-center md:right-20" style={{ transform: `scale(${ajuste})` }}>
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
      </div>
    </section>
  );
}
