'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';

/** «Abrir Fundador» (0051): una sola vez; desde ese momento corren los 90 días. Lo decide la base (dk.exigir_admin). */
export async function abrirFundadorAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  if (formulario.get('confirmo') !== 'si') throw new Error('Marca la casilla de confirmación.');
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_fundador_abrir()'));
  revalidatePath('/admin-dkitchen/fundador');
  revalidatePath('/precios');
  revalidatePath('/fundador');
}
