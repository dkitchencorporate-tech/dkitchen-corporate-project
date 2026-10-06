import { randomUUID } from 'node:crypto';
import { BASE_OPERATIVA } from '@/lib/pricing-config';
import { NextResponse } from 'next/server';
import { crearCheckoutProductoDirecto } from '@/lib/payments/cobros';
import { PRODUCTOS_PAGO } from '@/lib/productos-pago';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

/**
 * Checkout de las páginas /pagar/<producto> (29/09/2026). El precio lo pone el
 * servidor desde el catálogo; del navegador solo llegan los datos de contacto.
 * No toca la base: es el webhook de Stripe quien reacciona al pago real.
 */
export const runtime = 'nodejs';

const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('checkout-directo', ipDeLaPeticion(request)), 6, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiados intentos seguidos. Inténtalo en unos minutos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }); }
  const p = PRODUCTOS_PAGO[txt(b.producto, 30)];
  const email = txt(b.email, 254), nombre = txt(b.nombre, 80), negocio = txt(b.negocio, 100);
  const telefono = txt(b.telefono, 20).replace(/[^0-9+ ]/g, '');
  if (!p) return NextResponse.json({ error: 'Producto no válido.' }, { status: 400 });
  if (!nombre || !CORREO.test(email) || !negocio || telefono.replace(/\D/g, '').length < 9) {
    return NextResponse.json({ error: 'Revisa tu nombre, negocio, correo y teléfono.' }, { status: 400 });
  }
  try {
    const { url } = await crearCheckoutProductoDirecto({
      id: p.id, metadataPago: p.metadataPago, titulo: p.nombre, precio: p.precio, email, nombreContacto: nombre,
      restauranteNombre: negocio, telefono, detalle: txt(b.detalle, 60).replace(/[^a-z0-9 áéíóúñ-]/gi, ''),
      origen: new URL(request.url).origin,
      fraccionado: p.id === 'signature' && b.fraccionado === true && BASE_OPERATIVA.fraccionable
        ? { cuotas: BASE_OPERATIVA.fraccionado.cuotas, importeCuota: BASE_OPERATIVA.fraccionado.importeCuota, dias: BASE_OPERATIVA.fraccionado.diasEntreCuotas, ref: randomUUID() }
        : undefined,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error(`Error creando el checkout directo (${p.id}):`, e);
    return NextResponse.json({ error: 'No se pudo abrir el pago. Inténtalo de nuevo en un momento.' }, { status: 500 });
  }
}
