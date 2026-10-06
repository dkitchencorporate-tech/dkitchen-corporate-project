'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CURVA } from './Movimiento';

/**
 * Registro desde el pie de página (29/09/2026): «Recomiendo a un hostelero»
 * y «Quiero ser partner», cada uno con su formulario de perfil en una ventana.
 * Tras enviar: agradecimiento y acceso a cada servicio.
 */
type Tipo = 'recomendacion' | 'partner';
const PERFILES = [['tpv', 'Comercial de TPV'], ['horeca', 'Distribuidor HORECA'], ['independiente', 'Comercial independiente'], ['agencia', 'Agencia'], ['otro', 'Otro']];
const SERVICIOS = [['/qr', 'Carta digital QR', 'Tu carta al día desde el móvil'], ['/signature', 'DKitchen Signature', 'Tu propia app de pedidos'], ['/experience', 'Experience', 'Eventos que llenan el local'], ['/dark-kitchen', 'Dark Kitchen', 'Marcas para domicilio']];

function Formulario({ tipo, onCerrar }: { tipo: Tipo; onCerrar: () => void }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');
  const campo = 'mt-1.5 w-full rounded-xl border border-linea bg-white px-4 py-3 text-[15px] outline-none focus:border-tinta';

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado('enviando');
    const r = await fetch('/api/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(f), tipo, consentimiento: f.get('consentimiento') === 'on' }) }).catch(() => null);
    if (r?.ok) { setEstado('ok'); return; }
    const j = await r?.json().catch(() => ({}));
    setError(j?.error ?? 'No se pudo enviar. Inténtalo en unos minutos.'); setEstado('error');
  }

  if (estado === 'ok') {
    return (
      <div className="p-7">
        <p className="font-display text-3xl font-semibold">¡Gracias!</p>
        <p className="mt-2 text-niebla">Te hemos enviado un correo y muy pronto nos pondremos en contacto contigo. Mientras tanto, conoce lo que hacemos:</p>
        <div className="mt-6 grid gap-2">
          {SERVICIOS.map(([h, t, d]) => (
            <Link key={h} href={h} onClick={onCerrar} className="group flex items-center justify-between rounded-2xl border border-linea px-4 py-3.5 hover:border-tinta">
              <span><span className="block font-semibold">{t}</span><span className="block text-sm text-niebla">{d}</span></span>
              <span className="text-vino transition-transform group-hover:translate-x-1">→</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={enviar} className="space-y-4 p-7">
      <div>
        <p className="etiqueta-dk text-vino">{tipo === 'partner' ? 'Programa de partners' : 'Entre hosteleros'}</p>
        <p className="font-display mt-2 text-2xl font-semibold">{tipo === 'partner' ? 'Gana con DKitchen' : 'Recomienda a un hostelero'}</p>
        <p className="mt-1 text-sm text-niebla">{tipo === 'partner' ? 'Comerciales de TPV, distribuidores HORECA e independientes: cuéntanos quién eres y te contamos las condiciones.' : '¿Conoces un local que siga reimprimiendo cartas? Déjanos sus datos y los tuyos, y nosotros hacemos el resto.'}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Tu nombre *<input name="nombre" required maxLength={80} autoComplete="name" className={campo} /></label>
        <label className="block text-sm font-medium">{tipo === 'partner' ? 'Empresa' : 'Tu negocio'}<input name="empresa" maxLength={80} autoComplete="organization" className={campo} /></label>
        <label className="block text-sm font-medium">Correo *<input name="email" type="email" required autoComplete="email" className={campo} /></label>
        <label className="block text-sm font-medium">Teléfono *<input name="telefono" type="tel" required autoComplete="tel" className={campo} /></label>
        {tipo === 'partner' ? (
          <>
            <label className="block text-sm font-medium">Perfil *<select name="perfil" required defaultValue="" className={campo}><option value="" disabled>Elige</option>{PERFILES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
            <label className="block text-sm font-medium">Zona<input name="zona" maxLength={80} placeholder="Ciudad o provincia" className={campo} /></label>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium">Local que recomiendas<input name="localRecomendado" maxLength={80} className={campo} /></label>
            <label className="block text-sm font-medium">Contacto del local<input name="contactoRecomendado" maxLength={120} placeholder="Nombre o teléfono" className={campo} /></label>
          </>
        )}
      </div>
      <label className="block text-sm font-medium">{tipo === 'partner' ? '¿Con qué clientes trabajas?' : 'Comentario'}<textarea name="mensaje" rows={2} maxLength={600} className={campo} /></label>
      <label className="flex items-start gap-2 text-sm text-niebla"><input type="checkbox" name="consentimiento" required className="mt-1" /> Acepto que DKitchen use estos datos para contactarme (ver <a href="/privacy" className="underline">privacidad</a>).</label>
      {estado === 'error' && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={estado === 'enviando'} className="w-full rounded-full bg-vino py-4 text-[15px] font-semibold text-white disabled:opacity-50">{estado === 'enviando' ? 'Enviando…' : 'Enviar'}</button>
    </form>
  );
}

export default function RegistroRed() {
  const [abierto, setAbierto] = useState<Tipo | null>(null);
  useEffect(() => { document.body.style.overflow = abierto ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [abierto]);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setAbierto('recomendacion')} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40">Recomendar a un hostelero</button>
        <button onClick={() => setAbierto('partner')} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40">Ser partner comercial</button>
      </div>
      <AnimatePresence>
        {abierto && (
          <motion.div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierto(null)}>
            <motion.div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} data-lenis-prevent
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.4, ease: CURVA }}
              className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#FBFAF8] text-tinta sm:max-w-lg sm:rounded-[28px]">
              <button onClick={() => setAbierto(null)} aria-label="Cerrar" className="absolute right-4 top-4 rounded-full p-2 text-niebla hover:bg-black/5">✕</button>
              <Formulario key={abierto} tipo={abierto} onCerrar={() => setAbierto(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
