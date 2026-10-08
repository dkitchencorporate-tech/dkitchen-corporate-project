import Link from 'next/link';

/**
 * Guía corta de cada zona de Central (bloque 1b, 0061): qué es, qué se hace
 * aquí y paso a paso. Pensada para que un subadministrador o una secretaria
 * trabaje sin preguntar. Cerrada por defecto para no estorbar al que ya sabe.
 */
export default function GuiaZona({ titulo, que, pasos, ojo, ancla }: { titulo: string; que: string; pasos: string[]; ojo?: string[]; ancla?: string }) {
  return (
    <details className="group rounded-[22px] border border-linea bg-white px-5 py-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        <span><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-papel text-xs text-vino">?</span>Cómo funciona: {titulo}</span>
        <span className="text-xs font-normal text-niebla group-open:hidden">Ver guía</span>
        <span className="hidden text-xs font-normal text-niebla group-open:inline">Cerrar</span>
      </summary>
      <div className="mt-3 space-y-3 text-carbon">
        <p className="text-niebla">{que}</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          {pasos.map((p) => <li key={p}>{p}</li>)}
        </ol>
        {ojo && ojo.length > 0 && (
          <ul className="space-y-1 rounded-2xl bg-vino/[0.06] p-3 text-[13px] text-vino">
            {ojo.map((o) => <li key={o}>⚠ {o}</li>)}
          </ul>
        )}
        <p className="text-xs text-ceniza">
          Más detalle en el <Link href={`/admin-dkitchen/manual${ancla ? `#${ancla}` : ''}`} className="text-vino underline">Manual de Central</Link>. Si algo no hace lo que dice esta guía, pulsa «Avisar de un fallo».
        </p>
      </div>
    </details>
  );
}
