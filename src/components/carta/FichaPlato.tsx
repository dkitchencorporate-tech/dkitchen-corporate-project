'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { PlatoCarta } from '@/lib/menu';
import { EtiquetaPlato, PrecioAnterior, ComboPlato } from './ExtrasPlato';

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

  // Un banner puede abrir este plato directamente.
  useEffect(() => {
    const abrir = (e: Event) => { if ((e as CustomEvent).detail === plato.id) setAbierta(true); };
    window.addEventListener('dk:abrir-plato', abrir);
    return () => window.removeEventListener('dk:abrir-plato', abrir);
  }, [plato.id]);

  useEffect(() => {
    if (!abierta) return;
    const cerrarConEsc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false);
    document.addEventListener('keydown', cerrarConEsc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // El botón «atrás» del móvil cierra la ficha en lugar de sacar al cliente de la carta.
    history.pushState({ dkFicha: plato.id }, '');
    const atras = () => setAbierta(false);
    window.addEventListener('popstate', atras);
    return () => {
      document.removeEventListener('keydown', cerrarConEsc); document.body.style.overflow = overflow;
      window.removeEventListener('popstate', atras);
      if (history.state?.dkFicha === plato.id) history.back();
    };
  }, [abierta]);

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className={`block w-full text-left ${className ?? ''}`} aria-haspopup="dialog">
        {children}
      </button>
      {abierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md motion-safe:animate-[dkfondo_.25s_ease-out]" onClick={() => setAbierta(false)} role="presentation">
          <style>{'@keyframes dkfondo{from{opacity:0}}@keyframes dkficha{from{opacity:0;transform:translateY(24px) scale(.96)}}'}</style>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={plato.nombre}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[86vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,.7)] motion-safe:animate-[dkficha_.32s_cubic-bezier(.2,.8,.2,1)]"
          >
            <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-lg text-white backdrop-blur">✕</button>
            {plato.fotoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={plato.fotoUrl} alt={plato.nombre} className="aspect-[4/3] w-full object-cover" />
            )}
            {plato.fotoUrl?.includes('/ia/') && <p className="px-6 pt-2 text-[11px] text-black/45">Imagen orientativa, creada con IA.</p>}
            <div className="space-y-3 p-6 text-[#1a1a1a]">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold leading-tight first-letter:uppercase"><EtiquetaPlato plato={plato} />{plato.nombre}</h2>
                <span className="shrink-0 whitespace-nowrap text-lg font-bold tabular-nums" style={{ color: 'var(--marca)' }}>
                  <PrecioAnterior plato={plato} />{euros.format(Number(plato.precio))}
                </span>
              </div>
              <ComboPlato plato={plato} completo />
              {plato.descripcion && <p className="whitespace-pre-line leading-relaxed text-black/65 first-letter:uppercase">{plato.descripcion}</p>}
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
