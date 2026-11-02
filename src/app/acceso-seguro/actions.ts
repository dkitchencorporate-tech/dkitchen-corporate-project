'use server';

import { redirect } from 'next/navigation';
import { comoCliente } from '@/lib/db';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { estadoInterno } from '@/lib/guard-admin';

/**
 * Verifica el código TOTP del super admin o del socio (0052). La comprobación (secreto, ventana
 * de ±30 s, anti-reutilización y bloqueo tras 5 fallos en 15 min) ocurre en la
 * base: dk.admin_2fa_verificar() (0022). Aquí solo se valida el formato.
 */
export async function verificarSegundoFactorAction(formulario: FormData) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');

  const codigo = String(formulario.get('codigo') ?? '').replace(/\s/g, '');
  if (!/^[0-9]{6}$/.test(codigo)) redirect('/acceso-seguro?e=formato');

  const resultado = await comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{ r: string }>('SELECT dk.admin_2fa_verificar($1) AS r', [codigo]);
    return rows[0]?.r;
  }).catch(() => 'error');

  if (resultado === 'ok') {
    const i = await estadoInterno(jwt);
    // 02/11: en formación → Academia directamente (Central le diría «pendiente» y volvería aquí).
    redirect(i.tipo === 'socio' ? '/socio' : i.estado === 'ok' ? '/admin-dkitchen/qr' : '/academia');
  }
  redirect(`/acceso-seguro?e=${resultado === 'bloqueado' ? 'bloqueado' : 'codigo'}`);
}
