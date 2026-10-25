import { NextResponse } from 'next/server';
import { eventoQrCampana } from '@/lib/qr-campanas';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

/** Clic en una botonera que vino de un QR de campaña (0071). Siempre 204: nunca bloquea la navegación. */
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('qr-evento', ipDeLaPeticion(request)), 40, 60)) return new NextResponse(null, { status: 204 });
    const b = JSON.parse(await request.text()) as { codigo?: unknown; detalle?: unknown };
    await eventoQrCampana(String(b.codigo ?? '').toLowerCase(), 'clic', String(b.detalle ?? '').replace(/[^\p{L}\p{N} ·€.,-]/gu, '').slice(0, 120));
  } catch (e) {
    console.error('Evento de QR no registrado', e);
  }
  return new NextResponse(null, { status: 204 });
}
