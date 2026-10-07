'use client';

import { useEffect } from 'react';
import { CODIGO_VENDEDOR, COOKIE_VENDEDOR, DIAS_VENDEDOR } from '@/lib/socio-codigo';

/** Código del enlace o QR del socio (?v=CODIGO) en esta página, si es válido. */
export function codigoDeLaUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const v = (new URLSearchParams(window.location.search).get('v') ?? '').trim().toUpperCase();
  return CODIGO_VENDEDOR.test(v) ? v : null;
}

/** Código guardado de una visita anterior (cookie de 60 días). */
export function codigoGuardado(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_VENDEDOR}=([A-Z0-9]{3,12})`));
  return m ? m[1] : null;
}

/**
 * Socio en el sistema (0052): el enlace o QR del socio lleva ?v=CODIGO. Se
 * guarda 60 días para atribuirle el alta aunque el cliente pague otro día,
 * pero solo si el visitante ha aceptado las cookies de medición. Sin
 * consentimiento, el código viaja igual en esta visita: el formulario de alta
 * lo rellena desde la URL y también se puede escribir a mano.
 */
export default function CapturaVendedor() {
  useEffect(() => {
    const guardar = () => {
      const v = codigoDeLaUrl();
      let consentido = false;
      try { consentido = localStorage.getItem('dkitchen_cookie_consent') === 'all'; } catch { /* sin almacenamiento */ }
      if (!v || !consentido) return;
      document.cookie = `${COOKIE_VENDEDOR}=${v}; Max-Age=${DIAS_VENDEDOR * 86400}; Path=/; SameSite=Lax; Secure`;
    };
    guardar();
    window.addEventListener('dk-consentimiento', guardar);
    return () => window.removeEventListener('dk-consentimiento', guardar);
  }, []);
  return null;
}
