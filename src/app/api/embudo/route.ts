import { NextResponse } from 'next/server';
import { comoVisitante } from '@/lib/db';

/**
 * Seguimiento anónimo de las páginas de pago (0032): vista, interés, paso a la
 * pasarela y salida sin pagar. Solo un id de sesión aleatorio del navegador.
 * Responde siempre 204: medir nunca debe romper la página.
 */
export const runtime = 'nodejs';

const EVENTOS = ['vista', 'interes', 'checkout', 'salida'];

export async function POST(request: Request) {
  try {
    const b = JSON.parse(await request.text());
    const producto = String(b.producto ?? ''), evento = String(b.evento ?? ''), sesion = String(b.sesion ?? '');
    const segundos = Number.isFinite(b.segundos) ? Math.max(0, Math.min(86400, Math.round(b.segundos))) : null;
    if (/^[a-z0-9-]{2,30}$/.test(producto) && EVENTOS.includes(evento) && /^[a-z0-9]{8,40}$/.test(sesion)) {
      await comoVisitante((c) => c.query('SELECT dk.embudo_registrar($1, $2, $3, $4)', [producto, evento, sesion, segundos]));
    }
  } catch (e) { console.error('Embudo:', (e as Error).message); }
  return new NextResponse(null, { status: 204 });
}
