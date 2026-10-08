import { NextResponse } from 'next/server';
import { crearCheckoutQr } from '@/lib/payments/cobros';
import { leerAlta } from '@/lib/payments/alta';
import { esPlanQr } from '@/lib/pricing-config';

export const runtime = 'nodejs';

/**
 * Crea el cobro de Stripe para activar QR Menú (Parte 6, Sección 3) y
 * devuelve la URL de nuestro checkout nativo /pago. Stripe es el único
 * proveedor de pago (08/10/2026). `/api/webhooks/stripe`
 * es quien aprovisiona de verdad tras el pago — esta ruta nunca escribe en
 * la base. Validación, asesor, freno y correo ya registrado: `leerAlta`.
 */
export async function POST(request: Request) {
  const alta = await leerAlta(request, 'checkout-qr');
  if (!alta.ok) return alta.respuesta;
  const plan = alta.body.plan;
  if (!esPlanQr(plan)) {
    return NextResponse.json({ error: 'Plan desconocido.' }, { status: 400 });
  }

  try {
    const { url } = await crearCheckoutQr({ plan, ...alta.datos });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creando el checkout de QR Menú:', error);
    return NextResponse.json({ error: 'No se pudo iniciar el pago.' }, { status: 500 });
  }
}
