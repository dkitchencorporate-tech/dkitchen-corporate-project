'use client';

import { useState } from 'react';

/**
 * Simulador de ingresos de Central → Ruta (18/10/2026). Todo en el navegador, con los precios de pricing-config
 * que le pasa el servidor (sin IVA). Sirve para ver qué mezcla de clientes llega a la meta de MRR.
 */
export interface PreciosSimulador {
  carta: number; local: number; sala: number; fundador: number;
  signatureEntrada: number; signatureMensual: number; experience: number; auditoria: number;
}

const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

export default function SimuladorIngresos({ p, metaMrr, mrrReal }: { p: PreciosSimulador; metaMrr: number; mrrReal: number }) {
  const [n, setN] = useState({ carta: 5, local: 20, sala: 5, fundador: 5, signature: 1, experience: 2, auditoria: 3 });
  const mrr = n.carta * p.carta + n.local * p.local + n.sala * p.sala + n.fundador * p.fundador + n.signature * p.signatureMensual;
  const unicoMes = n.signature * p.signatureEntrada + n.experience * p.experience + n.auditoria * p.auditoria;
  const pct = Math.min(100, Math.round((mrr / metaMrr) * 100));
  const filas: [keyof typeof n, string, string, number][] = [
    ['carta', 'Carta QR · Carta', `${p.carta} €/mes`, 60], ['local', 'Carta QR · Local', `${p.local} €/mes`, 150], ['sala', 'Carta QR · Sala', `${p.sala} €/mes`, 60],
    ['fundador', 'Fundador (Sala al 40 %)', `${p.fundador} €/mes`, 100], ['signature', 'Signature', `${p.signatureEntrada} € + ${p.signatureMensual} €/mes`, 20],
    ['experience', 'Experience (eventos al mes)', `${p.experience} € cada uno`, 20], ['auditoria', 'Auditorías al mes', `${p.auditoria} €`, 30],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {filas.map(([k, txt, precio, max]) => (
          <label key={k} className="block">
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{txt} <span className="font-normal text-niebla">· {precio}</span></span>
              <span className="font-display text-xl font-semibold text-vino">{n[k]}</span>
            </span>
            <input type="range" min={0} max={max} value={n[k]} onChange={(e) => setN({ ...n, [k]: Number(e.target.value) })}
              className="mt-1 w-full accent-[#6E0C2B]" aria-label={txt} />
          </label>
        ))}
      </div>
      <div className="rounded-[24px] bg-noche p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oro">Con esta mezcla</p>
        <p className="font-display mt-3 text-4xl font-semibold">{eur(mrr)}<span className="text-base font-normal text-white/60"> /mes</span></p>
        <p className="text-sm text-white/70">MRR (sin IVA) · {eur(mrr * 12)} al año</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-oro" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-xs text-white/60">{pct} % de la meta de {eur(metaMrr)}/mes · hoy: {eur(mrrReal)}/mes</p>
        <p className="font-display mt-5 text-2xl font-semibold">{eur(unicoMes)}</p>
        <p className="text-sm text-white/70">Ingresos únicos del mes (entradas de Signature, eventos y auditorías)</p>
        <p className="mt-4 text-xs text-white/50">Clientes de carta QR: {n.carta + n.local + n.sala + n.fundador}</p>
      </div>
    </div>
  );
}
