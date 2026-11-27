import { createHash } from 'crypto';

/**
 * 0127 (27/11, Alex): huella de la red desde la que llega una petición (sha256 de la IP
 * con sal fija). Nunca se guarda la IP en claro. Central anota la red del equipo y las
 * aperturas de propuestas desde esa red no cuentan como lectura del cliente.
 */
export function huellaRed(h: Headers): string | null {
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || (h.get('x-real-ip') || '').trim();
  if (!ip) return null;
  return createHash('sha256').update(`dk-equipo:${ip}`).digest('hex');
}
