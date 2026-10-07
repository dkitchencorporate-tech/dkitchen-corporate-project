import 'server-only';
import { comoVisitante, HAY_BASE_DE_DATOS } from '@/lib/db';

/** Estado vivo del programa Fundador (0051): lo calcula la base, nunca la web. */
export interface EstadoFundador {
  abierto: boolean;
  abiertoEn: string | null;
  cierraEn: string | null;
  plazas: number;
  ocupadas: number;
  quedan: number;
  motivo: 'sin_abrir' | 'plazas' | 'plazo' | null;
}

/** null si la base no responde: quien lo pinte debe tratarlo como «cerrado». */
export async function estadoFundador(): Promise<EstadoFundador | null> {
  if (!HAY_BASE_DE_DATOS) return null;
  try {
    const e = await comoVisitante(async (c) => (await c.query<{ e: Record<string, unknown> }>('SELECT dk.fundador_estado() AS e')).rows[0]?.e);
    if (!e) return null;
    return {
      abierto: e.abierto === true,
      abiertoEn: (e.abierto_en as string | null) ?? null,
      cierraEn: (e.cierra_en as string | null) ?? null,
      plazas: Number(e.plazas ?? 0),
      ocupadas: Number(e.ocupadas ?? 0),
      quedan: Number(e.quedan ?? 0),
      motivo: (e.motivo as EstadoFundador['motivo']) ?? null,
    };
  } catch (error) {
    console.error('No se pudo leer el estado de Fundador:', error);
    return null;
  }
}
