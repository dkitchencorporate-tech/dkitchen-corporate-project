'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { anotarComunicacion, recordatorioHecho, type Canal } from '@/lib/comunicaciones';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Ficha 360 → Comunicación (0089): enviar un correo con plantilla, anotar un WhatsApp
 * (el navegador abre wa.me con el texto), una nota interna, una llamada o un recordatorio.
 */
export async function comunicarAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('restauranteId') ?? '');
  const canal = String(f.get('canal') ?? '') as Canal;
  const plantilla = String(f.get('plantilla') ?? '').slice(0, 40);
  const asunto = String(f.get('asunto') ?? '').trim().slice(0, 200);
  const cuerpo = String(f.get('cuerpo') ?? '').trim().slice(0, 8000);
  const email = String(f.get('email') ?? '');
  const recordar = String(f.get('recordar') ?? '');
  const volver = `/admin-dkitchen/qr/${id}`;
  if (!UUID.test(id) || !['email', 'whatsapp', 'nota', 'llamada', 'recordatorio'].includes(canal)) redirect(`${volver}?e=datos#comunicacion`);
  if (!cuerpo) redirect(`${volver}?e=vacio#comunicacion`);
  if (canal === 'recordatorio' && !/^\d{4}-\d{2}-\d{2}$/.test(recordar)) redirect(`${volver}?e=fecha#comunicacion`);
  if (canal === 'email') {
    if (!CORREO.test(email) || !asunto) redirect(`${volver}?e=correo#comunicacion`);
    const html = cuerpo.split(/\n{2,}/).map((p) => `<p>${escaparHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
    try { await enviarCorreoCliente(email, asunto, html); } catch { redirect(`${volver}?e=envio#comunicacion`); }
  }
  try { await anotarComunicacion(jwt, id, canal, plantilla, asunto, cuerpo, canal === 'recordatorio' ? recordar : null); }
  catch { redirect(`${volver}?e=base#comunicacion`); }
  revalidatePath(volver);
  redirect(`${volver}?ok=${canal}#comunicacion`);
}

export async function recordatorioHechoAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? ''), volver = String(f.get('volver') ?? '/admin-dkitchen/inicio');
  if (UUID.test(id)) await recordatorioHecho(jwt, id).catch(() => {});
  revalidatePath(volver);
  redirect(volver.startsWith('/admin-dkitchen') ? volver : '/admin-dkitchen/inicio');
}
