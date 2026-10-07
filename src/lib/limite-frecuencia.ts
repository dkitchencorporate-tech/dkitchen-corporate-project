import 'server-only';
import { createHmac } from 'node:crypto';
import { comoVisitante } from '@/lib/db';

/**
 * Freno de frecuencia global, respaldado por Neon.
 *
 * HISTORIA, porque importa entender por qué no es más simple: la primera
 * versión de este archivo llevaba el contador en un `Map` de memoria del
 * proceso. Funcionaba en `next start` —un único proceso de larga duración— y
 * se dio por bueno con esa prueba. Contra el despliegue real de Vercel, con
 * tráfico real, 35 peticiones seguidas al mismo código de QR pasaron 35 de 35:
 * cada función serverless tiene su propia memoria, así que el contador nunca
 * se acumulaba entre invocaciones. No protegía nada.
 *
 * El contador ahora vive en Neon, en `dk.limite_frecuencia`, tras la función
 * `dk.limite_superado()` (migración 0005). Es la misma conexión y el mismo
 * sombrero (`dk_anon`/`dk_auth`) que ya usa el resto del motor: no añade
 * infraestructura nueva ni una dependencia externa.
 *
 * SOBRE LA IP: nunca se guarda en claro, y tampoco basta con un hash simple.
 * Solo hay 4300 millones de direcciones IPv4: un SHA-256 sin secreto se
 * revierte probándolas todas en segundos, así que guardar `sha256(ip)` sería
 * en la práctica guardar la IP. Por eso se usa HMAC con `DK_IP_HASH_PEPPER`,
 * un secreto que solo conoce esta aplicación y que no viaja nunca a la base:
 * lo que llega a Neon es un HMAC de 64 caracteres hexadecimales, irreversible
 * sin el secreto, y el secreto nunca sale de aquí.
 */

export function ipDeLaPeticion(peticion: Request): string {
  return peticion.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconocida';
}

/** HMAC de la IP con el secreto del proceso. Nunca se envía la IP en claro a Neon. */
export function claveDeLimite(prefijo: string, ip: string): string {
  const pepper = process.env.DK_IP_HASH_PEPPER;
  if (!pepper) {
    // Fallar cerrado sería peor que fallar sin límite en un entorno de
    // desarrollo sin el secreto configurado, pero sí debe verse en el registro:
    // desplegar sin este secreto deja el freno inoperante en silencio.
    console.error(
      'Falta DK_IP_HASH_PEPPER: el freno de frecuencia no puede identificar orígenes repetidos.'
    );
    return `${prefijo}:sin-pepper`;
  }
  return `${prefijo}:${createHmac('sha256', pepper).update(ip).digest('hex')}`;
}

/**
 * true si `clave` ha superado `limite` intentos dentro de `ventanaSegundos`.
 *
 * Delegado en `dk.limite_superado()` (migración 0005): el contador vive en una
 * tabla que ni `dk_anon` ni `dk_auth` pueden leer ni escribir directamente,
 * solo a través de esta función `SECURITY DEFINER`. Se ejecuta como visitante
 * anónimo a propósito: este freno protege rutas públicas, sin sesión, así que
 * no necesita ni debe requerir más privilegio que el que ya tiene cualquiera
 * que llega sin identificarse.
 */
export async function limiteSuperado(
  clave: string,
  limite: number,
  ventanaSegundos: number
): Promise<boolean> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query<{ limite_superado: boolean }>(
      `SELECT dk.limite_superado($1, $2, make_interval(secs => $3)) AS limite_superado`,
      [clave, limite, ventanaSegundos]
    );
    return rows[0]?.limite_superado ?? false;
  });
}

/**
 * Varios frenos en UNA sola ida a Neon (cada uno cuenta su intento: ARRAY evalúa todos, OR podría cortar). true si
 * cualquiera se ha superado. Lo usa /api/sala, que se sondea cada pocos
 * segundos desde cada móvil y no puede pagar dos viajes por petición.
 */
export async function algunLimiteSuperado(
  frenos: { clave: string; limite: number; ventanaSegundos: number }[]
): Promise<boolean> {
  if (!frenos.length) return false;
  const params: unknown[] = [];
  const exprs = frenos.map((f, i) => {
    params.push(f.clave, f.limite, f.ventanaSegundos);
    return `dk.limite_superado($${i * 3 + 1}, $${i * 3 + 2}, make_interval(secs => $${i * 3 + 3}))`;
  });
  return comoVisitante(async (c) => {
    const { rows } = await c.query<{ superado: boolean }>(`SELECT true = ANY(ARRAY[${exprs.join(', ')}]) AS superado`, params);
    return rows[0]?.superado ?? false;
  });
}
