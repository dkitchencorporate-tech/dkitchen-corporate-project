'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import type { FilaAnulacion, FilaCuenta, ResumenSala } from '@/lib/comandero';
import { resumenSalaAction, informeCuentasAction, informeAnulacionesAction } from '@/app/panel/actions';

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const diaMadrid = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(d);
const menosDias = (n: number) => diaMadrid(new Date(Date.now() - n * 86400000));
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/**
 * Descarga sin librerías: «Excel» = CSV con BOM, «;» y coma decimal (lo abre
 * Excel en español tal cual); «CSV» = estándar con «,» y punto decimal.
 */
function descargar(nombre: string, cabecera: string[], filas: (string | number | null)[][], excel: boolean) {
  const sep = excel ? ';' : ',';
  const celda = (v: string | number | null) => {
    if (v === null || v === undefined) return '';
    const t = typeof v === 'number' ? (excel ? v.toFixed(2).replace('.', ',').replace(/,00$/, '') : String(v)) : v;
    return /[";,\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const texto = '﻿' + [cabecera, ...filas].map((f) => f.map(celda).join(sep)).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${nombre}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** «Resumen de sala (no fiscal)». Sin Comandero Pro solo HOY; con Pro, histórico, descargas, anulaciones y ranking. */
export default function InformesComandero({ camareros, mesas }: { camareros: { id: string; nombre: string }[]; mesas: string[] }) {
  const hoy = diaMadrid();
  const [filtro, setFiltro] = useState({ desde: hoy, hasta: hoy, mesa: '', camareroId: '' });
  const [resumen, setResumen] = useState<ResumenSala | null>(null);
  const [anulaciones, setAnulaciones] = useState<FilaAnulacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const f = useCallback((x = filtro) => ({ desde: x.desde, hasta: x.hasta, mesa: x.mesa || null, camareroId: x.camareroId || null }), [filtro]);

  const ver = useCallback((x = filtro) => iniciar(async () => {
    setError(null); setAnulaciones(null);
    const r = await resumenSalaAction(f(x));
    if (r.ok) setResumen(r.datos); else setError(r.error);
  }), [f, filtro]);
  // Solo al montar: el resumen de hoy.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { ver(); }, []);

  const pro = resumen?.pro ?? false;
  const rango = (desde: string, hasta = hoy) => { const x = { ...filtro, desde, hasta }; setFiltro(x); ver(x); };

  const bajarCuentas = (excel: boolean) => iniciar(async () => {
    const r = await informeCuentasAction(f());
    if (!r.ok) { setError(r.error); return; }
    descargar(`resumen-sala-${filtro.desde}_${filtro.hasta}`,
      ['Fecha', 'Mesa', 'Apertura', 'Cierre', 'Minutos', 'Estado', 'Comensales', 'Camarero (apertura)', 'Cerró', 'Rondas', 'Líneas', 'Importe (€)', 'Anulado (€)', 'Motivo anulación'],
      r.datos.map((x: FilaCuenta) => [x.fecha, x.mesa, hora(x.abiertaEn), hora(x.cerradaEn), x.minutos, x.estado, x.comensales, x.camareroApertura, x.camareroCierre, x.rondas, x.lineas, x.importe, x.importeAnulado, x.motivoAnulacion]),
      excel);
  });

  const cargarAnulaciones = () => iniciar(async () => {
    const r = await informeAnulacionesAction(f());
    if (r.ok) setAnulaciones(r.datos); else setError(r.error);
  });
  const bajarAnulaciones = (excel: boolean) => anulaciones && descargar(`anulaciones-${filtro.desde}_${filtro.hasta}`,
    ['Fecha y hora', 'Tipo', 'Mesa', 'Plato', 'Cantidad', 'Importe (€)', 'Camarero', 'Motivo'],
    anulaciones.map((a) => [hora(a.anuladaEn), a.tipo === 'linea' ? 'Línea' : 'Cuenta entera', a.mesa, a.plato, a.cantidad, a.importe, a.camarero, a.motivo]), excel);

  const campo = 'rounded-lg border border-[#E6E6E2] bg-white px-3 py-2 text-sm';
  const boton = 'rounded-full border border-[#D6D6D1] px-3 py-1.5 text-xs font-bold disabled:opacity-50';

  return (
    <section className="space-y-4 rounded-2xl border border-[#E6E6E2] bg-white p-5">
      <div>
        <h3 className="text-lg font-semibold">Resumen de sala <span className="text-sm font-normal text-[#6B7079]">(no fiscal)</span></h3>
        <p className="text-sm text-[#6B7079]">Lo que se ha servido en sala según el comandero. No sustituye a tu TPV, que es quien factura.</p>
      </div>

      {pro && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className={boton} disabled={pendiente} onClick={() => rango(hoy)}>Hoy</button>
            <button className={boton} disabled={pendiente} onClick={() => rango(menosDias(6))}>7 días</button>
            <button className={boton} disabled={pendiente} onClick={() => rango(menosDias(29))}>30 días</button>
            <button className={boton} disabled={pendiente} onClick={() => rango(`${hoy.slice(0, 8)}01`)}>Este mes</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <label className="text-xs text-[#6B7079]">Desde<input type="date" value={filtro.desde} max={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} className={`mt-1 w-full ${campo}`} /></label>
            <label className="text-xs text-[#6B7079]">Hasta<input type="date" value={filtro.hasta} min={filtro.desde} max={hoy} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} className={`mt-1 w-full ${campo}`} /></label>
            <label className="text-xs text-[#6B7079]">Mesa
              <select value={filtro.mesa} onChange={(e) => setFiltro({ ...filtro, mesa: e.target.value })} className={`mt-1 w-full ${campo}`}>
                <option value="">Todas</option>{mesas.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="text-xs text-[#6B7079]">Camarero
              <select value={filtro.camareroId} onChange={(e) => setFiltro({ ...filtro, camareroId: e.target.value })} className={`mt-1 w-full ${campo}`}>
                <option value="">Todos</option>{camareros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <button disabled={pendiente} onClick={() => ver()} className="col-span-2 self-end rounded-full bg-[#6E0C2B] py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-1">{pendiente ? 'Cargando…' : 'Ver'}</button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {resumen && (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['Facturado en sala', euros(resumen.importe)],
              ['Mesas cerradas', resumen.cuentas_cerradas],
              ['Comensales', resumen.comensales],
              ['Media por mesa', euros(resumen.importe_medio)],
              ['Tiempo medio', `${resumen.minutos_medios} min`],
              ['Abiertas ahora', resumen.cuentas_abiertas],
              ['Líneas anuladas', `${resumen.lineas_anuladas} · ${euros(resumen.importe_anulado)}`],
              ['Cuentas anuladas', resumen.cuentas_anuladas],
            ] as const).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[#F3F3F0] p-3"><dt className="text-[10px] uppercase tracking-wide text-[#6B7079]">{k}</dt><dd className="text-lg font-bold">{v}</dd></div>
            ))}
          </dl>

          {resumen.por_mesa.length > 0 && (
            <details className="rounded-xl border border-[#E6E6E2] p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Por mesa ({resumen.por_mesa.length})</summary>
              <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                {resumen.por_mesa.map((m) => <li key={m.mesa}>Mesa {m.mesa}: <strong>{euros(m.importe)}</strong> <span className="text-[#6B7079]">({m.cuentas})</span></li>)}
              </ul>
            </details>
          )}

          {pro ? (
            <>
              {resumen.ranking_camareros && resumen.ranking_camareros.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold">Ranking de camareros</h4>
                  <ol className="divide-y divide-[#ECECE8] rounded-xl border border-[#E6E6E2] text-sm">
                    {resumen.ranking_camareros.map((c, i) => (
                      <li key={c.camarero_id ?? i} className="flex flex-wrap justify-between gap-2 p-2.5">
                        <span><strong>{i + 1}.</strong> {c.nombre}</span>
                        <span className="text-[#6B7079]">{c.cuentas} mesas · {c.comensales} pax · <strong className="text-[#1B1D22]">{euros(c.importe)}</strong></span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#6B7079]">Descargar mesas:</span>
                <button className={boton} disabled={pendiente} onClick={() => bajarCuentas(true)}>Excel</button>
                <button className={boton} disabled={pendiente} onClick={() => bajarCuentas(false)}>CSV</button>
                <button className={`${boton} ml-auto`} disabled={pendiente} onClick={cargarAnulaciones}>Ver anulaciones</button>
              </div>
              {anulaciones && (
                <div className="space-y-2">
                  {anulaciones.length === 0 ? (
                    <p className="text-sm text-[#6B7079]">Sin anulaciones en estas fechas.</p>
                  ) : (
                    <>
                      <ul className="divide-y divide-[#ECECE8] rounded-xl border border-[#E6E6E2] text-sm">
                        {anulaciones.map((a, i) => (
                          <li key={i} className="p-2.5">
                            <p className="flex justify-between gap-2"><span>Mesa {a.mesa} · {a.tipo === 'linea' ? `${a.cantidad} × ${a.plato}` : 'cuenta entera'}</span><strong>{euros(a.importe)}</strong></p>
                            <p className="text-xs text-[#6B7079]">{hora(a.anuladaEn)} · {a.camarero ?? 'sin camarero'} · «{a.motivo}»</p>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <button className={boton} onClick={() => bajarAnulaciones(true)}>Excel</button>
                        <button className={boton} onClick={() => bajarAnulaciones(false)}>CSV</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#6E0C2B]/40 bg-[#6E0C2B]/5 p-4">
              <div className="text-sm">
                <p className="font-bold">Comandero Pro · 12 € + IVA al mes</p>
                <p className="text-[#6B7079]">Histórico por fechas, mesa y camarero, descarga en Excel y CSV, informe de anulaciones y ranking de camareros.</p>
              </div>
              <a href="/panel?pestana=modulos" className="rounded-full bg-[#6E0C2B] px-4 py-2 text-sm font-bold text-white">Activar</a>
            </div>
          )}
        </>
      )}
    </section>
  );
}
