import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Zona del cliente de Experience (0088): sus proyectos (por el correo de su cuenta),
 * el briefing y la llamada de arranque que agenda él mismo.
 */
export interface MiExperience {
  id: string; fase: string; origen: string; negocio: string | null; nombre: string | null; importe: number | null;
  datos: Record<string, string>; briefing: Record<string, string> | null; briefingEn: string | null;
  llamadaEn: string | null; siguientePaso: string | null; creadoEn: string;
  // 0103: lo contratado, la cronología (solo hitos) y el evento enlazado con sus ventas
  fotos: string[]; contratoEstado: string | null; cronologia: { tipo: string; fase: string | null; en: string }[];
  evento: EventoVentas | null;
}

export interface EventoVentas {
  slug: string; titulo: string; fecha: string; estado: 'borrador' | 'venta' | 'cerrado'; aforo: number; precio: number;
  vendidas: number; usadas: number; ingresos: number; hoy: number; tieneClave: boolean;
}

export interface Comprador { nombre: string; email: string; entradas: number; usadas: number; importe: number; compradoEn: string }

const iso = (x: unknown) => (x ? new Date(x as string).toISOString() : null);

export async function misExperiences(jwt: string): Promise<MiExperience[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.mi_experience()')).rows.map((r) => ({
    id: r.id, fase: r.fase, origen: r.origen, negocio: r.negocio, nombre: r.nombre, importe: r.importe_centimos,
    datos: (r.datos && typeof r.datos === 'object' ? r.datos : {}) as Record<string, string>,
    briefing: r.briefing ?? null, briefingEn: iso(r.briefing_en), llamadaEn: iso(r.llamada_en),
    siguientePaso: r.siguiente_paso, creadoEn: new Date(r.creado_en).toISOString(),
    fotos: Array.isArray(r.fotos) ? r.fotos : [], contratoEstado: r.contrato_estado ?? null,
    cronologia: Array.isArray(r.cronologia) ? r.cronologia.map((e: { tipo: string; fase: string | null; en: string }) => ({ tipo: e.tipo, fase: e.fase, en: iso(e.en)! })) : [],
    evento: r.evento ? {
      slug: r.evento.slug, titulo: r.evento.titulo, fecha: iso(r.evento.fecha)!, estado: r.evento.estado, aforo: Number(r.evento.aforo),
      precio: Number(r.evento.precio_centimos), vendidas: Number(r.evento.vendidas), usadas: Number(r.evento.usadas),
      ingresos: Number(r.evento.ingresos_centimos), hoy: Number(r.evento.hoy), tieneClave: !!r.evento.tiene_clave,
    } : null,
  })));
}

/** Compradores del evento del proyecto (0103): una fila por compra, sin anuladas. */
export async function misCompradores(jwt: string, id: string): Promise<Comprador[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.mi_experience_compradores($1)', [id])).rows.map((r) => ({
    nombre: r.nombre ?? '', email: r.email ?? '', entradas: Number(r.entradas), usadas: Number(r.usadas),
    importe: Number(r.importe_centimos), compradoEn: new Date(r.comprado_en).toISOString(),
  })));
}

/** Sustituye la lista de fotos del briefing (0103: la base solo acepta las de experience/<proyecto>/). */
export async function guardarMisFotos(jwt: string, id: string, fotos: string[]) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.mi_experience_fotos($1, $2::jsonb)', [id, JSON.stringify(fotos)]));
}

export async function guardarMiBriefing(jwt: string, id: string, briefing: Record<string, string>) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.mi_experience_briefing($1, $2::jsonb)', [id, JSON.stringify(briefing)]));
}

export async function agendarMiLlamada(jwt: string, id: string, cuando: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.mi_experience_llamada($1, $2::timestamptz)', [id, cuando]));
}

export async function huecosOcupados(jwt: string): Promise<Set<string>> {
  const filas = await comoCliente(jwt, async (c) => (await c.query('SELECT dk.experience_huecos_ocupados() AS t')).rows);
  return new Set(filas.map((r) => new Date(r.t).toISOString()));
}

/** Huecos de la llamada (espejo de dk.experience_hueco_valido): L–V, 10:00–13:30 y 16:30–19:00 de Madrid, cada 30 min, de 20 h a 14 días vista. */
export function huecosLibres(ocupados: Set<string>): { dia: string; horas: { iso: string; hora: string }[] }[] {
  const madrid = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false });
  const nombreDia = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' });
  const min = Date.now() + 20 * 3600e3, max = Date.now() + 14 * 86400e3;
  const dias = new Map<string, { iso: string; hora: string }[]>();
  // Recorre cada media hora UTC y se queda con las que caen en franja en Madrid
  for (let t = Math.ceil(min / 1800e3) * 1800e3; t <= max; t += 1800e3) {
    const p = Object.fromEntries(madrid.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    if (p.weekday === 'Sat' || p.weekday === 'Sun') continue;
    const hm = `${p.hour}:${p.minute}`;
    if (!((hm >= '10:00' && hm <= '13:30') || (hm >= '16:30' && hm <= '19:00'))) continue;
    const iso = new Date(t).toISOString();
    if (ocupados.has(iso)) continue;
    const dia = nombreDia.format(new Date(t));
    if (!dias.has(dia)) dias.set(dia, []);
    dias.get(dia)!.push({ iso, hora: hm });
  }
  return [...dias.entries()].map(([dia, horas]) => ({ dia, horas }));
}

export async function miCorreo(jwt: string): Promise<string | null> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.mi_correo() AS e')).rows[0]?.e ?? null);
}
