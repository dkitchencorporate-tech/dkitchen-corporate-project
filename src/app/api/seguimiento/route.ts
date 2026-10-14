import { NextResponse } from 'next/server';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { comoCliente } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Seguimiento en vivo de cuentas piloto (0078, 14/10/2026). El panel manda lotes de
 * eventos (clics, pantallas, tiempos, errores); la base solo los guarda si la cuenta
 * de la sesión está en seguimiento_cuentas. Responde { activo } para que el panel
 * deje de enviar si no lo está. Nunca recibe lo que el cliente escribe.
 */
export async function POST(request: Request) {
  const jwt = await obtenerJwtDeSesion();
  if (!jwt) return NextResponse.json({ activo: false }, { status: 401 });
  let eventos: unknown;
  try { eventos = (await request.json())?.eventos; } catch { return NextResponse.json({ activo: false }, { status: 400 }); }
  if (!Array.isArray(eventos) || eventos.length === 0 || eventos.length > 60) return NextResponse.json({ activo: false }, { status: 400 });
  try {
    const n = await comoCliente(jwt, async (c) => (await c.query<{ n: number }>('SELECT dk.seguimiento_registrar($1::jsonb) n', [JSON.stringify(eventos)])).rows[0]?.n ?? 0);
    return NextResponse.json({ activo: n > 0 });
  } catch (e) {
    console.error('Seguimiento no guardado', e);
    return NextResponse.json({ activo: false }, { status: 500 });
  }
}
