'use client';

import { useState } from 'react';
import { nifValido } from '@/lib/nif';

/**
 * Factura en el checkout (01/11/2026, decisión de Alex): las dos opciones, simplificada (sin datos)
 * o completa (razón social, NIF y dirección fiscal). Por encima de 400 € con IVA la ley exige la
 * completa y el servidor no deja pagar sin ella. Al guardar, el servidor rehace el cobro y la
 * página se recarga con la referencia nueva (como el código promocional).
 */
export default function DatosFiscales({ r, fiscal, obligatorio, onPendiente }: {
  r: string;
  fiscal: { razon: string; nif: string } | null;
  obligatorio: boolean;
  onPendiente: (pendiente: boolean) => void;
}) {
  const [modo, setModo] = useState<'simplificada' | 'completa'>(fiscal || obligatorio ? 'completa' : 'simplificada');
  const [editar, setEditar] = useState(!fiscal);
  const [d, setD] = useState({ razon: '', nif: '', calle: '', cp: '', localidad: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const elegir = (m: 'simplificada' | 'completa') => { setModo(m); onPendiente(m === 'completa' && !fiscal); };

  async function guardar() {
    if (!nifValido(d.nif)) { setError('Ese NIF/CIF no es válido. Revísalo.'); return; }
    setEnviando(true); setError('');
    const res = await fetch('/api/pago/fiscal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ r, ...d }) }).catch(() => null);
    const j = (await res?.json().catch(() => ({}))) as { r?: string; error?: string } | undefined;
    if (res?.ok && j?.r) { window.location.assign(`/pago?r=${encodeURIComponent(j.r)}`); return; }
    setError(j?.error ?? 'No se pudieron guardar los datos. Inténtalo de nuevo.');
    setEnviando(false);
  }

  const campo = 'mt-1 w-full rounded-xl border border-acero bg-white px-3.5 py-3 text-[15px] outline-none focus:border-vino focus:ring-2 focus:ring-vino/15';
  const opcion = (m: 'simplificada' | 'completa', titulo: string, texto: string) => (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-[13px] leading-snug ${modo === m ? 'border-vino ring-1 ring-vino' : 'border-linea'}`}>
      <input type="radio" name="tipo-factura" checked={modo === m} onChange={() => elegir(m)} className="mt-0.5 h-4 w-4 shrink-0 accent-vino" />
      <span><strong className="block text-[14px] text-tinta">{titulo}</strong><span className="text-pizarra">{texto}</span></span>
    </label>
  );

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-[15px] font-semibold text-tinta">Tu factura</legend>
      {fiscal && !editar ? (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-papel px-4 py-3 text-[13px] text-pizarra">
          <span>Factura completa a nombre de <strong className="text-tinta">{fiscal.razon}</strong> · NIF <strong className="text-tinta">{fiscal.nif}</strong></span>
          <button type="button" onClick={() => setEditar(true)} className="font-semibold text-vino underline-offset-2 hover:underline">Cambiar</button>
        </p>
      ) : (
        <>
          {obligatorio
            ? <p className="rounded-xl bg-oro/15 px-4 py-3 text-[13px] leading-relaxed text-tinta">Para importes de más de 400 € (IVA incluido) la ley exige factura completa: necesitamos tus datos fiscales.</p>
            : <div className="grid gap-2 sm:grid-cols-2">
                {opcion('simplificada', 'Factura simplificada', 'Sin datos fiscales. Te llega igual a tu correo.')}
                {opcion('completa', 'Factura completa', 'Con tu razón social y NIF, para desgravar el IVA.')}
              </div>}
          {modo === 'completa' && (
            <div className="grid gap-3 rounded-xl border border-linea p-4">
              <label className="text-[13px] font-medium">Razón social o nombre completo<input value={d.razon} onChange={(e) => setD({ ...d, razon: e.target.value })} maxLength={120} autoComplete="organization" className={campo} /></label>
              <label className="text-[13px] font-medium">NIF / CIF<input value={d.nif} onChange={(e) => setD({ ...d, nif: e.target.value })} maxLength={20} autoCapitalize="characters" className={campo} /></label>
              <label className="text-[13px] font-medium">Dirección fiscal<input value={d.calle} onChange={(e) => setD({ ...d, calle: e.target.value })} maxLength={160} autoComplete="street-address" className={campo} /></label>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                <label className="text-[13px] font-medium">Código postal<input value={d.cp} onChange={(e) => setD({ ...d, cp: e.target.value.replace(/\D/g, '').slice(0, 5) })} inputMode="numeric" autoComplete="postal-code" className={campo} /></label>
                <label className="text-[13px] font-medium">Localidad<input value={d.localidad} onChange={(e) => setD({ ...d, localidad: e.target.value })} maxLength={80} autoComplete="address-level2" className={campo} /></label>
              </div>
              {error && <p role="alert" className="rounded-xl bg-vino/10 px-4 py-2.5 text-sm text-vino">{error}</p>}
              <button type="button" onClick={guardar} disabled={enviando} className="justify-self-start rounded-full bg-tinta px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {enviando ? 'Guardando y preparando tu factura…' : 'Guardar mis datos fiscales'}
              </button>
              {fiscal && <button type="button" onClick={() => setEditar(false)} className="justify-self-start text-[13px] text-pizarra underline">Dejar los que tenía</button>}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
