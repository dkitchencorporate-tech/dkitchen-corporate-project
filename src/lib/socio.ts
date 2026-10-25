import 'server-only';
import { cookies } from 'next/headers';
import { comoCliente, comoVisitante, HAY_BASE_DE_DATOS } from '@/lib/db';
import { CODIGO_VENDEDOR, COOKIE_VENDEDOR } from '@/lib/socio-codigo';
export { COOKIE_PUESTA } from '@/lib/socio-codigo';

/**
 * Socio en el sistema (0052, punto 5 de karc0). El socio vende con su código
 * (?v=CODIGO, 60 días en el navegador), y hace la puesta a punto de la carta de
 * SUS clientes desde /socio. Todo lo decide la base: dk.es_socio() exige el
 * 2FA y dk.gestiona() limita la edición a sus clientes con permiso del dueño.
 */

export function normalizarCodigo(v: unknown): string | null {
  const s = String(v ?? '').trim().toUpperCase();
  return CODIGO_VENDEDOR.test(s) ? s : null;
}

export async function codigoValido(codigo: string): Promise<boolean> {
  if (!HAY_BASE_DE_DATOS) return false;
  try {
    return await comoVisitante(async (c) => (await c.query<{ v: boolean }>('SELECT dk.socio_codigo_valido($1) AS v', [codigo])).rows[0]?.v === true);
  } catch (error) {
    console.error('No se pudo comprobar el código de vendedor:', error);
    return false;
  }
}

/**
 * Código de vendedor de un alta: el del formulario (relleno desde el enlace o
 * escrito a mano) manda sobre el guardado. Si no existe o el socio está de baja,
 * el alta sigue sin código. El origen es solo una etiqueta para Central.
 */
export type Vendedor = { codigo: string; origen: 'manual' | 'enlace' };
export async function vendedorDeLaPeticion(escritoEnFormulario: unknown, vieneDelEnlace: unknown): Promise<Vendedor | null> {
  const escrito = normalizarCodigo(escritoEnFormulario);
  const guardado = normalizarCodigo((await cookies()).get(COOKIE_VENDEDOR)?.value);
  const candidato: Vendedor | null = escrito
    ? { codigo: escrito, origen: vieneDelEnlace === true || escrito === guardado ? 'enlace' : 'manual' }
    : guardado ? { codigo: guardado, origen: 'enlace' } : null;
  if (!candidato) return null;
  return (await codigoValido(candidato.codigo)) ? candidato : null;
}

export interface FichaSocio { nombre: string; codigo: string; altas: number; de_pago: number }
export interface ClienteSocio {
  id: string; nombre: string; slug: string; plan: string; fundador: boolean; estado_acceso: string;
  en_prueba: boolean; puede_editar: boolean; alta_en: string; productos: number; tickets_abiertos: number;
}

export async function fichaSocio(jwt: string): Promise<FichaSocio | null> {
  return comoCliente(jwt, async (c) => (await c.query<{ f: FichaSocio | null }>('SELECT dk.socio_mi_ficha() AS f')).rows[0]?.f ?? null);
}

export async function misClientes(jwt: string): Promise<ClienteSocio[]> {
  return comoCliente(jwt, async (c) => (await c.query<ClienteSocio>('SELECT * FROM dk.socio_mis_clientes()')).rows);
}

/** Tickets de sus clientes (la política ticket_del_propietario usa dk.gestiona). */
export async function ticketsDeMisClientes(jwt: string) {
  return comoCliente(jwt, async (c) => (await c.query<{ id: string; restaurante: string; asunto: string; estado: string; creado_en: string }>(
    `SELECT t.id, r.nombre AS restaurante, t.asunto, t.estado, t.creado_en
       FROM tickets_soporte t JOIN restaurantes r ON r.id = t.restaurante_id
      WHERE r.socio_id = dk.identidad_actual()
      ORDER BY (t.estado = 'abierto') DESC, t.creado_en DESC LIMIT 30`)).rows);
}

/** Panel del dueño: su asesor (si lo tiene) y si puede editar su carta. */
export async function miSocio(jwt: string): Promise<{ nombre: string; puede_editar: boolean } | null> {
  return comoCliente(jwt, async (c) => (await c.query<{ s: { nombre: string; puede_editar: boolean } | null }>('SELECT dk.mi_socio() AS s')).rows[0]?.s ?? null);
}
