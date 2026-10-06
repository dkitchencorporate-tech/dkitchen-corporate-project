'use client';

import { useState, useTransition } from 'react';
import type { SolicitudQrFisico, TipoQrFisico } from '@/lib/solicitudes-qr-fisico';
import { crearSolicitudQrFisicoAction } from '@/app/panel/actions';

const ETIQUETAS_ESTADO: Record<string, string> = {
  solicitado: 'Solicitado — a la espera de presupuesto',
  presupuestado: 'Presupuesto enviado — revisa tu correo/WhatsApp',
  pagado: 'Pagado — en cola de producción',
  en_produccion: 'En producción',
  enviado: 'Enviado',
};

export default function MiQr({
  codigoQr,
  restauranteNombre,
  solicitudes,
}: {
  codigoQr: string | null;
  restauranteNombre: string;
  solicitudes: SolicitudQrFisico[];
}) {
  return (
    <div className="space-y-8">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Mi QR</h2>

      {codigoQr ? (
        <div className="bg-white border border-linea rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/mi-qr/imagen"
            alt={`Código QR de ${restauranteNombre}`}
            className="w-40 h-40 rounded-xl border border-linea bg-white"
          />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-niebla text-sm mb-1">
              Este QR apunta siempre a la misma dirección — imprímelo una vez, cámbialo las veces que
              quieras desde "Mi Carta" y nunca tendrás que reimprimirlo.
            </p>
            <a
              href="/api/mi-qr/imagen"
              download
              className="inline-block mt-3 bg-vino hover:bg-vino-hondo text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
            >
              Descargar PNG en alta resolución
            </a>
          </div>
        </div>
      ) : (
        <p className="text-niebla">Todavía no tienes un código QR activo.</p>
      )}

      <FormularioQrFisico />

      {solicitudes.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">Tus solicitudes de QR físico</h3>
          <ul className="space-y-2">
            {solicitudes.map((s) => (
              <li
                key={s.id}
                className="bg-white border border-linea rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium">
                    {s.tipo} × {s.cantidad}
                  </p>
                  <p className="text-xs text-niebla">{new Date(s.creadoEn).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-grafito">{ETIQUETAS_ESTADO[s.estado] ?? s.estado}</p>
                  {s.precioCentimos != null && (
                    <p className="text-xs text-niebla">{(s.precioCentimos / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const TIPOS: { id: TipoQrFisico; nombre: string; nota: string }[] = [
  { id: 'etiquetas', nombre: 'Etiquetas adhesivas', nota: 'Para pegar en mesa' },
  { id: 'vinilo', nombre: 'Vinilo', nota: 'A presupuesto' },
  { id: 'atril', nombre: 'Atril de sobremesa', nota: 'A presupuesto' },
  { id: 'metacrilato', nombre: 'Metacrilato', nota: 'A presupuesto' },
];

function FormularioQrFisico() {
  const [pendiente, iniciarTransicion] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [tipo, setTipo] = useState<TipoQrFisico>('etiquetas');
  const [cantidad, setCantidad] = useState('50');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  if (enviado) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
        <p className="text-green-700 font-bold">Solicitud enviada.</p>
        <p className="text-niebla text-sm mt-1">
          Te contactaremos por email o WhatsApp con el presupuesto antes de fabricar nada.
        </p>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full sm:w-auto border-2 border-dashed border-linea-fuerte hover:border-vino/50 rounded-2xl p-6 text-center text-niebla hover:text-carbon transition-colors"
      >
        + Pide tu QR físico profesional
      </button>
    );
  }

  function enviar() {
    if (!direccion.trim() || !cantidad) return;
    iniciarTransicion(async () => {
      await crearSolicitudQrFisicoAction({
        tipo,
        cantidad: Number(cantidad),
        direccionEnvio: direccion.trim(),
        notas: notas.trim() || undefined,
      });
      setEnviado(true);
    });
  }

  return (
    <div className="bg-white border border-linea rounded-2xl p-6 space-y-4">
      <h3 className="text-lg font-semibold">Pide tu QR físico profesional</h3>
      <p className="text-niebla text-sm">
        Todo formato se cotiza antes de fabricar — te escribimos con el presupuesto y solo se produce
        una vez pagado.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTipo(t.id)}
            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
              tipo === t.id ? 'border-vino bg-vino/10' : 'border-linea hover:border-linea-fuerte'
            }`}
          >
            <p className="text-sm font-semibold">{t.nombre}</p>
            <p className="text-xs text-niebla">{t.nota}</p>
          </button>
        ))}
      </div>

      <input
        type="number"
        min="1"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        placeholder="Cantidad"
        className="w-full rounded-lg bg-white border border-acero px-3 py-2 text-carbon placeholder-ceniza"
      />
      <input
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        placeholder="Dirección de envío"
        className="w-full rounded-lg bg-white border border-acero px-3 py-2 text-carbon placeholder-ceniza"
      />
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Notas (opcional)"
        rows={2}
        className="w-full rounded-lg bg-white border border-acero px-3 py-2 text-carbon placeholder-ceniza"
      />

      <div className="flex justify-end gap-3">
        <button onClick={() => setAbierto(false)} className="text-sm text-niebla hover:text-grafito">
          Cancelar
        </button>
        <button
          onClick={enviar}
          disabled={pendiente}
          className="bg-vino hover:bg-vino-hondo text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          {pendiente ? 'Enviando…' : 'Pedir presupuesto'}
        </button>
      </div>
    </div>
  );
}
