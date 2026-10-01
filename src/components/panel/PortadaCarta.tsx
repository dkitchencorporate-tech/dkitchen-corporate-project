'use client';

import { useState } from 'react';
import SubirImagen from './SubirImagen';
import { guardarPortadaAction } from '@/app/panel/actions';

/**
 * Foto de portada (0043, feedback de la probadora): la cabecera de la carta
 * (estilo Visual y Carta de Autor) usaba la primera foto de un plato sin que el
 * cliente supiera de dónde salía ni cómo cambiarla.
 */
export default function PortadaCarta({ inicial, demo = false }: { inicial: string | null; demo?: boolean }) {
  const [url, setUrl] = useState<string | null>(inicial);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function cambiar(nueva: string | null) {
    setUrl(nueva);
    if (demo) { setAviso({ ok: true, texto: 'En tu panel real, la portada se guardaría al momento.' }); return; }
    const r = await guardarPortadaAction(nueva);
    setAviso(r.ok ? { ok: true, texto: nueva ? 'Portada guardada. Ya se ve en tu carta.' : 'Portada quitada: se usará la primera foto de tus platos.' } : { ok: false, texto: r.error });
  }

  return (
    <section className="rounded-[22px] border border-[#E6E6E2] bg-white p-5 sm:p-7">
      <h3 className="text-lg font-semibold">Foto de portada</h3>
      <p className="mt-1 text-sm text-[#6B7079]">
        Es la imagen grande de la <strong>cabecera de tu carta</strong> (se ve en el estilo Visual). Si no eliges ninguna, usamos la primera foto de tus platos.
        Formato horizontal; puedes subirla o crearla con IA.
      </p>
      <div className="mt-4"><SubirImagen valor={url} onCambio={(u) => cambiar(u)} etiqueta="Portada" ia={{ modo: 'banner' }} /></div>
      {aviso && <p className={`mt-3 text-sm ${aviso.ok ? 'text-[#2F8F6B]' : 'text-red-600'}`}>{aviso.texto}</p>}
    </section>
  );
}
