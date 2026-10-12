'use client';

import { useEffect } from 'react';

/** Cuenta los clics de la botonera cuando se llegó por un QR de campaña (0071). Nunca frena la navegación. */
export default function RastreoClics({ codigo }: { codigo: string | null }) {
  useEffect(() => {
    if (!codigo) return;
    const alClic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a[data-rastreo]');
      if (!a) return;
      const cuerpo = JSON.stringify({ codigo, detalle: a.getAttribute('data-rastreo') ?? '' });
      try {
        navigator.sendBeacon('/api/qr/evento', new Blob([cuerpo], { type: 'application/json' }));
      } catch {
        /* sin seguimiento, sin problema */
      }
    };
    document.addEventListener('click', alClic, true);
    return () => document.removeEventListener('click', alClic, true);
  }, [codigo]);
  return null;
}
