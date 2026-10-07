'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { crearCuentaCliente, enviarEnlaceDeContrasena, ErrorNeonAuth } from '@/lib/neon-auth';
import { normalizarCodigo } from '@/lib/socio';

const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const volver: (q: string) => never = (q) => redirect(`/admin-dkitchen/socios?${q}`);
const mensajeBase = (e: unknown) => String((e as Error)?.message ?? '').replace(/^.*?ERROR:\s*/, '').slice(0, 160);

/**
 * Alta de socio (regla de acceso de karc0: solo desde Central). Crea su cuenta
 * en Neon Auth si no existe, le da el rol en la base (dk.admin_socio_alta: nunca
 * admin ni dueño de un local) y le envía el correo para fijar su contraseña.
 * Al entrar, el 2FA le pide configurar su app de autenticación.
 */
export async function altaSocioAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const email = String(formulario.get('email') ?? '').trim().toLowerCase();
  const nombre = String(formulario.get('nombre') ?? '').trim();
  const codigo = normalizarCodigo(formulario.get('codigo'));
  if (!CORREO.test(email)) volver('e=correo');
  if (nombre.length < 2 || nombre.length > 80) volver('e=nombre');
  if (!codigo) volver('e=codigo');

  let cuentaNueva = false;
  try {
    await crearCuentaCliente({ email, nombre });
    cuentaNueva = true;
  } catch (e) {
    // Si ya tenía cuenta se reutiliza; la base comprueba que no sea dueño ni admin.
    if (!(e instanceof ErrorNeonAuth)) throw e;
  }

  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_socio_alta($1, $2, $3)', [email, nombre, codigo]));
  } catch (e) {
    const m = mensajeBase(e);
    volver(`e=base&m=${encodeURIComponent(/duplicate|unique/i.test(m) ? 'Ese código ya lo usa otro socio.' : m)}`);
  }

  let correo = true;
  await enviarEnlaceDeContrasena(email).catch((e) => { correo = false; console.error('Alta de socio: no se pudo enviar el enlace', e); });
  revalidatePath('/admin-dkitchen/socios');
  volver(`ok=alta&cuenta=${cuentaNueva ? 'nueva' : 'existente'}&correo=${correo ? 'si' : 'no'}`);
}

export async function activoSocioAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = String(formulario.get('id') ?? '');
  const activo = formulario.get('activo') === 'si';
  if (!/^[0-9a-f-]{36}$/i.test(id)) volver('e=base');
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_socio_activo($1, $2)', [id, activo]));
  revalidatePath('/admin-dkitchen/socios');
  volver(`ok=${activo ? 'activado' : 'desactivado'}`);
}

/** Corrección manual de la atribución de un local (código vacío = quitarla). */
export async function atribuirLocalAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const slug = String(formulario.get('slug') ?? '').trim().toLowerCase();
  const textoCodigo = String(formulario.get('codigo') ?? '').trim();
  const codigo = textoCodigo ? normalizarCodigo(textoCodigo) : null;
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) volver('e=slug');
  if (textoCodigo && !codigo) volver('e=codigo');
  try {
    await comoCliente(jwt, async (c) => {
      const { rows } = await c.query<{ id: string }>('SELECT id FROM restaurantes WHERE slug = $1', [slug]);
      if (!rows[0]) throw new Error('No hay ningún local con esa dirección.');
      await c.query('SELECT dk.admin_atribuir_socio($1, $2)', [rows[0].id, codigo]);
    });
  } catch (e) {
    volver(`e=base&m=${encodeURIComponent(mensajeBase(e))}`);
  }
  revalidatePath('/admin-dkitchen/socios');
  volver(`ok=${codigo ? 'atribuido' : 'quitado'}`);
}
