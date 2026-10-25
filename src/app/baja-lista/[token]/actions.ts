'use server';

import { redirect } from 'next/navigation';
import { comoVisitante } from '@/lib/db';

/** Baja de la lista de exclientes con un clic (0081, LSSI art. 21.2). */
export async function darmeDeBajaAction(formulario: FormData) {
  const token = String(formulario.get('token') ?? '');
  if (!/^[0-9a-f]{32}$/.test(token)) redirect('/');
  await comoVisitante((c) => c.query('SELECT dk.lista_baja($1)', [token])).catch((e) => console.error('Baja de la lista falló', e));
  redirect(`/baja-lista/${token}`);
}
