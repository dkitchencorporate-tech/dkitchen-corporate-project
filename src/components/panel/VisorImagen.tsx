'use client';

import { useEffect, useState } from 'react';

/**
 * Visor ampliado (01/10/2026, petición de la clienta): ver la imagen en grande,
 * descargarla o eliminarla. Se cierra con Esc o tocando fuera.
 */
export default function VisorImagen({ url, titulo = 'Imagen', onCerrar, onEliminar }: {
  url: string; titulo?: string; onCerrar: () => void; onEliminar?: () => void;
}) {
  const [descargando, setDescargando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  async function descargar() {
    setDescargando(true);
    try {
      const r = await fetch(url);
      const b = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `${titulo.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}.${b.type.includes('png') ? 'png' : b.type.includes('webp') ? 'webp' : 'jpg'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch { window.open(url, '_blank', 'noopener'); }
    finally { setDescargando(false); }
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`${titulo} ampliada`} onClick={onCerrar}>
      <div className="flex items-center justify-between gap-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="truncate text-sm font-semibold">{titulo}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={descargar} disabled={descargando} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1B1D22] disabled:opacity-60">{descargando ? 'Descargando…' : '↓ Descargar'}</button>
          {onEliminar && (confirmar
            ? <><button onClick={() => { onEliminar(); onCerrar(); }} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">Sí, eliminar</button><button onClick={() => setConfirmar(false)} className="px-2 py-2 text-sm text-white/70">No</button></>
            : <button onClick={() => setConfirmar(true)} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white">Eliminar</button>)}
          <button onClick={onCerrar} aria-label="Cerrar" className="h-9 w-9 rounded-full text-2xl text-white/80 hover:bg-white/10">×</button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center pt-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={titulo} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
      </div>
    </div>
  );
}
