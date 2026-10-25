'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { INTERESES } from '@/lib/intereses';

/**
 * Formulario de solicitud global (29/09/2026). Cualquier enlace a
 * `#solicitud-<clave>` (o `#solicitud-<clave>~<detalle>`) lo abre, y también
 * el evento `dk:solicitud` ({ interes, detalle }). Envía a /api/solicitud.
 */
export function abrirSolicitud(interes: string, detalle = '') {
  window.dispatchEvent(new CustomEvent('dk:solicitud', { detail: { interes, detalle } }));
}

const CURVA = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function Solicitud() {
  const [abierto, setAbierto] = useState<{ interes: string; detalle: string } | null>(null);
  const [estado, setEstado] = useState<'form' | 'enviando' | 'ok'>('form');
  const [error, setError] = useState('');

  useEffect(() => {
    const abrir = (interes: string, detalle: string) => { setAbierto({ interes: INTERESES[interes] ? interes : 'contacto', detalle }); setEstado('form'); setError(''); };
    const clic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href*="#solicitud"]') as HTMLAnchorElement | null;
      if (!a) return;
      const h = a.getAttribute('href')!.split('#solicitud')[1] || '';
      const [interes, detalle = ''] = h.replace(/^-/, '').split('~');
      e.preventDefault(); e.stopPropagation();
      abrir(interes || 'contacto', decodeURIComponent(detalle));
    };
    const evento = (e: Event) => { const d = (e as CustomEvent).detail || {}; abrir(d.interes || 'contacto', d.detalle || ''); };
    document.addEventListener('click', clic, true);
    window.addEventListener('dk:solicitud', evento);
    return () => { document.removeEventListener('click', clic, true); window.removeEventListener('dk:solicitud', evento); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    if (abierto) window.dispatchEvent(new Event('modal-open')); else window.dispatchEvent(new Event('modal-close'));
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto]);

  const info = abierto ? INTERESES[abierto.interes] : null;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado('enviando'); setError('');
    try {
      const r = await fetch('/api/solicitud', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(f), consentimiento: f.get('consentimiento') === 'on', interes: abierto!.interes, detalle: abierto!.detalle, pagina: location.pathname }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || 'No se pudo enviar. Inténtalo de nuevo.'); setEstado('form'); return; }
      setEstado('ok');
    } catch { setError('Sin conexión. Inténtalo de nuevo.'); setEstado('form'); }
  }

  const campo = 'w-full rounded-xl border border-acero bg-white px-4 py-3 text-[15px] text-tinta outline-none transition focus:border-vino focus:ring-2 focus:ring-vino/15';

  return (
    <AnimatePresence>
      {abierto && info && (
        <motion.div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierto(null)}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="solicitud-titulo" onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.45, ease: CURVA }}
            className="relative max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-crema p-6 text-tinta shadow-2xl sm:rounded-[28px] sm:p-8">
            <button onClick={() => setAbierto(null)} aria-label="Cerrar" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-niebla hover:text-tinta">×</button>
            {estado === 'ok' ? (
              <div className="py-6 text-center">
                <p className="acento-serif text-5xl">Gracias.</p>
                <p className="font-display mt-4 text-2xl font-semibold">Hemos recibido tu solicitud.</p>
                <p className="mx-auto mt-3 max-w-sm text-niebla">Te hemos enviado un correo de confirmación. {info.siguiente} Te contactaremos muy pronto.</p>
                <button onClick={() => setAbierto(null)} className="mt-7 rounded-full bg-tinta px-7 py-3.5 text-sm font-semibold text-white">Seguir viendo la web</button>
              </div>
            ) : (
              <form onSubmit={enviar} className="grid gap-3">
                <p className="etiqueta-dk text-vino">{info.nombre}{abierto.detalle ? ` · ${abierto.detalle}` : ''}</p>
                <h2 id="solicitud-titulo" className="font-display pr-10 text-3xl font-semibold leading-tight">{info.titulo}</h2>
                <p className="mb-2 text-[15px] text-niebla">{info.sub}</p>
                <input id="sol-nombre" name="nombre" required maxLength={80} placeholder="Tu nombre" autoComplete="name" className={campo} />
                <input id="sol-negocio" name="negocio" maxLength={100} placeholder="Nombre de tu negocio" autoComplete="organization" className={campo} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input id="sol-email" name="email" type="email" required maxLength={254} placeholder="Correo" autoComplete="email" className={campo} />
                  <input id="sol-telefono" name="telefono" type="tel" required maxLength={20} inputMode="tel" placeholder="Teléfono" autoComplete="tel" className={campo} />
                </div>
                <textarea id="sol-mensaje" name="mensaje" rows={3} maxLength={1000} placeholder="Cuéntanos lo que necesitas (opcional)" className={campo} />
                <label className="flex items-start gap-2.5 text-xs leading-relaxed text-niebla">
                  <input id="sol-consentimiento" name="consentimiento" type="checkbox" required className="mt-0.5 h-4 w-4 accent-vino" />
                  <span>Acepto que DKitchen use estos datos para responder a mi solicitud, según la <a href="/privacy" className="underline">política de privacidad</a>.</span>
                </label>
                {error && <p role="alert" className="rounded-xl bg-vino/10 px-4 py-3 text-sm text-vino">{error}</p>}
                <button type="submit" disabled={estado === 'enviando'} className="mt-2 rounded-full bg-vino px-7 py-4 text-[15px] font-semibold text-white disabled:opacity-60">
                  {estado === 'enviando' ? 'Enviando…' : info.boton}
                </button>
                <p className="text-center text-xs text-ceniza">Te respondemos en menos de 24 horas laborables.</p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
