'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { PlatoCarta } from '@/lib/menu';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/**
 * La carta es solo para mirar: tocar un plato abre su ficha con la foto grande
 * y la descripción completa. No hay carrito ni pedidos (eso es el Núcleo
 * Operativo, no el QR).
 */
export default function FichaPlato({
  plato, nombresAlergenos, children, className,
}: { plato: PlatoCarta; nombresAlergenos: Record<string, string>; children: ReactNode; className?: string }) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!abierta) return;
    const cerrarConEsc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false);
    document.addEventListener('keydown', cerrarConEsc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', cerrarConEsc); document.body.style.overflow = overflow; };
  }, [abierta]);

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className={`block w-full text-left ${className ?? ''}`} aria-haspopup="dialog">
        {children}
      </button>
      {abierta && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setAbierta(false)} role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={plato.nombre}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl"
          >
            {plato.fotoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={plato.fotoUrl} alt={plato.nombre} className="aspect-[4/3] w-full object-cover" />
            )}
            <div className="space-y-3 p-6 text-[#1a1a1a]">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold leading-tight">{plato.nombre}</h2>
                <span className="shrink-0 whitespace-nowrap text-lg font-bold tabular-nums" style={{ color: 'var(--marca)' }}>
                  {euros.format(Number(plato.precio))}
                </span>
              </div>
              {plato.descripcion && <p className="whitespace-pre-line leading-relaxed text-black/65">{plato.descripcion}</p>}
              {plato.alergenos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-black/40">Alérgenos</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {plato.alergenos.map((a) => (
                      <li key={a} className="rounded-full border border-black/10 px-2.5 py-1 text-xs text-black/60">{nombresAlergenos[a] ?? a}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={() => setAbierta(false)} className="mt-2 w-full rounded-xl border border-black/10 py-3 text-sm font-semibold">
                Volver a la carta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
