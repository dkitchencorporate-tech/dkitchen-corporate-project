import 'server-only';
import { comoCliente } from '@/lib/db';
import type { EstadoIdea, IdeaContenido, LineaContenido, PublicoIdea, RedIdea, ServicioIdea } from '@/lib/ideas-contenido-tipos';

export * from '@/lib/ideas-contenido-tipos';

const fecha = (v: unknown): string | null => {
  if (v == null) return null;
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  return String(v).slice(0, 10);
};
const num = (v: unknown): number | null => (v == null ? null : Number(v));

/** Lectura y escritura de Ideas y contenido (0125); la base exige dk.exigir_direccion(). */
export async function listarIdeas(jwt: string): Promise<IdeaContenido[]> {
  return comoCliente(jwt, async (c) =>
    (await c.query('SELECT * FROM dk.ideas_listar()')).rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      idea: r.idea,
      serie: r.serie,
      orden: r.orden,
      nicho: r.nicho,
      publico: r.publico as PublicoIdea,
      servicio: r.servicio as ServicioIdea,
      red: r.red as RedIdea,
      formato: r.formato,
      desarrollo: r.desarrollo,
      notaAlex: r.nota_alex,
      estado: r.estado as EstadoIdea,
      fechaPrevista: fecha(r.fecha_prevista),
      enlace: r.enlace,
      vistas: num(r.vistas),
      retencionSeg: num(r.retencion_seg),
      compartidos: num(r.compartidos),
      guardados: num(r.guardados),
      comentarios: num(r.comentarios),
      aprendizaje: r.aprendizaje,
      lineaEditorial: r.linea_editorial ?? null,
      lineaCreativa: r.linea_creativa ?? null,
      creadoEn: new Date(r.creado_en).toISOString(),
      actualizadoEn: new Date(r.actualizado_en).toISOString(),
    })),
  );
}

export async function crearIdea(jwt: string, d: { titulo: string; idea: string | null; publico: PublicoIdea; servicio: ServicioIdea; red: RedIdea }): Promise<string> {
  return comoCliente(jwt, async (c) =>
    (await c.query('SELECT dk.ideas_crear($1, $2, $3, $4, $5) AS id', [d.titulo, d.idea, d.publico, d.servicio, d.red])).rows[0].id,
  );
}

export async function cambiarEstadoIdea(jwt: string, id: string, estado: EstadoIdea, nota: string | null): Promise<void> {
  await comoCliente(jwt, (c) => c.query('SELECT dk.ideas_estado($1, $2, $3)', [id, estado, nota]));
}

export async function guardarIdea(jwt: string, id: string, campos: Record<string, string>): Promise<void> {
  await comoCliente(jwt, (c) => c.query('SELECT dk.ideas_guardar($1, $2::jsonb)', [id, JSON.stringify(campos)]));
}

export async function listarLineas(jwt: string): Promise<LineaContenido[]> {
  return comoCliente(jwt, async (c) =>
    (await c.query('SELECT * FROM dk.lineas_listar()')).rows.map((r) => ({
      codigo: r.codigo,
      tipo: r.tipo,
      nombre: r.nombre,
      paraQue: r.para_que,
      como: r.como,
      quien: r.quien,
      herramienta: r.herramienta,
      etiquetaIa: r.etiqueta_ia,
      referencias: r.referencias,
      estado: r.estado,
      piezas: Number(r.piezas),
      publicadas: Number(r.publicadas),
      retencionMedia: r.retencion_media == null ? null : Number(r.retencion_media),
      compartidos: Number(r.compartidos),
    })),
  );
}

export async function guardarLineasIdea(jwt: string, id: string, editorial: string | null, creativa: string | null): Promise<void> {
  await comoCliente(jwt, (c) => c.query('SELECT dk.ideas_lineas($1, $2, $3)', [id, editorial, creativa]));
}
