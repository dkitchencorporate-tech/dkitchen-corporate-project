import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { comoAprovisionamiento } from '@/lib/db';
import { enviarCorreoInterno } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Entrada de los leads de la tarea de Windows «DKitchen Buscar clientes» (0081, decisión de karc0 del 17/10).
 * El lanzador (tareas-programadas/ejecutar.ps1) manda aquí el archivo del día con la clave LEADS_TAREA_SECRET.
 * dk.leads_importar los mete en Central → Prospección como «Por revisar», sin duplicados (nombre + zona,
 * teléfono o Instagram) y como mucho 50 por envío. Nadie más puede escribir en el CRM por esta ruta.
 */
export async function POST(request: Request) {
  const secreto = process.env.LEADS_TAREA_SECRET;
  if (!secreto || secreto.length < 32) return NextResponse.json({ error: 'No configurado' }, { status: 500 });
  const recibido = Buffer.from(request.headers.get('authorization') ?? '');
  const esperado = Buffer.from(`Bearer ${secreto}`);
  if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const cuerpo = await request.json().catch(() => null) as { leads?: unknown } | null;
  if (!cuerpo || !Array.isArray(cuerpo.leads) || cuerpo.leads.length > 50) {
    return NextResponse.json({ error: 'Se espera { leads: [...] } con 50 como mucho' }, { status: 400 });
  }
  try {
    const r = await comoAprovisionamiento(async (c) => (await c.query<{ r: { nuevos: number; duplicados: number; descartados: number } }>(
      'SELECT dk.leads_importar($1::jsonb) AS r', [JSON.stringify(cuerpo.leads)])).rows[0].r);
    if (r.nuevos > 0) {
      await enviarCorreoInterno(`LEADS NUEVOS: ${r.nuevos} en Prospección`,
        `<p>La tarea «Buscar clientes» ha dejado <strong>${r.nuevos}</strong> local(es) en Central → Prospección como «Por revisar» (${r.duplicados} duplicado(s) descartado(s)).</p>`).catch(() => {});
    }
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error('Leads de la tarea: fallo al importar', e);
    return NextResponse.json({ error: 'No se pudieron guardar' }, { status: 500 });
  }
}
