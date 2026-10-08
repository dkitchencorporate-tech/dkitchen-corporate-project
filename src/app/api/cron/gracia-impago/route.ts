import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { avanzarGraciaConAvisos } from '@/lib/avisos-impago';
import { avanzarPruebas, purgarBajas } from '@/lib/prueba';
import { comoAprovisionamiento } from '@/lib/db';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Cron diario (vercel.json) que avanza el calendario propio de gracia/impago
 * (migración 0012) — es la única pieza que faltaba para que ese calendario
 * corra solo: sin esto, pago_fallido_desde quedaría fijado por el webhook
 * pero estado_acceso nunca avanzaría de "gracia" a "solo_lectura" ni a
 * "suspendido" por su cuenta.
 *
 * Protegido con CRON_SECRET: Vercel envía `Authorization: Bearer
 * $CRON_SECRET` automáticamente en cada invocación de un cron job cuando esa
 * variable de entorno existe — sin esto, la URL sería pública y cualquiera
 * podría dispararla a voluntad.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    console.error('Falta CRON_SECRET.');
    return NextResponse.json({ error: 'No configurado' }, { status: 500 });
  }

  const cabecera = request.headers.get('authorization') ?? '';
  const esperada = `Bearer ${secreto}`;
  const bufRecibido = Buffer.from(cabecera);
  const bufEsperado = Buffer.from(esperada);
  const autorizado =
    bufRecibido.length === bufEsperado.length && timingSafeEqual(bufRecibido, bufEsperado);

  if (!autorizado) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Calendario de impago + correos al cliente (H16, 0059): solo lectura, suspensión y recordatorios.
    const cambiados = await avanzarGraciaConAvisos();
    // Pruebas «todo incluido» (0034): vencidas → solo lectura, y avisos a 3 días y 1 día.
    const pruebasVencidas = await avanzarPruebas();
    // Bajas programadas (0061): respaldo del webhook de Stripe; las que vencen hoy pasan a suspendido.
    const bajasEjecutadas = await comoAprovisionamiento(async (c) => (await c.query<{ n: number }>('SELECT dk.ejecutar_bajas_vencidas() AS n')).rows[0]?.n ?? 0);
    // Regalos con fecha (0066, 3 meses de Conexión TPV con la puesta a punto): vencer y avisar 7 días antes.
    const regalosVencidos = await comoAprovisionamiento(async (c) => (await c.query<{ n: number }>('SELECT dk.vencer_regalos() AS n')).rows[0]?.n ?? 0);
    const porVencer = await comoAprovisionamiento(async (c) => (await c.query<{ restaurante: string; email: string | null; servicio: string; hasta: string }>('SELECT restaurante, email, servicio, hasta::text FROM dk.regalos_por_vencer(7)')).rows);
    if (porVencer.length) {
      await enviarCorreoInterno(`REGALOS QUE VENCEN EN 7 DÍAS: ${porVencer.length}`,
        `<p>Llama o escribe para ofrecer quedarse el módulo (Conexión TPV: 19 € + IVA al mes en Local, incluido en Sala).</p><ul>${porVencer.map((r) => `<li><strong>${escaparHtml(r.restaurante)}</strong> (${escaparHtml(r.email ?? 'sin correo')}) · ${escaparHtml(r.servicio)} hasta el ${escaparHtml(r.hasta)}</li>`).join('')}</ul>`).catch(() => {});
    }
    // Bajas (0041): aviso 7 días antes y borrado a los 60 días.
    const borrados = await purgarBajas();
    console.log(`Cron gracia/impago: ${cambiados} restaurante(s) cambiaron de fase; ${pruebasVencidas} prueba(s) vencida(s); ${bajasEjecutadas} baja(s) ejecutada(s); ${borrados} baja(s) borrada(s); ${regalosVencidos} regalo(s) vencido(s).`);
    return NextResponse.json({ ok: true, cambiados, pruebasVencidas, bajasEjecutadas, borrados, regalosVencidos });
  } catch (error) {
    console.error('Cron gracia/impago falló:', error);
    return NextResponse.json({ error: 'Fallo avanzando el calendario' }, { status: 500 });
  }
}
