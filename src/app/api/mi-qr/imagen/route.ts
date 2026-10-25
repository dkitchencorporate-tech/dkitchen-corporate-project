import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { obtenerMiRestaurante, obtenerCodigoQr } from '@/lib/mi-restaurante';

export const runtime = 'nodejs';

/**
 * Genera el PNG del QR bajo demanda, siempre para el propio restaurante de
 * la sesión — nunca acepta un código como parámetro, así nadie puede pedir
 * el QR de otro restaurante aunque adivine su código.
 */
export async function GET(peticion: Request) {
  const jwt = await obtenerJwtDeSesion();
  if (!jwt) return NextResponse.json({ error: 'No has iniciado sesión.' }, { status: 401 });

  const restaurante = await obtenerMiRestaurante(jwt);
  if (!restaurante) return NextResponse.json({ error: 'No se encontró tu restaurante.' }, { status: 404 });

  const codigo = await obtenerCodigoQr(jwt, restaurante.id);
  if (!codigo) return NextResponse.json({ error: 'Todavía no tienes un código QR activo.' }, { status: 404 });

  const mesaParam = new URL(peticion.url).searchParams.get('mesa');
  const mesa = mesaParam && /^[A-Za-z0-9-]{1,12}$/.test(mesaParam) ? mesaParam : null;
  const url = `https://dkitchencorporate.es/r/${codigo}${mesa ? `?mesa=${encodeURIComponent(mesa)}` : ''}`;
  const buffer = await QRCode.toBuffer(url, { width: 1024, margin: 2, color: { dark: '#171008', light: '#FDFCF8' } });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-${restaurante.slug}${mesa ? `-mesa-${mesa}` : ''}.png"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
