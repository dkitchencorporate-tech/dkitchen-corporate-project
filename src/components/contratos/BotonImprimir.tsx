'use client';

/** Guardar el contrato como PDF o imprimirlo con el diálogo del navegador. */
export default function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white hover:bg-vino-hondo print:hidden">
      Guardar en PDF o imprimir
    </button>
  );
}
