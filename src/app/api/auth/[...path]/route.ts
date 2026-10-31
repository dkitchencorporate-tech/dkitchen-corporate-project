import { auth } from '@/lib/auth';
import { algunLimiteSuperado, claveDeLimite, ipDeLaPeticion } from '@/lib/limite-frecuencia';

/**
 * Ruta proxy de Neon Auth — recibe toda petición de autenticación del
 * cliente (/api/auth/*) y la reenvía a NEON_AUTH_BASE_URL identificada como
 * proxy de servidor de Next.js, evitando el problema de origen que dan las
 * llamadas directas desde el navegador (ver src/lib/auth.ts).
 *
 * Frenos propios (01/11, reglas 11, 12 y 17 de karc0; Neon Auth no los trae):
 * - Inicio de sesión: 8 intentos por correo cada 15 min (bloqueo de 15 min) y 30 por IP.
 * - Recuperar contraseña: 3 por correo y hora, 10 por IP; al pasarse se responde igual que siempre
 *   (sin correo y sin pistas: regla 5).
 * - Fijar contraseña con el enlace: 10 por IP y hora.
 */
const manejador = auth.handler();

export const GET = manejador.GET;

const MINUTO = 60;
const bloqueo = () => Response.json({ code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Espera 15 minutos y vuelve a probar.' }, { status: 429 });

export async function POST(peticion: Request, contexto: { params: Promise<{ path: string[] }> }) {
  const { path } = await contexto.params;
  const ruta = path.map((t) => t.toLowerCase()).join('/');
  // Alta pública cerrada (27/09/2026): las cuentas las crea el servidor tras el pago.
  if (path.some((tramo) => tramo.toLowerCase().startsWith('sign-up'))) {
    return new Response(null, { status: 404 });
  }
  const frenada = ['sign-in/email', 'request-password-reset', 'forget-password', 'reset-password'].includes(ruta);
  if (!frenada) return manejador.POST(peticion as never, contexto as never);

  const cuerpo = await peticion.text();
  let email = '';
  try { email = String(JSON.parse(cuerpo)?.email ?? '').trim().toLowerCase().slice(0, 254); } catch { /* cuerpo no JSON: lo valida Neon */ }
  const ip = ipDeLaPeticion(peticion);
  try {
    if (ruta === 'sign-in/email') {
      if (await algunLimiteSuperado([
        { clave: claveDeLimite('login-ip', ip), limite: 30, ventanaSegundos: 15 * MINUTO },
        ...(email ? [{ clave: claveDeLimite('login-correo', email), limite: 8, ventanaSegundos: 15 * MINUTO }] : []),
      ])) return bloqueo();
    } else if (ruta === 'reset-password') {
      if (await algunLimiteSuperado([{ clave: claveDeLimite('fijar-clave-ip', ip), limite: 10, ventanaSegundos: 60 * MINUTO }])) return bloqueo();
    } else if (await algunLimiteSuperado([
      { clave: claveDeLimite('recuperar-ip', ip), limite: 10, ventanaSegundos: 60 * MINUTO },
      ...(email ? [{ clave: claveDeLimite('recuperar-correo', email), limite: 3, ventanaSegundos: 60 * MINUTO }] : []),
    ])) {
      // Misma respuesta que un envío normal: no revela nada ni manda más correos.
      return Response.json({ status: true, message: 'If this email exists in our system, check your email for the reset link' });
    }
  } catch (e) {
    console.error('Freno de autenticación no disponible:', (e as Error).message);
  }
  const reenvio = new Request(peticion.url, { method: 'POST', headers: peticion.headers, body: cuerpo });
  return manejador.POST(reenvio as never, contexto as never);
}
