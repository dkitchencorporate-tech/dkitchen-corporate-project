import { comoCliente } from '@/lib/db';

/**
 * Montajes gratis (0104, 27/10/2026): invitación de flyers, tarjetas y visitas, con cupo de 20.
 * Solo Central (admin con 2FA). El cupo lo hace cumplir la base.
 */
export const ORIGENES_MONTAJE = { flyer: 'Flyer', tarjeta: 'Tarjeta', visita: 'Visita' } as const;
export type OrigenMontaje = keyof typeof ORIGENES_MONTAJE;
export interface MontajeGratis { id: string; nombre: string; origen: OrigenMontaje; nota: string | null; prospecto_id: string | null; restaurante_id: string | null; creado_en: string }
export interface Montajes { cupo: number; usados: number; lista: MontajeGratis[] }

export async function montajesGratis(jwt: string): Promise<Montajes> {
  return comoCliente(jwt, async (c) => (await c.query<{ j: Montajes }>('SELECT dk.admin_montajes_gratis() AS j')).rows[0].j);
}
