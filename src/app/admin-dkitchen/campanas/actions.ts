'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';

/** QR de campaña (0071): crear o cambiar el destino. El código impreso no cambia nunca. */
export async function guardarQrCampanaAction(f: FormData) {
  const jwt = await exigirAdmin();
  const codigo = String(f.get('codigo') ?? '').trim().toLowerCase();
  const nombre = String(f.get('nombre') ?? '').trim().slice(0, 80);
  const destino = String(f.get('destino') ?? '').trim().replace(/^https:\/\/dkitchencorporate\.es/, '');
  if (!/^[a-z0-9-]{3,32}$/.test(codigo)) throw new Error('El código solo admite minúsculas, números y guiones (3–32).');
  if (!/^\/[A-Za-z0-9/_?&=%.,-]*$/.test(destino)) throw new Error('El destino debe ser una ruta de dkitchencorporate.es que empiece por «/».');
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_qr_campana_guardar($1, $2, $3, $4)', [codigo, nombre || codigo, destino, f.get('activo') === 'si']));
  revalidatePath('/admin-dkitchen/campanas');
}

export async function estadoContactoAction(f: FormData) {
  const jwt = await exigirAdmin();
  const estado = String(f.get('estado'));
  if (!['nuevo', 'atendido', 'descartado'].includes(estado)) throw new Error('Estado no válido.');
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_contacto_estado($1, $2)', [String(f.get('id')), estado]));
  revalidatePath('/admin-dkitchen/campanas');
}
