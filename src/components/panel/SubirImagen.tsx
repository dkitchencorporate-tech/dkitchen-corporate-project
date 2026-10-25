'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useRef, useState } from 'react';
import { comprimirImagen } from '@/lib/comprimir-imagen';
import GeneradorIa from './GeneradorIa';
import VisorImagen from './VisorImagen';
import { subirImagenAction } from '@/app/panel/actions';

/** Botón de subida con vista previa. Comprime en el navegador y devuelve la URL pública. */
export default function SubirImagen({
  valor,
  onCambio,
  etiqueta = 'Foto',
  redonda = false,
  formato,
  ia,
}: {
  valor: string | null;
  onCambio: (url: string | null) => void;
  etiqueta?: string;
  redonda?: boolean;
  /** «plato»: recorte 4:3 y luz automática (desactivable). */
  formato?: 'plato';
  /** Activa «Crear con IA» (0038). */
  ia?: { modo: 'plato' | 'banner' | 'portada' | 'logo'; plato?: { nombre?: string; descripcion?: string | null } };
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [generador, setGenerador] = useState(false);
  const [ver, setVer] = useState(false);

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
      setError(mensajeError(e, 'No se pudo subir la imagen.'));
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`h-20 w-20 shrink-0 overflow-hidden border border-linea bg-white flex items-center justify-center ${
          redonda ? 'rounded-full' : 'rounded-xl'
        }`}
      >
        {valor ? (
          <button type="button" onClick={() => setVer(true)} aria-label={`Ver ${etiqueta.toLowerCase()} en grande`} className="h-full w-full"><img src={valor} alt="" className="h-full w-full object-cover" /></button>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-ceniza">Sin {etiqueta.toLowerCase()}</span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={subiendo}
            onClick={() => entrada.current?.click()}
            className="rounded-lg bg-papel px-3 py-1.5 text-sm font-semibold hover:bg-linea disabled:opacity-50"
          >
            {subiendo ? 'Subiendo…' : valor ? `Cambiar ${etiqueta.toLowerCase()}` : `Subir ${etiqueta.toLowerCase()}`}
          </button>
          {ia && (
            <button type="button" disabled={subiendo} onClick={() => setGenerador(true)} className="rounded-lg bg-vino px-3 py-1.5 text-sm font-semibold text-white hover:bg-vino-hondo disabled:opacity-50">
              ✨ Crear con IA
            </button>
          )}
          {valor && !subiendo && (
            <button type="button" onClick={() => onCambio(null)} className="px-2 text-sm text-niebla hover:text-red-600">
              Quitar
            </button>
          )}
        </div>
        <p className="text-[11px] text-ceniza">JPG, PNG o WebP. Se optimiza automáticamente.</p>
        {formato === 'plato' && (
          <label className="flex items-center gap-1.5 text-[11px] text-niebla">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-3.5 w-3.5 accent-vino" />
            Encuadrar (4:3) y mejorar la luz automáticamente
          </label>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {ver && valor && <VisorImagen url={valor} titulo={etiqueta} onCerrar={() => setVer(false)} onEliminar={() => onCambio(null)} />}
      {generador && ia && (
        <GeneradorIa modo={ia.modo} plato={ia.plato} imagenActual={valor} onUsar={(url) => onCambio(url)} onCerrar={() => setGenerador(false)} />
      )}
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
