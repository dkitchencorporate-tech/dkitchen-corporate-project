import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Mapa cartográfico de la web (0106, E1–E2, 28/10/2026). Recorre dkitchencorporate.es como un visitante
 * sin sesión: parte del sitemap y de unas entradas fijas (portada, demo del panel, pago), sigue los enlaces
 * y formularios internos y guarda el grafo. Avisos:
 *  · roto: la URL interna responde ≥ 400 o no responde;
 *  · callejón: página interna sin ninguna salida propia (solo el menú y el pie, que salen en casi todas);
 *  · externo: destino fuera del dominio (no se recorre).
 * El HTML se lee tal cual llega (las páginas se pintan en el servidor); los botones que solo navegan con
 * JavaScript no aparecen: para eso está la medición de E3.
 */

export const ORIGEN_MAPA = 'https://dkitchencorporate.es';
export const ZONAS_MAPA = ['marketing', 'qr', 'signature', 'experience', 'pago', 'legal', 'panel', 'central', 'externo'] as const;
export type ZonaMapa = (typeof ZONAS_MAPA)[number];

export interface NodoMapa { url: string; zona: ZonaMapa; titulo: string | null; estado_http: number | null; ms: number | null; callejon: boolean; roto: boolean; externo: boolean }
export interface AristaMapa { o: string; d: string; t: string | null; f: boolean; g: boolean }
export interface Mapa {
  recorridos: { id: string; creado_en: string; paginas: number; callejones: number; rotos: number }[];
  recorrido: { id: string; creado_en: string; duracion_ms: number; paginas: number; aristas: number; callejones: number; rotos: number; externos: number } | null;
  nodos: NodoMapa[];
  aristas: AristaMapa[];
}

const ENTRADAS = ['/', '/demo/panel', '/pago/reserva'];
const MAX_PAGINAS = 400;
/** Páginas de clientes y artículos: con unas pocas por familia basta para ver el patrón. */
const MAX_POR_FAMILIA = 12;
const FAMILIAS = /^\/(m|l|blog|carta-digital|experience|demos|portada-qr)\/[^/]+/;
const SIN_RECORRER = /^\/(api|_next|admin-dkitchen|panel|manuals|dashboard|login|salir)(\/|$)|\.(png|jpe?g|webp|svg|pdf|ico|xml|txt|zip|mp4|webm)$/i;
const GLOBAL = 0.6;
const PARALELO = 6;

export function zonaDe(ruta: string): ZonaMapa {
  if (/^\/(admin-dkitchen)(\/|$)/.test(ruta)) return 'central';
  if (/^\/(panel|demo\/panel|camarero|login)(\/|$)/.test(ruta)) return 'panel';
  if (/^\/(pago|pagar|checkout|alta)(\/|$)/.test(ruta)) return 'pago';
  if (/^\/(aviso-legal|privacy|terms|cookies|legal|baja|condiciones)(\/|$)/.test(ruta)) return 'legal';
  if (/^\/(experience|mi-experience|entradas)(\/|$)/.test(ruta)) return 'experience';
  if (/^\/(signature|base-operativa|dark-kitchen|marcas)(\/|$)/.test(ruta)) return 'signature';
  if (/^\/(qr|m|l|carta-digital|carta-de-autor|demos|portada-qr|registro)(\/|$)/.test(ruta)) return 'qr';
  return 'marketing';
}

/** URL interna normalizada (ruta sin utm ni ancla) o externa (origen + ruta), o null si no es navegable. */
function normalizar(href: string, base: string): { url: string; externo: boolean } | null {
  const h = href.trim();
  if (!h || /^(#|mailto:|tel:|javascript:|data:|sms:|whatsapp:)/i.test(h)) return null;
  let u: URL;
  try { u = new URL(h.replace(/&amp;/g, '&'), base); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (u.hostname.replace(/^www\./, '') !== 'dkitchencorporate.es') return { url: `${u.hostname}${u.pathname}`.slice(0, 500), externo: true };
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|r$)/.test(k)) u.searchParams.delete(k);
  const q = u.searchParams.toString();
  const ruta = (u.pathname.replace(/\/+$/, '') || '/') + (q ? `?${q}` : '');
  return { url: ruta.slice(0, 500), externo: false };
}

const limpiarTexto = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim().slice(0, 120) || null;

function salidasDe(html: string, base: string) {
  const out: { url: string; externo: boolean; texto: string | null; tipo: 'enlace' | 'formulario' }[] = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(m[1])?.[1];
    const n = href ? normalizar(href, base) : null;
    if (n) out.push({ ...n, texto: limpiarTexto(m[2]) ?? /aria-label\s*=\s*["']([^"']+)/i.exec(m[1])?.[1]?.slice(0, 120) ?? null, tipo: 'enlace' });
  }
  for (const m of html.matchAll(/<form\b([^>]*)>/gi)) {
    const action = /\baction\s*=\s*["']([^"']+)["']/i.exec(m[1])?.[1];
    const n = action && !action.startsWith('javascript') ? normalizar(action, base) : null;
    if (n) out.push({ ...n, texto: 'Formulario', tipo: 'formulario' });
  }
  return out;
}

async function leer(ruta: string): Promise<{ estado: number | null; ms: number; html: string }> {
  const t0 = Date.now();
  try {
    const r = await fetch(ORIGEN_MAPA + ruta, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'DKitchen-Mapa/1.0 (Central)', 'Accept': 'text/html' } });
    const html = (r.headers.get('content-type') ?? '').includes('text/html') ? await r.text() : '';
    return { estado: r.status, ms: Date.now() - t0, html };
  } catch {
    return { estado: null, ms: Date.now() - t0, html: '' };
  }
}

/** Recorre la web y devuelve el grafo con sus avisos (no guarda nada). */
export async function recorrerWeb(): Promise<{ duracion_ms: number; nodos: NodoMapa[]; aristas: { origen: string; destino: string; texto: string | null; tipo: 'enlace' | 'formulario'; global: boolean }[] }> {
  const t0 = Date.now();
  const sitemap = await fetch(`${ORIGEN_MAPA}/sitemap.xml`, { cache: 'no-store', signal: AbortSignal.timeout(12000) }).then((r) => r.text()).catch(() => '');
  const cola: string[] = [...ENTRADAS];
  for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) { const n = normalizar(m[1], ORIGEN_MAPA); if (n && !n.externo) cola.push(n.url); }
  const vistos = new Set<string>();
  const familias = new Map<string, number>();
  const nodos = new Map<string, NodoMapa>();
  const salidas = new Map<string, ReturnType<typeof salidasDe>>();

  const admitir = (ruta: string) => {
    if (vistos.has(ruta) || SIN_RECORRER.test(ruta.split('?')[0]) || vistos.size >= MAX_PAGINAS) return false;
    const fam = FAMILIAS.exec(ruta)?.[1];
    if (fam) { const n = familias.get(fam) ?? 0; if (n >= MAX_POR_FAMILIA) return false; familias.set(fam, n + 1); }
    vistos.add(ruta);
    return true;
  };
  const pendientes = cola.filter(admitir);

  while (pendientes.length && Date.now() - t0 < 240_000) {
    const tanda = pendientes.splice(0, PARALELO);
    await Promise.all(tanda.map(async (ruta) => {
      const r = await leer(ruta);
      const sal = r.html ? salidasDe(r.html, ORIGEN_MAPA + ruta) : [];
      salidas.set(ruta, sal);
      nodos.set(ruta, {
        url: ruta, zona: zonaDe(ruta.split('?')[0]), titulo: r.html ? limpiarTexto(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(r.html)?.[1] ?? '') : null,
        estado_http: r.estado, ms: r.ms, callejon: false, roto: r.estado === null || r.estado >= 400, externo: false,
      });
      for (const s of sal) if (!s.externo && s.tipo === 'enlace' && admitir(s.url)) pendientes.push(s.url);
    }));
  }

  // Menú y pie: destinos enlazados desde más del 60 % de las páginas leídas.
  const paginas = [...salidas.keys()].filter((k) => (salidas.get(k)?.length ?? 0) > 0);
  const cuantas = new Map<string, number>();
  for (const k of paginas) for (const d of new Set(salidas.get(k)!.map((s) => s.url))) cuantas.set(d, (cuantas.get(d) ?? 0) + 1);
  const esGlobal = (d: string) => paginas.length >= 5 && (cuantas.get(d) ?? 0) / paginas.length > GLOBAL;

  const aristas: { origen: string; destino: string; texto: string | null; tipo: 'enlace' | 'formulario'; global: boolean }[] = [];
  const claves = new Set<string>();
  for (const [origen, sal] of salidas) {
    let propias = 0;
    for (const s of sal) {
      const global = esGlobal(s.url);
      if (s.url !== origen && !global) propias++;
      const k = `${origen}|${s.url}|${s.tipo}`;
      if (claves.has(k)) continue;
      claves.add(k);
      aristas.push({ origen, destino: s.url, texto: s.texto, tipo: s.tipo, global });
      if (s.externo && !nodos.has(s.url)) nodos.set(s.url, { url: s.url, zona: 'externo', titulo: null, estado_http: null, ms: null, callejon: false, roto: false, externo: true });
    }
    const n = nodos.get(origen);
    if (n && !n.roto && n.estado_http && n.estado_http < 400) n.callejon = propias === 0;
  }
  // Destinos internos que no se llegaron a leer (tope o filtro): se pintan sin avisos.
  for (const a of aristas) if (!nodos.has(a.destino)) nodos.set(a.destino, { url: a.destino, zona: zonaDe(a.destino.split('?')[0]), titulo: null, estado_http: null, ms: null, callejon: false, roto: false, externo: false });
  return { duracion_ms: Date.now() - t0, nodos: [...nodos.values()], aristas };
}

export async function guardarRecorrido(jwt: string, r: Awaited<ReturnType<typeof recorrerWeb>>): Promise<string> {
  return comoCliente(jwt, async (c) => (await c.query<{ id: string }>('SELECT dk.admin_mapa_guardar($1::jsonb) AS id', [JSON.stringify(r)])).rows[0].id);
}

export async function leerMapa(jwt: string, id: string | null): Promise<Mapa> {
  return comoCliente(jwt, async (c) => (await c.query<{ j: Mapa }>('SELECT dk.admin_mapa($1) AS j', [id])).rows[0].j);
}
