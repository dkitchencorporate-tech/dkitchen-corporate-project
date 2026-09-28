'use client';

import { useState, useTransition } from 'react';
import type { Reserva } from '@/lib/reservas';
import { cambiarEstadoReservaAction } from '@/app/panel/actions';

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

const ESTILO: Record<Reserva['estado'], string> = {
  pendiente: 'bg-amber-500/15 text-amber-700',
  confirmada: 'bg-green-500/15 text-green-700',
  cancelada: 'bg-[#EDEDEA] text-[#6B7079]',
};

/** Reservas recibidas desde la carta (plan Ampliado). */
export default function Reservas({ reservas, whatsapp }: { reservas: Reserva[]; whatsapp: string | null }) {
  const [abierta, setAbierta] = useState<Reserva | null>(null);
  const hoy = new Date().toISOString().slice(0, 10);
  const proximas = reservas.filter((r) => r.fecha >= hoy);
  const pasadas = reservas.filter((r) => r.fecha < hoy);

  const tarjeta = (r: Reserva) => (
    <li key={r.id}>
      <button onClick={() => setAbierta(r)} className="w-full rounded-2xl border border-[#E6E6E2] bg-white p-4 text-left hover:border-[#D6D6D1]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{fechaCorta(r.fecha)} · {r.hora} · {r.personas} {r.personas === 1 ? 'persona' : 'personas'}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILO[r.estado]}`}>{r.estado}</span>
        </div>
        <p className="mt-1 text-sm text-[#3F434B]">{r.nombre}</p>
        <p className="mt-2 text-xs font-semibold text-[#E8592A]">Ver detalles →</p>
      </button>
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Reservas</h2>
        <p className="text-sm text-[#6B7079]">
          Llegan desde el botón «Reservar mesa» de tu carta. Ábrelas para confirmar o cancelar: si el cliente dejó su correo, recibe el
          aviso automáticamente con tu logo y tu nombre.
          {whatsapp ? '' : ' Añade tu WhatsApp en Mi Local para recibirlas también por ahí.'}
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7079]">Próximas ({proximas.length})</h3>
        {proximas.length === 0 ? (
          <p className="rounded-2xl border border-[#E6E6E2] bg-white p-8 text-center text-sm text-[#6B7079]">No hay reservas próximas.</p>
        ) : (
          <ul className="space-y-3">{proximas.map(tarjeta)}</ul>
        )}
      </section>

      {pasadas.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7079]">Últimos 7 días</h3>
          <ul className="space-y-3 opacity-70">{pasadas.map(tarjeta)}</ul>
        </section>
      )}

      {abierta && <FichaReserva reserva={abierta} pasada={abierta.fecha < hoy} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}

function FichaReserva({ reserva, pasada, onCerrar }: { reserva: Reserva; pasada: boolean; onCerrar: () => void }) {
  const [pendiente, iniciar] = useTransition();
  const [estado, setEstado] = useState(reserva.estado);
  const [resultado, setResultado] = useState<{ correoEnviado: boolean; whatsappUrl: string | null; accion: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cambiar(nuevo: 'confirmada' | 'cancelada') {
    setError(null);
    iniciar(async () => {
      try {
        const r = await cambiarEstadoReservaAction(reserva.id, nuevo);
        setEstado(nuevo);
        setResultado({ ...r, accion: nuevo });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo actualizar.');
      }
    });
  }

  const fila = (etiqueta: string, valor: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-[#E6E6E2] py-2.5 text-sm">
      <span className="text-[#6B7079]">{etiqueta}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="ficha-reserva" onClick={(e) => e.stopPropagation()}
           className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#E6E6E2] bg-white p-6 text-[#1B1D22] sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="ficha-reserva" className="text-lg font-bold">Reserva</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-[#6B7079] hover:text-[#1B1D22]">✕</button>
        </div>

        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILO[estado]}`}>{estado}</span>
        <div className="mt-3">
          {fila('Nombre', reserva.nombre)}
          {fila('Día', fechaLarga(reserva.fecha))}
          {fila('Hora', reserva.hora)}
          {fila('Personas', reserva.personas)}
          {fila('Teléfono', <a href={`tel:${reserva.telefono.replace(/\s/g, '')}`} className="text-[#E8592A] hover:underline">{reserva.telefono}</a>)}
          {fila('Correo', reserva.email ? <a href={`mailto:${reserva.email}`} className="text-[#E8592A] hover:underline">{reserva.email}</a> : <span className="text-[#9A9EA6]">No indicado</span>)}
          {reserva.notas && fila('Notas', <span className="whitespace-pre-line">{reserva.notas}</span>)}
        </div>

        {resultado && (
          <div className="mt-4 space-y-2 rounded-xl bg-[#F3F3F0] p-4 text-sm">
            <p className="font-semibold text-green-700">✓ Reserva {resultado.accion}.</p>
            <p className="text-[#6B7079]">
              {resultado.correoEnviado
                ? 'Le hemos enviado un correo al cliente con tu logo y tu nombre.'
                : 'El cliente no dejó correo: avísale por WhatsApp o llámale.'}
            </p>
            {resultado.whatsappUrl && (
              <a href={resultado.whatsappUrl} target="_blank" rel="noopener" className="block rounded-lg bg-[#25D366] py-2.5 text-center font-bold text-white">
                Avisar también por WhatsApp
              </a>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {!pasada && !resultado && estado !== 'cancelada' && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {estado === 'pendiente' ? (
              <button disabled={pendiente} onClick={() => cambiar('confirmada')} className="rounded-xl bg-green-600 py-3 font-bold hover:bg-green-500 disabled:opacity-50">
                {pendiente ? 'Enviando…' : 'Confirmar'}
              </button>
            ) : (
              <span className="rounded-xl bg-[#F3F3F0] py-3 text-center text-sm text-[#6B7079]">Confirmada</span>
            )}
            <button disabled={pendiente} onClick={() => confirm('¿Cancelar esta reserva? Se avisará al cliente.') && cambiar('cancelada')}
                    className="rounded-xl border border-[#D6D6D1] py-3 font-bold text-[#3F434B] hover:text-[#1B1D22] disabled:opacity-50">
              Cancelar
            </button>
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-[#9A9EA6]">
          ¿Quieres que la confirmación salga sola por WhatsApp, sin pulsar nada? Pídelo en Soporte: lo configuramos con la API oficial de WhatsApp Business.
        </p>
      </div>
    </div>
  );
}
