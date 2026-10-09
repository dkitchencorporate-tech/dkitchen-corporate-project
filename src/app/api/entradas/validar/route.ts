import { NextResponse } from 'next/server';
import { comoVisitante } from '@/lib/db';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';
import { SLUG_EVENTO } from '@/lib/entradas';

export const runtime = 'nodejs';

/** Puerta del evento: valida una entrada con la clave de puerta del evento y la marca como usada. */
export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('entradas-puerta', ipDeLaPeticion(request)), 240, 10 * 60)) {
      return NextResponse.json({ r: 'freno' }, { status: 429 });
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = String(b?.slug ?? '');
  const clave = String(b?.clave ?? '').slice(0, 100);
  const codigo = String(b?.codigo ?? '').trim().slice(0, 60);
  if (!SLUG_EVENTO.test(slug) || !clave || !/^[A-Za-z0-9_-]{20,40}$/.test(codigo)) return NextResponse.json({ r: 'no_existe' });
  try {
    const { rows } = await comoVisitante((c) => c.query<{ r: Record<string, unknown> }>('SELECT dk.validar_entrada($1, $2, $3) AS r', [slug, clave, codigo]));
    return NextResponse.json(rows[0]?.r ?? { r: 'no_existe' });
  } catch (error) {
    console.error('Validar entrada:', error);
    return NextResponse.json({ r: 'error' }, { status: 500 });
  }
}
