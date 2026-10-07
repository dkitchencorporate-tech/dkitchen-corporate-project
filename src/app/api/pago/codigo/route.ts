import { NextResponse } from 'next/server';
import { aplicarCodigo, leerRefPago, refPago } from '@/lib/payments/stripe';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

/**
 * Código promocional en el checkout (07/10/2026): rehace el cobro con el
 * descuento y devuelve la referencia firmada del cobro nuevo. Con código vacío
 * quita el descuento. El freno evita probar códigos a ciegas.
 */
export async function POST(request: Request) {
  const ip = ipDeLaPeticion(request);
  try {
    if (await limiteSuperado(claveDeLimite('pago-codigo', ip), 10, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  const b = (await request.json().catch(() => ({}))) as { r?: string; codigo?: string };
  const id = leerRefPago(b.r);
  if (!id) return NextResponse.json({ error: 'Pago no válido.' }, { status: 400 });
  const r = await aplicarCodigo(id, String(b.codigo ?? ''));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, r: refPago(r.id) });
}
