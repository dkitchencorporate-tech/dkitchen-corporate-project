import type { PlatoCarta } from '@/lib/menu';

/**
 * Extras del Estudio de carta (0037) en la carta pública: etiqueta, precio
 * normal tachado durante una promoción y contenido de los combos con su
 * ahorro. Sin estado: sirven tanto en servidor como en la ficha del plato.
 */
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const NOMBRES = { especial: 'Especial', nuevo: 'Nuevo', recomendado: 'Recomendado' } as const;

export function EtiquetaPlato({ plato }: { plato: PlatoCarta }) {
  if (!plato.etiqueta && !plato.combo?.length && !plato.precioAnterior) return null;
  const texto = plato.combo?.length ? 'Combo' : plato.etiqueta ? NOMBRES[plato.etiqueta] : 'Promoción';
  return (
    <span className="mr-2 inline-block rounded-full px-2 py-0.5 align-[2px] text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: 'var(--marca)' }}>
      {texto}
    </span>
  );
}

export function PrecioAnterior({ plato }: { plato: PlatoCarta }) {
  if (!plato.precioAnterior) return null;
  return <s className="mr-1.5 whitespace-nowrap text-[0.85em] font-normal opacity-50" aria-label={`Antes ${euros.format(Number(plato.precioAnterior))}`}>{euros.format(Number(plato.precioAnterior))}</s>;
}

export function ComboPlato({ plato, completo = false }: { plato: PlatoCarta; completo?: boolean }) {
  if (!plato.combo?.length) return null;
  const lista = plato.combo.map((c) => (c.cantidad > 1 ? `${c.cantidad} × ${c.nombre}` : c.nombre));
  return (
    <span className={`block ${completo ? '' : 'mt-1'} text-sm leading-relaxed text-black/60`}>
      <span className="sr-only">Incluye: </span>{lista.join(' + ')}
      {plato.ahorro && Number(plato.ahorro) > 0 && (
        <span className="ml-1.5 whitespace-nowrap font-semibold" style={{ color: 'var(--marca)' }}>· Ahorras {euros.format(Number(plato.ahorro))}</span>
      )}
    </span>
  );
}
