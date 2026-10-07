'use client';

import { useEffect, useState } from 'react';

const MENSAJES: Record<string, string> = {
  fecha_invalida: 'Elige una fecha a partir de hoy (máximo 6 meses).',
  duplicada: 'Ya hemos recibido tu reserva hace un momento.',
  datos_invalidos: 'Revisa los datos: nombre, teléfono, fecha, hora y personas.',
  no_disponible: 'Este local no acepta reservas online ahora mismo. Llámales directamente.',
  tope_plan: 'Este mes el local ya no admite más reservas online. Llámales directamente y te atienden.',
  limite: 'Demasiados intentos. Espera unos minutos.',
  error: 'No se pudo enviar. Inténtalo de nuevo o llama al local.',
};

/** Botón "Reservar mesa" + formulario (plan Ampliado). */
export default function Reservar({ slug, color, nombreLocal }: { slug: string; color: string; nombreLocal: string }) {
  const [abierto, setAbierto] = useState(false);

  // Un banner con destino «Reservar» abre este formulario.
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener('dk:reservar', abrir);
    return () => window.removeEventListener('dk:reservar', abrir);
  }, []);
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const hoy = new Date().toISOString().slice(0, 10);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado('enviando');
    try {
      const r = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, nombre: f.get('nombre'), telefono: f.get('telefono'), email: f.get('email'), fecha: f.get('fecha'),
          hora: f.get('hora'), personas: Number(f.get('personas')), notas: f.get('notas'),
        }),
      });
      const j = await r.json().catch(() => ({ resultado: 'error' }));
      if (j.resultado === 'ok') {
        setWhatsappUrl(j.whatsappUrl ?? null);
        setEstado('ok');
      } else {
        setMensaje(MENSAJES[j.resultado] ?? MENSAJES.error);
        setEstado('error');
      }
    } catch {
      setMensaje(MENSAJES.error);
      setEstado('error');
    }
  }

  const campo = 'w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm text-[#1a1a1a] focus:outline-none';

  return (
    <>
      <button
        onClick={() => { setAbierto(true); setEstado('idle'); }}
        className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        Reservar mesa
      </button>

      {abierto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAbierto(false)} role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="reserva-titulo" onClick={(e) => e.stopPropagation()}
               className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="reserva-titulo" className="text-lg font-semibold text-[#1a1a1a]">Reservar en {nombreLocal}</h2>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-black/40">✕</button>
            </div>

            {estado === 'ok' ? (
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/45">Solicitud enviada</p>
                <p className="font-semibold text-[#1a1a1a]">¡Solicitud enviada!</p>
                <p className="text-sm text-black/60">El local ha recibido tu reserva y te la confirmará en breve (por correo si lo has indicado, o por teléfono).</p>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener" className="block rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white">
                    Enviar también por WhatsApp
                  </a>
                )}
                <button onClick={() => setAbierto(false)} className="text-sm text-black/50 underline">Volver a la carta</button>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-3">
                <input name="nombre" required minLength={2} maxLength={80} placeholder="Tu nombre" autoComplete="name" className={campo} />
                <input name="telefono" required type="tel" inputMode="tel" pattern="\+?[0-9 ]{9,20}" placeholder="Teléfono" autoComplete="tel" className={campo} />
                <input name="email" type="email" maxLength={120} placeholder="Correo (para recibir la confirmación)" autoComplete="email" className={campo} />
                <div className="grid grid-cols-2 gap-3">
                  <input name="fecha" required type="date" min={hoy} defaultValue={hoy} className={campo} aria-label="Fecha" />
                  <input name="hora" required type="time" defaultValue="21:00" className={campo} aria-label="Hora" />
                </div>
                <label className="flex items-center justify-between rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1a1a1a]">
                  Personas
                  <input name="personas" required type="number" min={1} max={50} defaultValue={2} className="w-16 text-right focus:outline-none" />
                </label>
                <textarea name="notas" maxLength={300} rows={2} placeholder="Notas (opcional): terraza, trona, alergias…" className={campo} />
                {estado === 'error' && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{mensaje}</p>}
                <button disabled={estado === 'enviando'} className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: color }}>
                  {estado === 'enviando' ? 'Enviando…' : 'Solicitar reserva'}
                </button>
                <p className="text-center text-[11px] text-black/40">
                  Tus datos solo se envían a este local para gestionar la reserva.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
