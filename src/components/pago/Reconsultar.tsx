'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Vuelve a pedir la página cada 3 s mientras Stripe confirma el pago (máximo 2 minutos). */
export default function Reconsultar() {
  const router = useRouter();
  const [agotado, setAgotado] = useState(false);
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      if (n > 40) { clearInterval(t); setAgotado(true); return; }
      router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [router]);
  return agotado ? (
    <p className="mt-6 text-sm text-pizarra">Está tardando más de lo normal. Te escribiremos al correo en cuanto se confirme; si no te llega nada en una hora, responde a cualquiera de nuestros correos.</p>
  ) : null;
}
