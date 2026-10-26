'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { guardarRecorrido, recorrerWeb } from '@/lib/mapa-web';

/** E1 (0106): recorre la web ahora y guarda la foto del grafo. Tarda 1–4 minutos. */
export async function recorrerMapaAction(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const jwt = await exigirAdmin();
  try {
    const r = await recorrerWeb();
    const id = await guardarRecorrido(jwt, r);
    revalidatePath('/admin-dkitchen/mapa');
    return { ok: true, id };
  } catch (e) {
    console.error('Mapa: recorrido fallido', e);
    return { ok: false, error: 'No se pudo completar el recorrido. Vuelve a intentarlo en unos minutos.' };
  }
}
