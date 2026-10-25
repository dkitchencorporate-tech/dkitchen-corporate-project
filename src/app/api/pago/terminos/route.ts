import { NextResponse } from 'next/server';
import { leerRefPago, registrarTerminos } from '@/lib/payments/stripe';
import { TERMINOS_VERSION } from '@/lib/terminos';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

/**
 * Aceptación de los términos en el checkout (A4, 08/10/2026): fecha, IP y
 * versión quedan en la metadata del cobro de Stripe antes de confirmar el pago.
 */
export async function POST(request: Request) {
  const ip = ipDeLaPeticion(request);
  try {
    if (await limiteSuperado(claveDeLimite('pago-terminos', ip), 20, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  const b = (await request.json().catch(() => ({}))) as { r?: string; version?: string };
  const id = leerRefPago(b.r);
  if (!id) return NextResponse.json({ error: 'Pago no válido.' }, { status: 400 });
  try {
    await registrarTerminos(id, ip, b.version === TERMINOS_VERSION ? TERMINOS_VERSION : `${TERMINOS_VERSION} (cliente: ${String(b.version ?? '').slice(0, 20)})`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`No se pudieron registrar los términos en ${id}:`, e);
    return NextResponse.json({ error: 'No se pudo registrar.' }, { status: 500 });
  }
}
