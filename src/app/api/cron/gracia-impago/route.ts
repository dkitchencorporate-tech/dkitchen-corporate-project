import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { avanzarGraciaConAvisos } from '@/lib/avisos-impago';
import { avanzarPruebas, purgarBajas } from '@/lib/prueba';

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
    // Bajas (0041): aviso 7 días antes y borrado a los 60 días.
    const borrados = await purgarBajas();
    console.log(`Cron gracia/impago: ${cambiados} restaurante(s) cambiaron de fase; ${pruebasVencidas} prueba(s) vencida(s); ${borrados} baja(s) borrada(s).`);
    return NextResponse.json({ ok: true, cambiados, pruebasVencidas, borrados });
  } catch (error) {
    console.error('Cron gracia/impago falló:', error);
    return NextResponse.json({ error: 'Fallo avanzando el calendario' }, { status: 500 });
  }
}
