'use client';

import { useState } from 'react';
import type { BaseCrm, Prospecto } from '@/lib/prospeccion';
import { CANALES, ESTADOS, TIPOS } from '@/lib/prospeccion-catalogo';
import { reasignarLoteAction } from '@/lib/prospeccion-acciones';

const campo = 'w-full rounded-2xl border border-linea bg-white px-3.5 py-2.5 text-sm focus:border-vino focus:outline-none';

export default function LotesProspeccion({
  base,
  prospectos,
  comerciales,
  demosIds,
}: {
  base: BaseCrm;
  prospectos: Prospecto[];
  comerciales: { id: string; nombre: string }[];
  demosIds: string[];
}) {
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const destinoInicial = comerciales.find((c, i) => i > 0)?.id ?? comerciales[0]?.id ?? '';
  const [comercialDestino, setComercialDestino] = useState<string>(destinoInicial);
  const [canal, setCanal] = useState<string>('fisico');
  const [enRuta, setEnRuta] = useState<boolean>(false);

  const candidatos = prospectos.filter((p) => !['cliente', 'descartado'].includes(p.estado));
  const setDemo = new Set(demosIds);

  const elegirPrimeros = (n: number) => {
    setSeleccionados(candidatos.slice(0, n).map((p) => p.id));
  };

  const elegirSinContactar = (n: number) => {
    const filtro = candidatos.filter((p) => ['por_revisar', 'por_visitar', 'muestra'].includes(p.estado));
    setSeleccionados((filtro.length ? filtro : candidatos).slice(0, n).map((p) => p.id));
  };

  const elegirConDemo = (n: number) => {
    const filtro = candidatos.filter((p) => setDemo.has(p.id));
    setSeleccionados(filtro.slice(0, n).map((p) => p.id));
  };

  const alternar = (id: string) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!comerciales.length || !candidatos.length) return null;

  return (
    <details className="rounded-[22px] border border-vino/25 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-vino">Control de carteras · Dirección</span>
          <h2 className="font-display text-lg font-semibold text-carbon">
            Asignar lotes de prospectos a comercial (6, 12 o selección manual)
          </h2>
        </div>
        <span className="rounded-full bg-vino/10 px-3.5 py-1.5 text-xs font-semibold text-vino">
          {seleccionados.length > 0 ? `${seleccionados.length} seleccionados` : 'Abrir repartidor por lotes →'}
        </span>
      </summary>

      <form action={reasignarLoteAction} className="mt-4 space-y-4 border-t border-linea pt-4">
        <input type="hidden" name="base" value={base} />
        {seleccionados.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-niebla">Selección rápida:</span>
          <button type="button" onClick={() => elegirSinContactar(6)}
            className="rounded-full border border-linea bg-papel px-3 py-1.5 text-xs font-semibold text-carbon hover:border-vino hover:text-vino">
            ⚡ Lote de 6 pendientes
          </button>
          <button type="button" onClick={() => elegirSinContactar(12)}
            className="rounded-full border border-linea bg-papel px-3 py-1.5 text-xs font-semibold text-carbon hover:border-vino hover:text-vino">
            ⚡ Lote de 12 pendientes
          </button>
          <button type="button" onClick={() => elegirConDemo(6)}
            className="rounded-full border border-linea bg-papel px-3 py-1.5 text-xs font-semibold text-carbon hover:border-vino hover:text-vino">
            🎨 6 con demo lista
          </button>
          <button type="button" onClick={() => elegirPrimeros(candidatos.length)}
            className="rounded-full border border-linea bg-white px-3 py-1.5 text-xs font-medium text-grafito hover:border-tinta">
            Todos ({candidatos.length})
          </button>
          {seleccionados.length > 0 && (
            <button type="button" onClick={() => setSeleccionados([])}
              className="rounded-full px-2.5 py-1 text-xs font-semibold text-vino hover:underline">
              Limpiar ({seleccionados.length})
            </button>
          )}
        </div>

        <div className="grid gap-3 rounded-2xl bg-papel/70 p-3.5 sm:grid-cols-3">
          <label className="text-xs font-semibold text-grafito">
            1. Pasar a la cartera de:
            <select name="comercial" value={comercialDestino} onChange={(e) => setComercialDestino(e.target.value)} className={`${campo} mt-1`}>
              {comerciales.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {i === 0 ? `${c.nombre} (Mi cartera)` : c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-grafito">
            2. Destino de trabajo del comercial:
            <select name="canal" value={canal} onChange={(e) => setCanal(e.target.value)} className={`${campo} mt-1`}>
              <option value="fisico">🚶 A pie (para su Ruta de calle)</option>
              <option value="instagram">📱 Prospección Digital · Instagram</option>
              <option value="whatsapp">📱 Prospección Digital · WhatsApp</option>
              <option value="telefono">📱 Prospección Digital · Teléfono</option>
              <option value="">Mantener canal actual de cada local</option>
            </select>
          </label>

          <div className="flex flex-col justify-end gap-2">
            {(canal === 'fisico' || canal === '') && (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-linea bg-white px-3 py-2 text-xs font-medium text-carbon">
                <input type="checkbox" name="en_ruta" checked={enRuta} onChange={(e) => setEnRuta(e.target.checked)} className="h-4 w-4 accent-vino" />
                Meter ya en su Ruta de hoy
              </label>
            )}
            <button
              type="submit"
              disabled={seleccionados.length === 0}
              className="w-full rounded-full bg-vino px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-tinta disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mover {seleccionados.length || ''} prospecto{seleccionados.length === 1 ? '' : 's'} ahora →
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-2xl border border-linea divide-y divide-linea">
          {candidatos.map((p) => {
            const marcado = seleccionados.includes(p.id);
            const tieneDemo = setDemo.has(p.id);
            return (
              <label key={p.id} className={`flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm transition ${marcado ? 'bg-vino/5' : 'hover:bg-papel/50'}`}>
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(p.id)}
                  className="h-4 w-4 shrink-0 accent-vino"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-carbon">
                  {p.nombre}
                  <span className="ml-1.5 text-xs font-normal text-niebla">
                    · {TIPOS[p.tipo]} · {p.barrio || p.zona}
                  </span>
                </span>
                {tieneDemo && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Demo lista
                  </span>
                )}
                {p.canal && (
                  <span className=" hidden shrink-0 rounded-full bg-papel px-2 py-0.5 text-[10px] text-grafito sm:inline">
                    {CANALES[p.canal]}
                  </span>
                )}
                <span className="shrink-0 text-[11px] text-niebla">{ESTADOS[p.estado]}</span>
              </label>
            );
          })}
        </div>
      </form>
    </details>
  );
}
