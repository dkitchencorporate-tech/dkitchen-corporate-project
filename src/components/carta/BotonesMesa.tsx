'use client';

import { useEffect, useState } from 'react';

const MESA = /^[A-Za-z0-9-]{1,12}$/;
const CLAVE = 'dk-mesa';

/**
 * "Llamar al camarero" / "Pedir la cuenta" (plan Ampliado).
 *
 * Solo aparece si quien mira la carta ha llegado ESCANEANDO el QR (`?qr=1`,
 * que añade /r/{codigo}): desde Google o un enlace compartido no hay nadie
 * sentado a quien atender. Se recuerda en la sesión del navegador para que
 * siga visible al moverse por la carta.
 *
 * La mesa llega rellenada si el QR es de mesa (`?mesa=N`) y se puede cambiar
 * (mesas juntadas). Antirrepetición y límites: /api/camarero + dk.llamar_camarero.
 */
export default function BotonesMesa({ slug, color }: { slug: string; color: string }) {
  const [desdeQr, setDesdeQr] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [mesa, setMesa] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    let guardada: { slug: string; mesa: string } | null = null;
    try { guardada = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null'); } catch { /* modo privado */ }
    const mesaUrl = p.get('mesa');
    if (p.get('qr') === '1' || (guardada && guardada.slug === slug)) {
      setDesdeQr(true);
      const m = mesaUrl && MESA.test(mesaUrl) ? mesaUrl : guardada?.slug === slug ? guardada.mesa : '';
      setMesa(m);
      try { sessionStorage.setItem(CLAVE, JSON.stringify({ slug, mesa: m })); } catch { /* modo privado */ }
    }
  }, [slug]);

  if (!desdeQr) return null;

  async function llamar(motivo: 'camarero' | 'cuenta') {
    const m = mesa.trim();
    if (!MESA.test(m)) {
      setEstado('error');
      setMensaje('Escribe el número de tu mesa.');
      return;
    }
    try { sessionStorage.setItem(CLAVE, JSON.stringify({ slug, mesa: m })); } catch { /* modo privado */ }
    setEstado('enviando');
    try {
      const r = await fetch('/api/camarero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, mesa: m, motivo }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.resultado === 'ok' || j.resultado === 'ya_avisado') {
        setEstado('ok');
        setMensaje(
          j.resultado === 'ya_avisado'
            ? `Ya hemos avisado para la mesa ${m}. Enseguida te atienden.`
            : motivo === 'cuenta' ? `Hemos pedido la cuenta para la mesa ${m}.` : `Camarero avisado para la mesa ${m}.`
        );
        setTimeout(() => { setAbierto(false); setEstado('idle'); }, 3500);
      } else {
        setEstado('error');
        setMensaje(j.resultado === 'limite' ? 'Demasiadas llamadas seguidas. Espera un momento.' : 'No se pudo avisar. Avisa a nuestro equipo con la mano, por favor.');
      }
    } catch {
      setEstado('error');
      setMensaje('Sin conexión. Inténtalo de nuevo.');
    }
  }

  return (
    <>
      <button
        onClick={() => { setAbierto(true); setEstado('idle'); }}
        className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white shadow-lg"
        style={{ backgroundColor: color }}
      >
        Llamar al camarero{mesa ? ` · Mesa ${mesa}` : ''}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAbierto(false)} role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="mesa-titulo" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-t-3xl bg-white p-6 sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 id="mesa-titulo" className="text-lg font-semibold text-[#1a1a1a]">¿Qué necesitas?</h2>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-black/40">✕</button>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-black/15 px-4 py-3 text-[#1a1a1a]">
              <span className="text-sm font-medium">Tu mesa</span>
              <input
                value={mesa}
                onChange={(e) => setMesa(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 12))}
                inputMode="numeric"
                placeholder="Nº"
                aria-label="Número de mesa"
                className="w-20 text-right text-xl font-bold focus:outline-none"
              />
            </label>
            <p className="-mt-2 text-xs text-black/40">Si habéis juntado mesas, pon el número de cualquiera de ellas.</p>
            {estado === 'ok' ? (
              <p className="rounded-xl bg-green-50 p-3 text-center text-sm font-semibold text-green-800">✓ {mensaje}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button disabled={estado === 'enviando'} onClick={() => llamar('camarero')} className="rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: color }}>
                  Llamar al camarero
                </button>
                <button disabled={estado === 'enviando'} onClick={() => llamar('cuenta')} className="rounded-xl border border-black/15 py-3.5 text-sm font-bold text-[#1a1a1a] disabled:opacity-60">
                  Pedir la cuenta
                </button>
              </div>
            )}
            {estado === 'error' && <p className="text-center text-sm text-red-700">{mensaje}</p>}
          </div>
        </div>
      )}
    </>
  );
}
