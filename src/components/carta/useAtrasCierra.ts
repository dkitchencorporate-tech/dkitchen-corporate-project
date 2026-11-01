'use client';

import { useEffect, useRef } from 'react';

/** Mientras un modal está abierto, el botón «atrás» del móvil lo cierra en lugar de sacar al cliente de la carta.
 *  `cerrar` va en una ref (02/11/2026): si estuviera en las dependencias, cada render del padre con una función nueva
 *  repetía el efecto, su limpieza hacía history.back() y el popstate cerraba el modal (al escribir la mesa en el pedido). */
export default function useAtrasCierra(abierto: boolean, cerrar: () => void, clave: string) {
  const cerrarRef = useRef(cerrar);
  useEffect(() => { cerrarRef.current = cerrar; }, [cerrar]);
  useEffect(() => {
    if (!abierto) return;
    history.pushState({ dkModal: clave }, '');
    const atras = () => cerrarRef.current();
    window.addEventListener('popstate', atras);
    return () => {
      window.removeEventListener('popstate', atras);
      if (history.state?.dkModal === clave) history.back();
    };
  }, [abierto, clave]);
}
