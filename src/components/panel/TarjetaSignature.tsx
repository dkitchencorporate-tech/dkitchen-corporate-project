'use client';

import { useEffect, useState } from 'react';
import { pedirLlamadaSignatureAction, registrarOfertaAction } from '@/app/panel/actions';
import type { SenalSignature } from '@/lib/servicios';

/**
 * Señal de Signature (punto 9a, 0057). Sale en Inicio cuando el local tiene
 * tracción (≥600 escaneos, ≥40 reservas o ≥300 llamadas en 30 días) y habla con
 * SU dato. «Quiero una llamada» crea un lead en Central; «Ahora no» la oculta
 * 30 días. Nunca promete cifras de ahorro que no salgan de sus datos.
 */
const DATO: Record<NonNullable<SenalSignature['motivo']>, (s: SenalSignature) => string> = {
  escaneos: (s) => `${s.escaneos.toLocaleString('es-ES')} personas han abierto tu carta en los últimos 30 días.`,
  reservas: (s) => `${s.reservas.toLocaleString('es-ES')} reservas te han llegado por tu carta en los últimos 30 días.`,
  llamadas: (s) => `Tus mesas han llamado al camarero ${s.llamadas.toLocaleString('es-ES')} veces en los últimos 30 días.`,
};

export default function TarjetaSignature({ senal, telefono, demo = false }: { senal: SenalSignature; telefono?: string | null; demo?: boolean }) {
  const [estado, setEstado] = useState<'inicio' | 'telefono' | 'enviando' | 'hecho' | 'oculta'>('inicio');
  const [tel, setTel] = useState(telefono ?? '');
  const [error, setError] = useState('');
  useEffect(() => { if (!demo) registrarOfertaAction('signature', 'mostrada').catch(() => {}); }, [demo]);
  if (!senal.motivo || estado === 'oculta') return null;

  const pedir = async () => {
    setEstado('enviando'); setError('');
    if (demo) { setTimeout(() => setEstado('hecho'), 600); return; }
    const r = await pedirLlamadaSignatureAction(tel).catch(() => ({ ok: false, error: 'No se pudo enviar. Inténtalo en unos segundos.' }));
    if (r.ok) setEstado('hecho'); else { setError(r.error ?? 'No se pudo enviar.'); setEstado('telefono'); }
  };

  return (
    <section className="relative overflow-hidden rounded-[26px] bg-noche p-6 text-white sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.45),transparent)]" />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-oro">Tu local está creciendo</p>
      <h3 className="relative font-display mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{DATO[senal.motivo](senal)}</h3>
      <p className="relative mt-3 max-w-xl text-sm text-white/70">
        Con ese movimiento, tener tu propia app empieza a salir a cuenta: pedidos a domicilio y para recoger sin la comisión de las plataformas, tu club de clientes y tus datos. Eso es DKitchen Signature.
      </p>
      {estado === 'hecho' ? (
        <p className="relative mt-6 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm">
          Hecho. Te llamamos para verlo con tus números, normalmente en un día laborable y sin compromiso.
        </p>
      ) : estado === 'telefono' || estado === 'enviando' ? (
        <div className="relative mt-6 max-w-md">
          <label htmlFor="tel-signature" className="text-xs text-white/60">¿A qué teléfono te llamamos?</label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input id="tel-signature" type="tel" inputMode="tel" autoComplete="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="600 000 000"
              className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-oro focus:outline-none" />
            <button onClick={pedir} disabled={estado === 'enviando' || tel.replace(/\D/g, '').length < 9}
              className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-oro/40 disabled:opacity-50">
              {estado === 'enviando' ? 'Enviando…' : 'Pedir la llamada'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>
      ) : (
        <div className="relative mt-6 flex flex-wrap gap-3">
          <button onClick={() => setEstado('telefono')} className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-oro/40">Quiero una llamada</button>
          <a href="/signature" target="_blank" rel="noopener" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white">Ver Signature</a>
          <button onClick={() => { setEstado('oculta'); registrarOfertaAction('signature', 'cerrada').catch(() => {}); }} className="px-2 py-2.5 text-sm text-white/55 underline-offset-4 hover:underline">Ahora no</button>
        </div>
      )}
    </section>
  );
}
