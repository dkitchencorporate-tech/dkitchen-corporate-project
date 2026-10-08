import { NextResponse } from 'next/server';
import { crearCheckoutFundador } from '@/lib/payments/cobros';
import { leerAlta } from '@/lib/payments/alta';
import { estadoFundador } from '@/lib/fundador';

export const runtime = 'nodejs';

/**
 * Alta de Fundador (0051): plan Sala al 40 %, 124,20 € + IVA por trimestre.
 * Solo si el programa está abierto (lo decide la base). Igual que /api/checkout/qr,
 * esta ruta nunca escribe en la base: aprovisiona el webhook tras el pago.
 * Desde el 08/10 (#247) comparte con QR la validación (teléfono y dirección),
 * el código de asesor (avisa si no existe) y el aviso de correo ya registrado.
 */
export async function POST(request: Request) {
  const [estado, alta] = await Promise.all([estadoFundador(), leerAlta(request, 'checkout-fundador')]);
  if (!estado?.abierto) {
    return NextResponse.json({ error: 'La oferta Fundador está cerrada.' }, { status: 409 });
  }
  if (!alta.ok) return alta.respuesta;

  try {
    const { url } = await crearCheckoutFundador(alta.datos);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creando el checkout de Fundador:', error);
    return NextResponse.json({ error: 'No se pudo iniciar el pago.' }, { status: 500 });
  }
}
