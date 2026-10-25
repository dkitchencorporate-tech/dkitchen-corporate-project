import 'server-only';
import { comoCliente } from '@/lib/db';
import type { TutorialEstado } from '@/lib/tutorial-tipos';

/**
 * Montaje guiado obligatorio (0049, B5 de karc0, 07/10/2026). Las tareas y el
 * abono de +10 créditos de IA los comprueba la base (SECURITY DEFINER), una
 * sola vez por local. Aquí solo se llaman las funciones con la sesión del dueño.
 */
export async function tutorialEstado(jwt: string, restauranteId: string): Promise<TutorialEstado | null> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.tutorial_estado($1) AS j', [restauranteId])).rows[0]?.j ?? null);
}

export async function tutorialAvanzar(jwt: string, restauranteId: string, paso: number, qr: boolean): Promise<TutorialEstado | null> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.tutorial_avanzar($1, $2, $3) AS j', [restauranteId, paso, qr])).rows[0]?.j ?? null);
}

export async function tutorialCompletar(jwt: string, restauranteId: string): Promise<TutorialEstado | null> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.tutorial_completar($1) AS j', [restauranteId])).rows[0]?.j ?? null);
}
