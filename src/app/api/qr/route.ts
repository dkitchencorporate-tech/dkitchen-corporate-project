import QRCode from 'qrcode';

export const runtime = 'nodejs';

const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';

/**
 * PNG del QR para la versión de correo de la propuesta (Gmail y Outlook no muestran imágenes data:).
 * Solo codifica enlaces de nuestro propio dominio, para que nadie lo use como generador de QR ajeno.
 */
export async function GET(peticion: Request) {
  const u = new URL(peticion.url).searchParams.get('u') ?? '';
  if (u.length > 500 || !u.startsWith(`${SITIO}/`)) return new Response('No válido', { status: 400 });
  const png = await QRCode.toBuffer(u, { width: 330, margin: 1 });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
