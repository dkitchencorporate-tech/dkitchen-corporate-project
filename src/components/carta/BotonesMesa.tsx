'use client';

import { useEffect, useState } from 'react';

/**
 * Botones "Llamar al camarero" / "Pedir la cuenta" de la carta pública.
 * Solo aparecen si el QR es de mesa (?mesa=N) y el local tiene plan Ampliado.
 * La mesa se lee en el navegador para que la carta siga siendo estática (ISR).
 */
export default function BotonesMesa({ slug, color }: { slug: string; color: string }) {
  const [mesa, setMesa] = useState<string | null>(null);
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('mesa');
    if (m && /^[A-Za-z0-9-]{1,12}$/.test(m)) setMesa(m);
  }, []);

  if (!mesa) return null;

  async function llamar(motivo: 'camarero' | 'cuenta') {
    setEstado('enviando');
    try {
      const r = await fetch('/api/camarero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, mesa, motivo }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.resultado === 'ok' || d.resultado === 'ya_avisado') {
        setEstado('ok');
        setMensaje(motivo === 'cuenta' ? 'Te traemos la cuenta enseguida.' : 'Un camarero viene a tu mesa.');
      } else {
        setEstado('error');
        setMensaje('No se pudo avisar. Llama al personal directamente.');
      }
    } catch {
      setEstado('error');
      setMensaje('Sin conexión. Llama al personal directamente.');
    }
    setTimeout(() => setEstado('idle'), 6000);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="mx-auto max-w-2xl">
        {estado === 'ok' || estado === 'error' ? (
          <p className={`py-2 text-center text-sm font-semibold ${estado === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{mensaje}</p>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => llamar('camarero')}
              disabled={estado === 'enviando'}
              style={{ backgroundColor: color }}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              🙋 Llamar al camarero
            </button>
            <button
              onClick={() => llamar('cuenta')}
              disabled={estado === 'enviando'}
              className="flex-1 rounded-xl border border-black/15 py-3 text-sm font-bold text-black/80 disabled:opacity-60"
            >
              🧾 Pedir la cuenta
            </button>
          </div>
        )}
        <p className="mt-1 text-center text-[10px] text-black/30">Mesa {mesa}</p>
      </div>
    </div>
  );
}
