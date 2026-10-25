'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { nuevoCompetidor, notaCompetidor } from '@/lib/competencia';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUTA = '/admin-dkitchen/competencia';

/** karc0 añade un competidor: entra «por auditar» y Claude lo ve al empezar su sesión (buzon.cjs). */
export async function nuevoCompetidorAction(f: FormData) {
  const jwt = await exigirAdmin();
  const nombre = String(f.get('nombre') ?? '').trim().slice(0, 120);
  const web = String(f.get('web') ?? '').trim().slice(0, 300);
  const nota = String(f.get('nota') ?? '').trim().slice(0, 2000);
  if (nombre.length < 2) redirect(`${RUTA}?e=nombre#nuevo`);
  let e = '';
  try { await nuevoCompetidor(jwt, nombre, web, nota); }
  catch (x) { const m = String((x as Error).message); e = /ya existe/.test(m) ? 'existe' : /web/.test(m) ? 'web' : 'base'; }
  if (e) redirect(`${RUTA}?e=${e}#nuevo`);
  revalidatePath(RUTA);
  redirect(`${RUTA}?ok=nuevo`);
}

export async function notaCompetidorAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const nota = String(f.get('nota') ?? '').trim().slice(0, 2000);
  const reauditar = f.get('reauditar') === '1';
  if (!UUID.test(id)) redirect(`${RUTA}?e=base`);
  try { await notaCompetidor(jwt, id, nota, reauditar); } catch { redirect(`${RUTA}?e=base#c-${id}`); }
  revalidatePath(RUTA);
  redirect(`${RUTA}?ok=${reauditar ? 'reauditar' : 'nota'}#c-${id}`);
}
