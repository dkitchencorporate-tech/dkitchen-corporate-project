'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Índice fijo de secciones de la carta (07/10/2026, karc0): marca en tiempo real la sección
 * que se está leyendo y desplaza la barra en horizontal para dejarla siempre a la vista.
 * Sin JavaScript sigue funcionando como lista de anclas.
 */
export type VarianteIndice = 'visual' | 'clasica' | 'editorial' | 'express' | 'autor';

const ENLACE: Record<VarianteIndice, { base: string; activo: string }> = {
  visual: {
    base: 'block rounded-full px-4 py-2 text-[13px] font-medium capitalize text-black/70 transition-colors hover:text-[var(--marca)]',
    activo: '!bg-[var(--marca)] !text-white shadow-sm',
  },
  clasica: {
    base: 'block rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-medium text-black/70 transition-colors hover:border-[var(--marca)] hover:text-[var(--marca)]',
    activo: '!border-[var(--marca)] !bg-[var(--marca)] !text-white',
  },
  editorial: {
    base: 'block rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-medium text-black/70 transition-colors hover:border-[var(--marca)] hover:text-[var(--marca)]',
    activo: '!border-[var(--marca)] !bg-[var(--marca)] !text-white',
  },
  express: {
    base: 'block rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black/60 transition-colors hover:text-[var(--marca)]',
    activo: '!bg-[var(--marca)] !text-white',
  },
  autor: {
    base: 'block border-b-2 border-transparent pb-1 text-[11px] font-medium uppercase tracking-[0.28em] text-[#221D17]/60 transition-colors hover:text-[var(--marca)]',
    activo: '!border-[var(--marca)] !text-[var(--marca)]',
  },
};

export default function IndiceSecciones({
  grupos, variante, ancho = 'max-w-2xl',
}: { grupos: { id: string; nombre: string }[]; variante: VarianteIndice; ancho?: string }) {
  const [activo, setActivo] = useState(grupos[0]?.id ?? '');
  const nav = useRef<HTMLElement>(null);
  const lista = useRef<HTMLUListElement>(null);

  // Sección activa: la última cuyo título ya ha pasado por debajo del índice.
  useEffect(() => {
    let pendiente = 0;
    const calcular = () => {
      pendiente = 0;
      const limite = (nav.current?.getBoundingClientRect().bottom ?? 0) + 48;
      let actual = grupos[0]?.id ?? '';
      for (const g of grupos) {
        const el = document.getElementById(`s-${g.id}`);
        if (el && el.getBoundingClientRect().top <= limite) actual = g.id;
      }
      // Al llegar al final de la página, la última sección (aunque sea corta).
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) actual = grupos[grupos.length - 1]?.id ?? actual;
      setActivo(actual);
    };
    const alDesplazar = () => { if (!pendiente) pendiente = requestAnimationFrame(calcular); };
    calcular();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    window.addEventListener('resize', alDesplazar);
    return () => { window.removeEventListener('scroll', alDesplazar); window.removeEventListener('resize', alDesplazar); if (pendiente) cancelAnimationFrame(pendiente); };
  }, [grupos]);

  // Lleva la pestaña activa al centro de la barra (solo se mueve la barra, no la página).
  useEffect(() => {
    const ul = lista.current;
    const a = ul?.querySelector<HTMLElement>(`[data-seccion="${CSS.escape(activo)}"]`);
    if (!ul || !a) return;
    const destino = a.offsetLeft - ul.clientWidth / 2 + a.offsetWidth / 2;
    ul.scrollTo({ left: Math.max(0, destino), behavior: 'smooth' });
  }, [activo]);

  const estilo = ENLACE[variante];
  const pastilla = variante === 'visual';
  const desvanecer = '[mask-image:linear-gradient(to_right,transparent,#000_20px,#000_calc(100%-20px),transparent)]';

  return (
    <nav
      ref={nav}
      aria-label="Secciones de la carta"
      className={
        pastilla
          ? 'sticky top-0 z-10 px-4 pt-3 pb-1'
          : variante === 'autor'
          ? 'sticky top-0 z-20 border-b border-[#221D17]/10 bg-[#F7F3EA]/95 backdrop-blur'
          : 'sticky top-0 z-10 mt-4 border-y border-black/10 bg-white/95 backdrop-blur'
      }
    >
      <div className={pastilla ? `mx-auto w-fit max-w-full overflow-hidden rounded-full bg-white/85 shadow-[0_10px_30px_-12px_rgba(0,0,0,.3)] ring-1 ring-black/10 backdrop-blur-md` : ''}>
        <ul
          ref={lista}
          className={`indice-carta mx-auto flex overflow-x-auto ${desvanecer} ${
            pastilla ? 'gap-1 px-4 py-1.5' : variante === 'autor' ? "max-w-3xl gap-6 px-6 py-3.5" : `gap-2 px-5 py-3 ${ancho}`
          }`}
        >
          {grupos.map((g) => (
            <li key={g.id} className="shrink-0">
              <a
                href={`#s-${g.id}`}
                data-seccion={g.id}
                aria-current={activo === g.id ? 'location' : undefined}
                className={`${estilo.base} ${activo === g.id ? estilo.activo : ''}`}
              >
                {g.nombre}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
