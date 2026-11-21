import 'server-only';
import { comoCliente } from '@/lib/db';
import { parsearAdjuntosJson } from '@/lib/media-central';
import type { CapturaRed, EntradaRedAnalitica, EstadoAnaliticaRed, RedSocial } from '@/lib/redes-analitica-tipos';

export { REDES_SOCIALES, ESTADOS_ANALITICA } from '@/lib/redes-analitica-tipos';
export type { RedSocial, EstadoAnaliticaRed, CapturaRed, EntradaRedAnalitica } from '@/lib/redes-analitica-tipos';

function fechaIsoPg(v: unknown): string {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v ?? '').slice(0, 10);
}

/** Lectura y escritura de Analítica de Redes (0123); la base exige dk.exigir_direccion(). */
export async function listarRedesAnalitica(
  jwt: string,
  red: RedSocial | null = null,
  limite = 80,
): Promise<EntradaRedAnalitica[]> {
  return comoCliente(jwt, async (c) =>
    (await c.query('SELECT * FROM dk.redes_analitica_listar($1, $2)', [red, limite])).rows.map((r) => ({
      id: r.id,
      fecha: fechaIsoPg(r.fecha),
      red: r.red as RedSocial,
      titulo: r.titulo,
      notasAlex: r.notas_alex,
      capturas: parsearAdjuntosJson(r.capturas, 10, false) as CapturaRed[],
      analisisDk: r.analisis_dk,
      rumboDiario: r.rumbo_diario,
      estado: r.estado as EstadoAnaliticaRed,
      autorNombre: r.autor_nombre ?? 'Dirección',
      creadoEn: new Date(r.creado_en).toISOString(),
      actualizadoEn: new Date(r.actualizado_en).toISOString(),
    })),
  );
}

export async function crearRedAnalitica(
  jwt: string,
  datos: { fecha: string | null; red: RedSocial; titulo: string; notasAlex: string | null; capturas: CapturaRed[] },
): Promise<string> {
  return comoCliente(
    jwt,
    async (c) =>
      (
        await c.query('SELECT dk.redes_analitica_crear($1::date, $2, $3, $4, $5::jsonb) AS id', [
          datos.fecha,
          datos.red,
          datos.titulo,
          datos.notasAlex,
          JSON.stringify(datos.capturas),
        ])
      ).rows[0].id,
  );
}

export async function actualizarRedAnalitica(
  jwt: string,
  datos: {
    id: string;
    notasAlex: string | null;
    analisisDk: string | null;
    rumboDiario: string | null;
    estado: EstadoAnaliticaRed;
  },
): Promise<void> {
  await comoCliente(jwt, (c) =>
    c.query('SELECT dk.redes_analitica_actualizar($1, $2, $3, $4, $5)', [
      datos.id,
      datos.notasAlex,
      datos.analisisDk,
      datos.rumboDiario,
      datos.estado,
    ]),
  );
}

export async function borrarRedAnalitica(jwt: string, id: string): Promise<void> {
  await comoCliente(jwt, (c) => c.query('SELECT dk.redes_analitica_borrar($1)', [id]));
}
