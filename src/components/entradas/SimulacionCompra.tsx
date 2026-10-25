'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Compra SIMULADA de un evento de muestra (18/10/2026, karc0: «el pago queda en
 * un callejón; que el cliente viva la experiencia completa y salga con un botón
 * para contratar ese evento o ver otros»). Tres pasos como los de verdad
 * (entradas → pago → entrada con QR), sin cobrar nada, y al final las salidas
 * para el dueño. Nada se envía a ningún sitio.
 */
const eur = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

function QrFalso({ semilla }: { semilla: number }) {
  const celdas = Array.from({ length: 121 }, (_, i) => ((i * 7919 + semilla * 104729) % 13) < 6);
  return (
    <svg viewBox="0 0 11 11" className="h-24 w-24" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="11" height="11" fill="#fff" />
      {celdas.map((on, i) => on && <rect key={i} x={i % 11} y={Math.floor(i / 11)} width="1" height="1" fill="#17191E" />)}
      {[[0, 0], [8, 0], [0, 8]].map(([x, y]) => <g key={`${x}${y}`}><rect x={x} y={y} width="3" height="3" fill="#17191E" /><rect x={x + 0.6} y={y + 0.6} width="1.8" height="1.8" fill="#fff" /><rect x={x + 1} y={y + 1} width="1" height="1" fill="#17191E" /></g>)}
    </svg>
  );
}

export default function SimulacionCompra({ precioCentimos, titulo, local, fecha, formato, formatoNombre }: {
  precioCentimos: number; titulo: string; local: string; fecha: string; formato: string | null; formatoNombre: string | null;
}) {
  const [paso, setPaso] = useState<0 | 1 | 2>(0);
  const [n, setN] = useState(2);
  const [pagando, setPagando] = useState(false);
  const total = precioCentimos * n;
  const salidas = (
    <div className="mt-5 space-y-2 border-t border-linea pt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">¿Lo quieres en tu local?</p>
      {formato && <Link href={`/experience/${formato}#configurar`} className="block rounded-full bg-vino py-3.5 text-center text-sm font-semibold text-white">Quiero {formatoNombre ? `«${formatoNombre}»` : 'este evento'} en mi local →</Link>}
      <Link href="/experience#formatos" className="block rounded-full border border-tinta py-3 text-center text-sm font-semibold">Ver otros eventos</Link>
      <p className="text-center text-[12px] leading-relaxed text-niebla">Esto es una muestra con un local inventado. Tu evento se personaliza contigo después de contratarlo: tu nombre, tu menú, tus fechas y tus precios.</p>
    </div>
  );

  return (
    <div>
      <ol className="mb-4 flex gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        {['Entradas', 'Pago', 'Tu entrada'].map((t, i) => (
          <li key={t} className={`flex-1 rounded-full px-2 py-1 text-center ${i === paso ? 'bg-tinta text-white' : i < paso ? 'bg-exito/15 text-exito' : 'bg-papel text-niebla'}`}>{i < paso ? '✓ ' : ''}{t}</li>
        ))}
      </ol>

      {paso === 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-papel px-4 py-3">
            <span className="text-sm font-semibold">Entradas</span>
            <span className="flex items-center gap-3">
              <button type="button" onClick={() => setN((x) => Math.max(1, x - 1))} aria-label="Una menos" className="h-9 w-9 rounded-full border border-acero text-lg">−</button>
              <span className="w-6 text-center font-display text-xl font-semibold tabular-nums">{n}</span>
              <button type="button" onClick={() => setN((x) => Math.min(8, x + 1))} aria-label="Una más" className="h-9 w-9 rounded-full border border-acero text-lg">+</button>
            </span>
          </div>
          <p className="flex justify-between text-sm"><span>Total</span><span className="font-semibold tabular-nums">{eur(total)}</span></p>
          <button type="button" onClick={() => setPaso(1)} className="w-full rounded-full bg-vino py-3.5 text-[15px] font-semibold text-white">Continuar al pago</button>
          <p className="text-center text-[12px] text-niebla">Simulación: así compran tus clientes. No se cobra nada.</p>
        </div>
      )}

      {paso === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setPagando(true); setTimeout(() => { setPagando(false); setPaso(2); }, 1100); }} className="rounded-xl bg-black py-3 text-sm font-semibold text-white"> Pay</button>
            <button type="button" onClick={() => { setPagando(true); setTimeout(() => { setPagando(false); setPaso(2); }, 1100); }} className="rounded-xl border border-acero bg-white py-3 text-sm font-semibold">G Pay</button>
          </div>
          <p className="text-center text-xs text-niebla">o con tarjeta</p>
          <div className="space-y-2 rounded-2xl border border-acero bg-white p-3 text-sm text-niebla">
            <p className="rounded-lg bg-papel px-3 py-2 tabular-nums">4242 4242 4242 4242</p>
            <div className="grid grid-cols-2 gap-2"><p className="rounded-lg bg-papel px-3 py-2">12 / 29</p><p className="rounded-lg bg-papel px-3 py-2">123</p></div>
          </div>
          <button type="button" disabled={pagando} onClick={() => { setPagando(true); setTimeout(() => { setPagando(false); setPaso(2); }, 1100); }} className="w-full rounded-full bg-vino py-3.5 text-[15px] font-semibold text-white disabled:opacity-60">{pagando ? 'Procesando el pago…' : `Pagar ${eur(total)}`}</button>
          <button type="button" onClick={() => setPaso(0)} className="w-full text-center text-sm text-niebla underline">← Cambiar entradas</button>
          <p className="text-center text-[12px] text-niebla">Simulación. En un evento real, el dinero va directo a la cuenta del local.</p>
        </div>
      )}

      {paso === 2 && (
        <div>
          <div className="rounded-2xl bg-exito/10 px-4 py-3 text-sm text-exito"><span className="font-semibold">¡Pago confirmado!</span> Tus {n} entradas están en tu correo y en tu móvil.</div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-dashed border-acero bg-white">
            <div className="flex items-center gap-4 p-4">
              <QrFalso semilla={n} />
              <div className="min-w-0 text-sm">
                <p className="font-semibold leading-snug">{titulo}</p>
                <p className="mt-1 text-niebla">{local}</p>
                <p className="mt-1 text-niebla first-letter:uppercase">{fecha}</p>
                <p className="mt-1 font-semibold">{n} {n === 1 ? 'entrada' : 'entradas'} · {eur(total)}</p>
              </div>
            </div>
            <p className="border-t border-dashed border-acero bg-papel px-4 py-2 text-[12px] text-niebla">En la puerta escanean este QR y la entrada queda usada. El local ve las ventas en directo en su panel.</p>
          </div>
          <button type="button" onClick={() => { setPaso(0); setN(2); }} className="mt-3 w-full text-center text-sm text-niebla underline">Repetir la simulación</button>
        </div>
      )}

      {salidas}
    </div>
  );
}
