'use client';

import { useState, useTransition } from 'react';
import type { Reserva } from '@/lib/reservas';
import { cambiarEstadoReservaAction } from '@/app/panel/actions';

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

const ESTILO: Record<Reserva['estado'], string> = {
  pendiente: 'bg-amber-500/15 text-amber-300',
  confirmada: 'bg-green-500/15 text-green-300',
  cancelada: 'bg-white/10 text-white/40',
};

/** Reservas recibidas desde la carta (plan Ampliado). */
export default function Reservas({ reservas, whatsapp }: { reservas: Reserva[]; whatsapp: string | null }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hoy = new Date().toISOString().slice(0, 10);
  const proximas = reservas.filter((r) => r.fecha >= hoy);
  const pasadas = reservas.filter((r) => r.fecha < hoy);

  function cambiar(id: string, estado: Reserva['estado']) {
    setError(null);
    iniciar(async () => {
      try { await cambiarEstadoReservaAction(id, estado); }
      catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
    });
  }

  const tarjeta = (r: Reserva) => (
    <li key={r.id} className="rounded-2xl border border-white/10 bg-[#1c140b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {fechaCorta(r.fecha)} · {r.hora} · {r.personas} {r.personas === 1 ? 'persona' : 'personas'}
        </p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILO[r.estado]}`}>{r.estado}</span>
      </div>
      <p className="mt-1 text-sm">
        {r.nombre} ·{' '}
        <a href={`tel:${r.telefono.replace(/\s/g, '')}`} className="text-[#D9531E] hover:underline">{r.telefono}</a>
      </p>
      {r.notas && <p className="mt-1 text-sm text-white/50">«{r.notas}»</p>}
      {r.estado !== 'cancelada' && r.fecha >= hoy && (
        <div className="mt-3 flex gap-4 text-sm">
          {r.estado === 'pendiente' && (
            <button disabled={pendiente} onClick={() => cambiar(r.id, 'confirmada')} className="font-semibold text-green-300 hover:text-green-200">Confirmar</button>
          )}
          <button disabled={pendiente} onClick={() => cambiar(r.id, 'cancelada')} className="text-white/50 hover:text-white">Cancelar</button>
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Reservas</h2>
        <p className="text-sm text-white/40">
          Llegan desde el botón «Reservar mesa» de tu carta. Te avisamos por correo
          {whatsapp ? ' y el cliente puede enviártela también por WhatsApp.' : '. Añade tu WhatsApp en Mi Local para recibirlas también por ahí.'}
        </p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Próximas ({proximas.length})</h3>
        {proximas.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-[#1c140b] p-8 text-center text-sm text-white/40">No hay reservas próximas.</p>
        ) : (
          <ul className="space-y-3">{proximas.map(tarjeta)}</ul>
        )}
      </section>

      {pasadas.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Últimos 7 días</h3>
          <ul className="space-y-3 opacity-70">{pasadas.map(tarjeta)}</ul>
        </section>
      )}
    </div>
  );
}
