import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Central → Reportes y Documentos (0083, decisión de karc0 del 17/10): la documentación interna vive en la
 * base, no en el repo (que es público). La sube herramientas-claude/docs.cjs desde el escritorio, sin
 * Credenciales, secretos ni carpetas judiciales; los reportes fechados van con tipo «reporte».
 */
export type TipoDocumento = 'reporte' | 'documento';
export interface FichaDocumento {
  ruta: string; carpeta: string; titulo: string; resumen: string | null; fecha: string | null;
  bytes: number; archivado: boolean; actualizadoEn: string;
}
export interface Documento {
  ruta: string; tipo: TipoDocumento; carpeta: string; titulo: string; fecha: string | null;
  contenido: string; archivado: boolean; actualizadoEn: string;
}

const dia = (d: unknown) => (d ? new Date(d as string).toISOString().slice(0, 10) : null);

export async function verDocumentos(jwt: string, tipo: TipoDocumento): Promise<FichaDocumento[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_documentos($1)', [tipo])).rows.map((r) => ({
    ruta: r.ruta, carpeta: r.carpeta, titulo: r.titulo, resumen: r.resumen, fecha: dia(r.fecha),
    bytes: r.bytes, archivado: r.archivado, actualizadoEn: new Date(r.actualizado_en).toISOString(),
  })));
}

export async function verDocumento(jwt: string, ruta: string): Promise<Documento | null> {
  if (!ruta || ruta.length > 400) return null;
  return comoCliente(jwt, async (c) => {
    const r = (await c.query('SELECT * FROM dk.admin_documento($1)', [ruta])).rows[0];
    return r ? { ruta: r.ruta, tipo: r.tipo, carpeta: r.carpeta, titulo: r.titulo, fecha: dia(r.fecha), contenido: r.contenido,
      archivado: r.archivado, actualizadoEn: new Date(r.actualizado_en).toISOString() } : null;
  });
}

/** Enlace al visor de Central para una ruta de documento o reporte. */
export const enlaceDocumento = (ruta: string) => `/admin-dkitchen/documentos/ver?r=${encodeURIComponent(ruta)}`;

// ── 19/10 (karc0: «Reportes sigue desperdigado y confuso: remapea y reorganiza») ──────────────────────────
// Un solo mapa para Conocimiento: cada reporte tiene una CLASE, los de la misma clase se SUSTITUYEN por el más
// nuevo (arranque y mapa), y Documentos deja fuera el ruido técnico y no duplica lo que ya es un reporte.

export type ClaseReporte = 'arranque' | 'mapa' | 'plan' | 'auditoria' | 'decisiones' | 'otro';
export const CLASES: Record<ClaseReporte, { nombre: string; que: string }> = {
  arranque: { nombre: 'Arranques y cierres', que: 'Dónde está todo y el orden de prioridades al empezar. Solo manda el último.' },
  mapa: { nombre: 'Mapas', que: 'Cómo está montada Central: zonas, ciclos y qué se sincroniza con qué. Solo manda el último.' },
  plan: { nombre: 'Planes', que: 'Qué se va a hacer, en qué orden y con qué tiempo. Cada uno crea sus tareas en Mis tareas.' },
  auditoria: { nombre: 'Auditorías', que: 'Qué se comprobó, qué se encontró y qué se cambió.' },
  decisiones: { nombre: 'Decisiones', que: 'Lo que decidiste y dónde quedó aplicado (el detalle vive en Decisiones).' },
  otro: { nombre: 'Otros', que: 'Reportes sin clase.' },
};
/** Clases en las que solo el más reciente está vigente (los anteriores pasan a «superado»). */
const UNICO_VIGENTE: ClaseReporte[] = ['arranque', 'mapa'];

export function claseDe(r: { ruta: string; titulo: string }): ClaseReporte {
  const t = `${r.ruta} ${r.titulo}`.toLowerCase();
  if (/arranque|cierre de sesi/.test(t)) return 'arranque';
  if (/(^|\/)mapa[_ -]/.test(r.ruta.toLowerCase()) || /^mapa /.test(r.titulo.toLowerCase())) return 'mapa';
  if (/decisi/.test(t)) return 'decisiones';
  if (/plan/.test(t) && !/fase \d/.test(t)) return 'plan';
  if (/auditor|fase \d|comprobad|producto real|web p[uú]blica/.test(t)) return 'auditoria';
  return 'otro';
}

/** Nombre base sin carpeta ni extensión: une «05 REFERENCIA/PLAN_X.md» con «reportes/PLAN_X». */
export const base = (ruta: string) => ruta.split('/').pop()!.replace(/\.(md|txt)$/i, '').toLowerCase();

export interface ReporteMapa extends FichaDocumento { clase: ClaseReporte; vigente: boolean; superadoPor: string | null }

/** Clasifica y marca la vigencia: en arranques y mapas solo el más nuevo manda. */
export function mapaReportes(lista: FichaDocumento[]): ReporteMapa[] {
  const orden = [...lista].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '') || b.actualizadoEn.localeCompare(a.actualizadoEn));
  const primero = new Map<ClaseReporte, ReporteMapa>();
  return orden.map((d) => {
    const clase = claseDe(d);
    const previo = UNICO_VIGENTE.includes(clase) ? primero.get(clase) : undefined;
    const r: ReporteMapa = { ...d, clase, vigente: !previo, superadoPor: previo ? previo.ruta : null };
    if (!previo && UNICO_VIGENTE.includes(clase)) primero.set(clase, r);
    return r;
  });
}

/**
 * Ruido técnico que docs.cjs subió desde 06 CODIGO LOCAL (skills de agentes, .vercel, public…): no es
 * documentación del negocio. Se queda en la base, pero Documentos no lo enseña salvo «Ver todo».
 */
export const esRuido = (d: { carpeta: string; ruta: string }) =>
  /(^|\/ )\.(agents|vercel|claude|github)( \/|$)|\/ public$/i.test(d.carpeta) || /(^|\/)\.(agents|vercel|claude|github)\//i.test(d.ruta);

/** Bloque del escritorio (primer nivel de carpeta) para agrupar Documentos. */
export const bloqueDe = (carpeta: string) => (carpeta.split(' / ')[0] || 'Raíz').trim();
