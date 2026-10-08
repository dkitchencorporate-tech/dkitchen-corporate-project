'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirSocio } from '@/lib/guard-admin';
import { escribirBuzon, type TipoBuzon } from '@/lib/buzon';
import { datosMensaje } from '@/components/buzon/validar';

/** Buzón para Claude desde /socio (0065): el socio solo ve lo suyo. */
export async function escribirBuzonSocioAction(formulario: FormData) {
  const jwt = await exigirSocio();
  const d = datosMensaje(formulario);
  if ('error' in d) redirect(`/socio/buzon?e=${d.error}`);
  try {
    await escribirBuzon(jwt, d.tipo as TipoBuzon, d.mensaje, d.pantalla);
  } catch (e) {
    redirect(`/socio/buzon?e=${/demasiados/.test(String((e as Error).message)) ? 'muchos' : 'base'}`);
  }
  revalidatePath('/socio/buzon');
  redirect('/socio/buzon?ok=1');
}
