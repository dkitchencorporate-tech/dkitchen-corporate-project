'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LlamadaCamarero } from '@/lib/llamadas-camarero';
import { atenderLlamadaAction, llamadasPendientesAction } from '@/app/panel/actions';
import { esIOS, useAlarmaLlamadas } from '@/lib/alarma-camarero';

const INTERVALO_MS = 5000;
/** Evento para que la sección «Llamadas» y esta alarma se enteren al momento de una llamada atendida. */
export const EVENTO_LLAMADAS = 'dk-llamadas-cambio';

/**
 * Alarma global del panel (B1, 07/10/2026): vigila las llamadas de mesa desde
 * CUALQUIER sección y suena en bucle hasta que se marcan como atendidas.
 * Si el navegador aún no deja sonar, muestra una franja que pide un toque.
 */
export default function AlarmaLlamadas({ enLlamadas, irALlamadas }: { enLlamadas: boolean; irALlamadas: () => void }) {
  const [llamadas, setLlamadas] = useState<LlamadaCamarero[]>([]);
  const { listo, activar } = useAlarmaLlamadas(llamadas.length > 0, llamadas.length === 1 ? `Mesa ${llamadas[0].mesa} llama` : `${llamadas.length} mesas llaman`);

  const refrescar = useCallback(async () => {
    try { setLlamadas(await llamadasPendientesAction()); } catch { /* red caída: siguiente ciclo */ }
  }, []);

  useEffect(() => {
    refrescar();
    const id = setInterval(refrescar, INTERVALO_MS);
    window.addEventListener(EVENTO_LLAMADAS, refrescar);
    return () => { clearInterval(id); window.removeEventListener(EVENTO_LLAMADAS, refrescar); };
  }, [refrescar]);

  async function atender(id: string) {
    setLlamadas((prev) => prev.filter((l) => l.id !== id));
    await atenderLlamadaAction(id).catch(() => {});
    window.dispatchEvent(new Event(EVENTO_LLAMADAS));
  }

  return (
    <>
      {!listo && (
        <button onClick={activar} className="block w-full bg-amber-400 px-4 py-2 text-center text-sm font-bold text-black">
          🔔 Toca aquí para activar el sonido de las llamadas de mesa
        </button>
      )}
      {llamadas.length > 0 && !enLlamadas && (
        <div role="alert" className="fixed inset-x-0 top-0 z-50 animate-pulse bg-red-600 px-4 py-3 text-white shadow-2xl">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
            <p className="text-lg font-black">🔔 {llamadas.length === 1 ? 'Una mesa está llamando' : `${llamadas.length} mesas están llamando`}</p>
            <div className="flex flex-1 flex-wrap gap-2">
              {llamadas.slice(0, 6).map((l) => (
                <button key={l.id} onClick={() => atender(l.id)} className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-red-700">
                  Mesa {l.mesa} · {l.motivo === 'cuenta' ? 'cuenta' : 'camarero'} ✓
                </button>
              ))}
            </div>
            <button onClick={irALlamadas} className="rounded-full border-2 border-white px-4 py-1.5 text-sm font-bold">Ver llamadas</button>
          </div>
          {esIOS() && <p className="mx-auto mt-1 max-w-6xl text-xs text-white/80">En iPhone, quita el modo silencio para oír la alarma.</p>}
        </div>
      )}
    </>
  );
}
