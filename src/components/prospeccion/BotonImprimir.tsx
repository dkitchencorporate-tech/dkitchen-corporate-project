'use client';

/** Imprime la propuesta (la hoja se maqueta para papel con las variantes print:). */
export default function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-carbon ring-1 ring-linea print:hidden">
      Imprimir
    </button>
  );
}
