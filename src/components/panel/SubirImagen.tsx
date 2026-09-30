'use client';

import { useRef, useState } from 'react';
import { comprimirImagen } from '@/lib/comprimir-imagen';
import { subirImagenAction } from '@/app/panel/actions';

/** Botón de subida con vista previa. Comprime en el navegador y devuelve la URL pública. */
export default function SubirImagen({
  valor,
  onCambio,
  etiqueta = 'Foto',
  redonda = false,
  formato,
}: {
  valor: string | null;
  onCambio: (url: string | null) => void;
  etiqueta?: string;
  redonda?: boolean;
  /** «plato»: recorte 4:3 y luz automática (desactivable). */
  formato?: 'plato';
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try {
      const blob = await comprimirImagen(archivo, 1400, formato === 'plato' && auto ? { recorte: 4 / 3, mejorar: true } : {});
      const formulario = new FormData();
      formulario.append('archivo', new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
      const { url } = await subirImagenAction(formulario);
      onCambio(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`h-20 w-20 shrink-0 overflow-hidden border border-[#E6E6E2] bg-white flex items-center justify-center ${
          redonda ? 'rounded-full' : 'rounded-xl'
        }`}
      >
        {valor ? (
          <img src={valor} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-[#9A9EA6]">Sin {etiqueta.toLowerCase()}</span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={subiendo}
            onClick={() => entrada.current?.click()}
            className="rounded-lg bg-[#EDEDEA] px-3 py-1.5 text-sm font-semibold hover:bg-[#E5E5E1] disabled:opacity-50"
          >
            {subiendo ? 'Subiendo…' : valor ? `Cambiar ${etiqueta.toLowerCase()}` : `Subir ${etiqueta.toLowerCase()}`}
          </button>
          {valor && !subiendo && (
            <button type="button" onClick={() => onCambio(null)} className="px-2 text-sm text-[#6B7079] hover:text-red-600">
              Quitar
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#9A9EA6]">JPG, PNG o WebP. Se optimiza automáticamente.</p>
        {formato === 'plato' && (
          <label className="flex items-center gap-1.5 text-[11px] text-[#6B7079]">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-3.5 w-3.5 accent-[#6E0C2B]" />
            Encuadrar (4:3) y mejorar la luz automáticamente
          </label>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => alElegir(e.target.files?.[0])}
      />
    </div>
  );
}
