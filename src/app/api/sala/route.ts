import { NextResponse } from 'next/server';
import { contextoSala, atenderLlamadaSala, registrarSala } from '@/lib/sala';
import { enviarRegistroAlTpv } from '@/lib/envio-tpv';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

export const runtime = 'nodejs';

const TOKEN = /^[A-Za-z0-9_-]{24,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MESA = /^[A-Za-z0-9-]{1,12}$/;

/**
 * App de sala (0027). El camarero entra con su enlace personal; el token solo
 * viaja en el cuerpo y la base valida su huella SHA-256 en cada llamada (se
 * revoca desactivando al camarero). Freno por IP contra fuerza bruta de tokens.
 */
export async function POST(peticion: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('sala', ipDeLaPeticion(peticion)), 120, 60)) {
      return NextResponse.json({ error: 'limite' }, { status: 429 });
    }
  } catch { /* si el freno falla, se sigue: la BD valida el token igualmente */ }

  const c = (await peticion.json().catch(() => null)) as Record<string, unknown> | null;
  const token = String(c?.token ?? '');
  if (!TOKEN.test(token)) return NextResponse.json({ error: 'acceso' }, { status: 401 });

  try {
    switch (c?.accion) {
      case 'contexto': {
        const x = await contextoSala(token);
        return x ? NextResponse.json(x) : NextResponse.json({ error: 'acceso' }, { status: 401 });
      }
      case 'atender': {
        const id = String(c?.llamadaId ?? '');
        if (!UUID.test(id)) return NextResponse.json({ error: 'datos' }, { status: 400 });
        return NextResponse.json({ ok: await atenderLlamadaSala(token, id) });
      }
      case 'registrar': {
        const mesa = String(c?.mesa ?? '');
        const lineas = Array.isArray(c?.lineas) ? (c!.lineas as { plato_id?: string; cantidad?: number; nota?: string }[]) : [];
        const limpias = lineas
          .filter((l) => UUID.test(String(l.plato_id ?? '')))
          .slice(0, 60)
          .map((l) => ({ plato_id: String(l.plato_id), cantidad: Math.min(50, Math.max(1, Math.trunc(Number(l.cantidad)) || 1)), nota: String(l.nota ?? '').slice(0, 120) }));
        if (!MESA.test(mesa) || limpias.length === 0) return NextResponse.json({ error: 'datos' }, { status: 400 });
        const id = await registrarSala(token, mesa, limpias);
        if (!id) return NextResponse.json({ error: 'acceso' }, { status: 401 });
        const tpv = await enviarRegistroAlTpv(token, id);
        return NextResponse.json({ ok: true, id, tpv });
      }
      default:
        return NextResponse.json({ error: 'accion' }, { status: 400 });
    }
  } catch (error) {
    console.error('App de sala:', (error as Error).message);
    return NextResponse.json({ error: 'servidor' }, { status: 500 });
  }
}
