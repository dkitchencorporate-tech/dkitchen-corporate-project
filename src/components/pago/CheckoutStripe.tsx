'use client';

import { useMemo, useState } from 'react';
import { loadStripe, type Appearance } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

/**
 * Paso 2 del checkout nativo (08/10/2026): Payment Element de Stripe
 * embebido en nuestra página, con el diseño Gran Reserva. Antes de confirmar
 * se registra la aceptación de los términos (fecha, IP y versión) en el
 * propio cobro de Stripe. 3D Secure lo gestiona Stripe.js solo.
 */

const APARIENCIA: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#6E0C2B',
    colorText: '#17191E',
    colorTextSecondary: '#5C616A',
    colorBackground: '#FFFFFF',
    colorDanger: '#9B1C1C',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    fontSizeBase: '15px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid #8B8F97', boxShadow: 'none', padding: '13px 14px' },
    '.Input:focus': { border: '1px solid #6E0C2B', boxShadow: '0 0 0 3px rgba(110,12,43,.15)' },
    '.Tab': { border: '1px solid #8B8F97', boxShadow: 'none' },
    '.Tab--selected': { border: '1px solid #6E0C2B', boxShadow: '0 0 0 1px #6E0C2B' },
    // Lista vertical (07/10): cada método a todo el ancho, sin desplegables en el móvil.
    '.AccordionItem': { border: '1px solid #D5D7DB', boxShadow: 'none', padding: '16px' },
    '.AccordionItem--selected': { border: '1px solid #6E0C2B', boxShadow: '0 0 0 1px #6E0C2B' },
    '.Label': { fontWeight: '500' },
  },
};

function Formulario({ r, tipo, boton, terminosVersion }: { r: string; tipo: 'pago' | 'tarjeta'; boton: string; terminosVersion: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [acepta, setAcepta] = useState(false);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!acepta) { setError('Para continuar tienes que aceptar los términos y la política de privacidad.'); return; }
    setEnviando(true); setError('');
    const { error: errorFormulario } = await elements.submit();
    if (errorFormulario) { setError(errorFormulario.message ?? 'Revisa los datos de pago.'); setEnviando(false); return; }
    const t = await fetch('/api/pago/terminos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ r, version: terminosVersion }) }).catch(() => null);
    if (!t?.ok) { setError('No pudimos registrar la aceptación de los términos. Inténtalo de nuevo.'); setEnviando(false); return; }
    const return_url = `${window.location.origin}/pago/listo?r=${encodeURIComponent(r)}`;
    const { error: errorPago } = tipo === 'pago'
      ? await stripe.confirmPayment({ elements, confirmParams: { return_url } })
      : await stripe.confirmSetup({ elements, confirmParams: { return_url } });
    // Solo vuelve aquí si hay error: si todo va bien, Stripe redirige a return_url.
    setError(errorPago?.message ?? 'No se pudo completar el pago. Inténtalo de nuevo.');
    setEnviando(false);
  }

  return (
    <form onSubmit={pagar} className="grid gap-5">
      <PaymentElement onReady={() => setListo(true)} options={{ layout: { type: 'accordion', defaultCollapsed: false, radios: 'always', spacedAccordionItems: true }, business: { name: 'DKitchen' } }} />
      {!listo && <div className="h-40 animate-pulse rounded-xl bg-papel" aria-label="Cargando el formulario de pago seguro" />}
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-pizarra">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-vino" />
        <span>He leído y acepto los <a href="/terms" target="_blank" className="underline">términos de contratación</a> y la <a href="/privacy" target="_blank" className="underline">política de privacidad</a>.</span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-vino/10 px-4 py-3 text-sm text-vino">{error}</p>}
      <button type="submit" disabled={!stripe || !listo || enviando} className="rounded-full bg-vino px-7 py-4 text-[16px] font-semibold text-white disabled:opacity-60">
        {enviando ? 'Procesando el pago seguro…' : boton}
      </button>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-pizarra">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Pago seguro gestionado por Stripe. DKitchen nunca ve ni guarda los datos de tu tarjeta.
      </p>
    </form>
  );
}

export default function CheckoutStripe({ clavePublica, secreto, r, tipo, boton, terminosVersion }: {
  clavePublica: string; secreto: string; r: string; tipo: 'pago' | 'tarjeta'; boton: string; terminosVersion: string;
}) {
  const promesa = useMemo(() => loadStripe(clavePublica, { locale: 'es' }), [clavePublica]);
  return (
    <Elements stripe={promesa} options={{ clientSecret: secreto, appearance: APARIENCIA, locale: 'es' }}>
      <Formulario r={r} tipo={tipo} boton={boton} terminosVersion={terminosVersion} />
    </Elements>
  );
}
