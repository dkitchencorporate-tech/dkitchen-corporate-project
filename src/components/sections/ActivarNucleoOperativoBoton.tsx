'use client';

import { useState } from 'react';

/**
 * Dispara el checkout real de Whop para Núcleo Operativo — Nivel B (Parte 8,
 * Sección 1): pago único al precio fijo publicado, sin negociar nada antes.
 * Convive con "Agendar Consultoría y Activar" (ConsultingModal) a propósito
 * — no lo sustituye: algunos clientes de 700€ prefieren hablar antes, y
 * ambos caminos disparan la misma tubería de post-pago en cuanto se paga.
 */
export default function ActivarNucleoOperativoBoton({ className }: { className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [restauranteNombre, setRestauranteNombre] = useState('');
  const [nombreContacto, setNombreContacto] = useState('');
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await fetch('/api/checkout/nucleo-operativo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restauranteNombre, nombreContacto, email }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.url) throw new Error(datos?.error ?? 'No se pudo iniciar el pago.');
      window.location.href = datos.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago.');
      setCargando(false);
    }
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className={className}>
        Pagar y activar ahora · 700 €
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setAbierto(false)}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={activar}
        className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-gray-900"
      >
        <h3 className="text-xl font-black mb-1">Activar DKitchen Signature</h3>
        <p className="text-gray-500 text-sm mb-6">Entrada única de 700 € (después, 69 €/mes de mantenimiento). Te escribimos para ponerla en marcha.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del negocio</label>
            <input
              type="text"
              required
              maxLength={80}
              value={restauranteNombre}
              onChange={(e) => setRestauranteNombre(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-[#D9531E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tu nombre</label>
            <input
              type="text"
              required
              maxLength={80}
              value={nombreContacto}
              onChange={(e) => setNombreContacto(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-[#D9531E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tu correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-[#D9531E] outline-none"
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="mt-6 w-full bg-[#D9531E] text-white font-black py-3.5 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {cargando ? 'Abriendo pago…' : 'Continuar al pago'}
        </button>
      </form>
    </div>
  );
}
