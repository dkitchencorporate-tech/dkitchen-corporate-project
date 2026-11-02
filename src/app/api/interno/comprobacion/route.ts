import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { leerComprobacion, volcarPuntos } from '@/lib/comprobacion';

export const runtime = 'nodejs';

/**
 * Ruta interna (remapeo 81f7ea99, 02/11/2026): Claude vuelca en Central → Comprobación los resultados de
 * dkitchen-pruebas. Misma clave interna que las fotos de la web (IA_LOTE_SECRET, solo la tiene Claude).
 * GET devuelve el estado actual; POST { filas: [{ servicio, punto, estado, nota, evidencia }] } pisa esos puntos.
 */
function autorizado(req: Request): boolean {
  const clave = process.env.IA_LOTE_SECRET ?? '';
  const dada = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (clave.length < 32 || dada.length !== clave.length) return false;
  return timingSafeEqual(Buffer.from(dada), Buffer.from(clave));
}

export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await leerComprobacion());
}

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { filas?: unknown } | null;
  if (!Array.isArray(b?.filas) || b.filas.length > 500) return NextResponse.json({ error: 'filas' }, { status: 400 });
  try {
    const n = await volcarPuntos(b.filas as Parameters<typeof volcarPuntos>[0], 'Claude');
    return NextResponse.json({ ok: true, n });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
