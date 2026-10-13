'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { guardarTarea, type EstadoTarea } from '@/lib/tareas';
import { escribirBuzon } from '@/lib/buzon';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tachar / bloquear / reabrir una tarea y dejar la nota para Claude (0077). */
export async function guardarTareaAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const estado = String(f.get('estado') ?? '');
  const nota = String(f.get('nota') ?? '').trim().slice(0, 3000);
  if (!UUID.test(id) || !['pendiente', 'hecha', 'bloqueada'].includes(estado)) redirect('/admin-dkitchen/tareas?e=datos');
  try { await guardarTarea(jwt, id, estado as EstadoTarea, nota); } catch { redirect('/admin-dkitchen/tareas?e=base'); }
  revalidatePath('/admin-dkitchen/tareas');
  redirect(`/admin-dkitchen/tareas?ok=${estado}#t-${id}`);
}

/** Buzón privado: «te dejo material en mi equipo» (ruta de carpeta, archivo o dato). Va al Buzón para Claude. */
export async function materialAction(f: FormData) {
  const jwt = await exigirAdmin();
  const ruta = String(f.get('ruta') ?? '').trim().slice(0, 280);
  const mensaje = String(f.get('mensaje') ?? '').trim();
  if (mensaje.length < 3 || mensaje.length > 4000) redirect('/admin-dkitchen/tareas?e=corto#material');
  try { await escribirBuzon(jwt, 'encargo', mensaje, ruta ? `Material: ${ruta}` : 'Material (sin ruta)'); }
  catch (e) { redirect(`/admin-dkitchen/tareas?e=${/demasiados/.test(String((e as Error).message)) ? 'muchos' : 'base'}#material`); }
  revalidatePath('/admin-dkitchen/buzon');
  redirect('/admin-dkitchen/tareas?ok=material#material');
}
