import 'server-only';
import { redirect } from 'next/navigation';
import { comoCliente, SesionNoValida } from '@/lib/db';
import { obtenerJwtDeSesion } from '@/lib/sesion';

export type EstadoAdmin = 'ok' | 'pendiente' | 'sin_configurar' | 'no_admin';
export type Interno = { tipo: 'admin' | 'socio' | null; estado: EstadoAdmin };

/**
 * Quién es la sesión para las zonas internas, según la base. El segundo factor
 * (0022) lo comparten el super admin y el socio (0052), así que
 * dk.admin_2fa_estado() solo dice si el 2FA está hecho: el TIPO sale de
 * dk.es_identidad_socio(). Un socio nunca pasa por la puerta de Central.
 */
export async function estadoInterno(jwt: string): Promise<Interno> {
  try {
    return await comoCliente(jwt, async (c) => {
      const { rows } = await c.query<{ e: EstadoAdmin; s: boolean; a: boolean }>(
        'SELECT dk.admin_2fa_estado() AS e, dk.es_identidad_socio() AS s, dk.es_admin() AS a');
      const f = rows[0];
      if (!f || f.e === 'no_admin') return { tipo: null, estado: 'no_admin' };
      if (f.s) return { tipo: 'socio', estado: f.e };
      if (f.e === 'ok' && !f.a) return { tipo: null, estado: 'no_admin' };
      return { tipo: 'admin', estado: f.e };
    });
  } catch (error) {
    if (!(error instanceof SesionNoValida)) console.error('Guard interno:', (error as Error).message);
    return { tipo: null, estado: 'no_admin' };
  }
}

/** Estado del super admin en ESTA sesión (0022). Un socio cuenta como «no_admin». */
export async function estadoAdmin(jwt: string): Promise<EstadoAdmin> {
  const i = await estadoInterno(jwt);
  return i.tipo === 'admin' ? i.estado : 'no_admin';
}

/**
 * Puerta de las zonas internas (/admin-dkitchen, /manuals,
 * /dashboard). La decisión la toma Postgres: dk.es_admin() exige rol admin
 * (solo dkitchen@dkitchencorporate.es) Y segundo factor superado en esta
 * sesión en las últimas 12 h. Sin 2FA → /acceso-seguro; sin rol → /panel.
 */
export async function exigirAdmin(): Promise<string> {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');

  const estado = await estadoAdmin(jwt);
  if (estado === 'ok') return jwt;
  // 0112: un comercial «en formación» solo tiene la Academia. Va ANTES que «pendiente»: con el 2FA ya hecho la base
  // le dice «pendiente» (no puede entrar en Central) y antes se le devolvía a /acceso-seguro en bucle (02/11, Elisabet).
  if (await esAdminAcademia(jwt)) redirect('/academia');
  if (estado === 'pendiente' || estado === 'sin_configurar') redirect('/acceso-seguro');
  redirect('/panel');
}

/** 0112: administrador con 2FA en esta sesión, sea cual sea su rol (incluido «en formación»). */
export async function esAdminAcademia(jwt: string): Promise<boolean> {
  try {
    return await comoCliente(jwt, async (c) => (await c.query<{ a: boolean }>('SELECT dk.es_admin_academia() AS a')).rows[0]?.a === true);
  } catch { return false; }
}

/** Puerta de /academia (0112): cualquier administrador con 2FA; sin 2FA → /acceso-seguro. */
export async function exigirAcademia(): Promise<string> {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');
  if (await esAdminAcademia(jwt)) return jwt;
  const i = await estadoInterno(jwt);
  if (i.estado === 'pendiente' || i.estado === 'sin_configurar') redirect('/acceso-seguro');
  redirect('/panel');
}

/** Puerta de /socio: rol socio activo + el mismo 2FA que Central (dk.es_socio, 0052). */
export async function exigirSocio(): Promise<string> {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');

  const i = await estadoInterno(jwt);
  if (i.tipo === 'socio' && i.estado === 'ok') return jwt;
  if (i.tipo === 'socio') redirect('/acceso-seguro');
  redirect('/panel');
}
