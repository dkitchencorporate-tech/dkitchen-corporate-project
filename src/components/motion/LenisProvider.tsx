'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Scroll con inercia (Parte 7, Sección 2.1) — la base de todo lo demás. Se
 * monta solo en el layout de `(marketing)`, nunca en el panel de
 * administración ni en el dashboard: ahí prima la velocidad de uso operativo
 * sobre la experiencia editorial (misma frontera que ya traza ese layout).
 */
export default function LenisProvider() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      // 18/10 (karc0: «el modal de Fundador no hace scroll, se mueve la página de atrás»): dentro de
      // cualquier diálogo o zona marcada, la rueda la gestiona el navegador y no Lenis.
      prevent: (nodo: HTMLElement) => !!nodo.closest?.('[role="dialog"], [data-lenis-prevent]'),
    });

    let frame: number;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
