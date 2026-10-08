'use client';

import { useState } from 'react';
import { AUDITORIA_CANALES, formatPrecio } from '@/lib/pricing-config';

/**
 * Order-bump de Auditoría+Escandallo (Parte 8, Sección 3.1-b): un único
 * clic en la propia pantalla de confirmación del pago de QR, aprovechando
 * el momento de mayor intención de compra del embudo. Nunca bloquea el
 * pago de QR ya hecho, y desaparece sin insistir si el cliente lo rechaza.
 */
export default function OrdenBumpAuditoria({
  email,
  nombreContacto,
  restauranteNombre,
}: {
  email: string;
  nombreContacto: string;
  restauranteNombre?: string;
}) {
  const [estado, setEstado] = useState<'visible' | 'cargando' | 'descartado' | 'error'>(
    email && nombreContacto ? 'visible' : 'descartado'
  );

  if (estado === 'descartado') return null;

  const activar = async () => {
    setEstado('cargando');
    try {
      const respuesta = await fetch('/api/checkout/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombreContacto, restauranteNombre }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.url) throw new Error(datos?.error ?? 'Sin URL de pago');
      window.location.href = datos.url;
    } catch (error) {
      console.error('No se pudo iniciar el checkout de Auditoría:', error);
      setEstado('error');
    }
  };

  return (
    <div className="mt-4 bg-white border border-linea rounded-[24px] p-6 md:p-8 text-left shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-widest text-vino mb-2">
        Opcional · para cuando tengas la carta
      </p>
      <h2 className="font-display text-xl md:text-2xl font-semibold text-tinta mb-2">
        ¿Sabes si tu negocio es realmente rentable?
      </h2>
      <p className="text-pizarra mb-6">
        Añade tu Auditoría de canales + Escandallo por{' '}
        <span className="line-through text-gray-400">{formatPrecio(AUDITORIA_CANALES.precioAncla)}</span>{' '}
        <span className="font-semibold text-tinta">{formatPrecio(AUDITORIA_CANALES.precioOferta)}</span> — un
        diagnóstico 1 a 1 de tu presencia digital y de los márgenes reales de tu carta.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={activar}
          disabled={estado === 'cargando'}
          className="flex-1 bg-vino text-white px-6 py-3.5 rounded-full font-semibold hover:bg-vino-hondo transition-colors disabled:opacity-60"
        >
          {estado === 'cargando' ? 'Abriendo pago…' : `Añadir por ${formatPrecio(AUDITORIA_CANALES.precioOferta)}`}
        </button>
        <button
          onClick={() => setEstado('descartado')}
          className="text-pizarra font-semibold text-sm hover:text-tinta transition-colors px-4"
        >
          No, gracias
        </button>
      </div>
      {estado === 'error' && (
        <p className="text-red-600 text-sm mt-3">
          No se pudo abrir el pago. Puedes reservarla más tarde desde{' '}
          <a href="/auditoria" className="underline font-bold">/auditoria</a>.
        </p>
      )}
    </div>
  );
}
