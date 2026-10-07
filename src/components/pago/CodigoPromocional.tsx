'use client';

import { useState } from 'react';

/**
 * Código promocional en el resumen del pedido (07/10/2026, karc0). Al aplicarlo
 * el servidor rehace el cobro con el descuento y la página se recarga con la
 * referencia nueva: el total y el formulario de pago salen ya descontados.
 */
export default function CodigoPromocional({ r, aplicado }: { r: string; aplicado: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(valor: string) {
    setEnviando(true); setError('');
    const res = await fetch('/api/pago/codigo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ r, codigo: valor }) }).catch(() => null);
    const j = (await res?.json().catch(() => ({}))) as { r?: string; error?: string } | undefined;
    if (res?.ok && j?.r) { window.location.assign(`/pago?r=${encodeURIComponent(j.r)}`); return; }
    setError(j?.error ?? 'No se pudo aplicar el código. Inténtalo de nuevo.');
    setEnviando(false);
  }

  if (aplicado) {
    return (
      <p className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-papel px-4 py-3 text-[13px] text-pizarra">
        <span>Código <strong className="font-semibold uppercase tracking-wide text-tinta">{aplicado}</strong> aplicado</span>
        <button type="button" disabled={enviando} onClick={() => enviar('')} className="font-semibold text-vino underline-offset-2 hover:underline disabled:opacity-60">
          {enviando ? 'Quitando…' : 'Quitar'}
        </button>
      </p>
    );
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="mt-4 text-[13px] font-medium text-vino underline-offset-2 hover:underline">
        ¿Tienes un código promocional?
      </button>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) enviar(codigo); }} className="mt-4">
      <label htmlFor="codigo-promocional" className="text-[13px] font-medium text-tinta">Código promocional</label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="codigo-promocional"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60))}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Escribe tu código"
          className="min-w-0 flex-1 rounded-xl border border-[#8B8F97] bg-white px-3.5 py-2.5 text-[15px] uppercase tracking-wide text-tinta placeholder:normal-case placeholder:tracking-normal focus:border-vino focus:outline-none focus:ring-2 focus:ring-vino/15"
        />
        <button type="submit" disabled={enviando || !codigo.trim()} className="shrink-0 rounded-xl border border-vino px-4 py-2.5 text-sm font-semibold text-vino transition-colors hover:bg-vino/5 disabled:opacity-50">
          {enviando ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] text-vino">{error}</p>}
    </form>
  );
}
