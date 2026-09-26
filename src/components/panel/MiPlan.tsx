'use client';

import { useState, useTransition } from 'react';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import { iniciarUpgradeAmpliadoAction } from '@/app/panel/actions';

const PLANES = {
  basico: {
    nombre: 'Básico',
    precio: 9,
    funciones: ['Carta digital ilimitada con fotos y alérgenos', 'QR descargable y QR físico', 'Estadísticas de escaneos', 'Soporte por ticket'],
  },
  ampliado: {
    nombre: 'Ampliado',
    precio: 25,
    funciones: [
      'Todo lo del plan Básico',
      'Llamar al camarero desde la mesa, con alarma en barra',
      'Pedir la cuenta desde la mesa',
      'Botón de reseñas de Google en la carta',
      'QR individual por mesa',
    ],
  },
} as const;

const ESTADOS: Record<string, { texto: string; color: string }> = {
  activo: { texto: 'Activa', color: 'text-green-400' },
  gracia: { texto: 'Pago pendiente (periodo de gracia)', color: 'text-amber-400' },
  suspendido: { texto: 'Suspendida por impago', color: 'text-red-400' },
};

export default function MiPlan({ restaurante }: { restaurante: MiRestaurante }) {
  const esAmpliado = restaurante.plan === 'ampliado';
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actual = esAmpliado ? PLANES.ampliado : PLANES.basico;
  const estado = ESTADOS[restaurante.estadoAcceso] ?? { texto: restaurante.estadoAcceso, color: 'text-white/60' };

  function mejorar() {
    setError(null);
    iniciar(async () => {
      try {
        const { url } = await iniciarUpgradeAmpliadoAction();
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo iniciar el pago.');
      }
    });
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Mi Plan</h2>

      <div className="bg-[#1c140b] border border-white/10 rounded-2xl p-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-white/50 text-sm">Plan actual</p>
          <p className="text-3xl font-black mt-1">{actual.nombre}</p>
          <p className="text-white/40 text-sm mt-1">{actual.precio} €/mes · sin permanencia</p>
        </div>
        <p className="text-sm">
          Cuenta: <span className={`font-semibold ${estado.color}`}>{estado.texto}</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {(['basico', 'ampliado'] as const).map((id) => {
          const p = PLANES[id];
          const esActual = restaurante.plan === id;
          return (
            <div
              key={id}
              className={`rounded-2xl p-6 border ${id === 'ampliado' ? 'border-[#D9531E]/60 bg-[#D9531E]/5' : 'border-white/10 bg-[#1c140b]'}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold text-lg">{p.nombre}</h3>
                <p className="font-black text-xl">
                  {p.precio} €<span className="text-sm font-normal text-white/40">/mes</span>
                </p>
              </div>
              <ul className="mt-4 space-y-2">
                {p.funciones.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-white/70">
                    <span className="text-[#D9531E]">✓</span> {f}
                  </li>
                ))}
              </ul>
              {esActual ? (
                <p className="mt-5 text-center text-sm font-semibold text-white/40">Tu plan actual</p>
              ) : id === 'ampliado' ? (
                <button
                  onClick={mejorar}
                  disabled={pendiente}
                  className="mt-5 w-full bg-[#D9531E] hover:bg-[#B8451A] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg"
                >
                  {pendiente ? 'Abriendo pago seguro…' : 'Pasar a Ampliado'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!esAmpliado && (
        <p className="text-xs text-white/30">
          El cambio se activa en cuanto se confirma el pago. Tu suscripción Básica se cancela para que no pagues las dos.
        </p>
      )}
    </div>
  );
}
