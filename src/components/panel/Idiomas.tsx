'use client';

import { useMemo, useState, useTransition } from 'react';
import type { SeccionPropia, PlatoPropio } from '@/lib/menu-propietario';
import { fijarIdiomasAction, guardarTraduccionesAction } from '@/app/panel/actions';

const DISPONIBLES: Record<string, string> = { en: '🇬🇧 Inglés', fr: '🇫🇷 Francés', de: '🇩🇪 Alemán', it: '🇮🇹 Italiano', pt: '🇵🇹 Portugués', ca: 'Catalán' };
type T = { entidad: 'plato' | 'seccion'; entidadId: string; idioma: string; campo: 'nombre' | 'descripcion'; texto: string };

/** Pack de idiomas (0027): elegir hasta 3 idiomas y traducir la carta. */
export default function Idiomas({ activos, secciones, platos, traducciones }: {
  activos: string[]; secciones: SeccionPropia[]; platos: PlatoPropio[]; traducciones: T[];
}) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [idiomas, setIdiomas] = useState<string[]>(activos);
  const [idioma, setIdioma] = useState<string>(activos[0] ?? '');
  const inicial = useMemo(() => new Map(traducciones.map((t) => [`${t.entidadId}:${t.idioma}:${t.campo}`, t.texto])), [traducciones]);
  const [valores, setValores] = useState<Map<string, string>>(inicial);

  const clave = (id: string, campo: string) => `${id}:${idioma}:${campo}`;
  const val = (id: string, campo: string) => valores.get(clave(id, campo)) ?? '';
  const poner = (id: string, campo: string, v: string) => setValores((m) => new Map(m).set(clave(id, campo), v.slice(0, 300)));
  const pendientes = platos.filter((p) => !val(p.id, 'nombre')).length;

  function guardarIdiomas() {
    setAviso(null);
    iniciar(async () => {
      try { await fijarIdiomasAction(idiomas); if (!idiomas.includes(idioma)) setIdioma(idiomas[0] ?? ''); setAviso({ ok: true, texto: 'Idiomas guardados. Tu carta ya muestra el selector.' }); }
      catch (e) { setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar.' }); }
    });
  }

  function guardarTraducciones() {
    const lista: T[] = [];
    for (const s of secciones) lista.push({ entidad: 'seccion', entidadId: s.id, idioma, campo: 'nombre', texto: val(s.id, 'nombre') });
    for (const p of platos) {
      lista.push({ entidad: 'plato', entidadId: p.id, idioma, campo: 'nombre', texto: val(p.id, 'nombre') });
      lista.push({ entidad: 'plato', entidadId: p.id, idioma, campo: 'descripcion', texto: val(p.id, 'descripcion') });
    }
    setAviso(null);
    iniciar(async () => {
      try { await guardarTraduccionesAction(lista); setAviso({ ok: true, texto: `Traducciones en ${DISPONIBLES[idioma]} guardadas.` }); }
      catch (e) { setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar.' }); }
    });
  }

  const campo = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25';

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold">Idiomas de tu carta</h2>
        <p className="text-sm text-white/40">Elige hasta 3 idiomas. Tus clientes verán un selector en la carta. Lo que no traduzcas se muestra en español.</p>
        {aviso && <p className={`mt-2 text-sm ${aviso.ok ? 'text-green-400' : 'text-red-400'}`}>{aviso.texto}</p>}
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#1c140b] p-5">
        <div className="flex flex-wrap gap-2">
          {Object.entries(DISPONIBLES).map(([c, n]) => {
            const on = idiomas.includes(c);
            return (
              <button key={c} type="button" aria-pressed={on} disabled={!on && idiomas.length >= 3}
                onClick={() => setIdiomas((l) => (on ? l.filter((x) => x !== c) : [...l, c]))}
                className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-30 ${on ? 'bg-[#D9531E]' : 'bg-white/10'}`}>{n}</button>
            );
          })}
        </div>
        <button disabled={pendiente} onClick={guardarIdiomas} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">Guardar idiomas ({idiomas.length}/3)</button>
      </section>

      {activos.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#1c140b] p-5">
          <div className="flex flex-wrap items-center gap-2">
            {activos.map((c) => (
              <button key={c} onClick={() => setIdioma(c)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${idioma === c ? 'bg-[#D9531E]' : 'bg-white/10'}`}>{DISPONIBLES[c]}</button>
            ))}
            <span className="ml-auto text-xs text-white/40">{pendientes > 0 ? `${pendientes} platos sin traducir` : '✓ Todo traducido'}</span>
          </div>
          {secciones.map((s) => (
            <div key={s.id} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <p className="self-center text-sm font-bold text-white/70">{s.nombre}</p>
                <input value={val(s.id, 'nombre')} onChange={(e) => poner(s.id, 'nombre', e.target.value)} placeholder={`«${s.nombre}» en ${DISPONIBLES[idioma]}`} className={campo} />
              </div>
              {platos.filter((p) => p.seccionId === s.id).map((p) => (
                <div key={p.id} className="grid gap-2 rounded-xl bg-black/20 p-3 sm:grid-cols-2">
                  <div className="text-sm"><p className="font-medium">{p.nombre}</p>{p.descripcion && <p className="text-xs text-white/40">{p.descripcion}</p>}</div>
                  <div className="space-y-2">
                    <input value={val(p.id, 'nombre')} onChange={(e) => poner(p.id, 'nombre', e.target.value)} placeholder="Nombre traducido" className={campo} />
                    {p.descripcion && <textarea value={val(p.id, 'descripcion')} onChange={(e) => poner(p.id, 'descripcion', e.target.value)} rows={2} placeholder="Descripción traducida" className={campo} />}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button disabled={pendiente} onClick={guardarTraducciones} className="rounded-lg bg-[#D9531E] px-5 py-2.5 text-sm font-bold disabled:opacity-50">
            {pendiente ? 'Guardando…' : 'Guardar traducciones'}
          </button>
        </section>
      )}
    </div>
  );
}
