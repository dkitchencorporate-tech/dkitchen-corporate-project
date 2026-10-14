'use client';

import { useEffect, useRef, useState } from 'react';
import { GUIAS } from './GuiaSeccion';
import { formacionEstadoAction, formacionMarcarAction } from '@/app/panel/actions';

/**
 * Mini formación OBLIGATORIA la primera vez que se abre cada sección del panel (0079, 14/10/2026,
 * decisión de karc0 tras el piloto: la guía plegada no la abría nadie). Paso a paso, con
 * «Siguiente» y «Entendido»; no se cierra sin terminar. Se guarda en la base (no se repite en
 * otro móvil) y se puede repasar siempre con el botón «?» de la guía. Espera a que el montaje
 * guiado no esté en pantalla para no taparlo.
 */
export default function FormacionSeccion({ seccion }: { seccion: string }) {
  const [vistas, setVistas] = useState<string[] | null>(null);
  const [paso, setPaso] = useState(0);
  const [libre, setLibre] = useState(false);
  const pedida = useRef(false);

  useEffect(() => {
    if (pedida.current) return;
    pedida.current = true;
    formacionEstadoAction().then((e) => setVistas(e ? e.vistas : null)).catch(() => setVistas(null));
  }, []);
  useEffect(() => setPaso(0), [seccion]);
  // No se superpone al montaje guiado (su diálogo lleva #tutorial-titulo).
  useEffect(() => {
    const mirar = () => setLibre(!document.getElementById('tutorial-titulo'));
    mirar();
    const id = setInterval(mirar, 1000);
    return () => clearInterval(id);
  }, []);

  const guia = GUIAS[seccion];
  if (!guia || !vistas || vistas.includes(seccion) || !libre) return null;
  const ultimo = paso >= guia.pasos.length - 1;
  const terminar = () => {
    setVistas([...vistas, seccion]);
    formacionMarcarAction(seccion).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="formacion-titulo">
      <div className="w-full max-w-md rounded-[26px] bg-noche p-5 text-white shadow-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-oro">Formación rápida · {paso + 1} de {guia.pasos.length}</p>
        <h2 id="formacion-titulo" className="font-display mt-1 text-2xl font-semibold">{guia.titulo}</h2>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-oro transition-all" style={{ width: `${Math.round(((paso + 1) / guia.pasos.length) * 100)}%` }} />
        </div>
        <p className="mt-4 min-h-[4.5rem] text-[15px] leading-relaxed text-white/90">{guia.pasos[paso]}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          {paso > 0 ? <button onClick={() => setPaso(paso - 1)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70">Atrás</button> : <span className="text-xs text-white/50">Solo la primera vez</span>}
          <button onClick={() => (ultimo ? terminar() : setPaso(paso + 1))} className="rounded-full bg-oro px-6 py-3 text-sm font-black text-tinta">
            {ultimo ? 'Entendido ✓' : 'Siguiente →'}
          </button>
        </div>
        <p className="mt-3 text-[11px] text-white/50">Puedes repasarla cuando quieras con el botón «?» de arriba de cada sección.</p>
      </div>
    </div>
  );
}
