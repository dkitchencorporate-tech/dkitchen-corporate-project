import 'server-only';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/**
 * Verificación del JWT de Neon Auth en el servidor (Ruta A, 27/09/2026).
 *
 * Por qué aquí y no en Postgres: pg_session_jwt no es utilizable por dk_app en
 * Neon (esquema `auth` de cloud_admin, sin USAGE concedible). Diagnóstico en
 * SEGURIDAD_SESION_PANEL_RUTA_A_Y_B_2026-09-27.md. Patrón oficial de Neon:
 * docs/guides/rls-query-execution.
 *
 * Qué se exige, todo a la vez:
 *   - firma EdDSA contra el JWKS público de Neon Auth (algoritmo fijado: ni
 *     `none` ni HS256 con la clave pública),
 *   - emisor y audiencia = origen de NEON_AUTH_BASE_URL,
 *   - `exp` vigente (tolerancia de reloj 5 s), `iat` y `sub` presentes,
 *   - `sub` con formato UUID y usuario no baneado.
 *
 * El JWKS se cachea y, si llega un `kid` desconocido (rotación de claves de
 * Neon), jose lo vuelve a descargar solo: no hay que redeplegar.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let jwks: JWTVerifyGetKey | null = null;
let emisor: string | null = null;

function configuracion(): { jwks: JWTVerifyGetKey; emisor: string } {
  if (!jwks || !emisor) {
    const base = process.env.NEON_AUTH_BASE_URL;
    if (!base) throw new Error('Falta NEON_AUTH_BASE_URL para verificar sesiones.');
    emisor = new URL(base).origin;
    jwks = createRemoteJWKSet(new URL(`${base.replace(/\/$/, '')}/.well-known/jwks.json`), {
      cacheMaxAge: 10 * 60_000,
      cooldownDuration: 30_000,
    });
  }
  return { jwks, emisor };
}

/** Devuelve el id del usuario si el token es auténtico y vigente; si no, null. */
export async function verificarJwtNeonAuth(jwt: string): Promise<string | null> {
  if (!jwt) return null;
  const { jwks, emisor } = configuracion();
  try {
    const { payload } = await jwtVerify(jwt, jwks, {
      algorithms: ['EdDSA'],
      issuer: emisor,
      audience: emisor,
      clockTolerance: 5,
      requiredClaims: ['sub', 'exp', 'iat'],
    });
    if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) return null;
    if (payload.banned === true) return null;
    return payload.sub.toLowerCase();
  } catch (e) {
    // Solo el código del error (nunca el token) para poder diagnosticar.
    console.error('verificarJwtNeonAuth: token rechazado:', (e as { code?: string }).code ?? (e as Error).name);
    return null;
  }
}
