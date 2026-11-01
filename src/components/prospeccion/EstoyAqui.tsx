'use client';

import { useRef, useState } from 'react';
import { situarAction } from '@/lib/prospeccion-acciones';

/** 0114 · «Estoy aquí»: sitúa el local en el mapa con el GPS del móvil (se pide permiso al tocar). */
export default function EstoyAqui({ base, id, situado }: { base: string; id: string; situado: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const lat = useRef<HTMLInputElement>(null);
  const lng = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<'' | 'buscando' | 'sin'>('');
  const pedir = () => {
    if (!navigator.geolocation) { setEstado('sin'); return; }
    setEstado('buscando');
    navigator.geolocation.getCurrentPosition((p) => {
      lat.current!.value = String(p.coords.latitude); lng.current!.value = String(p.coords.longitude);
      form.current!.requestSubmit();
    }, () => setEstado('sin'), { timeout: 8000, enableHighAccuracy: true });
  };
  return (
    <form ref={form} action={situarAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="fuente" value="gps" />
      <input ref={lat} type="hidden" name="lat" />
      <input ref={lng} type="hidden" name="lng" />
      <button type="button" onClick={pedir} className="inline-flex items-center rounded-full bg-papel px-4 py-2.5 text-sm font-semibold text-carbon ring-1 ring-linea">
        📍 {estado === 'buscando' ? 'Buscando…' : situado ? 'Corregir posición (estoy aquí)' : 'Estoy aquí: situar en el mapa'}
      </button>
      {estado === 'sin' && <span className="text-xs text-red-700">Sin permiso de ubicación.</span>}
    </form>
  );
}
