'use client';

import { useEffect, useState, useTransition } from 'react';
import type { Ticket } from '@/lib/tickets';
import { crearTicketAction } from '@/app/panel/actions';
import { abrirAyuda } from '@/components/ayuda/ChatAyuda';

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
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Soporte</h2>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-noche p-6 text-white">
        <div className="max-w-md">
          <p className="text-lg font-semibold">¿Tienes una duda? Resuélvela al momento</p>
          <p className="mt-1 text-sm text-white/65">El chat de ayuda responde las dudas más habituales paso a paso. Si no lo resuelve, se lo pasa a una persona con todo lo que has visto.</p>
        </div>
        <button onClick={abrirAyuda} className="rounded-full bg-vino px-5 py-2.5 text-sm font-bold text-white ring-1 ring-oro/40 hover:bg-vino-hondo">Abrir el chat de ayuda</button>
      </div>

      <div className="bg-white border border-linea rounded-2xl p-6 space-y-3">
        <h3 className="text-lg font-semibold">Abrir un ticket</h3>
        <input
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          placeholder="Asunto"
          className="w-full rounded-lg bg-white border border-linea px-3 py-2 text-carbon placeholder-ceniza"
        />
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Cuéntanos qué pasa"
          rows={4}
          className="w-full rounded-lg bg-white border border-linea px-3 py-2 text-carbon placeholder-ceniza"
        />
        <div className="flex items-center justify-between">
          {enviado && <p className="text-sm text-green-700">Enviado.</p>}
          <button
            onClick={enviar}
            disabled={pendiente}
            className="ml-auto bg-vino hover:bg-vino-hondo text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
          >
            {pendiente ? 'Enviando…' : 'Enviar ticket'}
          </button>
        </div>
      </div>

      {tickets.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">Tus tickets</h3>
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li key={t.id} className="bg-white border border-linea rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold">{t.asunto}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      t.estado === 'abierto'
                        ? 'bg-amber-500/15 text-amber-700'
                        : t.estado === 'respondido'
                        ? 'bg-green-500/15 text-green-700'
                        : 'bg-papel text-niebla'
                    }`}
                  >
                    {ETIQUETAS_ESTADO[t.estado] ?? t.estado}
                  </span>
                </div>
                <p className="text-niebla text-sm">{t.mensaje}</p>
                {t.respuesta && (
                  <div className="mt-3 pt-3 border-t border-linea">
                    <p className="text-xs text-niebla mb-1">Respuesta:</p>
                    <p className="text-sm text-grafito">{t.respuesta}</p>
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
