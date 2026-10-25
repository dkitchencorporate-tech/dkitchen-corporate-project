import { NextResponse } from 'next/server';
import { pedirDesdeMesa } from '@/lib/pedido-mesa';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const SLUG_VALIDO = /^[a-z0-9-]{1,60}$/;
const MESA_VALIDA = /^[A-Za-z0-9-]{1,12}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pedido del comensal desde la carta (G, 0099). Plan Sala y validación de platos,
 * precios y antiabuso en dk.mesa_pedir; aquí solo se limpia la entrada y se frena por IP.
 */
export async function POST(peticion: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('mesa-pedido', ipDeLaPeticion(peticion)), 6, 60)) {
      return NextResponse.json({ resultado: 'limite' }, { status: 429 });
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  const c = (await peticion.json().catch(() => null)) as { slug?: string; mesa?: string; nota?: string; lineas?: { plato_id?: string; cantidad?: number; nota?: string }[] } | null;
  const slug = String(c?.slug ?? '').toLowerCase();
  const mesa = String(c?.mesa ?? '');
  const bruto = c?.lineas;
  const lineas = (Array.isArray(bruto) ? bruto : [])
    .filter((l) => UUID.test(String(l?.plato_id ?? '')))
    .slice(0, 30)
    .map((l) => ({ plato_id: String(l.plato_id), cantidad: Math.min(20, Math.max(1, Math.trunc(Number(l.cantidad)) || 1)), nota: String(l.nota ?? '').slice(0, 120) }));
  if (!SLUG_VALIDO.test(slug) || !MESA_VALIDA.test(mesa) || lineas.length === 0) {
    return NextResponse.json({ resultado: 'datos' }, { status: 400 });
  }

  try {
    const resultado = await pedirDesdeMesa(slug, mesa, lineas, String(c?.nota ?? '').slice(0, 200));
    return NextResponse.json({ resultado });
  } catch (error) {
    console.error('Fallo registrando el pedido de la mesa:', error);
    return NextResponse.json({ resultado: 'error' }, { status: 500 });
  }
}
