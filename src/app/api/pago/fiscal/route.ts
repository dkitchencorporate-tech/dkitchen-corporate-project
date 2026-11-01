import { after, NextResponse } from 'next/server';
import { leerRefPago, refPago, rehacerConDatosFiscales } from '@/lib/payments/stripe';
import { validarDatosFiscales } from '@/lib/nif';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

/**
 * Factura completa en el checkout (01/11/2026): valida razón social, NIF y dirección en el
 * servidor, los guarda en el cliente de Stripe y rehace el cobro para que la factura los lleve.
 * Devuelve la referencia firmada del cobro nuevo (como /api/pago/codigo).
 */
export async function POST(request: Request) {
  const ip = ipDeLaPeticion(request);
  try {
    if (await limiteSuperado(claveDeLimite('pago-fiscal', ip), 10, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = leerRefPago(String(b.r ?? ''));
  if (!id) return NextResponse.json({ error: 'Pago no válido.' }, { status: 400 });
  const v = validarDatosFiscales(b);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const r = await rehacerConDatosFiscales(id, v.datos);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  after(r.retirar);
  return NextResponse.json({ ok: true, r: refPago(r.id) });
}
