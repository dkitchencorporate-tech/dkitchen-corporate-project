import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Menú de usuario de Central y /socio (0065): administradores y buzón para Claude.
 * Todo pasa por funciones de la base: la tabla del buzón no tiene permisos para la app.
 */
import type { TipoBuzon, EstadoBuzon } from '@/lib/buzon-tipos';
export { TIPOS_BUZON, ESTADOS_BUZON } from '@/lib/buzon-tipos';
export type { TipoBuzon, EstadoBuzon } from '@/lib/buzon-tipos';

export interface MensajeBuzon {
  id: string; autorNombre: string; autorTipo: 'admin' | 'socio'; tipo: TipoBuzon; mensaje: string; pantalla: string | null;
  estado: EstadoBuzon; respuesta: string | null; creadoEn: string; respondidoEn: string | null;
}
export interface Administrador { id: string; email: string; nombre: string; dosFa: boolean; yo: boolean; creadoEn: string }

export async function escribirBuzon(jwt: string, tipo: TipoBuzon, mensaje: string, pantalla: string | null): Promise<string> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.buzon_escribir($1, $2, $3) AS id', [tipo, mensaje, pantalla])).rows[0].id);
}

export async function verBuzon(jwt: string, limite = 100): Promise<MensajeBuzon[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.buzon_ver($1)', [limite])).rows.map((r) => ({
    id: r.id, autorNombre: r.autor_nombre, autorTipo: r.autor_tipo, tipo: r.tipo, mensaje: r.mensaje, pantalla: r.pantalla,
    estado: r.estado, respuesta: r.respuesta, creadoEn: new Date(r.creado_en).toISOString(),
    respondidoEn: r.respondido_en ? new Date(r.respondido_en).toISOString() : null,
  })));
}

export async function estadoBuzon(jwt: string, id: string, estado: EstadoBuzon) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_buzon_estado($1, $2)', [id, estado]));
}

export async function administradores(jwt: string): Promise<Administrador[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_admins()')).rows.map((r) => ({
    id: r.id, email: r.email, nombre: r.nombre ?? r.email, dosFa: r.dos_fa, yo: r.yo, creadoEn: new Date(r.creado_en).toISOString(),
  })));
}

export async function altaAdministrador(jwt: string, email: string, nombre: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_admin_alta($1, $2)', [email, nombre]));
}

export async function retirarAdministrador(jwt: string, id: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_admin_retirar($1)', [id]));
}
