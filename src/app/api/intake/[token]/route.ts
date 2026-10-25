import { NextResponse } from 'next/server';
import { guardarIntake, pedidoPorToken } from '@/lib/pedidos-nivel-b';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const LIMITE_POR_IP = 10;
const VENTANA_SEGUNDOS = 10 * 60;

/**
 * Guarda el formulario de intake (Parte 8, Sección 5-bis). El token del
 * pedido es la única autorización — no hay cuenta de cliente todavía para
 * Núcleo Operativo/Dark Kitchen Ruta B — así que se valida siempre dentro
 * de `dk.guardar_intake` (0013), nunca confiando en lo que diga esta ruta.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const clave = claveDeLimite('intake', ipDeLaPeticion(request));
    if (await limiteSuperado(clave, LIMITE_POR_IP, VENTANA_SEGUNDOS)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes seguidas. Inténtalo en unos minutos.' },
        { status: 429 }
      );
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  const { token } = await params;
  if (!token || token.length > 200) {
    return NextResponse.json({ error: 'Enlace no válido.' }, { status: 400 });
  }

  let datos: unknown;
  try {
    datos = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  if (!datos || typeof datos !== 'object' || JSON.stringify(datos).length > 50_000) {
    return NextResponse.json({ error: 'Formulario no válido.' }, { status: 400 });
  }

  try {
    await guardarIntake(token, datos);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`Error guardando el intake (token ${token}):`, error);
    return NextResponse.json({ error: 'No se pudo guardar el formulario. Comprueba el enlace.' }, { status: 400 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pedido = await pedidoPorToken(token).catch(() => null);
  if (!pedido) return NextResponse.json({ error: 'Enlace no válido.' }, { status: 404 });
  return NextResponse.json({
    producto: pedido.producto,
    nombreContacto: pedido.nombreContacto,
    restauranteNombre: pedido.restauranteNombre,
    estado: pedido.estado,
  });
}
