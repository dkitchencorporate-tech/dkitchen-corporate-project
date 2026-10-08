'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { escribirBuzon, estadoBuzon, type EstadoBuzon, type TipoBuzon } from '@/lib/buzon';
import { datosMensaje } from '@/components/buzon/validar';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Buzón para Claude desde Central (0065). Claude Code lo lee al empezar cada sesión. */
export async function escribirBuzonAdminAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const d = datosMensaje(formulario);
  if ('error' in d) redirect(`/admin-dkitchen/buzon?e=${d.error}`);
  try {
    await escribirBuzon(jwt, d.tipo as TipoBuzon, d.mensaje, d.pantalla);
  } catch (e) {
    redirect(`/admin-dkitchen/buzon?e=${/demasiados/.test(String((e as Error).message)) ? 'muchos' : 'base'}`);
  }
  revalidatePath('/admin-dkitchen/buzon');
  redirect('/admin-dkitchen/buzon?ok=1');
}

export async function estadoBuzonAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = String(formulario.get('id') ?? '');
  const estado = String(formulario.get('estado') ?? '');
  if (!UUID.test(id) || !['nuevo', 'leido', 'hecho', 'descartado'].includes(estado)) throw new Error('Datos no válidos.');
  await estadoBuzon(jwt, id, estado as EstadoBuzon);
  revalidatePath('/admin-dkitchen/buzon');
}
