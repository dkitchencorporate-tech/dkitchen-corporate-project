'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { identidadActual } from '@/lib/sesion';
import { comoCliente } from '@/lib/db';
import { crearCuentaCliente, enviarEnlaceDeContrasena, ErrorNeonAuth } from '@/lib/neon-auth';
import { altaAdministrador, cambiarRolAdministrador, retirarAdministrador } from '@/lib/buzon';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';

const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const volver: (q: string) => never = (q) => redirect(`/admin-dkitchen/administradores?${q}`);
const mensajeBase = (e: unknown) => String((e as Error)?.message ?? '').replace(/^.*?ERROR:\s*/, '').slice(0, 160);

async function exigirRolDireccion(jwt: string) {
  const esDir = await comoCliente(jwt, async (c) => {
    const r = await c.query<{ dir: boolean }>('SELECT dk.es_direccion() AS dir');
    return r.rows[0]?.dir === true;
  }).catch(() => false);
  if (!esDir) {
    volver(`e=base&m=${encodeURIComponent('no autorizado: requiere direccion')}`);
  }
}

/**
 * Añadir administrador (0065, P1 31/10): rol configurable ('comercial' por defecto o 'direccion').
 * Solo dirección puede dar de alta administradores.
 */
export async function altaAdminAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  await exigirRolDireccion(jwt);

  const email = String(formulario.get('email') ?? '').trim().toLowerCase();
  const nombre = String(formulario.get('nombre') ?? '').trim();
  const rolAdmin = String(formulario.get('rol_admin') ?? 'comercial').trim();
  if (!CORREO.test(email)) volver('e=correo');
  if (nombre.length < 2 || nombre.length > 80) volver('e=nombre');
  if (formulario.get('confirmo') !== 'si') volver('e=confirmo');
  const rolValido = rolAdmin === 'direccion' ? 'direccion' : 'comercial';

  let cuentaNueva = false;
  try {
    await crearCuentaCliente({ email, nombre });
    cuentaNueva = true;
  } catch (e) {
    if (!(e instanceof ErrorNeonAuth)) throw e;
  }

  try {
    await altaAdministrador(jwt, email, nombre, rolValido);
  } catch (e) {
    volver(`e=base&m=${encodeURIComponent(mensajeBase(e))}`);
  }

  let correo = true;
  if (cuentaNueva) await enviarEnlaceDeContrasena(email).catch((e) => { correo = false; console.error('Alta de admin: no se pudo enviar el enlace', e); });
  const yo = await identidadActual().catch(() => null);
  await enviarCorreoInterno(`NUEVO ADMINISTRADOR en Central: ${email}`,
    `<p><strong>${escaparHtml(yo?.email ?? 'Un administrador')}</strong> ha dado acceso a <strong>${escaparHtml(nombre)}</strong> (${escaparHtml(email)}) con rol <strong>${rolValido}</strong>.</p><p>Tendrá que configurar el segundo factor la primera vez que entre.</p>`).catch(() => {});
  revalidatePath('/admin-dkitchen/administradores');
  volver(`ok=alta&cuenta=${cuentaNueva ? 'nueva' : 'existente'}&correo=${correo ? 'si' : 'no'}`);
}

export async function cambiarRolAdminAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  await exigirRolDireccion(jwt);

  const id = String(formulario.get('id') ?? '');
  const nuevoRol = String(formulario.get('nuevo_rol') ?? 'comercial');
  if (!UUID.test(id)) volver('e=base');
  const rolValido = nuevoRol === 'direccion' ? 'direccion' : 'comercial';
  try {
    await cambiarRolAdministrador(jwt, id, rolValido);
  } catch (e) {
    volver(`e=base&m=${encodeURIComponent(mensajeBase(e))}`);
  }
  revalidatePath('/admin-dkitchen/administradores');
  volver('ok=rol_actualizado');
}

export async function retirarAdminAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  await exigirRolDireccion(jwt);

  const id = String(formulario.get('id') ?? '');
  const email = String(formulario.get('email') ?? '').slice(0, 200);
  if (!UUID.test(id)) volver('e=base');
  if (formulario.get('confirmo') !== 'si') volver('e=confirmo');
  try {
    await retirarAdministrador(jwt, id);
  } catch (e) {
    volver(`e=base&m=${encodeURIComponent(mensajeBase(e))}`);
  }
  const yo = await identidadActual().catch(() => null);
  await enviarCorreoInterno(`ADMINISTRADOR RETIRADO en Central: ${email}`,
    `<p><strong>${escaparHtml(yo?.email ?? 'Un administrador')}</strong> ha retirado el acceso de administrador a <strong>${escaparHtml(email)}</strong>.</p>`).catch(() => {});
  revalidatePath('/admin-dkitchen/administradores');
  volver('ok=retirado');
}
