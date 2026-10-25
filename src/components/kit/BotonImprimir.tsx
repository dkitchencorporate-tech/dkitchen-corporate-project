'use client';

/** «Imprimir o guardar en PDF»: el diálogo del navegador ya trae «Guardar como PDF». */
export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white">
      Imprimir o guardar en PDF
    </button>
  );
}
