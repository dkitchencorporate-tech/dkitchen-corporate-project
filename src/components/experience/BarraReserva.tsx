'use client';

import { useEffect, useState } from 'react';

/**
 * Barra fija inferior, solo en móvil, de las landings de Experience (revisión
 * de diseño del 06/10/2026): aparece al dejar atrás el hero y se oculta cuando
 * el configurador (#configurar) está en pantalla o al llegar al cierre.
 */
export default function BarraReserva({ precio }: { precio: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const configurador = document.getElementById('configurar');
    let pasadoHero = false;
    let enConfigurador = false;
    const actualizar = () => setVisible(pasadoHero && !enConfigurador);
    // Visible entre el hero y el cierre: al final de la página ya está el botón del cierre y no tapa el pie.
    const alScroll = () => {
      const alFinal = window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 900;
      pasadoHero = window.scrollY > window.innerHeight * 0.8 && !alFinal; actualizar();
    };
    const obs = configurador ? new IntersectionObserver(([e]) => { enConfigurador = e.isIntersecting; actualizar(); }, { threshold: 0.05 }) : null;
    if (configurador && obs) obs.observe(configurador);
    window.addEventListener('scroll', alScroll, { passive: true });
    alScroll();
    return () => { window.removeEventListener('scroll', alScroll); obs?.disconnect(); };
  }, []);

  return (
    <div aria-hidden={!visible} className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A080C]/95 pl-4 pr-20 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur transition-transform duration-300 md:hidden ${visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}>
      <a href="#configurar" tabIndex={visible ? 0 : -1} className="flex min-h-12 items-center justify-center rounded-full bg-[#6E0C2B] px-6 text-sm font-semibold text-white">
        Configurar mi evento · desde {precio} € + IVA
      </a>
    </div>
  );
}
