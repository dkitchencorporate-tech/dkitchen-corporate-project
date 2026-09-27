'use client';

import { useEffect, useState } from 'react';
import type { PromocionVigente } from '@/lib/menu';

/**
 * Tarjeta flotante con la promoción vigente. Aparece al abrir la carta, se
 * cierra con un toque y no vuelve a salir en esa visita (sessionStorage).
 * El botón lleva a la sección elegida por el hostelero.
 */
export default function BannerPromocion({ promo, color }: { promo: PromocionVigente; color: string }) {
  const [visible, setVisible] = useState(false);
  const clave = `dk-promo-${promo.id}`;

  useEffect(() => {
    let cerrada = false;
    try { cerrada = sessionStorage.getItem(clave) === '1'; } catch { /* modo privado */ }
    if (cerrada) return;
    const t = setTimeout(() => setVisible(true), 600);
    fetch('/api/promocion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: promo.id, tipo: 'vista' }), keepalive: true }).catch(() => {});
    return () => clearTimeout(t);
  }, [clave, promo.id]);

  function cerrar() {
    setVisible(false);
    try { sessionStorage.setItem(clave, '1'); } catch { /* modo privado */ }
  }

  function pulsarBoton() {
    fetch('/api/promocion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: promo.id, tipo: 'clic' }), keepalive: true }).catch(() => {});
    cerrar();
    if (promo.botonSeccion) document.getElementById(`s-${promo.botonSeccion}`)?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={cerrar} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-titulo"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <button onClick={cerrar} aria-label="Cerrar promoción" className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white">
          ✕
        </button>
        {promo.imagenUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={promo.imagenUrl} alt="" className="h-44 w-full object-cover" />
        )}
        <div className="space-y-2 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color }}>Hoy en la casa</p>
          <h2 id="promo-titulo" className="text-xl font-semibold leading-tight text-[#1a1a1a]">{promo.titulo}</h2>
          {promo.texto && <p className="text-sm leading-relaxed text-black/60">{promo.texto}</p>}
          <button onClick={pulsarBoton} className="mt-2 w-full rounded-xl py-3 text-sm font-bold text-white" style={{ backgroundColor: color }}>
            {promo.botonTexto || 'Ver la carta'}
          </button>
        </div>
      </div>
    </div>
  );
}
