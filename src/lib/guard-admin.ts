import 'server-only';
import { redirect } from 'next/navigation';
import { comoCliente, SesionNoValida } from '@/lib/db';
import { obtenerJwtDeSesion } from '@/lib/sesion';

/**
 * Puerta de las zonas internas (/admin-dkitchen, /manuals, /onboarding,
 * /dashboard). Hasta el 27/09/2026 eran públicas. La decisión la toma
 * Postgres (dk.es_admin(), identidades.rol = 'admin'), no la aplicación.
 */
export async function exigirAdmin(): Promise<string> {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');

  let esAdmin = false;
  try {
    esAdmin = await comoCliente(jwt, async (c) => {
      const { rows } = await c.query<{ ok: boolean }>('SELECT dk.es_admin() AS ok');
      return rows[0]?.ok === true;
    });
  } catch (error) {
    if (!(error instanceof SesionNoValida)) console.error('Guard admin:', error);
  }
  if (!esAdmin) redirect('/panel');
  return jwt;
}
