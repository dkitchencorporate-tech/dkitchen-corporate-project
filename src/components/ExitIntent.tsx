'use client';

import { useEffect } from 'react';
import { abrirSolicitud } from './Solicitud';

/**
 * Intención de salida (29/09/2026): una sola vez por sesión, al sacar el ratón
 * por arriba en escritorio o tras 60 s sin actividad en móvil, ofrece una
 * propuesta gratuita con el formulario común (sin WhatsApp ni promesas infladas).
 */
export default function ExitIntent() {
  useEffect(() => {
    let mostrado = false;
    try { mostrado = sessionStorage.getItem('dk-salida') === '1'; } catch {}
    if (mostrado) return;
    let listo = false;
    const t = setTimeout(() => { listo = true; }, 8000);
    let inactivo: ReturnType<typeof setTimeout>;
    const mostrar = () => {
      if (!listo || mostrado || document.body.style.overflow === 'hidden') return;
      // Nunca en mitad de un pago: mientras se teclea la tarjeta (iframe de Stripe) la página parece inactiva.
      if (location.pathname.startsWith('/pago')) return;
      mostrado = true;
      try { sessionStorage.setItem('dk-salida', '1'); } catch {}
      abrirSolicitud('propuesta');
    };
    const salir = (e: MouseEvent) => { if (e.clientY <= 10) mostrar(); };
    const reiniciar = () => { clearTimeout(inactivo); inactivo = setTimeout(mostrar, 60000); };
    document.addEventListener('mouseleave', salir);
    window.addEventListener('scroll', reiniciar, { passive: true });
    window.addEventListener('touchstart', reiniciar, { passive: true });
    reiniciar();
    return () => { clearTimeout(t); clearTimeout(inactivo); document.removeEventListener('mouseleave', salir); window.removeEventListener('scroll', reiniciar); window.removeEventListener('touchstart', reiniciar); };
  }, []);
  return null;
}
