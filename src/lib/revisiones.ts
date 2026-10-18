import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Central → Revisiones de Alex (0087): Claude registra cada cambio que karc0 debe
 * revisar (herramientas-claude/revisiones.cjs); karc0 lo aprueba o pide cambios
 * con texto e imágenes. Claude lo lee con buzon.cjs al empezar cada sesión.
 */
export type EstadoRevision = 'por_revisar' | 'cambios' | 'aprobada';
export const ESTADOS_REVISION: Record<EstadoRevision, string> = { por_revisar: 'Por revisar', cambios: 'Hay que cambiar', aprobada: 'Aprobada' };
/** 0090: el resultado que da Claude a cada revisión con cambios. */
export const ESTADOS_CLAUDE: Record<string, string> = { por_implementar: 'Por implementar', en_preguntas: 'Pregunta para ti', decision: 'Pendiente de decisión', implementada: 'Implementada', descartada: 'Descartada' };

export interface Revision {
  id: string; titulo: string; queCambio: string | null; enlace: string | null; version: string | null;
  estado: EstadoRevision; comentario: string | null; imagenes: string[]; creadoEn: string; revisadoEn: string | null; leidoClaude: boolean;
  estadoClaude: string | null; respuestaClaude: string | null; respondidaEn: string | null;
}

export async function verRevisiones(jwt: string): Promise<Revision[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_revisiones()')).rows.map((r) => ({
    id: r.id, titulo: r.titulo, queCambio: r.que_cambio, enlace: r.enlace, version: r.version, estado: r.estado,
    comentario: r.comentario_karc0, imagenes: Array.isArray(r.imagenes) ? r.imagenes : [],
    creadoEn: new Date(r.creado_en).toISOString(), revisadoEn: r.revisado_en ? new Date(r.revisado_en).toISOString() : null,
    leidoClaude: !r.cambiado_en || (!!r.leido_claude_en && new Date(r.leido_claude_en) >= new Date(r.cambiado_en)),
    estadoClaude: r.estado_claude ?? null, respuestaClaude: r.respuesta_claude ?? null, respondidaEn: r.respondida_en ? new Date(r.respondida_en).toISOString() : null,
  })));
}

export async function guardarRevision(jwt: string, id: string, estado: EstadoRevision, comentario: string, imagenes: string[]) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_revision_guardar($1, $2, $3, $4::jsonb)', [id, estado, comentario, JSON.stringify(imagenes)]));
}
