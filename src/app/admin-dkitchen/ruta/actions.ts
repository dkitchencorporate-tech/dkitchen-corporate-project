'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { fijarValorHito } from '@/lib/ruta';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Actualiza el dato real de un hito manual (publicaciones, testimonio, anuncios…) (0085). */
export async function valorHitoAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const valor = Number(String(f.get('valor') ?? '').replace(',', '.'));
  if (!UUID.test(id) || !Number.isFinite(valor) || valor < 0) redirect('/admin-dkitchen/ruta?e=1');
  let fallo = false;
  try { await fijarValorHito(jwt, id, valor); } catch { fallo = true; }
  if (fallo) redirect('/admin-dkitchen/ruta?e=1');
  revalidatePath('/admin-dkitchen/ruta');
  redirect(`/admin-dkitchen/ruta?ok=1#h-${id}`);
}
