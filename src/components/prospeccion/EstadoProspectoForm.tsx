'use client';

import { useState } from 'react';
import { ESTADOS, MOTIVOS } from '@/lib/prospeccion-catalogo';

/**
 * 0128 (27/11, Alex): zona de estado lógica. La etapa avanza sola con el Francotirador
 * («Propuesta enviada»); aquí se corrige a mano, se escribe la situación con palabras propias
 * y se fija el siguiente paso. Motivo solo al descartar; enlace de alta solo si es cliente.
 */
export default function EstadoProspectoForm({
  accion, base, id, estado, motivo, siguiente, fecha,
}: {
  accion: (f: FormData) => void | Promise<void>;
  base: string; id: string; estado: string; motivo: string | null; siguiente: string | null; fecha: string | null;
}) {
  const [e, setE] = useState(estado);
  const campo = 'w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm text-carbon focus:border-vino focus:outline-none';
  return (
    <form action={accion} className="mt-3 space-y-3">
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado_actual" value={estado} />
      <input type="hidden" name="siguiente_actual" value={siguiente ?? ''} />
      <input type="hidden" name="fecha_actual" value={fecha ?? ''} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-grafito">Etapa
          <select name="estado" value={e} onChange={(x) => setE(x.target.value)} className={`${campo} mt-1`}>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        {e === 'descartado' && (
          <label className="block text-xs font-semibold text-grafito">Motivo del descarte
            <select name="motivo" defaultValue={motivo ?? ''} required className={`${campo} mt-1`}>
              <option value="">Elige el motivo</option>
              {Object.entries(MOTIVOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        )}
        {e === 'cliente' && (
          <label className="block text-xs font-semibold text-grafito">Su local en DKitchen (opcional)
            <input name="slug" maxLength={80} placeholder="slug del alta, p. ej. la-gondola" className={`${campo} mt-1`} />
          </label>
        )}
      </div>
      <label className="block text-xs font-semibold text-grafito">Situación, con tus palabras
        <textarea name="situacion" rows={2} maxLength={1000} placeholder="Ej.: abrió la propuesta, le interesa Signature para el local nuevo; llamar el lunes por la tarde." className={`${campo} mt-1`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block text-xs font-semibold text-grafito">Siguiente paso
          <input name="siguiente" maxLength={200} defaultValue={siguiente ?? ''} placeholder="Llamar, visitar, enviar precio…" className={`${campo} mt-1`} />
        </label>
        <label className="block text-xs font-semibold text-grafito">Fecha
          <input name="fecha" type="date" defaultValue={fecha ?? ''} className={`${campo} mt-1`} />
        </label>
      </div>
      <button className="inline-flex min-h-[44px] items-center rounded-full bg-tinta px-5 text-sm font-semibold text-white hover:bg-vino">Guardar</button>
    </form>
  );
}
