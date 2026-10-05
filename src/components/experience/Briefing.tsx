'use client';

import { useEffect, useState } from 'react';
import { FORMATOS_EXPERIENCE } from '@/lib/experience-formatos';

/**
 * Briefing de Experience en /pagar/gracias?p=experience (06/10/2026).
 * Se rellena solo con lo que el cliente eligió en el configurador (si su
 * navegador lo guardó) y se envía a /api/experience/briefing.
 */
type Config = { formato?: string; cocina?: string; fecha?: string; plazas?: number; precioEntrada?: number };

export default function Briefing() {
  const [config, setConfig] = useState<Config>({});
  const [estado, setEstado] = useState<'form' | 'enviando' | 'hecho'>('form');
  const [error, setError] = useState('');

  useEffect(() => {
    try { setConfig(JSON.parse(localStorage.getItem('dk_experience_config') ?? '{}')); } catch { /* sin datos previos */ }
  }, []);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado('enviando'); setError('');
    try {
      const r = await fetch('/api/experience/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(f), consentimiento: f.get('consentimiento') === 'on' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || 'No se pudo enviar. Inténtalo de nuevo.'); setEstado('form'); return; }
      try { localStorage.removeItem('dk_experience_config'); } catch { /* nada que limpiar */ }
      setEstado('hecho');
    } catch { setError('Sin conexión. Inténtalo de nuevo.'); setEstado('form'); }
  }

  if (estado === 'hecho') {
    return <div className="mx-auto mt-12 max-w-lg rounded-[22px] border border-white/15 p-6 text-left"><p className="font-semibold">Briefing recibido.</p><p className="mt-1 text-white/60">Te llamamos en menos de 48 horas laborables. Te hemos enviado una copia por correo.</p></div>;
  }

  const campo = 'mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#D9B25C]';
  return (
    <form onSubmit={enviar} className="mx-auto mt-12 max-w-lg space-y-4 rounded-[24px] border border-white/15 bg-white/[0.03] p-6 text-left md:p-8">
      <p className="etiqueta-dk text-[#D9B25C]">Paso 1 · Briefing del evento (2 minutos)</p>
      <p className="text-sm text-white/60">Con esto preparamos la videollamada de arranque.</p>
      <label className="block text-sm font-semibold">Formato
        <select name="formato" defaultValue={config.formato} key={`f-${config.formato}`} className={campo}>
          {FORMATOS_EXPERIENCE.map((x) => <option key={x.slug} className="text-black">{x.nombre}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Nombre<input name="nombre" required maxLength={80} className={campo} /></label>
        <label className="block text-sm font-semibold">Negocio<input name="negocio" maxLength={100} className={campo} /></label>
        <label className="block text-sm font-semibold">Correo<input name="email" type="email" required className={campo} /></label>
        <label className="block text-sm font-semibold">Teléfono<input name="telefono" type="tel" required className={campo} /></label>
        <label className="block text-sm font-semibold">Tipo de cocina<input name="cocina" defaultValue={config.cocina} key={`c-${config.cocina}`} maxLength={60} className={campo} /></label>
        <label className="block text-sm font-semibold">Fecha deseada<input name="fecha" type="date" required defaultValue={config.fecha} key={`d-${config.fecha}`} className={campo} /></label>
        <label className="block text-sm font-semibold">Aforo<input name="plazas" type="number" min={1} defaultValue={config.plazas} key={`a-${config.plazas}`} className={campo} /></label>
        <label className="block text-sm font-semibold">Precio de la entrada (€)<input name="precioEntrada" type="number" min={0} defaultValue={config.precioEntrada} key={`p-${config.precioEntrada}`} className={campo} /></label>
      </div>
      <label className="block text-sm font-semibold">Menú o idea<textarea name="menu" rows={3} maxLength={1500} placeholder="Platos, bebidas o lo que tengas en mente" className={campo} /></label>
      <label className="block text-sm font-semibold">Pasarela de cobro de tus entradas
        <select name="pasarela" className={campo}>
          {['Ya tengo una (te digo cuál en la llamada)', 'Stripe', 'SumUp', 'Revolut Pay', 'Todavía no tengo'].map((x) => <option key={x} className="text-black">{x}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Licencias (alcohol, música, aforo)<input name="licencias" maxLength={300} placeholder="Qué tienes y qué no" className={campo} /></label>
      <label className="block text-sm font-semibold">Notas<textarea name="notas" rows={2} maxLength={1000} className={campo} /></label>
      <label className="flex gap-3 text-xs text-white/60"><input type="checkbox" name="consentimiento" required className="mt-0.5" />Acepto la <a href="/privacy" className="underline">política de privacidad</a> y que DKitchen use estos datos para preparar mi evento.</label>
      {error && <p className="text-sm text-[#F2B8B5]">{error}</p>}
      <button type="submit" disabled={estado === 'enviando'} className="w-full rounded-full bg-[#6E0C2B] px-6 py-4 text-sm font-semibold text-white hover:bg-[#570922] disabled:opacity-50">
        {estado === 'enviando' ? 'Enviando…' : 'Enviar briefing'}
      </button>
    </form>
  );
}
