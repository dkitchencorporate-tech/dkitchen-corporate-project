'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { dkMeta } from '@/components/AnaliticaWeb';

/**
 * «Que me llamen» de /carta-de-autor (13/10/2026): 4 datos y DKitchen llama.
 * Va a /api/contacto con llamar=true (se guarda en contactos_web, cuenta en Campañas
 * y llega un correo «QUE ME LLAMEN» al buzón interno).
 */
const TIPOS = ['Restaurante', 'Bar de tapas', 'Cafetería', 'Pizzería o hamburguesería', 'Kebab o comida rápida', 'Pub o discoteca', 'Otro'];
const campo = 'w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-base text-white placeholder:text-white/40 focus:border-oro focus:outline-none';

export default function QueMeLlamen({ origen }: { origen: string }) {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [d, setD] = useState({ nombre: '', negocio: '', tipo: 'Bar de tapas', localidad: '', telefono: '', franja: 'tarde', web: '' });
  const [acepto, setAcepto] = useState(false);
  const [estado, setEstado] = useState<'' | 'enviando' | 'ok'>('');
  const [error, setError] = useState('');
  useEffect(() => setMontado(true), []);
  const pon = (k: keyof typeof d, v: string) => setD((x) => ({ ...x, [k]: v }));
  const valido = d.nombre.trim().length >= 2 && /^\+?[0-9 ]{9,16}$/.test(d.telefono.trim()) && acepto;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setEstado('enviando'); setError('');
    try {
      const r = await fetch('/api/contacto', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, llamar: true, interes: 'carta', consulta: 'Quiere su carta de autor (página del anuncio)', origen }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'No se pudo enviar.');
      dkMeta('Lead', { content_name: 'que_me_llamen' });
      setEstado('ok');
    } catch (er) {
      setError(er instanceof Error ? er.message : 'No se pudo enviar.'); setEstado('');
    }
  }

  return (
    <>
      <button onClick={() => setAbierto(true)} className="w-full rounded-full border border-white/30 bg-white/[0.06] px-3 py-3.5 text-[15px] font-semibold lg:px-6 lg:py-4 lg:text-base text-white backdrop-blur transition hover:border-white/60">
        Que me llamen
      </button>
      {montado && abierto && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Que me llamen">
          <button aria-label="Cerrar" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative max-h-[92svh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/10 bg-noche p-6 text-white shadow-2xl sm:rounded-[28px]">
            {estado === 'ok' ? (
              <div className="py-6 text-center">
                <p className="font-display text-3xl font-semibold text-oro">¡Hecho!</p>
                <p className="mt-3 text-white/80">Te llamamos {d.franja === 'manana' ? 'por la mañana' : d.franja === 'noche' ? 'por la noche' : 'por la tarde'} al {d.telefono}. Si lo prefieres, ten a mano una foto de tu carta.</p>
                <button onClick={() => setAbierto(false)} className="mt-6 rounded-full bg-oro px-6 py-3 font-bold text-noche">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-oro">Te llamamos nosotros</p>
                    <h2 className="font-display mt-1 text-2xl font-semibold">2 minutos y sin compromiso</h2>
                  </div>
                  <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-2xl leading-none text-white/50 hover:text-white">×</button>
                </div>
                <input className={campo} placeholder="Tu nombre" autoComplete="name" value={d.nombre} onChange={(e) => pon('nombre', e.target.value)} required minLength={2} maxLength={80} />
                <input className={campo} placeholder="Nombre del local" value={d.negocio} onChange={(e) => pon('negocio', e.target.value)} maxLength={100} />
                <div className="grid grid-cols-2 gap-3">
                  <select className={campo} value={d.tipo} onChange={(e) => pon('tipo', e.target.value)} aria-label="Tipo de local">
                    {TIPOS.map((t) => <option key={t} className="text-black">{t}</option>)}
                  </select>
                  <input className={campo} placeholder="Localidad" value={d.localidad} onChange={(e) => pon('localidad', e.target.value)} maxLength={60} />
                </div>
                <input className={campo} placeholder="Teléfono" type="tel" inputMode="tel" autoComplete="tel" value={d.telefono} onChange={(e) => pon('telefono', e.target.value)} required />
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {[['manana', 'Mañana'], ['tarde', 'Tarde'], ['noche', 'Noche']].map(([v, n]) => (
                    <button type="button" key={v} onClick={() => pon('franja', v)} className={`rounded-2xl border px-3 py-2.5 ${d.franja === v ? 'border-oro bg-oro/15' : 'border-white/15 text-white/75'}`}>{n}</button>
                  ))}
                </div>
                <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={d.web} onChange={(e) => pon('web', e.target.value)} />
                <label className="flex items-start gap-2.5 text-xs text-white/70">
                  <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#F2C14E]" />
                  <span>Acepto que DKitchen me llame para hablar de la carta digital. <a href="/privacy" className="underline">Privacidad</a>.</span>
                </label>
                {error && <p className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
                <button disabled={!valido || estado === 'enviando'} className="w-full rounded-full bg-oro px-6 py-4 font-bold text-noche disabled:opacity-40">
                  {estado === 'enviando' ? 'Enviando…' : 'Que me llamen'}
                </button>
              </form>
            )}
          </div>
        </div>, document.body)}
    </>
  );
}
