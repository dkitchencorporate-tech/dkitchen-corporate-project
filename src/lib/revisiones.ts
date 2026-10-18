import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Central → Revisiones de Alex (0087): Claude registra cada cambio que karc0 debe
 * revisar (herramientas-claude/revisiones.cjs); karc0 lo aprueba o pide cambios
 * con texto e imágenes. Claude lo lee con buzon.cjs al empezar cada sesión.
 */
export type EstadoRevision = 'por_revisar' | 'cambios' | 'aprobada';
export const ESTADOS_REVISION: Record<EstadoRevision, string> = { por_revisar: 'Por revisar', cambios: 'Hay que cambiar', aprobada: 'Aprobada' };

export interface Revision {
  id: string; titulo: string; queCambio: string | null; enlace: string | null; version: string | null;
  estado: EstadoRevision; comentario: string | null; imagenes: string[]; creadoEn: string; revisadoEn: string | null; leidoClaude: boolean;
}

export async function verRevisiones(jwt: string): Promise<Revision[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_revisiones()')).rows.map((r) => ({
    id: r.id, titulo: r.titulo, queCambio: r.que_cambio, enlace: r.enlace, version: r.version, estado: r.estado,
    comentario: r.comentario_karc0, imagenes: Array.isArray(r.imagenes) ? r.imagenes : [],
    creadoEn: new Date(r.creado_en).toISOString(), revisadoEn: r.revisado_en ? new Date(r.revisado_en).toISOString() : null,
    leidoClaude: !r.cambiado_en || (!!r.leido_claude_en && new Date(r.leido_claude_en) >= new Date(r.cambiado_en)),
  })));
}

export async function guardarRevision(jwt: string, id: string, estado: EstadoRevision, comentario: string, imagenes: string[]) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_revision_guardar($1, $2, $3, $4::jsonb)', [id, estado, comentario, JSON.stringify(imagenes)]));
}
