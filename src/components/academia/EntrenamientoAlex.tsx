'use client';

import { useState } from 'react';
import Entrenador, { type Lanzar } from '@/components/academia/Entrenador';

/** Lanzador del entrenamiento de Alex (N4 + N1–N3 juntos, todas las preguntas) y de los escenarios. */
export default function EntrenamientoAlex() {
  const [lanzar, setLanzar] = useState<Lanzar | null>(null);
  if (lanzar) return <Entrenador lanzar={lanzar} cerrar={() => setLanzar(null)} />;
  const esc = [['E1', 'Hamburguesería'], ['E2', 'Mesón'], ['E3', 'Bodega'], ['E4', 'Casa Paco']] as const;
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setLanzar({ tipo: 'test', nivel: 'ALEX', titulo: 'Entrenamiento de dirección · máxima dificultad' })} className="dk-btn flex min-h-[56px] w-full items-center justify-center rounded-full bg-vino text-base font-bold text-white" data-testid="alex-test">Hacer el test completo (N1–N4, todas las preguntas)</button>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {esc.flatMap(([e, t]) => (['pie', 'digital'] as const).map((v) => (
          <button key={e + v} type="button" onClick={() => setLanzar({ tipo: 'esc', id: e, version: v, titulo: `${t} · ${v === 'pie' ? 'a pie' : 'digital'}` })} className="min-h-[48px] rounded-2xl border border-linea bg-white px-3 text-sm font-semibold hover:border-vino">{e} · {v === 'pie' ? 'a pie' : 'digital'}</button>
        )))}
      </div>
    </div>
  );
}
