import 'server-only';
import { randomBytes } from 'node:crypto';
import { comoCliente, comoVisitante } from '@/lib/db';
import { huellaToken } from '@/lib/sala';
import type { Equipo, RolSala } from '@/lib/equipo-tipos';

/**
 * Equipo de sala (0047, B3). Cada acceso tiene rol camarero o encargado.
 * El dueño (sesión) lo gestiona todo desde el panel; el encargado (token)
 * gestiona solo camareros desde su app. El token se genera aquí y se
 * devuelve UNA vez: en la base solo queda su huella.
 */

export const nuevoToken = () => randomBytes(24).toString('base64url');

// ------------------------------------------------------------------ dueño
export async function equipoDueno(jwt: string): Promise<Equipo> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.equipo() AS j')).rows[0].j);
}

export async function crearMiembro(jwt: string, nombre: string, rol: RolSala): Promise<string> {
  const token = nuevoToken();
  await comoCliente(jwt, (c) => c.query('SELECT dk.equipo_crear($1, $2, $3)', [nombre, huellaToken(token), rol]));
  return token;
}

export async function editarMiembro(jwt: string, id: string, cambios: { nombre?: string; rol?: RolSala; activo?: boolean }): Promise<boolean> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT dk.equipo_editar($1, $2, $3, $4) AS ok', [id, cambios.nombre ?? null, cambios.rol ?? null, cambios.activo ?? null]);
    return rows[0]?.ok === true;
  });
}

export async function regenerarEnlace(jwt: string, id: string): Promise<string | null> {
  const token = nuevoToken();
  const ok = await comoCliente(jwt, async (c) => (await c.query('SELECT dk.equipo_regenerar($1, $2) AS ok', [id, huellaToken(token)])).rows[0]?.ok === true);
  return ok ? token : null;
}

export async function asignarZona(jwt: string, zona: string, camareroId: string | null): Promise<number> {
  return comoCliente(jwt, async (c) => Number((await c.query('SELECT dk.equipo_zona($1, $2) AS n', [zona, camareroId])).rows[0]?.n ?? 0));
}

// --------------------------------------------------------------- encargado (token)
export async function equipoEncargado(token: string): Promise<Equipo | null> {
  return comoVisitante(async (c) => (await c.query('SELECT dk.sala_equipo($1) AS j', [huellaToken(token)])).rows[0]?.j ?? null);
}

/** Reservas de hoy en adelante para el encargado (0048, B4). null si el token no es de un encargado. */
export async function reservasEncargado(token: string): Promise<unknown[] | null> {
  return comoVisitante(async (c) => (await c.query('SELECT dk.sala_reservas($1) AS j', [huellaToken(token)])).rows[0]?.j ?? null);
}

export async function crearCamareroEncargado(token: string, nombre: string): Promise<string | null> {
  const nuevo = nuevoToken();
  const id = await comoVisitante(async (c) => (await c.query('SELECT dk.sala_equipo_crear($1, $2, $3) AS id', [huellaToken(token), nombre, huellaToken(nuevo)])).rows[0]?.id ?? null);
  return id ? nuevo : null;
}

export async function editarCamareroEncargado(token: string, id: string, cambios: { nombre?: string; activo?: boolean }): Promise<boolean> {
  return comoVisitante(async (c) => (await c.query('SELECT dk.sala_equipo_editar($1, $2, $3, $4) AS ok',
    [huellaToken(token), id, cambios.nombre ?? null, cambios.activo ?? null])).rows[0]?.ok === true);
}

export async function regenerarEnlaceEncargado(token: string, id: string): Promise<string | null> {
  const nuevo = nuevoToken();
  const ok = await comoVisitante(async (c) => (await c.query('SELECT dk.sala_equipo_regenerar($1, $2, $3) AS ok', [huellaToken(token), id, huellaToken(nuevo)])).rows[0]?.ok === true);
  return ok ? nuevo : null;
}

export async function asignarZonaEncargado(token: string, zona: string, camareroId: string | null): Promise<number | null> {
  return comoVisitante(async (c) => {
    const n = (await c.query('SELECT dk.sala_equipo_zona($1, $2, $3) AS n', [huellaToken(token), zona, camareroId])).rows[0]?.n;
    return n === null || n === undefined ? null : Number(n);
  });
}

export async function anularLineaEncargado(token: string, lineaId: string, motivo: string): Promise<boolean> {
  return comoVisitante(async (c) => (await c.query('SELECT dk.sala_anular_linea($1, $2, $3) AS ok', [huellaToken(token), lineaId, motivo])).rows[0]?.ok === true);
}

export async function cambiarCantidadEncargado(token: string, lineaId: string, cantidad: number, motivo: string | null): Promise<boolean> {
  return comoVisitante(async (c) => (await c.query('SELECT dk.sala_cambiar_cantidad($1, $2, $3, $4) AS ok', [huellaToken(token), lineaId, cantidad, motivo])).rows[0]?.ok === true);
}

export async function anularCuentaEncargado(token: string, cuentaId: string, motivo: string): Promise<boolean> {
  return comoVisitante(async (c) => (await c.query('SELECT dk.sala_anular_cuenta($1, $2, $3) AS ok', [huellaToken(token), cuentaId, motivo])).rows[0]?.ok === true);
}

export async function moverCuentaEncargado(token: string, cuentaId: string, mesa: string): Promise<{ ok: boolean; juntada?: boolean; cuenta?: string }> {
  return comoVisitante(async (c) => (await c.query('SELECT dk.sala_mover_cuenta($1, $2, $3) AS j', [huellaToken(token), cuentaId, mesa])).rows[0]?.j ?? { ok: false });
}
