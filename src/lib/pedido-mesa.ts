import 'server-only';
import { comoVisitante } from '@/lib/db';
import { huellaToken } from '@/lib/sala';

/**
 * Pedido del comensal desde la mesa (G, 0099). Planes Local y Sala (0100; Carta no); en las demos internas se simula.
 * El pedido no va a cocina: el camarero lo confirma en su app y entonces es una ronda normal.
 * Validación, precios y antiabuso viven en la base (dk.mesa_pedir, dk.sala_pedido_resolver).
 */
export type ModoPedidoMesa = 'real' | 'demo' | null;
export type ResultadoPedidoMesa = 'ok' | 'demo' | 'espera' | 'limite' | 'datos' | 'no_disponible';

export async function modoPedidoMesa(slug: string): Promise<ModoPedidoMesa> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.mesa_pedido_modo($1) AS m', [slug]);
    const m = rows[0]?.m;
    return m === 'real' || m === 'demo' ? m : null;
  }).catch(() => null);
}

export async function pedirDesdeMesa(slug: string, mesa: string, lineas: { plato_id: string; cantidad: number; nota: string }[], nota: string): Promise<ResultadoPedidoMesa> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.mesa_pedir($1, $2, $3::jsonb, $4) AS r', [slug, mesa, JSON.stringify(lineas), nota]);
    return (rows[0]?.r ?? 'datos') as ResultadoPedidoMesa;
  });
}

export async function resolverPedidoMesa(token: string, pedidoId: string, aceptar: boolean): Promise<string | null> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT dk.sala_pedido_resolver($1, $2, $3) AS id', [huellaToken(token), pedidoId, aceptar]);
    return rows[0]?.id ?? null;
  });
}
