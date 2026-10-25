'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { comprimirImagen } from '@/lib/comprimir-imagen';
import { subirFotoAction } from '@/app/mi-experience/actions';

/** Cerrar sesión desde la zona del cliente de Experience. */
export function SalirExperience() {
  const [saliendo, setSaliendo] = useState(false);
  return (
    <button type="button" disabled={saliendo} className="rounded-full bg-white/10 px-4 py-2 text-white/80 disabled:opacity-60"
      onClick={async () => { setSaliendo(true); await authClient.signOut().catch(() => {}); window.location.href = '/panel/iniciar-sesion'; }}>
      {saliendo ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  );
}

/** Ventas en directo: refresca los datos cada 30 s mientras la pestaña está a la vista. */
export function RefrescoVentas() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 30_000);
    return () => clearInterval(t);
  }, [router]);
  return <span className="inline-flex items-center gap-1.5 text-xs text-niebla"><span className="h-2 w-2 animate-pulse rounded-full bg-exito" />En directo · se actualiza solo</span>;
}

/** Subida de fotos del briefing: se comprimen en el navegador y suben de una en una. */
export function SubirFotosExperience({ id, quedan }: { id: string; quedan: number }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [, empezar] = useTransition();

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
    const lista = Array.from(archivos).slice(0, quedan);
    let hechas = 0;
    for (const archivo of lista) {
      setEstado(`Subiendo ${hechas + 1} de ${lista.length}…`);
      try {
        const blob = await comprimirImagen(archivo, 1600);
        const f = new FormData();
        f.set('id', id);
        f.set('archivo', new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
        const r = await subirFotoAction(f);
        if (r.error) { setEstado(r.error); return; }
        hechas++;
      } catch {
        setEstado('No pudimos leer una de las fotos. Prueba con otra.');
        return;
      }
    }
    setEstado(hechas === 1 ? 'Foto añadida.' : `${hechas} fotos añadidas.`);
    if (entrada.current) entrada.current.value = '';
    empezar(() => router.refresh());
  }

  if (quedan <= 0) return <p className="text-sm text-niebla">Ya tienes las 8 fotos. Quita alguna para subir otra.</p>;
  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-tinta px-5 py-2.5 text-sm font-semibold">
        <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => subir(e.target.files)} />
        Añadir fotos
      </label>
      <span className="ml-3 text-xs text-niebla">Quedan {quedan} · JPG, PNG o WebP</span>
      {estado && <p role="status" className="mt-2 text-sm text-niebla">{estado}</p>}
    </div>
  );
}
