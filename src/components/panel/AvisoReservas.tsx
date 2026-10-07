'use client';

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Reserva } from '@/lib/reservas';
import { misReservasAction } from '@/app/panel/actions';
import { useCampanillaReservas } from '@/lib/alarma-camarero';
import { textoReserva, useReservasNuevas } from '@/lib/aviso-reservas';

const INTERVALO_MS = 10000;

/**
 * Reservas en tiempo real (B4, 07/10/2026): refresca la lista cada 10 s desde
 * CUALQUIER sección y, si entra una reserva nueva, suena una campanilla cada 20 s
 * con una franja verde hasta que alguien toca «Visto» o la abre. Complementa al
 * correo que ya recibe el dueño y al WhatsApp del local (si lo tiene configurado).
 */
export default function AvisoReservas({ reservas, whatsapp, onReservas, abrir, demo = false }: {
  reservas: Reserva[]; whatsapp: string | null; onReservas: Dispatch<SetStateAction<Reserva[]>>; abrir: (id: string) => void; demo?: boolean;
}) {
  useEffect(() => {
    if (demo) {
      // Demo pública: a los 8 s entra una reserva de ejemplo para enseñar el aviso
      const t = setTimeout(() => onReservas((prev) => [{
        id: `demo-${Date.now()}`, nombre: 'Marta G.', telefono: '600 000 000', email: null, fecha: new Date().toISOString().slice(0, 10), hora: '21:30',
        personas: 4, notas: 'Mesa tranquila, es un cumpleaños', estado: 'pendiente', creadaEn: new Date().toISOString(), avisadoEn: null,
      }, ...prev]), 8000);
      return () => clearTimeout(t);
    }
    const refrescar = async () => { try { onReservas(await misReservasAction()); } catch { /* red caída: siguiente ciclo */ } };
    const id = setInterval(refrescar, INTERVALO_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') void refrescar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [onReservas, demo]);

  const { nuevas, marcar } = useReservasNuevas(reservas);
  const titulo = nuevas.length === 1 ? 'Nueva reserva' : `${nuevas.length} reservas nuevas`;
  useCampanillaReservas(nuevas.length > 0, titulo);
  if (!nuevas.length) return null;

  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-40 bg-emerald-600 py-3 pl-4 pr-24 text-white shadow-2xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <p className="text-lg font-black">📅 {titulo}</p>
        <div className="flex flex-1 flex-wrap gap-2">
          {nuevas.slice(0, 4).map((r) => (
            <button key={r.id} onClick={() => { marcar([r.id]); abrir(r.id); }} className="rounded-full bg-white px-3 py-1.5 text-left text-sm font-bold text-emerald-800">
              {textoReserva(r)} →
            </button>
          ))}
        </div>
        <button onClick={() => marcar(nuevas.map((r) => r.id))} className="rounded-full border-2 border-white px-4 py-1.5 text-sm font-bold">Visto</button>
      </div>
      <p className="mx-auto mt-1 max-w-6xl text-xs text-white/85">
        También te ha llegado por correo{whatsapp ? ' y el cliente puede habértela enviado por WhatsApp' : ''}. Ábrela para confirmarla o cancelarla: el cliente recibe el aviso.
      </p>
    </div>
  );
}
