import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { PREGUNTAS as BASE, ESCENARIOS as ESC_BASE, APROBADO_TEST, APROBADO_ESCENARIO, type Nivel, type Dimension, type Opcion } from './banco';
import { PREGUNTAS_EXTRA, MIN_PREGUNTAS_NUEVO as MIN_PREGUNTAS } from './banco-extra';
import { ESCENARIOS_EXTRA } from './escenarios-extra';

/** 0116: banco ampliado y escenarios ramificados (cada opción puede decir a qué nodo va; un nodo «fin» termina). */
const PREGUNTAS = [...BASE, ...PREGUNTAS_EXTRA];
type NodoM = { id: string; situacion: string; opciones: (Opcion & { sig?: string })[]; fin?: boolean };
type EscM = { id: string; titulo: string; ficha: string; objetivo: string; nodos: { pie: NodoM[]; digital: NodoM[] } };
const ESCENARIOS: EscM[] = [...ESC_BASE, ...ESCENARIOS_EXTRA];

/**
 * Motor de la Academia (01/11): el navegador nunca ve las respuestas correctas ni puede fabricar una nota.
 * Cada intento viaja firmado (HMAC) con las preguntas servidas y el orden de sus opciones; la corrección es
 * del servidor y la base (dk.academia_registrar) guarda el resultado y aplica la espera de 24 h.
 */
const clave = () => createHmac('sha256', 'dk-academia').update(process.env.CRON_SECRET || process.env.NEON_AUTH_COOKIE_SECRET || 'falta-secreto').digest();
const b64 = (s: string) => Buffer.from(s).toString('base64url');
export function firmar(obj: unknown): string {
  const cuerpo = b64(JSON.stringify(obj));
  return `${cuerpo}.${createHmac('sha256', clave()).update(cuerpo).digest('base64url')}`;
}
export function verificar<T>(token: string): T | null {
  const [cuerpo, firma] = String(token).split('.');
  if (!cuerpo || !firma) return null;
  const esperada = createHmac('sha256', clave()).update(cuerpo).digest();
  const dada = Buffer.from(firma, 'base64url');
  if (dada.length !== esperada.length || !timingSafeEqual(dada, esperada)) return null;
  try {
    const o = JSON.parse(Buffer.from(cuerpo, 'base64url').toString()) as T & { exp: number };
    return o.exp > Date.now() ? o : null;
  } catch { return null; }
}
/** La mejor opción de un nodo (en los de recuperación vale menos de 10: recuperarse puntúa menos). */
const mejorDe = (n: NodoM) => n.opciones.reduce((a, b) => (b.puntos > a.puntos ? b : a));
const barajar = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = randomInt(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ── Tests ──
export type PreguntaVista = { id: string; texto: string; opciones: string[] };
type EstadoTest = { k: 'test'; modo: 'test' | 'alex'; nivel: Nivel | 'ALEX'; p: { id: string; orden: number[] }[]; exp: number; pr?: boolean };

export function empezarTest(nivel: Nivel | 'ALEX', soloObjeciones = false): { token: string; preguntas: PreguntaVista[] } {
  const orden: Nivel[] = ['N1', 'N2', 'N3', 'N4'];
  const fuente = soloObjeciones
    ? PREGUNTAS.filter((q) => /^Objeción|«/.test(q.texto) && orden.indexOf(q.nivel) <= orden.indexOf(nivel === 'ALEX' ? 'N4' : nivel))
    : nivel === 'ALEX' ? PREGUNTAS : PREGUNTAS.filter((q) => q.nivel === nivel);
  const elegidas = nivel === 'ALEX' && !soloObjeciones ? barajar(fuente) : barajar(fuente).slice(0, soloObjeciones ? 6 : MIN_PREGUNTAS[nivel as Nivel]);
  const p = elegidas.map((q) => ({ id: q.id, orden: barajar(q.opciones.map((_, i) => i)) }));
  const estado: EstadoTest = { k: 'test', modo: nivel === 'ALEX' ? 'alex' : 'test', nivel, p, exp: Date.now() + 90 * 60_000, pr: soloObjeciones || undefined };
  return {
    token: firmar(estado),
    preguntas: p.map(({ id, orden }) => { const q = PREGUNTAS.find((x) => x.id === id)!; return { id, texto: q.texto, opciones: orden.map((i) => q.opciones[i]) }; }),
  };
}

export type Fallo = { donde: string; elegiste: string; correcta: string; porque: string; mejora: string; dim: Dimension };
export type Resultado = { nota: number; aprobado: boolean; dims: Partial<Record<Dimension, number>>; fallos: Fallo[]; total: number; bien: number };

export function corregirTest(token: string, respuestas: Record<string, number>): (Resultado & { nivel: Nivel | 'ALEX'; modo: 'test' | 'alex'; practica: boolean }) | null {
  const e = verificar<EstadoTest>(token);
  if (!e || e.k !== 'test') return null;
  const porDim: Record<string, [number, number]> = {};
  const fallos: Fallo[] = [];
  let bien = 0;
  for (const { id, orden } of e.p) {
    const q = PREGUNTAS.find((x) => x.id === id)!;
    const vista = Number(respuestas[id]);
    const elegida = Number.isInteger(vista) && vista >= 0 && vista < orden.length ? orden[vista] : -1;
    const ok = elegida === q.correcta;
    porDim[q.dim] = [(porDim[q.dim]?.[0] ?? 0) + (ok ? 1 : 0), (porDim[q.dim]?.[1] ?? 0) + 1];
    if (ok) bien++;
    else fallos.push({ donde: q.texto, elegiste: elegida >= 0 ? q.opciones[elegida] : 'Sin responder', correcta: q.opciones[q.correcta], porque: q.porque, mejora: q.mejora, dim: q.dim });
  }
  const nota = Math.round((bien / e.p.length) * 100);
  const dims = Object.fromEntries(Object.entries(porDim).map(([d, [b, t]]) => [d, Math.round((b / t) * 100)])) as Resultado['dims'];
  return { practica: !!e.pr, nivel: e.nivel, modo: e.modo, nota, aprobado: nota >= APROBADO_TEST, dims, fallos, total: e.p.length, bien };
}

// ── Escenarios ──
export type NodoVista = { id: string; situacion: string; opciones: string[] };
type EstadoEsc = { k: 'esc'; e: string; v: 'pie' | 'digital'; i: number; orden: number[][]; puntos: number; regla: boolean; elec: number[]; vis?: number[]; exp: number };

export function empezarEscenario(id: string, version: 'pie' | 'digital') {
  const esc = ESCENARIOS.find((x) => x.id === id);
  if (!esc) return null;
  const nodos = esc.nodos[version];
  const orden = nodos.map((n) => barajar(n.opciones.map((_, i) => i)));
  const estado: EstadoEsc = { k: 'esc', e: id, v: version, i: 0, orden, puntos: 0, regla: false, elec: [], vis: [], exp: Date.now() + 60 * 60_000 };
  const total = nodos.some((n) => n.fin) ? nodos.filter((n) => !/fin|f$/.test(n.id)).length : nodos.length;
  return { token: firmar(estado), titulo: esc.titulo, ficha: esc.ficha, objetivo: esc.objetivo, total, nodo: vistaNodo(esc.id, version, 0, orden[0]) };
}
function vistaNodo(id: string, v: 'pie' | 'digital', i: number, orden: number[]): NodoVista {
  const n = ESCENARIOS.find((x) => x.id === id)!.nodos[v][i];
  return { id: n.id, situacion: n.situacion, opciones: orden.map((k) => n.opciones[k].texto) };
}

export function responderEscenario(token: string, opcionVista: number) {
  const e = verificar<EstadoEsc>(token);
  if (!e || e.k !== 'esc') return null;
  const esc = ESCENARIOS.find((x) => x.id === e.e)!;
  const nodos = esc.nodos[e.v];
  const n = nodos[e.i];
  const real = e.orden[e.i][opcionVista];
  if (real === undefined) return null;
  const op = n.opciones[real];
  const mejor = mejorDe(n);
  // Rama: la opción dice a qué nodo va; un nodo «fin» termina; sin indicación, el siguiente (escenarios lineales).
  const siguiente = op.sig ? nodos.findIndex((x) => x.id === op.sig) : n.fin ? -1 : e.i + 1;
  const vis = [...(e.vis ?? e.elec.map((_, k) => k)), e.i];
  const sig: EstadoEsc = { ...e, i: siguiente, puntos: e.puntos + op.puntos, regla: e.regla || !!op.regla, elec: [...e.elec, real], vis };
  const terminado = siguiente < 0 || siguiente >= nodos.length;
  const retro = { puntos: op.puntos, feedback: op.feedback, regla: !!op.regla, mejor: op === mejor ? null : mejor.texto };
  if (!terminado) return { ...retro, terminado: false as const, token: firmar(sig), nodo: vistaNodo(e.e, e.v, sig.i, e.orden[sig.i]) };
  const nota = Math.max(0, Math.round((sig.puntos / (vis.length * 10)) * 100));
  const aprobado = !sig.regla && nota >= APROBADO_ESCENARIO;
  const porDim: Record<string, [number, number]> = {};
  const fallos: Fallo[] = [];
  vis.forEach((idx, k) => {
    const nd = nodos[idx];
    const o = nd.opciones[sig.elec[k]];
    porDim[o.dim] = [(porDim[o.dim]?.[0] ?? 0) + Math.max(0, o.puntos), (porDim[o.dim]?.[1] ?? 0) + 10];
    const mj = mejorDe(nd);
    if (o !== mj) fallos.push({ donde: nd.situacion, elegiste: o.texto, correcta: mj.texto, porque: o.feedback, mejora: mj.feedback, dim: o.dim });
  });
  const dims = Object.fromEntries(Object.entries(porDim).map(([d, [b, t]]) => [d, Math.round((b / t) * 100)]));
  dims[e.v === 'pie' ? 'fisico' : 'digital'] = nota;
  return { ...retro, terminado: true as const, resultado: { escenario: e.e, version: e.v, nota, aprobado, regla: sig.regla, dims, fallos: fallos.slice(0, 3) } };
}

export const nivelDe = (n: number) => (n >= 90 ? 'Cerrador DKitchen' : n >= 75 ? 'Sólido' : n >= 50 ? 'En desarrollo' : 'Aprendiz');
export const REGLA_ABANDONO = 'Caso perdido y avanza cuando se cumplen 2 de 3: sin decisor tras 2 contactos · sin dolor identificado tras la demo · 3 toques sin respuesta en 10 días.';
