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
  /** 0087: nota enviada (bloqueada hasta «Editar nota»), traspaso a Claude y fecha de cierre. */
  notaEnviadaEn: string | null; traspasadaEn: string | null; hechaEn: string | null;
  /** 0091: ciclo de Comunicación (karc0 escribe → Claude responde con resultado → karc0 aprueba o reabre) y hito de la Ruta. */
  comEstado: EstadoComunicacion | null; comResultado: ResultadoClaude | null; respuestaEn: string | null; resueltaEn: string | null; hito: string | null;
  /** 0092: fecha y hora de creación (karc0: «fecha y hora para todo, siempre»). */
  creadoEn: string | null;
}
export type EstadoComunicacion = 'abierta' | 'respondida' | 'resuelta' | 'reabierta';
export type ResultadoClaude = 'listo' | 'falta_decidir' | 'falta_corregir';
export const ESTADOS_COMUNICACION: Record<EstadoComunicacion, string> = { abierta: 'Esperando a Claude', respondida: 'Claude ha respondido', resuelta: 'Resuelta', reabierta: 'Reabierta' };
export const RESULTADOS_CLAUDE: Record<ResultadoClaude, string> = { listo: 'Listo', falta_decidir: 'Falta que decidas', falta_corregir: 'Falta corregir' };
/** 0087: qué hace la nota al enviarse. */
export type ModoNota = 'abierta' | 'cerrar' | 'traspasar' | 'estado';
const iso = (x: unknown) => (x ? new Date(x as string).toISOString() : null);

export async function verTareas(jwt: string): Promise<Tarea[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_tareas()')).rows.map((r) => ({
    id: r.id, orden: r.orden, bloque: r.bloque, titulo: r.titulo, detalle: r.detalle, enlace: r.enlace,
    paraCuando: r.para_cuando ? new Date(r.para_cuando).toISOString().slice(0, 10) : null, estado: r.estado,
    notaKarc0: r.nota_karc0, notaClaude: r.nota_claude, cambiadoEn: r.cambiado_en ? new Date(r.cambiado_en).toISOString() : null,
    leidoClaude: r.leido_claude, responsable: r.responsable ?? 'karc0', estimado: r.estimado ?? null,
    urgencia: r.urgencia ?? 'media', docEscritorio: r.doc_escritorio ?? null, docCentral: r.doc_central ?? null,
    notaEnviadaEn: iso(r.nota_enviada_en), traspasadaEn: iso(r.traspasada_en), hechaEn: iso(r.hecha_en),
    comEstado: r.com_estado ?? null, comResultado: r.com_resultado ?? null, respuestaEn: iso(r.respuesta_en), resueltaEn: iso(r.resuelta_en), hito: r.hito ?? null, creadoEn: iso(r.creado_en),
  })));
}

/** 0093: añade una nota al hilo de la tarea (con fecha y hora) y reabre la comunicación para Claude. */
export async function anadirNota(jwt: string, id: string, nota: string, modo: 'abierta' | 'cerrar' | 'traspasar') {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_tarea_anadir_nota($1, $2, $3)', [id, nota, modo]));
}

export async function comunicacion(jwt: string, id: string, accion: 'aprobar' | 'reabrir') {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_comunicacion($1, $2)', [id, accion]));
}

export async function guardarTarea(jwt: string, id: string, estado: EstadoTarea, nota: string, modo: ModoNota = 'estado') {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_tarea_guardar($1, $2, $3, $4)', [id, estado, nota, modo]));
}
