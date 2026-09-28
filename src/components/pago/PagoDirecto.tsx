'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Formulario de pago directo con seguimiento del embudo (0032): anota la
 * vista, el primer campo tocado, el paso a la pasarela y la salida sin pagar
 * (con los segundos que estuvo). Solo un id de sesión aleatorio.
 */
function sesion(): string {
  try {
    let s = sessionStorage.getItem('dk-embudo');
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('dk-embudo', s); }
    return s;
  } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

function anotar(producto: string, evento: string, s: string, segundos?: number) {
  const cuerpo = JSON.stringify({ producto, evento, sesion: s, segundos });
  try {
    if (evento === 'salida' && navigator.sendBeacon) { navigator.sendBeacon('/api/embudo', new Blob([cuerpo], { type: 'application/json' })); return; }
    fetch('/api/embudo', { method: 'POST', body: cuerpo, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  } catch {}
}

export default function PagoDirecto({ producto, precio, boton, detalle = '' }: { producto: string; precio: number; boton: string; detalle?: string }) {
  const [estado, setEstado] = useState<'form' | 'enviando'>('form');
  const [error, setError] = useState('');
  const s = useRef('');
  const inicio = useRef(Date.now());
  const interes = useRef(false);
  const pagando = useRef(false);

  useEffect(() => {
    s.current = sesion();
    inicio.current = Date.now();
    anotar(producto, 'vista', s.current);
    const salir = () => { if (!pagando.current) anotar(producto, 'salida', s.current, (Date.now() - inicio.current) / 1000); };
    window.addEventListener('pagehide', salir);
    return () => window.removeEventListener('pagehide', salir);
  }, [producto]);

  const tocar = () => { if (!interes.current) { interes.current = true; anotar(producto, 'interes', s.current); } };

  async function pagar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado('enviando'); setError('');
    try {
      const r = await fetch('/api/pagar', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(f), condiciones: f.get('condiciones') === 'on', producto, detalle }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { setError(j.error || 'No se pudo abrir el pago. Inténtalo de nuevo.'); setEstado('form'); return; }
      pagando.current = true;
      anotar(producto, 'checkout', s.current);
      window.location.href = j.url;
    } catch { setError('Sin conexión. Inténtalo de nuevo.'); setEstado('form'); }
  }

  const campo = 'w-full rounded-xl border border-[#E4E1DC] bg-white px-4 py-3.5 text-[15px] text-[#17191E] outline-none transition focus:border-[#6E0C2B] focus:ring-2 focus:ring-[#6E0C2B]/15';

  return (
    <form onSubmit={pagar} onFocus={tocar} className="grid gap-3">
      <input id="pago-nombre" name="nombre" required maxLength={80} placeholder="Tu nombre" autoComplete="name" className={campo} />
      <input id="pago-negocio" name="negocio" required maxLength={100} placeholder="Nombre de tu negocio" autoComplete="organization" className={campo} />
      <input id="pago-email" name="email" type="email" required maxLength={254} placeholder="Correo (aquí te llega todo)" autoComplete="email" className={campo} />
      <input id="pago-telefono" name="telefono" type="tel" required maxLength={20} inputMode="tel" placeholder="Teléfono" autoComplete="tel" className={campo} />
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[#6B7079]">
        <input id="pago-condiciones" name="condiciones" type="checkbox" required className="mt-0.5 h-4 w-4 accent-[#6E0C2B]" />
        <span>Acepto los <a href="/terms" className="underline">términos</a> y la <a href="/privacy" className="underline">política de privacidad</a>.</span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-[#6E0C2B]/10 px-4 py-3 text-sm text-[#6E0C2B]">{error}</p>}
      <button type="submit" disabled={estado === 'enviando'} className="mt-1 rounded-full bg-[#6E0C2B] px-7 py-4 text-[16px] font-semibold text-white disabled:opacity-60">
        {estado === 'enviando' ? 'Abriendo el pago seguro…' : `${boton} · ${precio} €`}
      </button>
      <p className="text-center text-xs text-[#9A9EA6]">Te llevamos a la pasarela segura de Whop para pagar con tarjeta.</p>
    </form>
  );
}
