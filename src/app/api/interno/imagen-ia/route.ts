import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { imagenLibre } from '@/lib/ia';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Ruta interna (17/10/2026, decisión de karc0): fotos para la propia web de DKitchen (portadas de los
 * formatos y los eventos de muestra de Experience) con el crédito gratuito de AI Gateway, que solo existe
 * dentro del despliegue (OIDC). Solo Claude la llama, con IA_LOTE_SECRET (Credenciales/IA_lote.txt).
 * Devuelve la foto en webp a la medida pedida; no guarda nada: la foto se sube al repo como estática.
 */
const MEDIDAS: Record<string, { pedir: string; ancho: number; alto: number }> = {
  '4x5': { pedir: '1088x1360', ancho: 1080, alto: 1350 },
  '16x9': { pedir: '1600x896', ancho: 1600, alto: 900 },
};

function autorizado(req: Request): boolean {
  const clave = process.env.IA_LOTE_SECRET ?? '';
  const dada = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (clave.length < 32 || dada.length !== clave.length) return false;
  return timingSafeEqual(Buffer.from(dada), Buffer.from(clave));
}

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const cuerpo = await req.json().catch(() => null) as { prompt?: unknown; medida?: unknown } | null;
  const prompt = typeof cuerpo?.prompt === 'string' ? cuerpo.prompt.trim().slice(0, 2000) : '';
  const m = MEDIDAS[String(cuerpo?.medida ?? '')];
  if (prompt.length < 20 || !m) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 });
  const original = await imagenLibre(prompt, m.pedir);
  if (!original) return NextResponse.json({ error: 'La IA no devolvió imagen' }, { status: 502 });
  const webp = await sharp(original).resize(m.ancho, m.alto, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toBuffer();
  return new NextResponse(new Uint8Array(webp), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' } });
}
