import 'server-only';
import { headers, cookies } from 'next/headers';
import { auth } from './auth';

/**
 * Puente entre la sesión real de Neon Auth (resuelta en 0017/Parte 17) y el
 * patrón `comoCliente(jwt, fn)` que ya usa el resto del proyecto (db.ts) —
 * ese patrón necesita un JWT verificable contra el JWKS de Neon Auth
 * (`alg: EdDSA`), no el objeto de sesión en sí ni el token de sesión plano
 * que devuelve `sign-in/email` (ese es opaco, solo sirve como cookie).
 *
 * CONFIRMADO en producción (2026-09-22): el JWT real se obtiene llamando al
 * propio endpoint proxy `GET /api/auth/token` (mismo mecanismo que
 * `authClient.token()` en el cliente) — no existe un método `auth.token()`
 * directo en el objeto que devuelve `createNeonAuth` server-side, así que se
 * llama por HTTP interno, reenviando la cookie de la petición entrante.
 */
export async function obtenerJwtDeSesion(): Promise<string | null> {
  const { data: sesion } = await auth.getSession();
  if (!sesion?.user) return null;

  try {
    const listaCookies = await cookies();
    const cabeceraCookie = listaCookies.toString();
    const listaHeaders = await headers();
    const host = listaHeaders.get('host');
    const proto = listaHeaders.get('x-forwarded-proto') ?? 'https';

    const respuesta = await fetch(`${proto}://${host}/api/auth/token`, {
      headers: { cookie: cabeceraCookie },
      cache: 'no-store',
    });
    if (!respuesta.ok) return null;

    const datos = (await respuesta.json()) as { token?: string };
    return datos.token ?? null;
  } catch (error) {
    console.error('No se pudo obtener el JWT de sesión vía /api/auth/token:', error);
    return null;
  }
}

export async function identidadActual(): Promise<{ id: string; nombre: string; email: string } | null> {
  const { data: sesion } = await auth.getSession();
  if (!sesion?.user) return null;
  return { id: sesion.user.id, nombre: sesion.user.name, email: sesion.user.email };
}
