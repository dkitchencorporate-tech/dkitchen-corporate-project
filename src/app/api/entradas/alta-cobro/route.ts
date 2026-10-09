import { NextResponse } from 'next/server';
import { altaCobroValida, enlaceAltaStripe } from '@/lib/entradas';

export const runtime = 'nodejs';

/**
 * Enlace estable que karc0 manda al local para dar de alta su cobro en Stripe (Connect Express).
 * Comprueba la firma y redirige a un enlace de alta de Stripe recién creado.
 */
export async function GET(request: Request) {
  const u = new URL(request.url);
  const cuenta = u.searchParams.get('c') ?? '';
  const slug = (u.searchParams.get('e') ?? '').replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!altaCobroValida(cuenta, u.searchParams.get('f') ?? '')) return new NextResponse('Enlace no válido.', { status: 404 });
  try {
    const volver = `${u.origin}/e/${slug}?alta=ok`;
    return NextResponse.redirect(await enlaceAltaStripe(cuenta, volver, u.toString()), 303);
  } catch (error) {
    console.error('Alta de cobro del local:', error);
    return new NextResponse('No se pudo abrir el alta en Stripe. Inténtalo en unos minutos.', { status: 502 });
  }
}
