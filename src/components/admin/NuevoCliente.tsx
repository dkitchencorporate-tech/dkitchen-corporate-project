'use client';

import { useState } from 'react';
import AltaUnicaModal, { type ServicioAlta, type PrefijoAlta } from '@/components/admin/AltaUnicaModal';

/**
 * «+ Nuevo» de Central (decisión 3 de karc0, 01/11): en Clientes abre el alta general;
 * en cada tablero de servicio, el alta con ese servicio ya marcado. Con `prefijo`
 * (Prospección → «Convertir en cliente») el paso 1 llega relleno.
 */
export default function NuevoCliente({ esComercial = false, servicio, etiqueta, prefijo, claro = false }: {
  esComercial?: boolean; servicio?: ServicioAlta; etiqueta?: string; prefijo?: PrefijoAlta; claro?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        data-testid={servicio ? `nuevo-${servicio}` : 'nuevo-cliente'}
        onClick={() => setAbierto(true)}
        className={`dk-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition ${claro ? 'border border-linea bg-white text-tinta hover:bg-papel' : 'bg-vino text-white hover:bg-vino-hondo'}`}
      >
        {etiqueta ?? '+ Nuevo cliente'}
      </button>
      {abierto && <AltaUnicaModal abierto alCerrar={() => setAbierto(false)} esComercial={esComercial} servicio={servicio} prefijo={prefijo} />}
    </>
  );
}
