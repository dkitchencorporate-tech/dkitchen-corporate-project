'use client';

import { useState } from 'react';
import AltaUnicaModal from '@/components/admin/AltaUnicaModal';

/**
 * Botón y lanzador de «+ Nuevo cliente» en Central (0029, P1.3 boceto 30/10).
 * Abre el wizard unificado de 4 pasos para alta de Carta QR, Signature, Experience y Auditoría.
 */
export default function NuevoCliente({ esComercial = false }: { esComercial?: boolean }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-vino px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo transition"
      >
        + Nuevo cliente
      </button>

      <AltaUnicaModal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        esComercial={esComercial}
      />
    </>
  );
}
