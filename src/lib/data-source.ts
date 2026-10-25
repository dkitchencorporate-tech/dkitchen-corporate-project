/**
 * ÚNICA FRONTERA ENTRE LA APLICACIÓN Y SU BASE DE DATOS
 *
 * Supabase se eliminó por completo del proyecto. Neon ya está provisionado y
 * cableado —ver `src/lib/db.ts`—, pero el esquema que hay en producción cubre el
 * motor de QR de carta: restaurantes, secciones, platos, códigos y escaneos.
 *
 * Las pantallas que consume este módulo (perfiles de cliente, invitaciones,
 * catálogo de eventos, campañas, analítica) NO tienen tabla detrás todavía. Por
 * eso `BACKEND_CONFIGURED` sigue en false, y este módulo:
 *
 *   - devuelve colecciones vacías en las lecturas, nunca datos inventados;
 *   - rechaza las escrituras con un error explícito que la interfaz puede mostrar.
 *
 * La regla es que ninguna pantalla finja tener datos que no tiene. Tener la base
 * conectada no es tener las tablas: mientras no existan, esto no miente sobre
 * ellas. El inventario de lo que se ve sin respaldo real está en ESTADO_FRONT.md.
 */

export const BACKEND_CONFIGURED = false;

export class BackendNoConfigurado extends Error {
  constructor(operacion: string) {
    super(
      `No hay base de datos conectada, así que no se puede ${operacion}. ` +
        `Esta pantalla está a la espera de que se provisione Neon.`
    );
    this.name = 'BackendNoConfigurado';
  }
}

/** Mensaje único para los avisos de interfaz, para no repetirlo por pantalla. */
export const AVISO_SIN_BACKEND =
  'Sin base de datos conectada: esta pantalla no muestra datos reales.';

// ─────────────────────────────────────────────────────────────
// Tipos mínimos que consume la interfaz
// ─────────────────────────────────────────────────────────────

export interface PerfilCliente {
  id: string;
  email: string | null;
  business_name: string | null;
  plan: string | null;
  onboarding_completed: boolean;
  projects?: { restaurant_name?: string | null }[];
}

export interface Invitacion {
  id: string;
  email: string;
  token: string;
  used: boolean;
  created_at: string;
}

export interface EventoMaestro {
  id: string;
  title: string;
  category: string;
  description: string;
}

export interface PlatoCreativo {
  id: string;
  name: string;
  desc: string;
}

export interface ResumenTrafico {
  sessions: number;
  events: number;
  utms: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────
// Lecturas — vacías mientras no haya base de datos
// ─────────────────────────────────────────────────────────────

export async function listarPerfilesCliente(): Promise<PerfilCliente[]> {
  return [];
}

export async function obtenerPerfil(_id: string): Promise<PerfilCliente | null> {
  return null;
}

export async function listarInvitaciones(): Promise<Invitacion[]> {
  return [];
}

export async function listarEventosMaestros(): Promise<EventoMaestro[]> {
  return [];
}

export async function listarEventosSolicitados(_perfilId: string): Promise<string[]> {
  return [];
}

export async function listarPlatos(_perfilId: string): Promise<PlatoCreativo[]> {
  return [];
}

export async function obtenerTrafico(_desdeIso: string, _hastaIso: string): Promise<ResumenTrafico> {
  return { sessions: 0, events: 0, utms: {} };
}

// ─────────────────────────────────────────────────────────────
// Escrituras — fallan de forma explícita, nunca en silencio
// ─────────────────────────────────────────────────────────────

export async function guardarOnboarding(_datos: unknown): Promise<never> {
  throw new BackendNoConfigurado('guardar los datos del onboarding');
}

export async function solicitarEvento(_eventoId: string): Promise<never> {
  throw new BackendNoConfigurado('solicitar el evento');
}

export async function guardarCampana(_datos: unknown): Promise<never> {
  throw new BackendNoConfigurado('guardar la campaña');
}

export async function crearInvitacion(_email: string): Promise<never> {
  throw new BackendNoConfigurado('crear la invitación');
}

/**
 * El píxel de analítica se traga los fallos a propósito: si la medición no
 * funciona, no puede romper la navegación de quien está visitando la web.
 */
export async function registrarEventoWeb(_evento: unknown): Promise<void> {
  return;
}
