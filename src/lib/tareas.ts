import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Central → Mis tareas (0077): lo que le toca hacer a karc0 para el lanzamiento.
 * Claude las crea; karc0 las tacha o deja una nota y Claude lo lee al empezar cada sesión.
 */
export type EstadoTarea = 'pendiente' | 'hecha' | 'bloqueada';
export const BLOQUES: Record<string, string> = {
  propuestas: 'Propuestas', redes: 'Redes sociales', anuncios: 'Anuncios de Meta', cobro: 'Antes del primer cobro',
  legal: 'Legal', flyers: 'Flyers y visitas', central: 'Central y paneles', producto: 'Producto (QR, Signature, Experience)',
  desarrollo: 'Desarrollo y automatización', auditoria: 'Auditorías y reportes', otro: 'Otras',
};
/** Quién la hace (0082). Mis tareas es también la hoja de ruta: nada vive solo en el chat. */
export const RESPONSABLES: Record<string, string> = { karc0: 'Tú', claude: 'Claude', antigravity: 'Antigravity', ambos: 'Tú + Claude' };
/** Urgencia (0083): ordena la lista y el tablero. */
export const URGENCIAS: Record<string, string> = { urgente: 'Urgente', alta: 'Alta', media: 'Media', baja: 'Baja' };

export interface Tarea {
  id: string; orden: number; bloque: string; titulo: string; detalle: string | null; enlace: string | null;
  paraCuando: string | null; estado: EstadoTarea; notaKarc0: string | null; notaClaude: string | null;
  cambiadoEn: string | null; leidoClaude: boolean; responsable: string; estimado: string | null;
  urgencia: string; docEscritorio: string | null; docCentral: string | null;
}

export async function verTareas(jwt: string): Promise<Tarea[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_tareas()')).rows.map((r) => ({
    id: r.id, orden: r.orden, bloque: r.bloque, titulo: r.titulo, detalle: r.detalle, enlace: r.enlace,
    paraCuando: r.para_cuando ? new Date(r.para_cuando).toISOString().slice(0, 10) : null, estado: r.estado,
    notaKarc0: r.nota_karc0, notaClaude: r.nota_claude, cambiadoEn: r.cambiado_en ? new Date(r.cambiado_en).toISOString() : null,
    leidoClaude: r.leido_claude, responsable: r.responsable ?? 'karc0', estimado: r.estimado ?? null,
    urgencia: r.urgencia ?? 'media', docEscritorio: r.doc_escritorio ?? null, docCentral: r.doc_central ?? null,
  })));
}

export async function guardarTarea(jwt: string, id: string, estado: EstadoTarea, nota: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_tarea_guardar($1, $2, $3)', [id, estado, nota]));
}
