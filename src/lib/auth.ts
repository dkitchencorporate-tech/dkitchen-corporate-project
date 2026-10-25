import 'server-only';
import { createNeonAuth } from '@neondatabase/auth/next/server';

/**
 * Instancia de servidor de Neon Auth — envuelve el proxy hacia
 * NEON_AUTH_BASE_URL (server-only, nunca expuesta al cliente) y firma su
 * propia cookie de sesión en dkitchencorporate.es con NEON_AUTH_COOKIE_SECRET.
 *
 * Por qué un proxy y no llamar a Neon Auth directamente desde el navegador
 * (2026-09-22): las llamadas directas a /sign-in/email y
 * /request-password-reset devuelven INVALID_ORIGIN/INVALID_REDIRECT_URL de
 * forma consistente, incluso con el dominio ya registrado como confianza en
 * el propio dashboard de Neon. El paquete oficial (@neondatabase/auth,
 * requiere Next >=16) resuelve esto integrando la petición como proxy de
 * servidor identificado, en vez de una llamada cruzada desde el navegador.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
