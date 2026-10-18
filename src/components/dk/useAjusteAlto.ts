'use client';

import { useEffect, useState } from 'react';

/**
 * Escala (0,5–1) para que un bloque fijado al hacer scroll quepa en pantallas
 * bajas (portátiles de 13–14", 1366×625 o 1536×730 útiles). `necesario` es el
 * alto en px que ocupa el bloque a escala 1 y `reserva` lo que se come la
 * barra de menú y los márgenes. Solo actúa desde 768 px de ancho: en móvil
 * cada componente tiene su propia maquetación. 18/10: `max` > 1 deja crecer el
 * bloque en pantallas altas (antes se quedaba pequeño en monitores grandes).
 */
export function useAjusteAlto(necesario: number, reserva: number, max = 1, min = 0.5, anchoNecesario = 0) {
  const [ajuste, setAjuste] = useState(1);
  useEffect(() => {
    const f = () => setAjuste(window.innerWidth < 768 ? 1 : Math.max(min, Math.min(max, (window.innerHeight - reserva) / necesario, anchoNecesario ? (window.innerWidth - 40) / anchoNecesario : max)));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, [necesario, reserva, max, min, anchoNecesario]);
  return ajuste;
}
