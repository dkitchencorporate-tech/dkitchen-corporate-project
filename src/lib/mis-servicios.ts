import 'server-only';
import { comoCliente } from '@/lib/db';

/** Zona del cliente «Mis servicios» (0111): Signature, Experience y Auditoría del correo de la sesión. */
export interface MiServicio {
  id: string; producto: 'signature' | 'experience' | 'auditoria'; fase: string; negocio: string | null;
  siguientePaso: string | null; siguienteFecha: string | null; creadoEn: string;
  datos: Record<string, string | string[]>; cronologia: { tipo: string; fase: string | null; en: string }[];
}

export async function misServicios(jwt: string): Promise<MiServicio[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.mis_servicios()')).rows.map((r) => ({
    id: r.id, producto: r.producto, fase: r.fase, negocio: r.negocio, siguientePaso: r.siguiente_paso,
    siguienteFecha: r.siguiente_fecha ? new Date(r.siguiente_fecha).toISOString().slice(0, 10) : null,
    creadoEn: new Date(r.creado_en).toISOString(),
    datos: (r.datos_cliente && typeof r.datos_cliente === 'object' ? r.datos_cliente : {}) as Record<string, string | string[]>,
    cronologia: Array.isArray(r.cronologia) ? r.cronologia : [],
  })));
}

export async function guardarMisDatos(jwt: string, id: string, datos: Record<string, string | string[]>): Promise<void> {
  await comoCliente(jwt, (c) => c.query('SELECT dk.mi_proyecto_datos($1, $2::jsonb)', [id, JSON.stringify(datos)]));
}
