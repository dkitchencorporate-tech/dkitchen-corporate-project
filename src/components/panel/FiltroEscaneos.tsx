'use client';

import { useEffect, useState, useTransition } from 'react';
import { escaneosRangoAction } from '@/app/panel/actions';

/**
 * Filtros de escaneos (01/10/2026, petición de karc0): ver cualquier periodo
 * (hoy, 7 días, este mes, mes pasado, este año o un rango libre) agrupado por
 * día, semana o mes. Fechas en hora de Madrid.
 */
type Fila = { fecha: string; total: number };
const ymd = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function rango(preset: string): [string, string, 'day' | 'week' | 'month'] {
  const hoy = new Date();
  const d = (y: number, m: number, dia: number) => ymd(new Date(y, m, dia));
  const y = hoy.getFullYear(), m = hoy.getMonth();
  switch (preset) {
    case 'hoy': return [ymd(hoy), ymd(hoy), 'day'];
    case '7': { const a = new Date(hoy); a.setDate(a.getDate() - 6); return [ymd(a), ymd(hoy), 'day']; }
    case 'mes': return [d(y, m, 1), ymd(hoy), 'day'];
    case 'mes-pasado': return [d(y, m - 1, 1), d(y, m, 0), 'day'];
    case 'anio': return [d(y, 0, 1), ymd(hoy), 'month'];
    default: return [d(y, m, 1), ymd(hoy), 'day'];
  }
}
const PRESETS: [string, string][] = [['hoy', 'Hoy'], ['7', 'Últimos 7 días'], ['mes', 'Este mes'], ['mes-pasado', 'Mes pasado'], ['anio', 'Este año'], ['libre', 'Elegir fechas']];
const etiqueta = (f: string, ag: string) => {
  const dt = new Date(`${f}T12:00:00`);
  if (ag === 'month') return dt.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  if (ag === 'week') return `Semana del ${dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
  return dt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function FiltroEscaneos({ demo = false }: { demo?: boolean }) {
  const [preset, setPreset] = useState('mes-pasado');
  const inicial = rango('mes-pasado');
  const [desde, setDesde] = useState(inicial[0]);
  const [hasta, setHasta] = useState(inicial[1]);
  const [agrupar, setAgrupar] = useState<'day' | 'week' | 'month'>(inicial[2]);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState('');
  const [pendiente, iniciar] = useTransition();

  function consultar(de = desde, a = hasta, ag = agrupar) {
    setError('');
    if (demo) { setFilas([]); return; }
    iniciar(async () => {
      const r = await escaneosRangoAction(de, a, ag);
      if (r.ok) setFilas(r.filas); else { setError(r.error); setFilas(null); }
    });
  }
  useEffect(() => { consultar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function elegir(p: string) {
    setPreset(p);
    if (p === 'libre') return;
    const [de, a, ag] = rango(p);
    setDesde(de); setHasta(a); setAgrupar(ag);
    consultar(de, a, ag);
  }

  const total = (filas ?? []).reduce((t, f) => t + f.total, 0);
  const maximo = Math.max(1, ...(filas ?? []).map((f) => f.total));
  const mejor = (filas ?? []).reduce<Fila | null>((m, f) => (!m || f.total > m.total ? f : m), null);

  return (
    <section className="rounded-2xl border border-linea bg-white p-6">
      <h3 className="text-lg font-semibold">Consultar otro periodo</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map(([v, t]) => (
          <button key={v} onClick={() => elegir(v)} aria-pressed={preset === v} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${preset === v ? 'border-vino bg-vino text-white' : 'border-linea bg-white'}`}>{t}</button>
        ))}
      </div>
      {preset === 'libre' && (
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); consultar(); }}>
          <label className="text-xs text-niebla">Desde<input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="mt-1 block rounded-xl border border-linea px-3 py-2 text-sm" /></label>
          <label className="text-xs text-niebla">Hasta<input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="mt-1 block rounded-xl border border-linea px-3 py-2 text-sm" /></label>
          <label className="text-xs text-niebla">Ver por
            <select value={agrupar} onChange={(e) => setAgrupar(e.target.value as 'day' | 'week' | 'month')} className="mt-1 block rounded-xl border border-linea px-3 py-2 text-sm">
              <option value="day">Días</option><option value="week">Semanas</option><option value="month">Meses</option>
            </select>
          </label>
          <button className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">Ver</button>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {pendiente && <p className="mt-4 text-sm text-niebla">Consultando…</p>}
      {!pendiente && filas && (
        <div className="mt-5">
          <div className="flex flex-wrap gap-6">
            <div><p className="text-xs text-niebla">Escaneos en el periodo</p><p className="font-display text-4xl font-semibold text-vino">{total}</p></div>
            {mejor && mejor.total > 0 && <div><p className="text-xs text-niebla">Mejor {agrupar === 'month' ? 'mes' : agrupar === 'week' ? 'semana' : 'día'}</p><p className="mt-2 text-sm font-semibold capitalize">{etiqueta(mejor.fecha, agrupar)} · {mejor.total}</p></div>}
          </div>
          {filas.length === 0 ? <p className="mt-4 text-sm text-niebla">No hubo escaneos en este periodo.</p> : (
            <ul className="mt-4 space-y-1.5">
              {filas.map((f) => (
                <li key={f.fecha} className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-sm">
                  <span className="capitalize text-grafito">{etiqueta(f.fecha, agrupar)}</span>
                  <span className="h-2.5 rounded-full bg-[#F3EDE6]"><span className="block h-2.5 rounded-full bg-vino" style={{ width: `${(f.total / maximo) * 100}%` }} /></span>
                  <span className="text-right font-semibold tabular-nums">{f.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
