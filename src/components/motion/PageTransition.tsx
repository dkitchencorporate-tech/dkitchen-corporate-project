'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

/**
 * Entrada suave de cada página. 18/10 (karc0: «el botón de atrás no te devuelve
 * donde estabas, te manda al principio»): antes era AnimatePresence en modo
 * «wait» con salida animada; al volver atrás la página nueva aún no existía
 * cuando Next.js restauraba el scroll y acababa arriba del todo. Ahora la página
 * se pinta al instante (sin esperar a la salida) y solo aparece con un fundido.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
