import { NextResponse } from 'next/server';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';
import { crearIntentoEntradas, eventoPublico, plazasLibres, ventaAbierta } from '@/lib/entradas';
import { stripeConfigurado } from '@/lib/payments/stripe';

export const runtime = 'nodejs';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Inicia el pago de entradas de un evento de Experience (cargo directo en la cuenta del local). */
export async function POST(request: Request) {
  if (!stripeConfigurado()) return NextResponse.json({ error: 'El pago no está disponible ahora mismo.' }, { status: 503 });
  try {
    if (await limiteSuperado(claveDeLimite('entradas-intento', ipDeLaPeticion(request)), 10, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiados intentos seguidos. Prueba en unos minutos.' }, { status: 429 });
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = String(b?.slug ?? '');
  const cantidad = Number(b?.cantidad);
  const nombre = String(b?.nombre ?? '').trim();
  const email = String(b?.email ?? '').trim().toLowerCase();

  const e = await eventoPublico(slug).catch(() => null);
  if (!e || !ventaAbierta(e)) return NextResponse.json({ error: 'La venta de este evento no está abierta.' }, { status: 409 });
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > Math.min(e.max_por_compra, plazasLibres(e))) {
    return NextResponse.json({ error: `Puedes comprar entre 1 y ${Math.min(e.max_por_compra, plazasLibres(e))} entradas.` }, { status: 400 });
  }
  if (nombre.length < 2 || nombre.length > 80) return NextResponse.json({ error: 'Escribe tu nombre.' }, { status: 400 });
  if (!CORREO_VALIDO.test(email) || email.length > 254) return NextResponse.json({ error: 'El correo no es válido.' }, { status: 400 });

  try {
    return NextResponse.json(await crearIntentoEntradas(e, cantidad, nombre, email));
  } catch (error) {
    console.error('Error creando el pago de entradas:', error);
    return NextResponse.json({ error: 'No se pudo iniciar el pago. Inténtalo de nuevo.' }, { status: 500 });
  }
}
