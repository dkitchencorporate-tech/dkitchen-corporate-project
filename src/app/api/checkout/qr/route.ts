import { NextResponse } from 'next/server';
import { crearCheckoutQr } from '@/lib/payments/cobros';
import { esPlanQr } from '@/lib/pricing-config';
import { frenoDeAltas } from '@/lib/limite-frecuencia';
import { vendedorDeLaPeticion, type Vendedor } from '@/lib/socio';

export const runtime = 'nodejs';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function normalizarSlug(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36) || 'restaurante'
  );
}

/**
 * Crea el cobro de Stripe para activar QR Menú (Parte 6, Sección 3) y
 * devuelve la URL de nuestro checkout nativo /pago. Stripe es el único
 * proveedor de pago (08/10/2026). `/api/webhooks/stripe`
 * es quien aprovisiona de verdad tras el pago — esta ruta nunca toca la
 * base de datos.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  // El código de comercial se resuelve ANTES del freno: con código válido el límite es más alto (H32).
  let vendedor: Vendedor | null = null;
  const escrito = String((body as { vendedor?: unknown })?.vendedor ?? '').trim();
  try {
    vendedor = await vendedorDeLaPeticion((body as { vendedor?: unknown })?.vendedor, (body as { vendedorDelEnlace?: unknown })?.vendedorDelEnlace);
    // Código escrito y no válido: se avisa en vez de ignorarlo en silencio (08/10, karc0).
    if (escrito && !vendedor) {
      return NextResponse.json({ error: 'Ese código de asesor no existe. Revísalo o déjalo en blanco (los códigos de descuento se ponen en el paso siguiente).', campo: 'vendedor' }, { status: 400 });
    }
  } catch (error) {
    console.error('No se pudo comprobar el código de comercial:', error);
  }

  try {
    if (await frenoDeAltas(request, 'checkout-qr', vendedor?.codigo ?? null)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes seguidas. Inténtalo en unos minutos.' },
        { status: 429 }
      );
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  const plan = (body as { plan?: unknown })?.plan;
  const restauranteNombre = String((body as { restauranteNombre?: unknown })?.restauranteNombre ?? '').trim();
  const nombreContacto = String((body as { nombreContacto?: unknown })?.nombreContacto ?? '').trim();
  const email = String((body as { email?: unknown })?.email ?? '').trim();
  const telefono = String((body as { telefono?: unknown })?.telefono ?? '').replace(/[^0-9+]/g, '');
  const calle = String((body as { direccion?: unknown })?.direccion ?? '').trim();
  const localidad = String((body as { localidad?: unknown })?.localidad ?? '').trim();
  const cp = String((body as { cp?: unknown })?.cp ?? '').trim();

  if (!esPlanQr(plan)) {
    return NextResponse.json({ error: 'Plan desconocido.' }, { status: 400 });
  }
  if (!restauranteNombre || restauranteNombre.length > 80) {
    return NextResponse.json({ error: 'El nombre del restaurante no es válido.' }, { status: 400 });
  }
  if (!nombreContacto || nombreContacto.length > 80) {
    return NextResponse.json({ error: 'Tu nombre no es válido.' }, { status: 400 });
  }
  if (!CORREO_VALIDO.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'El correo no es válido.' }, { status: 400 });
  }

  if (!/^\+?[0-9]{9,15}$/.test(telefono)) {
    return NextResponse.json({ error: 'El teléfono no es válido.' }, { status: 400 });
  }
  if (calle.length < 4 || calle.length > 160 || !localidad || localidad.length > 80 || !/^[0-9]{5}$/.test(cp)) {
    return NextResponse.json({ error: 'Revisa la dirección del local (calle, código postal de 5 cifras y localidad).' }, { status: 400 });
  }

  const slugBase = normalizarSlug(restauranteNombre);
  const origen = new URL(request.url).origin;

  try {
    const { url } = await crearCheckoutQr({
      plan,
      restauranteNombre,
      nombreContacto,
      email,
      telefono,
      direccion: { calle, localidad, cp },
      slugBase,
      origen,
      vendedor,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creando el checkout de QR Menú:', error);
    return NextResponse.json({ error: 'No se pudo iniciar el pago.' }, { status: 500 });
  }
}
