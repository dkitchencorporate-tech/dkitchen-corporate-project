'use client';

import Link from 'next/link';

/**
 * Barra de salida para páginas sin camino de vuelta (18/10/2026, karc0: «nada
 * puede quedar como un callejón»). Fija abajo: «Volver» a la página de la que
 * se viene (o a la portada si se entró directo) y las dos salidas de venta.
 */
export default function BarraSalida() {
  const volver = () => {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) window.history.back();
    else window.location.href = '/';
  };
  return (
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-20 print:hidden">
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-noche/90 p-1.5 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(23,25,30,.35)] backdrop-blur">
        <button type="button" onClick={volver} className="rounded-full px-4 py-2.5 hover:bg-white/10">← Volver</button>
        <Link href="/precios" className="hidden rounded-full px-4 py-2.5 hover:bg-white/10 sm:block">Precios</Link>
        <Link href="/qr#planes" className="whitespace-nowrap rounded-full bg-vino px-4 py-2.5 hover:bg-vino-hondo">Empieza por 1 €</Link>
      </div>
    </div>
  );
}
