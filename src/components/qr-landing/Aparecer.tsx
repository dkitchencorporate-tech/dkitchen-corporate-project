'use client';

import { motion } from 'framer-motion';

/** Aparición al entrar en pantalla, común a toda la web (respeta «reducir movimiento» vía Motion). */
export default function Aparecer({ children, retraso = 0, className }: { children: React.ReactNode; retraso?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: retraso, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}>
      {children}
    </motion.div>
  );
}
