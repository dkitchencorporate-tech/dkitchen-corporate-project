'use client';

import { useState } from 'react';
import { SERVICIOS_QR, formatPrecio } from '@/lib/pricing-config';

/**
 * Upsell de la puesta a punto a precio de bienvenida (08/10 y 10/10, karc0; 0068):
 * se ve en «Pago confirmado» (con `r`) y en el panel (sin `r`) MIENTRAS el local no
 * haya empezado a montar su carta; la base decide si sigue disponible. Va por encima de la
 * Auditoría. La lista dice todo lo que hacemos, incluido lo que más frena a un
 * bar: que funcione con su TPV y sus impresoras de tickets de siempre.
 */
const INCLUYE = [
  'Montamos tu carta completa: secciones, platos, precios y alérgenos.',
  'Fotos de tus platos generadas con IA cuando no tengas las tuyas.',
  'Configuramos tu panel: horarios, datos del local, estilo y QR listo para imprimir.',
  'No cambias de sistema: revisamos tu TPV o POS y tus impresoras térmicas de tickets en remoto, sin visitas.',
  'Conectamos tu TPV si acepta pedidos externos: las comandas llegan solas y salen por tus impresoras de siempre.',
  'Asistente con IA en tu panel las 24 h, los 7 días, y una persona por WhatsApp el mismo día del arranque.',
];

export default function OfertaPuestaAPunto({ r }: { r?: string }) {
  const [estado, setEstado] = useState<'visible' | 'cargando' | 'descartado'>('visible');
  const [error, setError] = useState('');
  if (estado === 'descartado') return null;

  async function contratar() {
    setEstado('cargando'); setError('');
    const res = await fetch('/api/checkout/puesta-a-punto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r ? { r } : { panel: true }) }).catch(() => null);
    const j = (await res?.json().catch(() => ({}))) as { url?: string; error?: string } | undefined;
    if (res?.ok && j?.url) { window.location.href = j.url; return; }
    setError(j?.error ?? 'No se pudo abrir el pago. Inténtalo de nuevo.');
    setEstado('visible');
  }

  return (
    <div className="mt-4 rounded-[24px] border-2 border-vino bg-white p-6 text-left shadow-lg md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-vino">{r ? 'Solo ahora, al darte de alta' : 'Oferta de bienvenida · antes de montar tu carta'}</p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-tinta">Te lo dejamos todo funcionando</h2>
      <p className="mt-2 text-[15px] text-pizarra">
        Puesta a punto completa por{' '}
        <span className="text-pizarra/70 line-through">{formatPrecio(SERVICIOS_QR.puestaAPunto)}</span>{' '}
        <strong className="text-tinta">{formatPrecio(SERVICIOS_QR.puestaAPuntoBienvenida)} + IVA</strong>, pago único. Tú no tocas nada.
      </p>
      <ul className="mt-5 space-y-2.5">
        {INCLUYE.map((t) => (
          <li key={t} className="flex gap-2.5 text-[14px] leading-relaxed text-tinta">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-vino text-[11px] text-white" aria-hidden="true">✓</span>
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={contratar} disabled={estado === 'cargando'}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-vino px-6 py-3.5 font-semibold text-white transition-colors hover:bg-vino-hondo disabled:opacity-60">
          {estado === 'cargando' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />}
          {estado === 'cargando' ? 'Abriendo el pago seguro…' : `Añadir por ${formatPrecio(SERVICIOS_QR.puestaAPuntoBienvenida)} + IVA`}
        </button>
        <button type="button" onClick={() => setEstado('descartado')} className="px-4 text-sm font-semibold text-pizarra hover:text-tinta">
          Prefiero montarla yo
        </button>
      </div>
      <p className="mt-3 text-xs text-pizarra">La oferta se mantiene hasta que empieces a montar tu carta. Después, la puesta a punto vale {formatPrecio(SERVICIOS_QR.puestaAPunto)} + IVA.</p>
      {error && <p role="alert" className="mt-3 text-sm text-vino">{error}</p>}
    </div>
  );
}
