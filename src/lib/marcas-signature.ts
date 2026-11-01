import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Signature semiautomática (0113, 02/11): encargo de marca con el motor white label. Dirección lo pide en Central;
 * el flujo privado dkitchen-marcas (GitHub Actions) crea repo + base + Vercel + subdominio y escribe cada paso.
 */
export type PasoMarca = { estado: 'en_curso' | 'hecho'; detalle: string | null; en: string };
export interface Marca {
  proyectoId: string; slug: string; nombre: string; color: string; preajuste: string; ciudad: string | null;
  estado: 'pedida' | 'en_curso' | 'lista' | 'error'; pasos: Record<string, PasoMarca>; url: string | null; repo: string | null;
  error: string | null; prueba: boolean; actualizadoEn: string;
}
export const PASOS_MARCA: [string, string][] = [['repo', 'Repo con el motor'], ['base', 'Base de datos propia'], ['vercel', 'App publicada en Vercel'], ['dominio', 'Subdominio en línea']];
export const PREAJUSTES: [string, string][] = [['restaurante', 'Restaurante'], ['bar', 'Bar'], ['dark_kitchen', 'Dark kitchen'], ['dark_store', 'Dark store']];

const fila = (r: Record<string, unknown>): Marca => ({
  proyectoId: r.proyecto_id as string, slug: r.slug as string, nombre: r.nombre as string, color: r.color as string,
  preajuste: r.preajuste as string, ciudad: (r.ciudad as string) ?? null, estado: r.estado as Marca['estado'],
  pasos: (r.pasos && typeof r.pasos === 'object' ? r.pasos : {}) as Record<string, PasoMarca>, url: (r.url as string) ?? null,
  repo: (r.repo as string) ?? null, error: (r.error as string) ?? null, prueba: r.prueba === true,
  actualizadoEn: new Date(r.actualizado_en as string).toISOString(),
});

export async function marcas(jwt: string, proyecto?: string): Promise<Marca[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_marcas($1)', [proyecto ?? null])).rows.map(fila));
}

/** Nombre corto para repo, base y subdominio: minúsculas, sin acentos, guiones; sin el prefijo PRUEBA. */
export function slugMarca(texto: string, prueba = false): string {
  const base = texto.replace(/^PRUEBA\s*·\s*/i, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, prueba ? 30 : 36).replace(/-+$/g, '');
  const s = (prueba ? `prueba-${base}` : base) || 'marca';
  return s.length < 3 ? `${s}-app` : s;
}

/** Lanza el flujo al momento si hay token de GitHub en Vercel; si no, lo recoge la ejecución de cada hora. */
export async function lanzarFlujoMarcas(): Promise<boolean> {
  const token = process.env.DK_MARCAS_TOKEN;
  if (!token) return false;
  const r = await fetch('https://api.github.com/repos/dkitchencorporate-tech/dkitchen-marcas/actions/workflows/marcas.yml/dispatches', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ ref: 'main' }),
  }).catch(() => null);
  return !!r?.ok;
}
