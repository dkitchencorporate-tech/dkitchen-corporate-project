import 'server-only';
import { comoCliente, comoVisitante } from '@/lib/db';

export interface LlamadaCamarero {
  id: string;
  mesa: string;
  motivo: 'camarero' | 'cuenta';
  creadaEn: string;
}

export async function llamadasPendientes(jwt: string, restauranteId: string): Promise<LlamadaCamarero[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query(
      `SELECT id, mesa, motivo, creada_en FROM llamadas_camarero
        WHERE restaurante_id = $1 AND atendida_en IS NULL
          AND creada_en > now() - interval '2 hours'
        ORDER BY creada_en`,
      [restauranteId]
    );
    return rows.map((r) => ({ id: r.id, mesa: r.mesa, motivo: r.motivo, creadaEn: new Date(r.creada_en).toISOString() }));
  });
}

export async function atenderLlamada(jwt: string, llamadaId: string): Promise<void> {
  await comoCliente(jwt, async (c) => {
    await c.query('UPDATE llamadas_camarero SET atendida_en = now() WHERE id = $1 AND atendida_en IS NULL', [llamadaId]);
  });
}

export async function llamarCamarero(slug: string, mesa: string, motivo: 'camarero' | 'cuenta'): Promise<string> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query<{ r: string }>('SELECT dk.llamar_camarero($1, $2, $3) AS r', [slug, mesa, motivo]);
    return rows[0]?.r ?? 'error';
  });
}
