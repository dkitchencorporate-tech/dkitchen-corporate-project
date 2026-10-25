'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

/**
 * Compra de entradas de Experience: paso 1 (cantidad, nombre y correo) y paso 2 (Payment Element de Stripe
 * cargado en la cuenta del LOCAL, `stripeAccount`). El dinero va directo al local.
 */
const APARIENCIA = {
  theme: 'stripe' as const,
  variables: { colorPrimary: '#6E0C2B', colorText: '#17191E', borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif', fontSizeBase: '15px' },
};

function Pagar({ slug, boton }: { slug: string; boton: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function pagar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!stripe || !elements) return;
    setEnviando(true); setError('');
    const { error: e } = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/e/${slug}/entradas` } });
    setError(e?.message ?? 'No se pudo completar el pago. Inténtalo de nuevo.');
    setEnviando(false);
  }

  return (
    <form onSubmit={pagar} className="grid gap-5">
      <PaymentElement onReady={() => setListo(true)} options={{ layout: { type: 'accordion', defaultCollapsed: false, radios: 'always', spacedAccordionItems: true } }} />
      {!listo && <div className="h-40 animate-pulse rounded-xl bg-papel" aria-label="Cargando el formulario de pago seguro" />}
      {error && <p role="alert" className="rounded-xl bg-vino/10 px-4 py-3 text-sm text-vino">{error}</p>}
      <button type="submit" disabled={!stripe || !listo || enviando} className="rounded-full bg-vino px-7 py-4 text-[16px] font-semibold text-white disabled:opacity-60">
        {enviando ? 'Procesando el pago seguro…' : boton}
      </button>
    </form>
  );
}

export default function CompraEntradas({ slug, clavePublica, precioCentimos, maximo }: { slug: string; clavePublica: string; precioCentimos: number; maximo: number }) {
  const [cantidad, setCantidad] = useState(1);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [pago, setPago] = useState<{ secreto: string; cuenta: string } | null>(null);
  const promesa = useMemo(() => (pago ? loadStripe(clavePublica, { locale: 'es', stripeAccount: pago.cuenta }) : null), [clavePublica, pago]);
  const total = ((precioCentimos * cantidad) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  async function continuar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!acepta) { setError('Para continuar tienes que aceptar la política de privacidad.'); return; }
    setCargando(true); setError('');
    const r = await fetch('/api/entradas/intento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, cantidad, nombre, email }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!r?.ok || !j?.secreto) { setError(j?.error ?? 'No se pudo iniciar el pago.'); setCargando(false); return; }
    setPago(j);
    setCargando(false);
  }

  if (pago && promesa) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-pizarra">{cantidad} {cantidad === 1 ? 'entrada' : 'entradas'} · <strong className="text-carbon">{total}</strong> · a nombre de {nombre}</p>
        <Elements stripe={promesa} options={{ clientSecret: pago.secreto, appearance: APARIENCIA, locale: 'es' }}>
          <Pagar slug={slug} boton={`Pagar ${total}`} />
        </Elements>
      </div>
    );
  }

  const campo = 'w-full rounded-xl border border-acero bg-white px-4 py-3 text-[15px] outline-none focus:border-vino';
  return (
    <form onSubmit={continuar} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium">Entradas
        <select value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className={campo}>
          {Array.from({ length: maximo }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={80} autoComplete="name" className={campo} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">Correo (te enviamos las entradas)
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="email" className={campo} />
      </label>
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-pizarra">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-vino" />
        <span>Acepto la <a href="/privacy" target="_blank" className="underline">política de privacidad</a>. El organizador del evento es el local; el pago va directo a su cuenta.</span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-vino/10 px-4 py-3 text-sm text-vino">{error}</p>}
      <button type="submit" disabled={cargando} className="rounded-full bg-vino px-7 py-4 text-[16px] font-semibold text-white disabled:opacity-60">
        {cargando ? 'Preparando el pago…' : `Continuar · ${total}`}
      </button>
    </form>
  );
}
