'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { exigirSocio } from '@/lib/guard-admin';
import { misClientes } from '@/lib/socio';
import { COOKIE_PUESTA } from '@/lib/socio-codigo';

/**
 * Abre la puesta a punto de un cliente: el panel normal pasa a mostrar ESE
 * local (obtenerMiRestaurante lee la cookie y la base lo confirma con
 * dk.gestiona). Solo clientes suyos y con permiso del dueño. 12 h como el 2FA.
 */
export async function entrarPuestaAction(formulario: FormData) {
  const jwt = await exigirSocio();
  const id = String(formulario.get('id') ?? '');
  const cliente = (await misClientes(jwt)).find((c) => c.id === id);
  if (!cliente || !cliente.puede_editar) redirect('/socio?e=permiso');
  (await cookies()).set(COOKIE_PUESTA, id, { path: '/', maxAge: 12 * 3600, httpOnly: true, secure: true, sameSite: 'lax' });
  redirect('/panel?pestana=carta');
}
