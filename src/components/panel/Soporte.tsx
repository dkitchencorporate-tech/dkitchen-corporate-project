'use client';

import { useEffect, useState, useTransition } from 'react';
import type { Ticket } from '@/lib/tickets';
import { crearTicketAction } from '@/app/panel/actions';

const ETIQUETAS_ESTADO: Record<string, string> = {
  abierto: 'Abierto',
  respondido: 'Respondido',
  cerrado: 'Cerrado',
};

export default function Soporte({ tickets }: { tickets: Ticket[] }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviado, setEnviado] = useState(false);

  // Asunto precargado desde un enlace del panel (p. ej. «Lo quiero» del Setup)
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get('asunto');
    if (a) {
      setAsunto(a.slice(0, 120));
      setMensaje((m) => m || 'Hola, me interesa. ¿Me contáis los siguientes pasos?');
    }
  }, []);

  function enviar() {
    if (!asunto.trim() || !mensaje.trim()) return;
    iniciarTransicion(async () => {
      await crearTicketAction({ asunto: asunto.trim(), mensaje: mensaje.trim() });
      setAsunto('');
      setMensaje('');
      setEnviado(true);
      setTimeout(() => setEnviado(false), 3000);
    });
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Soporte</h2>

      <div className="bg-[#1c140b] border border-white/10 rounded-2xl p-6 space-y-3">
        <h3 className="font-bold">Abrir un ticket</h3>
        <input
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          placeholder="Asunto"
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/30"
        />
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Cuéntanos qué pasa"
          rows={4}
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/30"
        />
        <div className="flex items-center justify-between">
          {enviado && <p className="text-sm text-green-400">Enviado.</p>}
          <button
            onClick={enviar}
            disabled={pendiente}
            className="ml-auto bg-[#D9531E] hover:bg-[#B8451A] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {pendiente ? 'Enviando…' : 'Enviar ticket'}
          </button>
        </div>
      </div>

      {tickets.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">Tus tickets</h3>
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li key={t.id} className="bg-[#1c140b] border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold">{t.asunto}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      t.estado === 'abierto'
                        ? 'bg-amber-500/15 text-amber-400'
                        : t.estado === 'respondido'
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {ETIQUETAS_ESTADO[t.estado] ?? t.estado}
                  </span>
                </div>
                <p className="text-white/60 text-sm">{t.mensaje}</p>
                {t.respuesta && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/40 mb-1">Respuesta:</p>
                    <p className="text-sm text-white/80">{t.respuesta}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
