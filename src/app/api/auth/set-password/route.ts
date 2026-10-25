import { NextResponse } from 'next/server';
import { fijarContrasena, ErrorNeonAuth } from '@/lib/neon-auth';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const LIMITE_POR_IP = 8;
const VENTANA_SEGUNDOS = 10 * 60;

/**
 * Proxy de servidor hacia Better Auth para fijar la contraseña.
 *
 * El formulario de /panel/nueva-contrasena llama aquí en vez de a Neon Auth
 * directamente: NEON_AUTH_BASE_URL es una variable de servidor, no pública, y
 * así el token de reseteo nunca aparece en el bundle ni en herramientas de
 * red del cliente salvo la propia petición a este dominio.
 */
export async function POST(request: Request) {
  try {
    const clave = claveDeLimite('set-password', ipDeLaPeticion(request));
    if (await limiteSuperado(clave, LIMITE_POR_IP, VENTANA_SEGUNDOS)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const token = String((body as { token?: unknown })?.token ?? '');
  const password = String((body as { password?: unknown })?.password ?? '');

  if (!token) {
    return NextResponse.json({ error: 'Falta el token del enlace.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  try {
    await fijarContrasena(token, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mensaje =
      error instanceof ErrorNeonAuth
        ? error.message
        : 'No se pudo fijar la contraseña. El enlace puede haber caducado.';
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
