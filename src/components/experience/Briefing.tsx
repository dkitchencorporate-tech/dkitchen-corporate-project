'use client';

import { useEffect, useState } from 'react';
import { FORMATOS_EXPERIENCE } from '@/lib/experience-formatos';

/**
 * Briefing de Experience en /pagar/gracias?p=experience (06/10/2026).
 * Se rellena solo con lo que el cliente eligió en el configurador (si su
 * navegador lo guardó) y se envía a /api/experience/briefing.
 */
type Config = { v?: number; ts?: number; formato?: string; cocina?: string; fecha?: string; plazas?: number; precioEntrada?: number };
/** Lo guardado en el configurador caduca a las 48 h: si el pago se abandonó, otro día no se precarga una configuración vieja. */
const CADUCIDAD_MS = 48 * 3_600_000;

/**
 * `registro` (07/10/2026): mientras se construye el módulo de eventos,
 * /pagar/experience no cobra. Este mismo formulario sirve de solicitud sin
 * pago: llega como «SOLICITUD EXPERIENCE (sin pago)» y se llama al cliente.
 */
export default function Briefing({ registro = false }: { registro?: boolean }) {
  const [config, setConfig] = useState<Config>({});
  const [estado, setEstado] = useState<'form' | 'enviando' | 'hecho'>('form');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const c: Config = JSON.parse(localStorage.getItem('dk_experience_config') ?? '{}');
      if (c.v === 1 && typeof c.ts === 'number' && Date.now() - c.ts < CADUCIDAD_MS) setConfig(c);
      else localStorage.removeItem('dk_experience_config');
    } catch { /* sin datos previos */ }
  }, []);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado('enviando'); setError('');
    try {
      const r = await fetch('/api/experience/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(f), consentimiento: f.get('consentimiento') === 'on', origen: registro ? 'registro' : 'pago' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || 'No se pudo enviar. Inténtalo de nuevo.'); setEstado('form'); return; }
      try { localStorage.removeItem('dk_experience_config'); } catch { /* nada que limpiar */ }
      setEstado('hecho');
    } catch { setError('Sin conexión. Inténtalo de nuevo.'); setEstado('form'); }
  }

  if (estado === 'hecho') {
    return <div className={`${registro ? 'mt-6' : 'mx-auto mt-12 max-w-lg'} rounded-[22px] border border-white/15 p-6 text-left`}><p className="font-semibold">{registro ? 'Solicitud recibida.' : 'Briefing recibido.'}</p><p className="mt-1 text-white/60">{registro ? 'Te llamamos en menos de 48 horas laborables para cerrar formato y fecha. No has pagado nada. Te hemos enviado una copia por correo.' : 'Te llamamos en menos de 48 horas laborables. Te hemos enviado una copia por correo.'}</p></div>;
  }

  const campo = 'mt-1.5 w-full rounded-xl border border-white/30 bg-white/[0.06] px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-oro';
  return (
    <form onSubmit={enviar} className={registro ? 'mt-6 space-y-4 border-t border-white/10 pt-6 text-left' : 'mx-auto mt-12 max-w-lg space-y-4 rounded-[24px] border border-white/15 bg-white/[0.03] p-6 text-left md:p-8'}>
      <p className="etiqueta-dk text-oro">{registro ? 'Solicita tu evento · 2 minutos' : 'Paso 1 · Briefing del evento (2 minutos)'}</p>
      <p className="text-sm text-white/60">{registro ? 'Cuéntanos tu idea. Te llamamos, cerramos los detalles y solo entonces pagas.' : 'Con esto preparamos la videollamada de arranque.'}</p>
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
      <button type="submit" disabled={estado === 'enviando'} className="w-full rounded-full bg-vino px-6 py-4 text-sm font-semibold text-white hover:bg-vino-hondo disabled:opacity-50">
        {estado === 'enviando' ? 'Enviando…' : registro ? 'Solicitar mi evento · sin pagar ahora' : 'Enviar briefing'}
      </button>
    </form>
  );
}
