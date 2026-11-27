import { NextResponse } from 'next/server';
import { comoVisitante } from '@/lib/db';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

/**
 * Enlace corto de la propuesta (0131, 27/11): /p/<nombre-del-local>-<palabra>.
 * Se envía por WhatsApp en lugar de /propuesta/<token>, que se ve extraño.
 * Solo redirige al enlace con token (que sigue siendo la llave y donde se cuentan
 * las vistas); ?preview=1 se conserva para las revisiones internas.
 * Límite de frecuencia por IP contra quien pruebe nombres al azar.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sinCache = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const FORMATO = /^[a-z0-9]+(-[a-z0-9]+){1,7}$/;

export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const codigo = (await params).codigo.toLowerCase();
  const peticion = new URL(request.url);
  const origen = peticion.origin;
  let token: string | null = null;
  if (codigo.length <= 60 && FORMATO.test(codigo)) {
    try {
      const frenado = await limiteSuperado(claveDeLimite('propuesta-corta', ipDeLaPeticion(request)), 20, 60).catch(() => false);
      if (!frenado) {
        token = await comoVisitante(async (c) => (await c.query<{ t: string | null }>('SELECT dk.propuesta_token_corto($1) AS t', [codigo])).rows[0]?.t ?? null);
      }
    } catch (e) {
      console.error(`Propuesta corta ${codigo}: no se pudo resolver`, e);
    }
  }
  if (!token || !/^[a-f0-9]{32}$/.test(token)) return NextResponse.redirect(`${origen}/`, { status: 302, headers: sinCache });
  const destino = new URL(`/propuesta/${token}`, origen);
  if (peticion.searchParams.get('preview') === '1') destino.searchParams.set('preview', '1');
  return NextResponse.redirect(destino, { status: 302, headers: sinCache });
}
