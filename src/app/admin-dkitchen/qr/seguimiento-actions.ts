'use server';

import { exigirAdmin } from '@/lib/guard-admin';
import { eventosSeguimiento, type EventoSeguimiento } from '@/lib/admin-seguimiento';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Central refresca el seguimiento en vivo de la ficha cada pocos segundos (0078). */
export async function seguimientoAction(restauranteId: string): Promise<EventoSeguimiento[]> {
  if (!UUID.test(restauranteId)) return [];
  const jwt = await exigirAdmin();
  return eventosSeguimiento(jwt, restauranteId);
}
