'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Kit de movimiento DKitchen (29/09/2026). Todo en CSS/Motion, sin vídeos ni
 * WebGL: carga rápido en móvil y respeta «reducir movimiento».
 */
export const CURVA = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Fondo vivo: manchas de luz que se desplazan despacio sobre grafito (sin tonos marrones). */
export function FondoVivo({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -left-[20%] -top-[30%] h-[80vmax] w-[80vmax] rounded-full opacity-60 blur-[90px] [background:radial-gradient(closest-side,rgba(232,89,42,.55),transparent)] animate-[deriva1_22s_ease-in-out_infinite_alternate]" />
      <div className="absolute -right-[25%] top-[10%] h-[70vmax] w-[70vmax] rounded-full opacity-50 blur-[100px] [background:radial-gradient(closest-side,rgba(59,110,165,.55),transparent)] animate-[deriva2_26s_ease-in-out_infinite_alternate]" />
      <div className="absolute bottom-[-40%] left-[30%] h-[60vmax] w-[60vmax] rounded-full opacity-30 blur-[100px] [background:radial-gradient(closest-side,rgba(47,143,107,.5),transparent)] animate-[deriva3_30s_ease-in-out_infinite_alternate]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />
    </div>
  );
}

/** Cinta infinita de mensajes. */
export function Marquesina({ items, oscura = false }: { items: string[]; oscura?: boolean }) {
  const fila = [...items, ...items];
  return (
    <div className={`relative overflow-hidden border-y py-5 ${oscura ? 'border-white/10 bg-[#111317] text-white' : 'border-[#E6E6E2] bg-white text-[#17191E]'}`}>
      <div className="flex w-max animate-[marquesina_38s_linear_infinite] gap-10 whitespace-nowrap">
        {fila.map((t, i) => (
          <span key={i} className="font-display flex items-center gap-10 text-2xl font-semibold md:text-3xl">
            {t}<span className="h-2 w-2 rounded-full bg-[#E8592A]" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Número que cuenta hacia arriba al entrar en pantalla. */
export function Contador({ hasta, prefijo = '', sufijo = '', decimales = 0 }: { hasta: number; prefijo?: string; sufijo?: string; decimales?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true, amount: 0.6 });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!visto) return;
    const c = animate(0, hasta, { duration: 1.6, ease: CURVA, onUpdate: setV });
    return () => c.stop();
  }, [visto, hasta]);
  return <span ref={ref} className="tabular-nums">{prefijo}{v.toLocaleString('es-ES', { maximumFractionDigits: decimales, minimumFractionDigits: decimales })}{sufijo}</span>;
}

/** Título que se revela palabra a palabra al entrar en pantalla. */
export function TextoRevelado({ texto, className, como: Etiqueta = 'h2' }: { texto: string; className?: string; como?: 'h1' | 'h2' | 'h3' | 'p' }) {
  const quieto = useReducedMotion();
  return (
    <Etiqueta className={className}>
      {texto.split(' ').map((p, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-top">
          <motion.span className="inline-block" initial={quieto ? false : { y: '105%', opacity: 0 }} whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.8, delay: i * 0.045, ease: CURVA }}>{p}&nbsp;</motion.span>
        </span>
      ))}
    </Etiqueta>
  );
}

/** Botón que se deja atraer por el puntero (solo con ratón). */
export function BotonMagnetico({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 }), sy = useSpring(y, { stiffness: 250, damping: 18 });
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <motion.span style={{ x: sx, y: sy }} className="inline-block">
      <Link ref={ref} href={href} className={className}
        onPointerMove={(e) => { if (e.pointerType !== 'mouse' || !ref.current) return; const r = ref.current.getBoundingClientRect(); x.set((e.clientX - r.left - r.width / 2) * 0.25); y.set((e.clientY - r.top - r.height / 2) * 0.35); }}
        onPointerLeave={() => { x.set(0); y.set(0); }}>
        {children}
      </Link>
    </motion.span>
  );
}

/** Tarjeta que se inclina con el puntero. */
export function TarjetaTilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 }), sry = useSpring(ry, { stiffness: 200, damping: 20 });
  return (
    <motion.div className={className} style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      onPointerMove={(e) => { if (e.pointerType !== 'mouse') return; const r = e.currentTarget.getBoundingClientRect(); ry.set(((e.clientX - r.left) / r.width - 0.5) * 8); rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8); }}
      onPointerLeave={() => { rx.set(0); ry.set(0); }}>
      {children}
    </motion.div>
  );
}
