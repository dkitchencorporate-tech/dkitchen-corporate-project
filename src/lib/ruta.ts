import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Central → Ruta de lanzamiento (0085, 18/10/2026): hitos con meta y dato real, matriz de productos y KPIs.
 * Los valores automáticos los calcula la base (dk.ruta_kpis); los manuales los fija karc0 o Claude.
 */
export interface Hito {
  id: string; orden: number; codigo: string; fase: string; titulo: string; detalle: string | null; fecha: string;
  meta: number; unidad: string; metrica: string | null; responsable: string; valor: number;
}
export interface CapacidadProducto { orden: number; producto: string; capacidad: string; estado: 'auto' | 'parcial' | 'manual' | 'falta'; nota: string | null }
export interface Ruta { hoy: string; kpis: Record<string, number>; hitos: Hito[]; productos: CapacidadProducto[] }

export async function verRuta(jwt: string): Promise<Ruta> {
  const r = await comoCliente(jwt, async (c) => (await c.query<{ r: Ruta }>('SELECT dk.admin_ruta() AS r')).rows[0].r);
  return { ...r, hitos: r.hitos.map((h) => ({ ...h, meta: Number(h.meta), valor: Number(h.valor) })) };
}

export async function fijarValorHito(jwt: string, id: string, valor: number) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_ruta_valor($1, $2)', [id, valor]));
}

/** Puntos por estado de cada capacidad para el % de automatización de un producto. */
export const PESO: Record<CapacidadProducto['estado'], number> = { auto: 1, parcial: 0.5, manual: 0.2, falta: 0 };
export const progreso = (h: Hito) => Math.max(0, Math.min(1, h.meta > 0 ? h.valor / h.meta : 0));
export type EstadoHito = 'hecho' | 'atrasado' | 'en_curso' | 'proximo';
export function estadoHito(h: Hito, hoy: string): EstadoHito {
  if (progreso(h) >= 1) return 'hecho';
  if (h.fecha < hoy) return 'atrasado';
  const dias = (Date.parse(h.fecha) - Date.parse(hoy)) / 86400000;
  return dias <= 7 ? 'en_curso' : 'proximo';
}
