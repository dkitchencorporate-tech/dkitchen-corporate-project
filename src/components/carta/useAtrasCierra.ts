'use client';

import { useEffect } from 'react';

/** Mientras un modal está abierto, el botón «atrás» del móvil lo cierra en lugar de sacar al cliente de la carta. */
export default function useAtrasCierra(abierto: boolean, cerrar: () => void, clave: string) {
  useEffect(() => {
    if (!abierto) return;
    history.pushState({ dkModal: clave }, '');
    const atras = () => cerrar();
    window.addEventListener('popstate', atras);
    return () => {
      window.removeEventListener('popstate', atras);
      if (history.state?.dkModal === clave) history.back();
    };
  }, [abierto, cerrar, clave]);
}
