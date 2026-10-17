import { NextResponse } from 'next/server';
import { comoVisitante } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Baja con un clic desde el propio cliente de correo (RFC 8058, cabecera List-Unsubscribe-Post).
 * GET (si el cliente de correo abre el enlace en el navegador) lleva a la página con el botón.
 */
const token = (request: Request) => new URL(request.url).searchParams.get('t') ?? '';

export async function POST(request: Request) {
  const t = token(request);
  if (!/^[0-9a-f]{32}$/.test(t)) return NextResponse.json({ error: 'Enlace no válido' }, { status: 400 });
  try {
    await comoVisitante((c) => c.query('SELECT dk.lista_baja($1)', [t]));
  } catch (e) {
    console.error('Baja con un clic falló', e);
    return NextResponse.json({ error: 'No se pudo dar de baja' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export function GET(request: Request) {
  const t = token(request);
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
  return NextResponse.redirect(/^[0-9a-f]{32}$/.test(t) ? `${sitio}/baja-lista/${t}` : sitio, 303);
}
