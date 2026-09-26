import { NextResponse } from 'next/server';
import { llamarCamarero } from '@/lib/llamadas-camarero';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const SLUG_VALIDO = /^[a-z0-9-]{1,60}$/;
const MESA_VALIDA = /^[A-Za-z0-9-]{1,12}$/;

/**
 * Llamada de mesa desde la carta pública (plan Ampliado). La validación de
 * plan, estado y antirrepetición vive en dk.llamar_camarero (0019).
 */
export async function POST(peticion: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('camarero', ipDeLaPeticion(peticion)), 10, 60)) {
      return NextResponse.json({ resultado: 'limite' }, { status: 429 });
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  const cuerpo = (await peticion.json().catch(() => null)) as { slug?: string; mesa?: string; motivo?: string } | null;
  const slug = String(cuerpo?.slug ?? '').toLowerCase();
  const mesa = String(cuerpo?.mesa ?? '');
  const motivo = cuerpo?.motivo === 'cuenta' ? 'cuenta' : 'camarero';
  if (!SLUG_VALIDO.test(slug) || !MESA_VALIDA.test(mesa)) {
    return NextResponse.json({ resultado: 'invalido' }, { status: 400 });
  }

  try {
    const resultado = await llamarCamarero(slug, mesa, motivo);
    return NextResponse.json({ resultado });
  } catch (error) {
    console.error('Fallo registrando llamada de camarero:', error);
    return NextResponse.json({ resultado: 'error' }, { status: 500 });
  }
}
