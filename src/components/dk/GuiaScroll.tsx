'use client';

import { useState } from 'react';
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion';

/**
 * Guía de las secciones fijadas al scroll (18/10/2026, karc0: «que se vea en
 * qué punto del scroll estás y que hay que seguir bajando»). Escritorio: riel
 * vertical a la derecha con un punto por paso, el paso activo con su nombre y
 * «Desliza» con la ruedecita del ratón; al llegar al final cambia a «Sigue».
 * Móvil (solo si `movil`): barra fina abajo, entre los botones flotantes. No tapa nada:
 * va en el margen, fuera del contenido.
 */
export default function GuiaScroll({ progreso, pasos, cortes, oscuro = false, movil = false }: { progreso: MotionValue<number>; pasos: string[]; /** dónde empieza cada paso a partir del 2.º (0–1); por defecto, tramos iguales */ cortes?: number[]; oscuro?: boolean; movil?: boolean }) {
  const n = pasos.length;
  const c = cortes ?? Array.from({ length: n - 1 }, (_, i) => (i + 1) / n);
  const [activo, setActivo] = useState(0);
  const [final, setFinal] = useState(false);
  useMotionValueEvent(progreso, 'change', (v) => {
    setActivo(c.filter((x) => v >= x).length);
    setFinal(v > 0.9);
  });
  // el relleno llega a cada punto justo cuando empieza su paso
  const relleno = useTransform(progreso, [0, ...c, 1], n > 1 ? [0, ...c.map((_, i) => (i + 1) / (n - 1)), 1] : [0, 1]);
  const texto = oscuro ? 'text-white/70' : 'text-niebla';
  const pista = oscuro ? 'bg-white/15' : 'bg-linea-fuerte';
  const punto = oscuro ? 'border-white/30 bg-noche' : 'border-linea-fuerte bg-white';

  return (
    <>
      <div aria-hidden="true" className={`pointer-events-none absolute right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-4 lg:right-8 md:flex`}>
        <div className="relative flex h-56 w-3 justify-center">
          <span className={`absolute inset-y-0 w-[2px] rounded-full ${pista}`} />
          <motion.span style={{ scaleY: relleno }} className="absolute inset-y-0 w-[2px] origin-top rounded-full bg-vino" />
          {pasos.map((p, i) => {
            const top = pasos.length === 1 ? 50 : (i / (pasos.length - 1)) * 100;
            const hecho = i <= activo;
            return (
              <span key={p} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: `${top}%` }}>
                <span className={`block h-3 w-3 rounded-full border-2 transition-colors duration-300 ${hecho ? 'border-vino bg-vino' : punto}`} />
                <span className={`absolute right-6 top-1/2 hidden -translate-y-1/2 whitespace-nowrap text-xs font-semibold transition-all 2xl:block duration-300 ${i === activo ? `opacity-100 ${oscuro ? 'text-white' : 'text-tinta'}` : `opacity-0 ${texto}`}`}>
                  <span className="text-vino">{String(i + 1).padStart(2, '0')}</span> · {p}
                </span>
              </span>
            );
          })}
        </div>
        <span className={`font-display text-xs font-semibold 2xl:hidden ${oscuro ? 'text-white' : 'text-tinta'}`}><span className="text-vino">{String(activo + 1).padStart(2, '0')}</span>/{String(n).padStart(2, '0')}</span>
        <div className={`flex flex-col items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${texto}`}>
          {final ? (
            <>
              <svg viewBox="0 0 24 24" className="h-5 w-5 animate-bounce text-vino" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
              <span>Sigue</span>
            </>
          ) : (
            <>
              <span className={`flex h-8 w-5 justify-center rounded-full border-2 pt-1.5 ${oscuro ? 'border-white/40' : 'border-ceniza'}`}><span className="h-1.5 w-1 animate-[rueda_1.6s_ease-in-out_infinite] rounded-full bg-vino" /></span>
              <span>Desliza</span>
            </>
          )}
        </div>
      </div>
      {movil && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[92px] bottom-8 z-40 md:hidden">
          <div className={`flex items-center justify-between text-[11px] font-semibold ${texto}`}>
            <span>Paso {activo + 1} de {n}</span>
            <span className="flex items-center gap-1">{final ? 'Sigue' : 'Desliza'}<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-bounce text-vino" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg></span>
          </div>
          <div className={`mt-1.5 h-1 overflow-hidden rounded-full ${pista}`}><motion.div style={{ scaleX: relleno }} className="h-full origin-left rounded-full bg-vino" /></div>
        </div>
      )}
    </>
  );
}
