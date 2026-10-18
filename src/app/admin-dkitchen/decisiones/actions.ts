'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { decidir, reabrirDecision } from '@/lib/decisiones';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUTA = '/admin-dkitchen/decisiones';

/** karc0 elige una opción, escribe la suya («otra») o la aplaza (0083). Claude lo lee al empezar su sesión. */
export async function decidirAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  // «Aplazar» va en su propio botón: con el mismo nombre que las opciones, FormData daría la opción marcada.
  const eleccion = f.get('aplazar') === '1' ? 'aplazar' : String(f.get('eleccion') ?? '').slice(0, 20);
  const respuesta = String(f.get('respuesta') ?? '').trim().slice(0, 4000);
  if (!UUID.test(id) || !eleccion) redirect(`${RUTA}?e=elige#d-${id}`);
  if (eleccion === 'otra' && !respuesta) redirect(`${RUTA}?e=otra#d-${id}`);
  let e = '';
  try { await decidir(jwt, id, eleccion, respuesta); }
  catch (x) { e = /no válida/.test(String((x as Error).message)) ? 'elige' : 'base'; }
  if (e) redirect(`${RUTA}?e=${e}#d-${id}`);
  revalidatePath(RUTA);
  redirect(`${RUTA}?ok=${eleccion === 'aplazar' ? 'aplazada' : 'decidida'}#d-${id}`);
}

/** 0092: karc0 reabre una decisión cerrada (vuelve a «Por decidir»). */
export async function reabrirDecisionAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  if (!UUID.test(id)) redirect(`${RUTA}?e=base`);
  try { await reabrirDecision(jwt, id); } catch { redirect(`${RUTA}?e=base#d-${id}`); }
  revalidatePath(RUTA);
  redirect(`${RUTA}?f=por_decidir&ok=reabierta#d-${id}`);
}
