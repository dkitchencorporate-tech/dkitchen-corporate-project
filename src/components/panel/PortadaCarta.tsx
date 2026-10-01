'use client';

import { useState } from 'react';
import SubirImagen from './SubirImagen';
import { guardarPortadaAction } from '@/app/panel/actions';

/**
 * Foto de portada (0043, feedback de la probadora): la cabecera de la carta
 * (estilo Visual y Carta de Autor) usaba la primera foto de un plato sin que el
 * cliente supiera de dónde salía ni cómo cambiarla.
 */
export default function PortadaCarta({ inicial, conNombreInicial = false, demo = false }: { inicial: string | null; conNombreInicial?: boolean; demo?: boolean }) {
  const [url, setUrl] = useState<string | null>(inicial);
  const [conNombre, setConNombre] = useState(conNombreInicial);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function cambiar(nueva: string | null, nombre = conNombre) {
    setUrl(nueva);
    setConNombre(nombre);
    if (demo) { setAviso({ ok: true, texto: 'En tu panel real, la portada se guardaría al momento.' }); return; }
    const r = await guardarPortadaAction(nueva, nombre);
    setAviso(r.ok ? { ok: true, texto: nueva ? 'Portada guardada. Ya se ve en tu carta.' : 'Portada quitada: se usará la primera foto de tus platos.' } : { ok: false, texto: r.error });
  }

  return (
    <section className="rounded-[22px] border border-[#E6E6E2] bg-white p-5 sm:p-7">
      <h3 className="text-lg font-semibold">Foto de portada</h3>
      <p className="mt-1 text-sm text-[#6B7079]">
        Es la imagen grande de la <strong>cabecera de tu carta</strong> (se ve en el estilo Visual). Si no eliges ninguna, usamos la primera foto de tus platos.
        Formato horizontal; puedes subirla o crearla con IA.
      </p>
      <div className="mt-4"><SubirImagen valor={url} onCambio={(u) => cambiar(u)} etiqueta="Portada" ia={{ modo: 'portada' }} /></div>
      {url && (
        <label className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#F7F5F2] p-3 text-sm">
          <input type="checkbox" checked={conNombre} onChange={(e) => cambiar(url, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6E0C2B]" />
          <span><strong>Mi portada ya lleva el nombre del local escrito.</strong> Así no lo repetimos encima de la imagen.</span>
        </label>
      )}
      {aviso && <p className={`mt-3 text-sm ${aviso.ok ? 'text-[#2F8F6B]' : 'text-red-600'}`}>{aviso.texto}</p>}
    </section>
  );
}
