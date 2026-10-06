'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LlamadaCamarero } from '@/lib/llamadas-camarero';
import { atenderLlamadaAction, llamadasPendientesAction } from '@/app/panel/actions';

const INTERVALO_MS = 8000;

/** Pitido corto con WebAudio: no necesita ningún archivo de sonido. */
function pitar(ctx: AudioContext) {
  [0, 0.25].forEach((t) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + t);
    o.stop(ctx.currentTime + t + 0.22);
  });
}

function haceCuanto(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`;
}

export default function Camarero({ slug, codigoQr }: { slug: string; codigoQr: string | null }) {
  const [llamadas, setLlamadas] = useState<LlamadaCamarero[]>([]);
  const [sonido, setSonido] = useState(false);
  const [mesas, setMesas] = useState(10);
  const audio = useRef<AudioContext | null>(null);
  const vistas = useRef<Set<string>>(new Set());

  const refrescar = useCallback(async () => {
    try {
      const nuevas = await llamadasPendientesAction();
      const hayNueva = nuevas.some((l) => !vistas.current.has(l.id));
      nuevas.forEach((l) => vistas.current.add(l.id));
      if (hayNueva && audio.current) pitar(audio.current);
      setLlamadas(nuevas);
    } catch {
      /* red caída: se reintenta en el siguiente ciclo */
    }
  }, []);

  useEffect(() => {
    refrescar();
    const id = setInterval(refrescar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [refrescar]);

  function activarSonido() {
    audio.current = audio.current ?? new AudioContext();
    audio.current.resume();
    pitar(audio.current);
    setSonido(true);
  }

  async function atender(id: string) {
    setLlamadas((prev) => prev.filter((l) => l.id !== id));
    await atenderLlamadaAction(id);
  }

  const base = codigoQr ? `https://dkitchencorporate.es/r/${codigoQr}` : `https://dkitchencorporate.es/m/${slug}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Llamadas de mesa</h2>
          <p className="text-sm text-niebla">Deja esta pantalla abierta en la barra. Se actualiza sola cada 8 segundos.</p>
        </div>
        {!sonido ? (
          <button onClick={activarSonido} className="shrink-0 bg-vino hover:bg-vino-hondo text-white text-sm font-bold px-4 py-2 rounded-full">
            🔔 Activar alarma sonora
          </button>
        ) : (
          <span className="shrink-0 text-sm text-green-700">🔔 Alarma activa</span>
        )}
      </div>

      {llamadas.length === 0 ? (
        <div className="bg-white border border-linea rounded-2xl p-10 text-center text-niebla">
          Ninguna mesa está llamando ahora mismo.
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {llamadas.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-vino bg-vino/10 p-5 animate-pulse">
              <div>
                <p className="text-2xl font-black">Mesa {l.mesa}</p>
                <p className="text-sm text-niebla">
                  {l.motivo === 'cuenta' ? 'Pide la cuenta' : 'Llama al camarero'} · {haceCuanto(l.creadaEn)}
                </p>
              </div>
              <button onClick={() => atender(l.id)} className="rounded-full bg-tinta text-white px-4 py-2 text-sm font-bold">
                Atendida
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="bg-white border border-linea rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold">QR por mesa</h3>
        <p className="text-sm text-niebla">
          Cada mesa necesita su propio QR para saber quién llama. Descarga uno por mesa e imprímelos.
        </p>
        <label className="flex items-center gap-3 text-sm text-niebla">
          Número de mesas
          <input
            type="number"
            min={1}
            max={80}
            value={mesas}
            onChange={(e) => setMesas(Math.min(80, Math.max(1, Number(e.target.value) || 1)))}
            className="w-20 rounded-lg bg-white border border-linea px-2 py-1 text-carbon"
          />
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {Array.from({ length: mesas }, (_, i) => i + 1).map((n) => (
            <a
              key={n}
              href={`/api/mi-qr/imagen?mesa=${n}`}
              className="rounded-lg border border-linea py-2 text-center text-sm font-semibold hover:border-vino hover:text-vino"
            >
              Mesa {n}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-ceniza break-all">Enlace de ejemplo: {base}?mesa=1</p>
      </section>
    </div>
  );
}
