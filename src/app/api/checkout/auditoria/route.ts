import { NextResponse } from 'next/server';
import { crearCheckoutAuditoria } from '@/lib/payments/cobros';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const LIMITE_POR_IP = 5;
const VENTANA_SEGUNDOS = 10 * 60;

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Order-bump de Auditoría+Escandallo (Parte 8, Sección 3.1-b): un segundo
 * checkout de Stripe, opcional, ofrecido justo después de confirmar el pago
 * de QR Menú — nunca bloquea ese pago, y esta ruta no toca la base de datos
 * (igual que /api/checkout/qr, es /api/webhooks/stripe quien reacciona al
 * pago real).
 */
export async function POST(request: Request) {
  try {
    const clave = claveDeLimite('checkout-auditoria', ipDeLaPeticion(request));
    if (await limiteSuperado(clave, LIMITE_POR_IP, VENTANA_SEGUNDOS)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes seguidas. Inténtalo en unos minutos.' },
        { status: 429 }
      );
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  const email = String((body as { email?: unknown })?.email ?? '').trim();
  const nombreContacto = String((body as { nombreContacto?: unknown })?.nombreContacto ?? '').trim();
  const restauranteNombre = String((body as { restauranteNombre?: unknown })?.restauranteNombre ?? '').trim();

  if (!CORREO_VALIDO.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'El correo no es válido.' }, { status: 400 });
  }
  if (!nombreContacto || nombreContacto.length > 80) {
    return NextResponse.json({ error: 'Tu nombre no es válido.' }, { status: 400 });
  }

  const origen = new URL(request.url).origin;

  try {
    const { url } = await crearCheckoutAuditoria({
      email,
      nombreContacto,
      restauranteNombre: restauranteNombre || undefined,
      origen,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creando el checkout de Auditoría (order-bump):', error);
    return NextResponse.json({ error: 'No se pudo iniciar el pago.' }, { status: 500 });
  }
}
