import { NextResponse } from 'next/server';
import { resolverQrCampana } from '@/lib/qr-campanas';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

/**
 * QR de campaña (0071): el flyer y la tarjeta imprimen /q/<codigo>. El destino
 * vive en la base y se cambia desde Central sin reimprimir; cada escaneo cuenta.
 * Al destino se le añade ?qr=<codigo> para atribuir los clics de la botonera.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sinCache = { 'Cache-Control': 'no-store' };

export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const codigo = (await params).codigo.toLowerCase();
  const origen = new URL(request.url).origin;
  let destino: string | null = null;
  try {
    const frenado = await limiteSuperado(claveDeLimite('qr-campana', ipDeLaPeticion(request)), 30, 60).catch(() => false);
    destino = frenado ? null : await resolverQrCampana(codigo);
  } catch (e) {
    console.error(`QR de campaña ${codigo}: no se pudo resolver`, e);
  }
  if (!destino) return NextResponse.redirect(`${origen}/`, { status: 302, headers: sinCache });
  const url = new URL(destino, origen);
  url.searchParams.set('qr', codigo);
  return NextResponse.redirect(url, { status: 302, headers: sinCache });
}
