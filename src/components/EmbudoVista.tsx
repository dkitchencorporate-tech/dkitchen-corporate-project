'use client';

import { useEffect } from 'react';

/**
 * Embudo (0032) fuera de /pagar: anota la visita y la salida sin pagar de una
 * página de alta (/qr, /fundador). El formulario anota «interés» al abrirse y
 * «checkout» al ir al pago (ActivarPlanBoton). Anónimo: solo un id de sesión.
 */
export function sesionEmbudo(): string {
  try {
    let s = sessionStorage.getItem('dk-embudo');
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('dk-embudo', s); }
    return s;
  } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

export function anotarEmbudo(producto: string, evento: 'vista' | 'interes' | 'checkout' | 'salida', segundos?: number) {
  const cuerpo = JSON.stringify({ producto, evento, sesion: sesionEmbudo(), segundos });
  try {
    if (evento === 'salida' && navigator.sendBeacon) { navigator.sendBeacon('/api/embudo', new Blob([cuerpo], { type: 'application/json' })); return; }
    fetch('/api/embudo', { method: 'POST', body: cuerpo, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  } catch {}
}

export default function EmbudoVista({ producto }: { producto: string }) {
  useEffect(() => {
    const inicio = Date.now();
    anotarEmbudo(producto, 'vista');
    const salir = () => {
      try { if (sessionStorage.getItem('dk-embudo-pago') === producto) return; } catch {}
      anotarEmbudo(producto, 'salida', (Date.now() - inicio) / 1000);
    };
    window.addEventListener('pagehide', salir);
    return () => window.removeEventListener('pagehide', salir);
  }, [producto]);
  return null;
}
