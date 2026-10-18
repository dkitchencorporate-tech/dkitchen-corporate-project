'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QR_MENU } from '@/lib/pricing-config';

/**
 * Intención de salida (29/09/2026): una sola vez por sesión, al sacar el ratón
 * por arriba en escritorio o tras 60 s sin actividad en móvil.
 * 18/10 (nota de karc0 en Mis tareas): en vez de «una propuesta gratis», el gancho
 * es «mándanos la foto de tu carta» → /carta-de-autor (la URL de la bio, reservada
 * para la campaña de anuncios desde el 26/10), con utm_source=salida para medirlo.
 */
export default function ExitIntent() {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    let mostrado = false;
    try { mostrado = sessionStorage.getItem('dk-salida') === '1'; } catch {}
    if (mostrado) return;
    let listo = false;
    const t = setTimeout(() => { listo = true; }, 8000);
    let inactivo: ReturnType<typeof setTimeout>;
    const mostrar = () => {
      if (!listo || mostrado || document.body.style.overflow === 'hidden') return;
      // Nunca en mitad de un pago ni en la propia página de la foto.
      if (location.pathname.startsWith('/pago') || location.pathname.startsWith('/carta-de-autor')) return;
      mostrado = true;
      try { sessionStorage.setItem('dk-salida', '1'); } catch {}
      setAbierto(true);
    };
    const salir = (e: MouseEvent) => { if (e.clientY <= 10) mostrar(); };
    const reiniciar = () => { clearTimeout(inactivo); inactivo = setTimeout(mostrar, 60000); };
    document.addEventListener('mouseleave', salir);
    window.addEventListener('scroll', reiniciar, { passive: true });
    window.addEventListener('touchstart', reiniciar, { passive: true });
    reiniciar();
    return () => { clearTimeout(t); clearTimeout(inactivo); document.removeEventListener('mouseleave', salir); window.removeEventListener('scroll', reiniciar); window.removeEventListener('touchstart', reiniciar); };
  }, []);
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto]);

  if (!abierto) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="salida-titulo" className="fixed inset-0 z-[9990] flex items-end justify-center bg-noche/60 p-3 backdrop-blur-sm sm:items-center" onClick={() => setAbierto(false)}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-noche p-7 text-white shadow-2xl sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-vino/50 blur-3xl" />
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="absolute right-4 top-4 h-9 w-9 rounded-full bg-white/10 text-lg">×</button>
        <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-oro">Antes de irte</p>
        <h2 id="salida-titulo" className="font-display relative mt-3 text-3xl font-semibold leading-[1.05]">Mándanos una foto de tu carta.</h2>
        <p className="relative mt-3 text-white/70">Te la dejamos funcionando en el móvil de tus clientes, con su QR para las mesas. El primer mes, {QR_MENU.primerMes} € + IVA.</p>
        <a href="/carta-de-autor?utm_source=salida&utm_medium=web&utm_campaign=foto-carta" className="relative mt-6 block rounded-full bg-vino py-4 text-center text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)]">Enviar la foto de mi carta →</a>
        <button type="button" onClick={() => setAbierto(false)} className="relative mt-3 w-full text-center text-sm text-white/55 underline underline-offset-4">Ahora no</button>
      </div>
    </div>,
    document.body,
  );
}
