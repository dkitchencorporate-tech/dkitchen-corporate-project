'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { comoCliente } from '@/lib/db';
import { obtenerJwtDeSesion } from '@/lib/sesion';

/** Acciones del contador de montajes gratis (0104). La autorización (admin con 2FA) la decide la base. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function contexto(f: FormData) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');
  const volver = String(f.get('volver') ?? '');
  return { jwt, volver: /^\/admin-dkitchen\/[a-z0-9/_-]*$/i.test(volver) ? volver : '/admin-dkitchen/inicio' };
}

const conAviso = (ruta: string, k: string) => `${ruta}${ruta.includes('?') ? '&' : '?'}montaje=${k}#montaje`;

export async function marcarMontajeAction(f: FormData) {
  const { jwt, volver } = await contexto(f);
  const prospecto = String(f.get('prospecto') ?? '');
  const restaurante = String(f.get('restaurante') ?? '');
  const origen = String(f.get('origen') ?? '');
  const nota = String(f.get('nota') ?? '').trim().slice(0, 300);
  let k = 'marcado';
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_montaje_gratis_marcar($1, $2, $3, $4)',
      [UUID.test(prospecto) ? prospecto : null, UUID.test(restaurante) ? restaurante : null, origen, nota || null]));
  } catch (e) {
    const m = (e as Error).message || '';
    k = /cupo completo/.test(m) ? 'cupo' : /ya marcado/.test(m) ? 'repetido' : /no autorizado/.test(m) ? 'permiso' : 'error';
  }
  revalidatePath('/admin-dkitchen/inicio');
  redirect(conAviso(volver, k));
}

export async function quitarMontajeAction(f: FormData) {
  const { jwt, volver } = await contexto(f);
  const id = String(f.get('id') ?? '');
  let k = 'quitado';
  if (!UUID.test(id)) k = 'error';
  else {
    try { await comoCliente(jwt, (c) => c.query('SELECT dk.admin_montaje_gratis_quitar($1)', [id])); }
    catch { k = 'error'; }
  }
  revalidatePath('/admin-dkitchen/inicio');
  redirect(conAviso(volver, k));
}
