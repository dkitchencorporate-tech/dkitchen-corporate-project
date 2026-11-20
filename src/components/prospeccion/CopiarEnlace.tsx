'use client';

import { useState } from 'react';

/** Copia el enlace de la propuesta para pegarlo a mano en un DM o un WhatsApp. */
export default function CopiarEnlace({
  texto,
  etiqueta = 'Copiar enlace',
  className = 'inline-flex items-center rounded-full bg-tinta px-4 py-2.5 text-sm font-semibold text-white',
}: {
  texto: string;
  etiqueta?: string;
  className?: string;
}) {
  const [hecho, setHecho] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(texto).then(() => { setHecho(true); setTimeout(() => setHecho(false), 2000); })}
      className={className}
    >
      {hecho ? 'Copiado ✓' : etiqueta}
    </button>
  );
}
