import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { estadoAdmin } from '@/lib/guard-admin';

/**
 * Central → Revisiones de Alex (0087): sube UNA imagen (captura pegada o archivo)
 * a Vercel Blob y devuelve su URL. Solo el super admin con 2FA. El navegador la
 * comprime antes (máx. 1.600 px) para no pasar del límite de cuerpo.
 */
const TIPOS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const MAX = 3_500_000;

export async function POST(req: Request) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt || (await estadoAdmin(jwt)) !== 'ok') return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  const f = (await req.formData().catch(() => null))?.get('f');
  if (!(f instanceof File) || !TIPOS[f.type] || f.size > MAX || f.size < 100) return NextResponse.json({ error: 'imagen no válida' }, { status: 400 });
  try {
    const { url } = await put(`revisiones/${crypto.randomUUID()}.${TIPOS[f.type]}`, f, { access: 'public', contentType: f.type });
    return NextResponse.json({ url });
  } catch (e) {
    console.error('Revisión imagen:', (e as Error).message);
    return NextResponse.json({ error: 'no se pudo subir' }, { status: 500 });
  }
}
