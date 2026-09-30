'use client';

import { useState, useTransition } from 'react';
import type { ResumenCobro } from '@/lib/prueba';
import { quedarmeConTodoAction } from '@/app/panel/actions';

/**
 * Prueba «todo incluido» y cobro (0034). AvisoPrueba va encima de todas las
 * secciones mientras dura la prueba; DesgloseCobro vive en «Mi plan».
 * Importes y fechas llegan calculados por la base (dk.resumen_cobro).
 */
const euros = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const fecha = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
const diasHasta = (iso: string) => Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000);

function BotonQuedarme({ texto = 'Quedarme con todo' }: { texto?: string }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        disabled={pendiente}
        onClick={() => { setError(null); iniciar(async () => { const r = await quedarmeConTodoAction(); if (r.url) window.location.href = r.url; else setError(r.error ?? 'No se pudo preparar el pago.'); }); }}
        className="rounded-full bg-[#6E0C2B] px-5 py-2.5 text-sm font-bold disabled:opacity-60">
        {pendiente ? 'Preparando el pago…' : texto}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function AvisoPrueba({ cobro }: { cobro: ResumenCobro | null }) {
  if (!cobro?.prueba_hasta) return null;
  const quedan = diasHasta(cobro.prueba_hasta);
  const vencida = cobro.estado_acceso === 'solo_lectura' || quedan < 0;
  const urgente = !vencida && quedan <= 3;
  return (
    <section aria-live="polite" className={`mb-6 rounded-[22px] p-5 sm:p-6 ${vencida || urgente ? 'bg-[#0A080C] text-white' : 'border border-[#E6E2DC] bg-white'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${vencida || urgente ? 'text-[#D9B25C]' : 'text-[#6E0C2B]'}`}>
            {vencida ? 'Tu prueba ha terminado' : quedan === 0 ? 'Tu prueba termina hoy' : `Quedan ${quedan} ${quedan === 1 ? 'día' : 'días'} de prueba`}
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed">
            {vencida
              ? <>Tu carta sigue visible para tus clientes, pero el panel está en solo lectura. Si te quedas hoy, pagas solo la parte proporcional hasta el día {cobro.dia_cobro} y recuperas todo al momento.</>
              : <>Tienes todo incluido, valorado en <strong>{euros(cobro.valor_mensual)}/mes</strong>, hasta el <strong>{fecha(cobro.prueba_hasta)}</strong>. Si te quedas antes, <strong>no pagas nada hasta el {fecha(cobro.cobro_si_paga_hoy)}</strong>.</>}
          </p>
        </div>
        <BotonQuedarme texto={vencida ? 'Reactivar todo' : 'Quedarme con todo'} />
      </div>
    </section>
  );
}

export function DesgloseCobro({ cobro }: { cobro: ResumenCobro | null }) {
  if (!cobro) return null;
  return (
    <section className="rounded-[22px] border border-[#E6E2DC] bg-white p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight">Tu cobro</h2>
      <p className="mt-1 text-sm text-[#6B7079]">Cobramos a todos los clientes el día {cobro.dia_cobro} de cada mes, lejos de los pagos de final de mes. Precios + IVA.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#F3F1EE] p-4"><p className="text-xs text-[#6B7079]">Valor de lo que tienes</p><p className="mt-1 text-lg font-black">{euros(cobro.valor_mensual)}/mes</p></div>
        <div className="rounded-2xl bg-[#F3F1EE] p-4"><p className="text-xs text-[#6B7079]">Pagas ahora</p><p className="mt-1 text-lg font-black">{cobro.paga_mensual ? `${euros(cobro.paga_mensual)}/mes` : '0 €'}</p></div>
        <div className="rounded-2xl bg-[#F3F1EE] p-4">
          <p className="text-xs text-[#6B7079]">{cobro.proximo_cobro ? 'Próximo cobro' : cobro.prueba_hasta ? 'Si te quedas hoy, primer cobro' : 'Próximo cobro'}</p>
          <p className="mt-1 text-lg font-black">{cobro.proximo_cobro ? fecha(cobro.proximo_cobro) : cobro.prueba_hasta ? fecha(cobro.cobro_si_paga_hoy) : '—'}</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-[#EFEDE9] text-sm">
        <li className="flex justify-between gap-3 py-2"><span>Plan {cobro.plan === 'ampliado' ? 'Ampliado' : 'Básico'}</span><span className="text-[#6B7079]">{euros(cobro.precio_plan)}/mes</span></li>
        {cobro.items.map((i) => (
          <li key={i.servicio} className="flex justify-between gap-3 py-2">
            <span>{i.nombre}{i.origen !== 'pago' && <span className="ml-1.5 rounded-full bg-[#2F8F6B]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2F8F6B]">{i.origen === 'regalo' ? 'incluido gratis' : 'demo'}</span>}</span>
            <span className="shrink-0 text-[#6B7079]">{euros(i.precio)}{i.tipo === 'mensual' ? '/mes' : ' una vez'}</span>
          </li>
        ))}
      </ul>
      {cobro.prueba_hasta && <div className="mt-5"><BotonQuedarme /></div>}
    </section>
  );
}
