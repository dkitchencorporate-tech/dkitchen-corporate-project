/** Los 3 pasos del checkout nativo (08/10/2026): Tus datos → Pago seguro → Acceso. */
const PASOS = ['Tus datos', 'Pago seguro', 'Acceso'];

export default function PasosPago({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto flex max-w-xl items-center justify-between gap-2" aria-label="Pasos del pago">
      {PASOS.map((p, i) => {
        const n = i + 1;
        const hecho = n < actual;
        const activo = n === actual;
        return (
          <li key={p} className="flex flex-1 items-center gap-2" aria-current={activo ? 'step' : undefined}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${hecho ? 'bg-vino text-white' : activo ? 'border-2 border-vino text-vino' : 'border border-acero text-pizarra'}`}>
              {hecho ? '✓' : n}
            </span>
            <span className={`text-[13px] sm:text-sm ${activo ? 'font-semibold text-tinta' : 'text-pizarra'}`}>{p}</span>
            {n < PASOS.length && <span className="mx-1 hidden h-px flex-1 bg-linea sm:block" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
