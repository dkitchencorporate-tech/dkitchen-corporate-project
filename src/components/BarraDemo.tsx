'use client';

import { useState } from 'react';

/**
 * 30/10/2026 (mapeo de karc0) + 0117: las cartas y paneles de muestra (/demo/carta, /m/demo, /demo/panel)
 * incluyen CTA directo y, en el panel de demo, un simulador interactivo de comanda entrante con aviso sonoro.
 */
export default function BarraDemo({
  texto = '¿Quieres tu carta así?',
  localSlug,
  simulador = false,
}: {
  texto?: string;
  localSlug?: string;
  simulador?: boolean;
}) {
  const [comandaActiva, setComandaActiva] = useState<{
    mesa: string;
    platos: string;
    total: string;
    hora: string;
  } | null>(null);

  const sonarTimbre = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [587.33, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.14 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.14);
        osc.stop(ctx.currentTime + i * 0.14 + 0.36);
      });
    } catch {
      // Ignorar si el navegador bloquea audio sin gesto previo
    }
  };

  const dispararSimulacion = () => {
    sonarTimbre();
    const ahora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setComandaActiva({
      mesa: 'Mesa 4 (Terraza)',
      platos: '2× Croquetas cremosas · 1× Plato principal · 2× Bebidas',
      total: '38,50 €',
      hora: ahora,
    });
  };

  return (
    <>
      <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-[#2A0A12]/95 px-4 py-2.5 text-center font-sans text-sm text-white shadow-lg backdrop-blur">
        <span className="font-semibold">
          {texto} <span className="text-[#D4AF6A]">Desde 1 €</span>
        </span>
        <span className="flex flex-wrap items-center justify-center gap-2">
          {simulador && (
            <button
              type="button"
              onClick={dispararSimulacion}
              className="rounded-full bg-emerald-400 px-4 py-1.5 font-bold text-[#0c2918] shadow-sm transition hover:bg-emerald-300"
            >
              🔔 Simular comanda en vivo (Mesa 4)
            </button>
          )}
          {localSlug && (
            <a
              href={`/m/${localSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/15 px-3.5 py-1.5 font-semibold text-white hover:bg-white/25"
            >
              Ver Carta QR ↗
            </a>
          )}
          <a href="/qr" className="rounded-full bg-[#D4AF6A] px-4 py-1.5 font-semibold text-[#1A0710]">
            Ver planes
          </a>
          <a href="/contacto?i=carta" className="rounded-full border border-white/40 px-4 py-1.5 font-semibold">
            Que me llamen
          </a>
        </span>
      </div>

      {comandaActiva && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-2xl border-2 border-emerald-400 bg-[#141414] p-4 text-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                🛎️ Nueva comanda desde QR · {comandaActiva.hora}
              </p>
              <p className="mt-1 font-display text-lg font-bold">{comandaActiva.mesa}</p>
              <p className="mt-1 text-xs text-white/80">{comandaActiva.platos}</p>
              <p className="mt-2 text-sm font-bold text-[#D4AF6A]">Total comanda: {comandaActiva.total}</p>
            </div>
            <button
              type="button"
              onClick={() => setComandaActiva(null)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
            >
              Atender ✓
            </button>
          </div>
        </div>
      )}
    </>
  );
}
