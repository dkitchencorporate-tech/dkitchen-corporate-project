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
