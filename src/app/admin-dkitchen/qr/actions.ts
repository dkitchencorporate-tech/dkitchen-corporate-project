'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import {
  cambiarEstadoCliente, cambiarPlanCliente, responderTicket, cambiarEstadoSolicitudQr, asignarDiseno, adminServicio, adminConexionTpv,
} from '@/lib/admin-clientes';
import { enviarCorreoCliente, escaparHtml, escaparTexto } from '@/lib/email';
import { cifrar } from '@/lib/cifrado';
import { guardarTraducciones, type Traduccion } from '@/lib/idiomas';

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
        { titulo: 'Te hemos respondido', boton: { texto: 'Ver en mi panel', url: 'https://dkitchencorporate.es/panel?pestana=soporte' } }
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

export async function asignarDisenoAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const plantilla = String(formulario.get('plantilla'));
  const nivel = String(formulario.get('nivel'));
  const colorBruto = String(formulario.get('color') ?? '').trim();
  if (!['clasica', 'visual', 'express'].includes(plantilla) || !['esencial', 'autor', 'signature'].includes(nivel)) {
    throw new Error('Diseño no válido.');
  }
  const color = /^#[0-9a-fA-F]{6}$/.test(colorBruto) ? colorBruto.toUpperCase() : null;
  await asignarDiseno(jwt, id, plantilla, nivel, color);
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

const SERVICIOS_ADMIN = ['setup_esencial', 'setup_experto', 'idiomas', 'plano_mesas', 'app_sala', 'conexion_tpv', 'pack_sala'];
const PUNTOS_SETUP = ['carta', 'imagenes', 'banner', 'google', 'redes', 'material', 'soporte', 'formacion'];

export async function servicioAdminAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const servicio = String(formulario.get('servicio'));
  const accion = String(formulario.get('accion'));
  if (!SERVICIOS_ADMIN.includes(servicio) || !['demo', 'regalar', 'cancelar', 'entregado'].includes(accion)) throw new Error('Acción no válida.');
  await adminServicio(jwt, id, servicio, accion);
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function checklistSetupAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const servicio = String(formulario.get('servicio'));
  if (!['setup_esencial', 'setup_experto'].includes(servicio)) throw new Error('Servicio no válido.');
  const lista = Object.fromEntries(PUNTOS_SETUP.map((p) => [p, formulario.get(p) === 'on']));
  await adminServicio(jwt, id, servicio, 'checklist', lista);
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function conexionTpvAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const proveedor = String(formulario.get('proveedor') ?? '').trim().slice(0, 40);
  const endpoint = String(formulario.get('endpoint') ?? '').trim();
  const credencial = String(formulario.get('credencial') ?? '').trim();
  if (proveedor.length < 2 || !/^https:\/\/[^\s]+$/.test(endpoint)) throw new Error('Proveedor y URL https obligatorios.');
  // La credencial (cabecera Authorization completa, p. ej. "Bearer xxx") se cifra aquí; vacía = mantener la actual
  await adminConexionTpv(jwt, id, proveedor, endpoint, credencial ? cifrar(credencial) : null, formulario.get('activa') === 'on');
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

/** Traducciones del Pack de idiomas: solo DKitchen escribe (0028). */
export async function guardarTraduccionesAdminAction(restauranteId: string, lista: Traduccion[]) {
  if (!UUID.test(restauranteId)) throw new Error('Identificador no válido.');
  const jwt = await exigirAdmin();
  const limpia = (lista ?? [])
    .filter((t) => ['plato', 'seccion'].includes(t.entidad) && UUID.test(t.entidadId) && ['en', 'fr', 'de', 'it', 'pt', 'ca'].includes(t.idioma)
      && ['nombre', 'descripcion'].includes(t.campo))
    .slice(0, 600)
    .map((t) => ({ ...t, texto: String(t.texto ?? '').slice(0, 300) }));
  await guardarTraducciones(jwt, restauranteId, limpia).catch(() => { throw new Error('No se pudieron guardar las traducciones.'); });
  revalidatePath(`/admin-dkitchen/qr/${restauranteId}`);
}
