import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import {
  pedidosPendientesMantenimientoNucleoOperativo,
  marcarMantenimientoDisparado,
} from '@/lib/pedidos-nivel-b';
import { crearCheckoutMantenimientoNucleoOperativo } from '@/lib/payments/whop';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Cron diario (vercel.json) que dispara la cuota de mantenimiento de Núcleo
 * Operativo (69€/mes, migración 0017) a los 60 días de la activación —
 * Whop no tiene "N ciclos gratis y luego cobra" nativo, así que el checkout
 * recurrente se crea aquí, nunca en el momento de la activación (700€).
 *
 * Protegido con CRON_SECRET, mismo patrón que /api/cron/gracia-impago.
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

  const origen = new URL(request.url).origin;
  let disparados = 0;

  try {
    const pendientes = await pedidosPendientesMantenimientoNucleoOperativo();
    for (const pedido of pendientes) {
      try {
        const { url } = await crearCheckoutMantenimientoNucleoOperativo({
          pedidoId: pedido.id,
          email: pedido.email,
          nombreContacto: pedido.nombreContacto,
          origen,
        });

        await enviarCorreoCliente(
          pedido.email,
          'Activa el mantenimiento de tu Núcleo Operativo',
          `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6E0C2B;">Tus dos primeros meses de mantenimiento ya pasaron</h2>
            <p>Hola ${escaparHtml(pedido.nombreContacto)},</p>
            <p>Para seguir con la infraestructura y el mantenimiento de tu Núcleo Operativo,
            activa la cuota mensual (69€/mes) aquí:</p>
            <p><a href="${url}" style="background:#6E0C2B;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">Activar mantenimiento</a></p>
          </div>`
        );

        await marcarMantenimientoDisparado(pedido.id);
        disparados++;
      } catch (error) {
        // Un fallo puntual (email caído, Whop con hipo) no debe bloquear al
        // resto de pedidos pendientes de esta pasada — se reintenta mañana,
        // porque no se marcó mantenimiento_disparado_en.
        console.error(`No se pudo disparar el mantenimiento del pedido ${pedido.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Cron mantenimiento Núcleo Operativo falló:', error);
    return NextResponse.json({ error: 'Fallo revisando pedidos pendientes' }, { status: 500 });
  }

  console.log(`Cron mantenimiento Núcleo Operativo: ${disparados} correo(s) enviados.`);
  return NextResponse.json({ ok: true, disparados });
}
