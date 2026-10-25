'use client';

import { useCallback, useEffect, useState } from 'react';
import useAtrasCierra from './useAtrasCierra';
import PedidoMesa, { type PlatoPedido } from './PedidoMesa';

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
const barra = 'flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[16px] px-2 py-3 text-[13px] font-semibold tracking-[0.01em] text-white/90 transition hover:bg-white/[.06] active:scale-[.98]';
function Icono({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

export default function BotonesMesa({ slug, color, siempre = false, reservar = false, pedido = null, platos = [] }: {
  slug: string; color: string; siempre?: boolean; reservar?: boolean;
  /** Pedido desde la mesa (G, 0099): 'real' en Local y Sala (solo si llegó escaneando el QR), 'demo' en las demos internas. */
  pedido?: 'real' | 'demo' | null; platos?: PlatoPedido[];
}) {
  const [desdeQr, setDesdeQr] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [mesa, setMesa] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');
  const [pidiendo, setPidiendo] = useState(false);

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

  const cerrar = useCallback(() => setAbierto(false), []);
  useAtrasCierra(abierto, cerrar, 'camarero');

  // En las demos se enseña siempre; en un local real solo a quien está sentado (llegó por el QR).
  const puedePedir = platos.length > 0 && (pedido === 'demo' || (pedido === 'real' && desdeQr));
  const cerrarPedido = () => setPidiendo(false);

  if (!desdeQr && !siempre && !puedePedir) return null;

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
      {siempre ? (
        // Barra fija de la carta (26/10: icono + rótulo en una línea, vidrio oscuro y acento de la marca).
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:px-4">
          <div className="flex w-full max-w-[440px] items-stretch gap-1 rounded-[22px] border border-white/10 bg-[#0B0A09]/80 p-1.5 shadow-[0_24px_60px_-18px_rgba(0,0,0,.85)] ring-1 ring-black/20 backdrop-blur-2xl backdrop-saturate-150">
            {reservar && (
              <button onClick={() => window.dispatchEvent(new Event('dk:reservar'))} className={barra}>
                <Icono d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />Reservar
              </button>
            )}
            <button onClick={() => { setAbierto(true); setEstado('idle'); }} className={puedePedir ? barra : `${barra} text-white`} style={puedePedir ? undefined : { backgroundColor: color }}>
              <Icono d="M12 4a7 7 0 0 0-7 7v3h14v-3a7 7 0 0 0-7-7ZM3 17h18M12 2v2" />{puedePedir ? 'Camarero' : 'Llamar al camarero'}{mesa ? ` · ${mesa}` : ''}
            </button>
            {puedePedir && (
              <button onClick={() => setPidiendo(true)} className={`${barra} text-white`} style={{ backgroundColor: color }}>
                <Icono d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2" />Pedir
              </button>
            )}
          </div>
        </div>
      ) : (
      <>
      {puedePedir && (
        <button onClick={() => setPidiendo(true)} className="fixed bottom-[76px] right-5 z-20 rounded-full bg-[#0B0A09] px-5 py-3.5 text-sm font-bold text-white shadow-lg">
          Pedir desde la mesa
        </button>
      )}
      <button
        onClick={() => { setAbierto(true); setEstado('idle'); }}
        className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white shadow-lg"
        style={{ backgroundColor: color }}
      >
        Llamar al camarero{mesa ? ` · Mesa ${mesa}` : ''}
      </button>
      </>
      )}

      {pidiendo && pedido && <PedidoMesa slug={slug} color={color} platos={platos} modo={pedido} mesa={mesa} setMesa={setMesa} onCerrar={cerrarPedido} />}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={() => setAbierto(false)} role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="mesa-titulo" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-[28px] bg-white p-6 shadow-2xl">
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
