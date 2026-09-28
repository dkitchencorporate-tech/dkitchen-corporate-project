'use client';

import { useMemo, useState, useTransition } from 'react';
import { guardarTraduccionesAdminAction } from '@/app/admin-dkitchen/qr/actions';

type Sec = { id: string; nombre: string };
type Pla = { id: string; nombre: string; descripcion: string | null; seccionId: string | null };

const DISPONIBLES: Record<string, string> = { en: '🇬🇧 Inglés', fr: '🇫🇷 Francés', de: '🇩🇪 Alemán', it: '🇮🇹 Italiano', pt: '🇵🇹 Portugués', ca: 'Catalán' };
type T = { entidad: 'plato' | 'seccion'; entidadId: string; idioma: string; campo: 'nombre' | 'descripcion'; texto: string };

/** Editor de traducciones de Central (0028: solo DKitchen traduce; el cliente lo ve). */
export default function TraductorCarta({ restauranteId, activos, secciones, platos, traducciones }: {
  restauranteId: string; activos: string[]; secciones: Sec[]; platos: Pla[]; traducciones: T[];
}) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [idioma, setIdioma] = useState<string>(activos[0] ?? '');
  const inicial = useMemo(() => new Map(traducciones.map((t) => [`${t.entidadId}:${t.idioma}:${t.campo}`, t.texto])), [traducciones]);
  const [valores, setValores] = useState<Map<string, string>>(inicial);

  const clave = (id: string, campo: string) => `${id}:${idioma}:${campo}`;
  const val = (id: string, campo: string) => valores.get(clave(id, campo)) ?? '';
  const poner = (id: string, campo: string, v: string) => setValores((m) => new Map(m).set(clave(id, campo), v.slice(0, 300)));
  const pendientes = platos.filter((p) => !val(p.id, 'nombre')).length;

  function guardarTraducciones() {
    const lista: T[] = [];
    for (const s of secciones) lista.push({ entidad: 'seccion', entidadId: s.id, idioma, campo: 'nombre', texto: val(s.id, 'nombre') });
    for (const p of platos) {
      lista.push({ entidad: 'plato', entidadId: p.id, idioma, campo: 'nombre', texto: val(p.id, 'nombre') });
      lista.push({ entidad: 'plato', entidadId: p.id, idioma, campo: 'descripcion', texto: val(p.id, 'descripcion') });
    }
    setAviso(null);
    iniciar(async () => {
      try { await guardarTraduccionesAdminAction(restauranteId, lista); setAviso({ ok: true, texto: `Traducciones en ${DISPONIBLES[idioma]} guardadas.` }); }
      catch (e) { setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar.' }); }
    });
  }

  const campo = 'w-full rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-sm text-[#1B1D22] placeholder-[#9A9EA6]';

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-bold">Traducciones de la carta</h2>
        <p className="text-sm text-[#6B7079]">Idiomas elegidos por el cliente: {activos.map((c) => DISPONIBLES[c]).join(', ') || 'ninguno todavía'}.</p>
        {aviso && <p className={`mt-2 text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}
      </header>

      {activos.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-[#E6E6E2] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            {activos.map((c) => (
              <button key={c} onClick={() => setIdioma(c)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${idioma === c ? 'bg-[#E8592A]' : 'bg-[#EDEDEA]'}`}>{DISPONIBLES[c]}</button>
            ))}
            <span className="ml-auto text-xs text-[#6B7079]">{pendientes > 0 ? `${pendientes} platos sin traducir` : '✓ Todo traducido'}</span>
          </div>
          {secciones.map((s) => (
            <div key={s.id} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <p className="self-center text-sm font-bold text-[#3F434B]">{s.nombre}</p>
                <input value={val(s.id, 'nombre')} onChange={(e) => poner(s.id, 'nombre', e.target.value)} placeholder={`«${s.nombre}» en ${DISPONIBLES[idioma]}`} className={campo} />
              </div>
              {platos.filter((p) => p.seccionId === s.id).map((p) => (
                <div key={p.id} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-2">
                  <div className="text-sm"><p className="font-medium">{p.nombre}</p>{p.descripcion && <p className="text-xs text-[#6B7079]">{p.descripcion}</p>}</div>
                  <div className="space-y-2">
                    <input value={val(p.id, 'nombre')} onChange={(e) => poner(p.id, 'nombre', e.target.value)} placeholder="Nombre traducido" className={campo} />
                    {p.descripcion && <textarea value={val(p.id, 'descripcion')} onChange={(e) => poner(p.id, 'descripcion', e.target.value)} rows={2} placeholder="Descripción traducida" className={campo} />}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button disabled={pendiente} onClick={guardarTraducciones} className="rounded-full bg-[#E8592A] px-5 py-2.5 text-sm font-bold disabled:opacity-50">
            {pendiente ? 'Guardando…' : 'Guardar traducciones'}
          </button>
        </section>
      )}
    </div>
  );
}
