'use client';

import { useEffect, useState } from 'react';

/**
 * Escala (0,5–1) para que un bloque fijado al hacer scroll quepa en pantallas
 * bajas (portátiles de 13–14", 1366×625 o 1536×730 útiles). `necesario` es el
 * alto en px que ocupa el bloque a escala 1 y `reserva` lo que se come la
 * barra de menú y los márgenes. Solo actúa desde 768 px de ancho: en móvil
 * cada componente tiene su propia maquetación.
 */
export function useAjusteAlto(necesario: number, reserva: number) {
  const [ajuste, setAjuste] = useState(1);
  useEffect(() => {
    const f = () => setAjuste(window.innerWidth < 768 ? 1 : Math.max(0.5, Math.min(1, (window.innerHeight - reserva) / necesario)));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, [necesario, reserva]);
  return ajuste;
}
