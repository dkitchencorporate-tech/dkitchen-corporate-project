'use client';

import { useState } from 'react';

/**
 * «Invita a otro hostelero»: comparte DKitchen con el menú nativo del móvil
 * (o WhatsApp / copiar enlace). El enlace lleva ?ref=invitacion para medirlo.
 */
const URL_INVITACION = 'https://dkitchencorporate.es/qr?ref=invitacion';
const TEXTO = 'Mira esto: carta digital QR para el restaurante, la cambias desde el móvil y el primer mes cuesta 1 €.';

export default function Invitar({ oscuro = false }: { oscuro?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  async function compartir() {
    try {
      if (navigator.share) { await navigator.share({ title: 'DKitchen', text: TEXTO, url: URL_INVITACION }); return; }
    } catch { /* el usuario canceló */ return; }
    await navigator.clipboard?.writeText(`${TEXTO} ${URL_INVITACION}`);
    setCopiado(true); setTimeout(() => setCopiado(false), 2500);
  }
  const borde = oscuro ? 'border-white/15 text-white hover:border-white/40' : 'border-linea-fuerte text-tinta hover:border-tinta';
  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={compartir} className="rounded-full bg-vino px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-vino-hondo">{copiado ? 'Enlace copiado' : 'Invitar a otro hostelero'}</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${TEXTO} ${URL_INVITACION}`)}`} target="_blank" rel="noopener" className={`rounded-full border px-6 py-3.5 text-[15px] font-semibold ${borde}`}>Enviar por WhatsApp</a>
    </div>
  );
}
