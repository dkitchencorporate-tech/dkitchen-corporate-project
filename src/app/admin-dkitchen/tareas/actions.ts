'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { guardarTarea, type EstadoTarea, type ModoNota } from '@/lib/tareas';
import { guardarRevision, type EstadoRevision } from '@/lib/revisiones';
import { escribirBuzon } from '@/lib/buzon';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ZONAS = ['hoy', 'mias', 'claude', 'enviadas', 'revisiones', 'resueltas'];
const zonaDe = (f: FormData) => { const z = String(f.get('zona') ?? ''); return ZONAS.includes(z) ? z : 'mias'; };

/**
 * Tachar / bloquear / reabrir una tarea y enviar la nota para Claude (0077).
 * 0087: `modo` decide qué pasa al enviar la nota: «cerrar» (hecha), «traspasar»
 * (cerrada para karc0, pendiente para Claude), «abierta» (solo la nota) o
 * «estado» (los botones de siempre). La nota enviada queda bloqueada.
 */
export async function guardarTareaAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const estado = String(f.get('estado') ?? '');
  const modo = String(f.get('modo') ?? 'estado');
  const nota = String(f.get('nota') ?? '').trim().slice(0, 3000);
  const zona = zonaDe(f);
  if (!UUID.test(id) || !['pendiente', 'hecha', 'bloqueada'].includes(estado) || !['abierta', 'cerrar', 'traspasar', 'estado'].includes(modo)) redirect(`/admin-dkitchen/tareas?zona=${zona}&e=datos`);
  if (modo !== 'estado' && !nota) redirect(`/admin-dkitchen/tareas?zona=${zona}&e=corto#t-${id}`);
  try { await guardarTarea(jwt, id, estado as EstadoTarea, nota, modo as ModoNota); } catch { redirect(`/admin-dkitchen/tareas?zona=${zona}&e=base`); }
  revalidatePath('/admin-dkitchen/tareas');
  const ok = modo === 'estado' ? estado : modo === 'abierta' ? 'nota' : modo;
  redirect(`/admin-dkitchen/tareas?zona=${zona}&ok=${ok}`);
}

/** Revisiones de Alex (0087): aprobar o pedir cambios con texto e imágenes ya subidas a Blob. */
export async function revisionAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const estado = String(f.get('estado') ?? '') as EstadoRevision;
  const comentario = String(f.get('comentario') ?? '').trim().slice(0, 6000);
  let imagenes: string[] = [];
  try { imagenes = JSON.parse(String(f.get('imagenes') ?? '[]')); } catch { imagenes = []; }
  imagenes = Array.isArray(imagenes) ? imagenes.filter((x) => typeof x === 'string' && /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(x)).slice(0, 12) : [];
  if (!UUID.test(id) || !['cambios', 'aprobada', 'por_revisar'].includes(estado)) redirect('/admin-dkitchen/tareas?zona=revisiones&e=datos');
  if (estado === 'cambios' && !comentario && !imagenes.length) redirect(`/admin-dkitchen/tareas?zona=revisiones&e=corto#r-${id}`);
  try { await guardarRevision(jwt, id, estado, comentario, imagenes); } catch { redirect('/admin-dkitchen/tareas?zona=revisiones&e=base'); }
  revalidatePath('/admin-dkitchen/tareas');
  redirect(`/admin-dkitchen/tareas?zona=revisiones&ok=${estado === 'aprobada' ? 'aprobada' : 'revision'}`);
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
