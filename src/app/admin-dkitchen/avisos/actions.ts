'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { avisarFallo, cambiarEstadoAviso } from '@/lib/admin-clientes';
import { enviarCorreoInterno, escaparHtml, escaparTexto } from '@/lib/email';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * «Avisar de un fallo» (0061): queda en la tabla avisos_fallo (Claude la lee
 * al empezar cada sesión) y llega un correo interno con la pantalla exacta.
 */
export async function avisarFalloAction(d: { pantalla: string; mensaje: string }): Promise<{ ok?: true; error?: string }> {
  const jwt = await exigirAdmin();
  const pantalla = String(d.pantalla ?? '').trim().slice(0, 300) || '(sin pantalla)';
  const mensaje = String(d.mensaje ?? '').trim();
  if (mensaje.length < 3) return { error: 'Cuéntanos qué ha pasado (al menos unas palabras).' };
  if (mensaje.length > 3000) return { error: 'El aviso es demasiado largo (máximo 3000 caracteres).' };
  try {
    await avisarFallo(jwt, pantalla, mensaje);
  } catch (e) {
    return { error: /demasiados/.test(String((e as Error).message)) ? 'Has enviado muchos avisos en una hora. Espera un poco.' : 'No se pudo guardar el aviso. Inténtalo de nuevo.' };
  }
  await enviarCorreoInterno(`AVISO DE FALLO en Central: ${pantalla}`,
    `<p>Pantalla: <strong>${escaparHtml(pantalla)}</strong></p><div style="border-left:3px solid #6E0C2B;background:#F6F5F3;border-radius:8px;padding:14px 16px;white-space:pre-wrap">${escaparTexto(mensaje, 3000)}</div><p>Lista completa en Central → Más → Avisos de fallo.</p>`).catch(() => {});
  revalidatePath('/admin-dkitchen/avisos');
  return { ok: true };
}

export async function estadoAvisoAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = String(formulario.get('id') ?? '');
  const estado = String(formulario.get('estado') ?? '');
  if (!UUID.test(id) || !['nuevo', 'en_curso', 'resuelto'].includes(estado)) throw new Error('Datos no válidos.');
  await cambiarEstadoAviso(jwt, id, estado as 'nuevo' | 'en_curso' | 'resuelto', String(formulario.get('nota') ?? '').slice(0, 1000));
  revalidatePath('/admin-dkitchen/avisos');
}
