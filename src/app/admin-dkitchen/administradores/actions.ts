'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { identidadActual } from '@/lib/sesion';
import { crearCuentaCliente, enviarEnlaceDeContrasena, ErrorNeonAuth } from '@/lib/neon-auth';
import { altaAdministrador, retirarAdministrador } from '@/lib/buzon';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';

const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const volver: (q: string) => never = (q) => redirect(`/admin-dkitchen/administradores?${q}`);
const mensajeBase = (e: unknown) => String((e as Error)?.message ?? '').replace(/^.*?ERROR:\s*/, '').slice(0, 160);

/**
 * Añadir administrador (0065): admin COMPLETO. Crea su cuenta en Neon Auth si no
 * existe, le da el rol en la base (nunca a un socio ni al dueño de un local) y le
 * envía «Crea tu contraseña». Al entrar, Central le obliga a configurar el 2FA.
 */
export async function altaAdminAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const email = String(formulario.get('email') ?? '').trim().toLowerCase();
  const nombre = String(formulario.get('nombre') ?? '').trim();
  if (!CORREO.test(email)) volver('e=correo');
  if (nombre.length < 2 || nombre.length > 80) volver('e=nombre');
  if (formulario.get('confirmo') !== 'si') volver('e=confirmo');

  let cuentaNueva = false;
  try {
    await crearCuentaCliente({ email, nombre });
    cuentaNueva = true;
  } catch (e) {
    // Si ya tenía cuenta se reutiliza; la base comprueba que no sea socio ni dueño de un local.
    if (!(e instanceof ErrorNeonAuth)) throw e;
  }

  try {
    await altaAdministrador(jwt, email, nombre);
  } catch (e) {
    volver(`e=base&m=${encodeURIComponent(mensajeBase(e))}`);
  }

  let correo = true;
  if (cuentaNueva) await enviarEnlaceDeContrasena(email).catch((e) => { correo = false; console.error('Alta de admin: no se pudo enviar el enlace', e); });
  const yo = await identidadActual().catch(() => null);
  await enviarCorreoInterno(`NUEVO ADMINISTRADOR en Central: ${email}`,
    `<p><strong>${escaparHtml(yo?.email ?? 'Un administrador')}</strong> ha dado acceso de administrador completo a <strong>${escaparHtml(nombre)}</strong> (${escaparHtml(email)}).</p><p>Tendrá que configurar el segundo factor la primera vez que entre. Si no lo has hecho tú, retíralo en Central → Cuenta → Administradores.</p>`).catch(() => {});
  revalidatePath('/admin-dkitchen/administradores');
  volver(`ok=alta&cuenta=${cuentaNueva ? 'nueva' : 'existente'}&correo=${correo ? 'si' : 'no'}`);
}

export async function retirarAdminAction(formulario: FormData) {
  const jwt = await exigirAdmin();
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
    `<p><strong>${escaparHtml(yo?.email ?? 'Un administrador')}</strong> ha retirado el acceso de administrador a <strong>${escaparHtml(email)}</strong>. Su cuenta sigue existiendo, pero ya no entra en Central.</p>`).catch(() => {});
  revalidatePath('/admin-dkitchen/administradores');
  volver('ok=retirado');
}
