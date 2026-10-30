'use client';

import { useState } from 'react';

/**
 * 30/10/2026 (karc0): la fase «Llamada hecha» prometía el enlace de pago y la
 * ficha no lo daba. El enlace lleva a /pagar/<producto>: el precio lo pone el
 * servidor (/api/pagar desde el catálogo), aquí solo se comparte.
 */
export default function EnlacePagoProyecto({ producto, telefono, email }: { producto: 'experience' | 'signature' | 'auditoria'; telefono: string | null; email: string }) {
  const [copiado, setCopiado] = useState(false);
  const url = `https://dkitchencorporate.es/pagar/${producto}`;
  const texto = `Hola, aquí tienes el enlace para confirmar y pagar tu servicio de DKitchen: ${url}`;
  const tel = (telefono ?? '').replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1');
  return (
    <section className="rounded-[22px] border border-vino/30 bg-white p-5">
      <p className="text-sm font-semibold">Enlace de pago</p>
      <p className="mt-1 text-xs text-niebla">Envíaselo cuando hayáis cerrado los detalles. El pago te llega por correo y queda en Proyectos; avanza entonces la fase.</p>
      <code className="mt-3 block break-all rounded-xl bg-papel p-3 text-xs">{url}</code>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={() => { navigator.clipboard?.writeText(url); setCopiado(true); }} className="rounded-full border border-linea px-4 py-2 font-semibold">{copiado ? 'Copiado ✓' : 'Copiar'}</button>
        <a href={`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener" className="rounded-full bg-[#25D366] px-4 py-2 font-semibold text-white">WhatsApp</a>
        <a href={`mailto:${email}?subject=${encodeURIComponent('Tu enlace de pago · DKitchen')}&body=${encodeURIComponent(texto)}`} className="rounded-full bg-vino px-4 py-2 font-semibold text-white">Correo</a>
      </div>
    </section>
  );
}
