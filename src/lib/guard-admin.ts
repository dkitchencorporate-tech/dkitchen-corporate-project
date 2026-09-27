import 'server-only';
import { redirect } from 'next/navigation';
import { comoCliente, SesionNoValida } from '@/lib/db';
import { obtenerJwtDeSesion } from '@/lib/sesion';

export type EstadoAdmin = 'ok' | 'pendiente' | 'sin_configurar' | 'no_admin';

/** Estado del super admin en ESTA sesión, según la base (0022). */
export async function estadoAdmin(jwt: string): Promise<EstadoAdmin> {
  try {
    return await comoCliente(jwt, async (c) => {
      const { rows } = await c.query<{ e: EstadoAdmin }>('SELECT dk.admin_2fa_estado() AS e');
      return rows[0]?.e ?? 'no_admin';
    });
  } catch (error) {
    if (!(error instanceof SesionNoValida)) console.error('Guard admin:', (error as Error).message);
    return 'no_admin';
  }
}

/**
 * Puerta de las zonas internas (/admin-dkitchen, /manuals, /onboarding,
 * /dashboard). La decisión la toma Postgres: dk.es_admin() exige rol admin
 * (solo dkitchen@dkitchencorporate.es) Y segundo factor superado en esta
 * sesión en las últimas 12 h. Sin 2FA → /acceso-seguro; sin rol → /panel.
 */
export async function exigirAdmin(): Promise<string> {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');

  const estado = await estadoAdmin(jwt);
  if (estado === 'ok') return jwt;
  if (estado === 'pendiente' || estado === 'sin_configurar') redirect('/acceso-seguro');
  redirect('/panel');
}
