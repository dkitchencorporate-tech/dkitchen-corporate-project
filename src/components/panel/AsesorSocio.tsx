'use client';

import { useState, useTransition } from 'react';
import { socioPermisoAction } from '@/app/panel/actions';

/**
 * Asesor del local (0052). El dueño sabe quién le ayuda con la puesta a punto
 * y decide si puede editar su carta. El socio nunca ve pagos ni el plan.
 */
export default function AsesorSocio({ socio }: { socio: { nombre: string; puede_editar: boolean } }) {
  const [permitido, setPermitido] = useState(socio.puede_editar);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  const cambiar = () => empezar(async () => {
    setError(null);
    const r = await socioPermisoAction(!permitido);
    if (r.ok) setPermitido(!permitido);
    else setError(r.error ?? 'No se pudo guardar. Inténtalo otra vez.');
  });

  return (
    <section className="rounded-[22px] border border-linea bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">Tu asesor DKitchen</p>
      <p className="mt-2 text-lg font-semibold">{socio.nombre}</p>
      <p className="mt-1 text-sm text-niebla">
        {permitido
          ? 'Puede ayudarte a poner a punto tu carta: platos, fotos, diseño, banners y plano. Nunca ve tus pagos ni cambia tu plan, y cada cambio queda registrado.'
          : 'Le has retirado el permiso: ya no puede editar tu carta. Puedes devolvérselo cuando quieras.'}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={cambiar} disabled={pendiente}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${permitido ? 'border border-linea-fuerte bg-white text-carbon hover:bg-papel' : 'bg-tinta text-white hover:bg-black'}`}>
          {pendiente ? 'Guardando…' : permitido ? 'Retirarle el permiso de edición' : 'Permitir que edite mi carta'}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}
