import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Central → Decisiones (0083): cada punto crítico con su contexto, sus opciones y la recomendación de
 * Claude. karc0 elige una opción, escribe la suya («otra») o la aplaza; Claude lo lee al empezar
 * (buzon.cjs) y crea la tarea que salga de cada decisión.
 */
export interface Opcion { id: string; texto: string; detalle?: string; recomendada?: boolean }
export interface Decision {
  id: string; orden: number; tema: string; titulo: string; contexto: string; opciones: Opcion[];
  estado: 'pendiente' | 'decidida' | 'aplazada'; eleccion: string | null; respuesta_karc0: string | null;
  nota_claude: string | null; doc_ruta: string | null; tarea_id: string | null; decidido_en: string | null; creado_en: string;
  /** 0092: fase del ciclo y sus fechas. */
  fase?: FaseDecision; respuesta_claude_en?: string | null; resuelta_en?: string | null; cambiado_en?: string | null;
}
export type FaseDecision = 'por_decidir' | 'comunicacion' | 'decidida' | 'resuelta';
export const FASES: Record<FaseDecision, string> = { por_decidir: 'Por decidir', comunicacion: 'En comunicación', decidida: 'Decidido', resuelta: 'Resuelto' };
/** Fase aunque la base aún no tenga 0092. */
export const faseDe = (d: Decision): FaseDecision => d.fase ?? (d.estado !== 'decidida' ? 'por_decidir' : d.nota_claude ? 'resuelta' : 'decidida');

export async function verDecisiones(jwt: string): Promise<Decision[]> {
  return comoCliente(jwt, async (c) => (await c.query<{ l: Decision[] }>('SELECT dk.admin_decisiones() AS l')).rows[0]?.l ?? []);
}

export async function reabrirDecision(jwt: string, id: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_decision_reabrir($1)', [id]));
}

export async function decidir(jwt: string, id: string, eleccion: string, respuesta: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_decidir($1, $2, $3)', [id, eleccion, respuesta || null]));
}
