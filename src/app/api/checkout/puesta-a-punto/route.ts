import { NextResponse } from 'next/server';
import { comoAprovisionamiento } from '@/lib/db';
import { crearCheckoutServicio } from '@/lib/payments/cobros';
import { leerRefPago, resumenPago } from '@/lib/payments/stripe';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';
import { SERVICIOS_QR } from '@/lib/pricing-config';

export const runtime = 'nodejs';

/**
 * Upsell de la puesta a punto en «Pago confirmado» (08/10, karc0): 29 € + IVA
 * en vez de 49 €, SOLO desde aquí. La llave es la referencia firmada de un alta
 * QR o Fundador ya pagada: de ella sale el cliente de Stripe y, con 0064, su
 * local. El cobro es el mismo servicio `setup_esencial` del panel, así que la
 * entrega aparece en Central como cualquier otro servicio contratado.
 */
export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('puesta-bienvenida', ipDeLaPeticion(request)), 6, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  const b = (await request.json().catch(() => ({}))) as { r?: string };
  const id = leerRefPago(b.r);
  const pago = id ? await resumenPago(id) : null;
  const producto = pago?.metadata.producto;
  if (!pago || pago.estado !== 'pagado' || !pago.cliente || (producto !== 'qr-menu' && producto !== 'fundador')) {
    return NextResponse.json({ error: 'Esta oferta es solo para el alta que acabas de hacer.' }, { status: 400 });
  }

  const local = await comoAprovisionamiento(async (c) =>
    (await c.query<{ id: string; nombre: string }>('SELECT * FROM dk.restaurante_de_cliente_stripe($1)', [pago.cliente])).rows[0]
  ).catch((e) => { console.error('No se pudo buscar el local del upsell:', e); return undefined; });
  if (!local) {
    return NextResponse.json({ error: 'Tu local aún se está creando. Vuelve a pulsar en unos segundos.' }, { status: 409 });
  }

  const email = String(pago.metadata.email ?? pago.email ?? '');
  try {
    const { url } = await crearCheckoutServicio({
      servicio: 'setup_esencial',
      nombre: 'Puesta a punto (oferta de bienvenida)',
      tipo: 'unico',
      precioCentimos: SERVICIOS_QR.puestaAPuntoBienvenida * 100,
      restauranteId: local.id,
      restauranteNombre: local.nombre,
      email,
      origen: new URL(request.url).origin,
      clienteStripe: pago.cliente,
      destino: `/qr/bienvenida?puesta=ok&email=${encodeURIComponent(email)}&restaurante=${encodeURIComponent(local.nombre)}`,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creando el cobro de la puesta a punto de bienvenida:', error);
    return NextResponse.json({ error: 'No se pudo abrir el pago. Inténtalo de nuevo.' }, { status: 500 });
  }
}
