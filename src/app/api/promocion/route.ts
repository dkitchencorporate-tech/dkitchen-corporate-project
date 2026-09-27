import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { registrarEventoPromocion } from '@/lib/menu';
import { ipDeLaPeticion } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Vista o clic del banner de la carta. La clave del visitante es un hash de
 * la IP (nunca se guarda la IP): la base cuenta como máximo una vista y un
 * clic por visitante cada 30 minutos (dk.registrar_evento_promocion, 0023).
 */
export async function POST(peticion: Request) {
  const c = (await peticion.json().catch(() => null)) as { id?: string; tipo?: string } | null;
  const id = String(c?.id ?? '');
  const tipo = c?.tipo === 'clic' ? 'clic' : 'vista';
  if (!UUID.test(id)) return new NextResponse(null, { status: 204 });
  try {
    const clave = createHash('sha256').update(ipDeLaPeticion(peticion)).digest('hex').slice(0, 32);
    await registrarEventoPromocion(id, tipo, clave);
  } catch (error) {
    console.error('Evento de promoción no registrado:', (error as Error).message);
  }
  return new NextResponse(null, { status: 204 });
}
