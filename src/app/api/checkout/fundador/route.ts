import { NextResponse } from 'next/server';
import { crearCheckoutFundador } from '@/lib/payments/cobros';
import { estadoFundador } from '@/lib/fundador';
import { frenoDeAltas } from '@/lib/limite-frecuencia';
import { vendedorDeLaPeticion, type Vendedor } from '@/lib/socio';

export const runtime = 'nodejs';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function normalizarSlug(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36) || 'restaurante'
  );
}

/**
 * Alta de Fundador (0051): plan Sala al 40 %, 124,20 € + IVA por trimestre.
 * Solo si el programa está abierto (lo decide la base). Igual que /api/checkout/qr,
 * esta ruta nunca toca la base para escribir: aprovisiona el webhook tras el pago.
 */
export async function POST(request: Request) {
  const estado = await estadoFundador();
  if (!estado?.abierto) {
    return NextResponse.json({ error: 'La oferta Fundador está cerrada.' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }
  // Código de comercial antes del freno: con código válido el límite es más alto (H32).
  let vendedor: Vendedor | null = null;
  try {
    vendedor = await vendedorDeLaPeticion(body?.vendedor, body?.vendedorDelEnlace);
  } catch (error) {
    console.error('No se pudo comprobar el código de comercial:', error);
  }
  try {
    if (await frenoDeAltas(request, 'checkout-fundador', vendedor?.codigo ?? null)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes seguidas. Inténtalo en unos minutos.' }, { status: 429 });
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }
  const restauranteNombre = String(body?.restauranteNombre ?? '').trim();
  const nombreContacto = String(body?.nombreContacto ?? '').trim();
  const email = String(body?.email ?? '').trim();
  if (!restauranteNombre || restauranteNombre.length > 80) {
    return NextResponse.json({ error: 'El nombre del restaurante no es válido.' }, { status: 400 });
  }
  if (!nombreContacto || nombreContacto.length > 80) {
    return NextResponse.json({ error: 'Tu nombre no es válido.' }, { status: 400 });
  }
  if (!CORREO_VALIDO.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'El correo no es válido.' }, { status: 400 });
  }

  try {
    const { url } = await crearCheckoutFundador({
      restauranteNombre, nombreContacto, email,
      slugBase: normalizarSlug(restauranteNombre),
      origen: new URL(request.url).origin,
      vendedor,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creando el checkout de Fundador:', error);
    return NextResponse.json({ error: 'No se pudo iniciar el pago.' }, { status: 500 });
  }
}
