'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { subirArchivoAction } from '@/app/mis-servicios/actions';
import { comprimirImagen } from '@/lib/comprimir-imagen';

/** Subida de logo, fotos o carta en PDF desde «Mis servicios» (las fotos se reducen en el móvil antes de subir). */
export default function SubirArchivos({ id, quedan }: { id: string; quedan: number }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [, empezar] = useTransition();

  async function subir(lista: FileList | null) {
    if (!lista?.length) return;
    const archivos = Array.from(lista).slice(0, quedan);
    let hechos = 0;
    for (const a of archivos) {
      setEstado(`Subiendo ${hechos + 1} de ${archivos.length}…`);
      try {
        const f = new FormData();
        f.set('id', id);
        if (a.type.startsWith('image/') && a.type !== 'image/svg+xml') {
          const blob = await comprimirImagen(a, 1800);
          f.set('archivo', new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
        } else f.set('archivo', a);
        const r = await subirArchivoAction(f);
        if (r.error) { setEstado(r.error); return; }
        hechos++;
      } catch {
        setEstado('No pudimos leer uno de los archivos. Prueba con otro.');
        return;
      }
    }
    setEstado(hechos === 1 ? 'Archivo añadido.' : `${hechos} archivos añadidos.`);
    if (entrada.current) entrada.current.value = '';
    empezar(() => router.refresh());
  }

  if (quedan <= 0) return <p className="text-sm text-niebla">Ya tenemos el máximo de archivos.</p>;
  return (
    <div>
      <label className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border border-tinta bg-white px-5 text-sm font-bold">
        <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,application/pdf" multiple className="sr-only" onChange={(e) => subir(e.target.files)} />
        Subir logo, fotos o carta
      </label>
      {estado && <p role="status" className="mt-2 text-sm text-niebla">{estado}</p>}
    </div>
  );
}
