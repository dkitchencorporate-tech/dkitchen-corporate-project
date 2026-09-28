'use client';

import { useState, useTransition } from 'react';
import type { SeccionPropia, PlatoPropio } from '@/lib/menu-propietario';
import { fijarIdiomasAction } from '@/app/panel/actions';

const DISPONIBLES: Record<string, string> = { en: '🇬🇧 Inglés', fr: '🇫🇷 Francés', de: '🇩🇪 Alemán', it: '🇮🇹 Italiano', pt: '🇵🇹 Portugués', ca: 'Catalán' };
type T = { entidad: 'plato' | 'seccion'; entidadId: string; idioma: string; campo: 'nombre' | 'descripcion'; texto: string };

/**
 * Pack de idiomas: el cliente elige hasta 3 idiomas y DKitchen traduce su carta
 * (servicio hecho por nosotros, 0028). Aquí solo ve el progreso.
 */
export default function Idiomas({ activos, platos, traducciones }: {
  activos: string[]; secciones: SeccionPropia[]; platos: PlatoPropio[]; traducciones: T[];
}) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [idiomas, setIdiomas] = useState<string[]>(activos);
  const hechos = (i: string) => platos.filter((p) => traducciones.some((t) => t.entidadId === p.id && t.idioma === i && t.campo === 'nombre')).length;

  function guardar() {
    setAviso(null);
    iniciar(async () => {
      try { await fijarIdiomasAction(idiomas); setAviso({ ok: true, texto: 'Idiomas guardados. DKitchen se pone con la traducción.' }); }
      catch (e) { setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar.' }); }
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Idiomas de tu carta</h2>
        <p className="text-sm text-[#6B7079]">Elige hasta 3 idiomas. <strong className="text-[#3F434B]">Nosotros traducimos tu carta</strong> (nombres, descripciones y secciones) y tus clientes verán un selector de idioma. Si cambias un plato, lo actualizamos.</p>
        {aviso && <p className={`mt-2 text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}
      </header>

      <section className="space-y-3 rounded-2xl border border-[#E6E6E2] bg-white p-5">
        <div className="flex flex-wrap gap-2">
          {Object.entries(DISPONIBLES).map(([c, n]) => {
            const on = idiomas.includes(c);
            return (
              <button key={c} type="button" aria-pressed={on} disabled={!on && idiomas.length >= 3}
                onClick={() => setIdiomas((l) => (on ? l.filter((x) => x !== c) : [...l, c]))}
                className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-30 ${on ? 'bg-[#6E0C2B]' : 'bg-[#EDEDEA]'}`}>{n}</button>
            );
          })}
        </div>
        <button disabled={pendiente} onClick={guardar} className="rounded-lg bg-[#EDEDEA] px-4 py-2 text-sm font-bold hover:bg-[#E5E5E1]">Guardar idiomas ({idiomas.length}/3)</button>
      </section>

      {activos.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-[#E6E6E2] bg-white p-5">
          <h3 className="text-lg font-semibold">Estado de la traducción</h3>
          {activos.map((i) => {
            const n = hechos(i), total = platos.length, pct = total ? Math.round((n / total) * 100) : 100;
            return (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm"><span>{DISPONIBLES[i]}</span><span className="text-[#6B7079]">{pct === 100 ? '✓ Lista' : `DKitchen está traduciendo · ${n}/${total}`}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-[#EDEDEA]"><div className="h-full bg-[#6E0C2B]" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          <p className="text-xs text-[#9A9EA6]">¿Ves algo que cambiarías? Escríbenos desde Soporte y lo corregimos.</p>
        </section>
      )}
    </div>
  );
}
