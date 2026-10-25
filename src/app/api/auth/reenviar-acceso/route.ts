import { NextResponse } from 'next/server';
import { enviarEnlaceDeContrasena } from '@/lib/neon-auth';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Reenvía el correo «Crea tu contraseña de DKitchen» (08/10, fallo 4 de la
 * entrada 122): botón «Reenviar correo» de la página de pago confirmado y
 * «¿Olvidaste tu contraseña?» del inicio de sesión, que antes llevaba a una
 * página sin token. La respuesta es siempre la misma, exista o no la cuenta,
 * para no servir de buscador de correos; el freno limita por IP y por correo.
 */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = String(b.email ?? '').trim().toLowerCase();
  if (!CORREO_VALIDO.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Escribe un correo válido.' }, { status: 400 });
  }
  const ip = ipDeLaPeticion(request);
  try {
    const [porIp, porCorreo] = await Promise.all([
      limiteSuperado(claveDeLimite('reenviar-acceso', ip), 5, 15 * 60),
      limiteSuperado(claveDeLimite('reenviar-acceso-correo', email), 3, 15 * 60), // el correo también va con HMAC, nunca en claro
    ]);
    if (porIp || porCorreo) {
      return NextResponse.json({ error: 'Ya te lo hemos enviado varias veces. Espera unos minutos y revisa también spam y promociones.' }, { status: 429 });
    }
  } catch (e) {
    console.error('No se pudo comprobar el freno de frecuencia:', e);
  }
  await enviarEnlaceDeContrasena(email).catch((e) => console.error('No se pudo reenviar el enlace de contraseña:', e));
  return NextResponse.json({ ok: true });
}
