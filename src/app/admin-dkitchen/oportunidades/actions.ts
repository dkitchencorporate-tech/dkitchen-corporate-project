'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';

/** Marca atendido un lead de Signature (0057) con una nota de cómo fue la llamada. */
export async function atenderLeadAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = String(formulario.get('lead') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Lead no válido.');
  const nota = String(formulario.get('nota') ?? '').slice(0, 500);
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_lead_signature_atender($1, $2)', [id, nota]));
  revalidatePath('/admin-dkitchen/oportunidades');
  revalidatePath('/admin-dkitchen/inicio');
}
