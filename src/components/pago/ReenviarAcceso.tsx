'use client';

import { useState } from 'react';

/**
 * «Reenviar correo» del acceso (08/10, fallo 4 de la entrada 122): vuelve a
 * mandar «Crea tu contraseña de DKitchen». Con el correo conocido es un botón;
 * sin él (inicio de sesión → «¿Olvidaste tu contraseña?») pide el correo.
 */
export default function ReenviarAcceso({ email: conocido = '', etiqueta = 'Reenviar el correo' }: { email?: string; etiqueta?: string }) {
  const [email, setEmail] = useState(conocido);
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'enviado'>('listo');
  const [error, setError] = useState('');

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim()) return;
    setEstado('enviando'); setError('');
    const res = await fetch('/api/auth/reenviar-acceso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null);
    const j = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (res?.ok) { setEstado('enviado'); return; }
    setError(j?.error ?? 'No se pudo enviar. Inténtalo de nuevo o escríbenos por WhatsApp.');
    setEstado('listo');
  }

  if (estado === 'enviado') {
    return <p role="status" className="mt-3 rounded-xl bg-papel px-4 py-3 text-[13px] text-tinta">Enviado a <strong>{email}</strong>. Llega en 1 o 2 minutos: mira también en spam y promociones.</p>;
  }

  return (
    <form onSubmit={enviar} className="mt-3">
      {!conocido && (
        <label className="block text-sm font-medium text-tinta">Tu correo
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#8B8F97] bg-white px-3.5 py-2.5 text-[15px] text-tinta focus:border-vino focus:outline-none focus:ring-2 focus:ring-vino/15" />
        </label>
      )}
      <button type="submit" disabled={estado === 'enviando' || !email.trim()}
        className={`${conocido ? '' : 'mt-3 w-full '}inline-flex items-center justify-center gap-2 rounded-full border border-vino px-5 py-2.5 text-sm font-semibold text-vino transition-colors hover:bg-vino/5 disabled:opacity-60`}>
        {estado === 'enviando' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-vino border-t-transparent" aria-hidden="true" />}
        {estado === 'enviando' ? 'Enviando…' : etiqueta}
      </button>
      {error && <p role="alert" className="mt-2 text-[13px] text-vino">{error}</p>}
    </form>
  );
}
