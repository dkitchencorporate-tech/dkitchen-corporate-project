import { NextResponse } from 'next/server';
import { bloqueoSinBackend } from '@/lib/api-guard';

/**
 * Exportación de leads a CSV.
 *
 * ATENCIÓN AL RECONECTAR NEON: esta ruta nunca tuvo comprobación de identidad.
 * Era un POST abierto que devolvía nombre, teléfono y correo de todos los leads
 * a quien lo pidiera. Antes de volver a habilitarla hay que exigir sesión de
 * administrador, no solo que exista base de datos.
 */
export async function POST() {
  const bloqueo = bloqueoSinBackend();
  if (bloqueo) return bloqueo;

  return NextResponse.json(
    { status: 'error', message: 'Exportación no disponible.' },
    { status: 501 }
  );
}
