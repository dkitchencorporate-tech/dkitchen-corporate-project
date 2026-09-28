'use client';

import { useState } from 'react';

const TIPOS = [['tpv', 'Comercial de TPV'], ['horeca', 'Distribuidor HORECA'], ['independiente', 'Comercial independiente'], ['agencia', 'Agencia'], ['otro', 'Otro']];

export default function FormularioPartner() {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');
  const campo = 'mt-1.5 w-full rounded-xl border border-[#E6E6E2] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#17191E]';

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado('enviando');
    const r = await fetch('/api/partner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(f), consentimiento: f.get('consentimiento') === 'on' }) }).catch(() => null);
    if (r?.ok) { setEstado('ok'); return; }
    const j = await r?.json().catch(() => ({}));
    setError(j?.error ?? 'No se pudo enviar. Escríbenos por WhatsApp.'); setEstado('error');
  }

  if (estado === 'ok') {
    return (
      <div className="rounded-[28px] bg-[#0A080C] p-10 text-white">
        <p className="font-display text-3xl font-semibold">Recibido.</p>
        <p className="mt-3 text-white/65">Te contactamos lo antes posible para contarte las condiciones.</p>
      </div>
    );
  }
  return (
    <form onSubmit={enviar} className="space-y-4 rounded-[28px] border border-[#E6E6E2] bg-[#F7F5F2] p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Nombre *<input name="nombre" required maxLength={80} autoComplete="name" className={campo} /></label>
        <label className="block text-sm font-medium">Empresa<input name="empresa" maxLength={80} autoComplete="organization" className={campo} /></label>
        <label className="block text-sm font-medium">Correo *<input name="email" type="email" required autoComplete="email" className={campo} /></label>
        <label className="block text-sm font-medium">Teléfono *<input name="telefono" type="tel" required autoComplete="tel" className={campo} /></label>
        <label className="block text-sm font-medium">Perfil *
          <select name="tipo" required defaultValue="" className={campo}><option value="" disabled>Elige una opción</option>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
        </label>
        <label className="block text-sm font-medium">Zona<input name="zona" maxLength={80} placeholder="Ciudad o provincia" className={campo} /></label>
      </div>
      <label className="block text-sm font-medium">¿Con qué clientes trabajas?<textarea name="mensaje" rows={3} maxLength={600} className={campo} /></label>
      <label className="flex items-start gap-2 text-sm text-[#6B7079]"><input type="checkbox" name="consentimiento" required className="mt-1" /> Acepto que DKitchen use estos datos para contactarme sobre el programa de partners (ver <a href="/privacy" className="underline">privacidad</a>).</label>
      {estado === 'error' && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={estado === 'enviando'} className="w-full rounded-full bg-[#6E0C2B] py-4 text-[15px] font-semibold text-white disabled:opacity-50">{estado === 'enviando' ? 'Enviando…' : 'Quiero ser partner'}</button>
    </form>
  );
}
