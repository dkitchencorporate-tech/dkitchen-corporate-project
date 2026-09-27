'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import {
  cambiarEstadoCliente, cambiarPlanCliente, responderTicket, cambiarEstadoSolicitudQr,
} from '@/lib/admin-clientes';
import { enviarCorreoCliente, escaparHtml, escaparTexto } from '@/lib/email';

/**
 * Acciones del super admin. Doble cerrojo: exigirAdmin() aquí y dk.es_admin()
 * dentro de cada función SQL (0021). Las Server Actions de Next rechazan
 * peticiones cuyo Origin no coincide con el Host (protección CSRF nativa).
 * Todo valor que llega del formulario se valida con lista blanca.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESTADOS_SOLICITUD = ['solicitado', 'presupuestado', 'pagado', 'en_produccion', 'enviado'];

function uuid(valor: FormDataEntryValue | null): string {
  const v = String(valor ?? '');
  if (!UUID.test(v)) throw new Error('Identificador no válido.');
  return v;
}

export async function cambiarEstadoAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const estado = String(formulario.get('estado'));
  if (estado !== 'activo' && estado !== 'suspendido') throw new Error('Estado no válido.');
  await cambiarEstadoCliente(jwt, id, estado);
  revalidatePath('/admin-dkitchen/qr');
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function cambiarPlanAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const plan = String(formulario.get('plan'));
  if (plan !== 'basico' && plan !== 'ampliado') throw new Error('Plan no válido.');
  await cambiarPlanCliente(jwt, id, plan);
  revalidatePath('/admin-dkitchen/qr');
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function responderTicketAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('ticketId'));
  const respuesta = String(formulario.get('respuesta') ?? '').trim();
  if (!respuesta || respuesta.length > 4000) throw new Error('La respuesta debe tener entre 1 y 4000 caracteres.');
  const cerrar = formulario.get('cerrar') === 'on';

  const destino = await responderTicket(jwt, id, respuesta, cerrar);
  if (destino?.email) {
    try {
      await enviarCorreoCliente(
        destino.email,
        `Respuesta a tu consulta: ${destino.asunto}`,
        `<p style="margin:0 0 12px">Hola, hemos respondido a tu consulta <strong>«${escaparHtml(destino.asunto)}»</strong> sobre ${escaparHtml(destino.restaurante)}:</p>` +
          `<div style="border-left:3px solid #D9531E;background:#F6F5F3;border-radius:8px;padding:14px 16px;white-space:pre-wrap">${escaparTexto(respuesta, 4000)}</div>` +
          `<p style="margin:16px 0 0;font-size:14px;color:#6B6560">También la tienes en tu panel, en Soporte. Si necesitas algo más, responde a este correo.</p>`,
        { titulo: 'Te hemos respondido', boton: { texto: 'Abrir mi panel', url: 'https://dkitchencorporate.es/panel' } }
      );
    } catch (error) {
      // La respuesta ya quedó guardada y visible en el panel del cliente.
      console.error('Aviso de respuesta de ticket no enviado:', (error as Error).message);
    }
  }
  revalidatePath('/admin-dkitchen/soporte');
}

export async function estadoSolicitudAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('solicitudId'));
  const estado = String(formulario.get('estado'));
  if (!ESTADOS_SOLICITUD.includes(estado)) throw new Error('Estado no válido.');
  await cambiarEstadoSolicitudQr(jwt, id, estado);
  revalidatePath('/admin-dkitchen/soporte');
}
