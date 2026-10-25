import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { generarYEnviarParte } from '@/lib/mando';

export const runtime = 'nodejs';

/**
 * Cron del parte diario (punto 8, 0056; vercel.json, 06:30 UTC = 08:30 en
 * Madrid en horario de verano y 07:30 en invierno). Genera el parte, lo guarda
 * en partes_diarios y lo envía al buzón interno. Mismo cierre con CRON_SECRET
 * que /api/cron/gracia-impago.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    console.error('Falta CRON_SECRET.');
    return NextResponse.json({ error: 'No configurado' }, { status: 500 });
  }
  const recibido = Buffer.from(request.headers.get('authorization') ?? '');
  const esperado = Buffer.from(`Bearer ${secreto}`);
  if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const d = await generarYEnviarParte();
    console.log(`Parte diario ${d.fecha}: ${d.necesita_humano} pendiente(s), ${d.urgentes} urgente(s).`);
    return NextResponse.json({ ok: true, fecha: d.fecha, pendientes: d.necesita_humano, urgentes: d.urgentes });
  } catch (error) {
    console.error('Parte diario falló:', error);
    return NextResponse.json({ error: 'Fallo generando el parte' }, { status: 500 });
  }
}
