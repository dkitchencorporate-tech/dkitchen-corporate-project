'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { crearCuentaCliente, enviarEnlaceDeContrasena } from '@/lib/neon-auth';
import { enviarBienvenidaQr } from '@/lib/bienvenida';
import { comoAprovisionamiento } from '@/lib/db';
import { crearCheckoutEnlaceAdmin } from '@/lib/payments/cobros';
import { exigirAdmin } from '@/lib/guard-admin';
import {
  cambiarEstadoCliente, cambiarPlanCliente, regalarTodo, cargarCartaDemo, crearEnlace, fijarUrlEnlace, anularEnlace, fichaCliente, responderTicket, cambiarEstadoSolicitudQr, asignarDiseno, adminServicio, adminConexionTpv,
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
          `<div style="border-left:3px solid #6E0C2B;background:#F6F5F3;border-radius:8px;padding:14px 16px;white-space:pre-wrap">${escaparTexto(respuesta, 4000)}</div>` +
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

// ---------------------------------------------------------------------------
// Alta manual de clientes (demos comerciales o cortesía) — 0029
// ---------------------------------------------------------------------------
const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const slugBase = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'local';

/**
 * Crea cuenta (Neon Auth) + restaurante sin pago. Reutiliza el mismo
 * aprovisionamiento que el alta pagada, con referencias «cortesia-…» (no hay
 * cobro que seguir, nunca entra en gracia). El cliente recibe el correo para
 * fijar su contraseña. Opcional: regalarle todo y cargar una carta de ejemplo.
 */
export async function crearClienteAction(datos: { email: string; contacto: string; local: string; plan: string; todo: boolean; dias?: number | null; demo: boolean }): Promise<{ id?: string; error?: string }> {
  const jwt = await exigirAdmin();
  const email = String(datos.email ?? '').trim().toLowerCase();
  const contacto = String(datos.contacto ?? '').trim().slice(0, 80);
  const local = String(datos.local ?? '').trim().slice(0, 80);
  const plan = datos.plan === 'ampliado' ? 'ampliado' : 'basico';
  if (!CORREO.test(email) || email.length > 254) return { error: 'El correo no es válido.' };
  if (contacto.length < 2 || local.length < 2) return { error: 'Pon el nombre del contacto y del local.' };

  let identidad: string;
  try { identidad = (await crearCuentaCliente({ email, nombre: contacto })).id; }
  catch { return { error: 'Ese correo ya tiene cuenta o Neon Auth no respondió. Usa otro correo (p. ej. tu+demo1@gmail.com).' }; }

  const ref = 'cortesia-' + randomUUID();
  const { rows } = await comoAprovisionamiento((c) =>
    c.query<{ restaurante_id: string }>('SELECT * FROM dk.aprovisionar_cliente_qr($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [ref, identidad, email, contacto, plan, local, slugBase(local), ref, ref]));
  const id = rows[0]?.restaurante_id;
  if (!id) return { error: 'No se pudo crear el restaurante.' };
  const dias = datos.dias == null ? null : Math.round(Number(datos.dias));
  if (dias !== null && (!Number.isFinite(dias) || dias < 1 || dias > 120)) return { error: 'La prueba debe durar entre 1 y 120 días.' };
  if (datos.todo) await regalarTodo(jwt, id, dias);
  if (datos.demo) await cargarCartaDemo(jwt, id).catch(() => 0);
  await enviarEnlaceDeContrasena(email).catch((e) => console.error('Alta manual: no se pudo enviar el enlace de contraseña', e));
  await enviarBienvenidaQr(email, contacto, local, plan).catch((e) => console.error('Alta manual: bienvenida no enviada', e));
  revalidatePath('/admin-dkitchen/qr');
  return { id };
}

export async function regalarTodoAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  // Duración de la prueba «todo incluido» (0034): 15/30 días, hasta una fecha o sin fin.
  const opcion = String(formulario.get('dias') ?? '15');
  let dias: number | null = null;
  if (opcion === 'fecha') {
    const hasta = String(formulario.get('hasta') ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) throw new Error('Elige la fecha de fin de la prueba.');
    dias = Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000);
  } else if (opcion !== 'sin') {
    dias = Number(opcion);
  }
  if (dias !== null && (!Number.isInteger(dias) || dias < 1 || dias > 120)) throw new Error('La prueba debe durar entre 1 y 120 días.');
  await regalarTodo(jwt, id, dias);
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function cartaDemoAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  await cargarCartaDemo(jwt, id);
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function reenviarAccesoAction(formulario: FormData) {
  await exigirAdmin();
  const email = String(formulario.get('email') ?? '').trim();
  if (!CORREO.test(email)) throw new Error('Correo no válido.');
  await enviarEnlaceDeContrasena(email);
}

// ---------------------------------------------------------------------------
// Enlaces de pago a medida (0030): el super admin decide qué y cuánto
// ---------------------------------------------------------------------------
const NOMBRES: Record<string, string> = {
  setup_esencial: 'Puesta a punto', setup_experto: 'Carta de Autor', idiomas: 'Idiomas', plano_mesas: 'Plano de mesas',
  app_sala: 'App de sala', conexion_tpv: 'Conexión TPV', pack_sala: 'Pack Sala',
};

export async function crearEnlaceAction(d: { restauranteId: string; plan: string; servicios: string[]; primer: number; mensual: number; nota: string; enviar: boolean }): Promise<{ url?: string; error?: string }> {
  if (!UUID.test(d.restauranteId)) return { error: 'Cliente no válido.' };
  const jwt = await exigirAdmin();
  const plan = d.plan === 'basico' || d.plan === 'ampliado' ? d.plan : null;
  const servicios = [...new Set((d.servicios ?? []).filter((s) => SERVICIOS_ADMIN.includes(s)))];
  const primer = Math.round(Number(d.primer) * 100), mensual = Math.round(Number(d.mensual || 0) * 100);
  if (!plan && servicios.length === 0) return { error: 'Elige un plan o al menos un servicio.' };
  if (!Number.isFinite(primer) || primer < 100 || primer > 1000000) return { error: 'El primer cobro debe estar entre 1 € y 10.000 €.' };
  if (!Number.isFinite(mensual) || mensual < 0 || mensual > 1000000) return { error: 'La cuota mensual no es válida.' };
  const ficha = await fichaCliente(jwt, d.restauranteId);
  if (!ficha?.restaurante || !ficha.email) return { error: 'El cliente no tiene correo.' };

  const id = await crearEnlace(jwt, d.restauranteId, { plan, servicios, primer, mensual, nota: String(d.nota ?? '').slice(0, 300) });
  const concepto = [plan ? `Plan ${plan === 'ampliado' ? 'Ampliado' : 'Básico'}` : null, ...servicios.map((s) => NOMBRES[s])].filter(Boolean).join(' + ');
  let url: string;
  try {
    ({ url } = await crearCheckoutEnlaceAdmin({
      enlaceId: id, restauranteId: d.restauranteId, restauranteNombre: ficha.restaurante.nombre, email: ficha.email,
      concepto, primerCentimos: primer, mensualCentimos: mensual, origen: process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es',
    }));
  } catch (e) {
    await anularEnlace(jwt, id).catch(() => {});
    return { error: e instanceof Error ? e.message : 'Stripe no respondió.' };
  }
  await fijarUrlEnlace(jwt, id, url);
  if (d.enviar) {
    const importe = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    await enviarCorreoCliente(ficha.email, `Tu enlace de pago · ${ficha.restaurante.nombre}`,
      `<p>Hola${ficha.contacto ? ' ' + escaparHtml(ficha.contacto) : ''},</p>
       <p>Te dejamos preparado el enlace para activar <strong>${escaparHtml(concepto)}</strong> en ${escaparHtml(ficha.restaurante.nombre)}.</p>
       <p>Primer pago: <strong>${importe(primer)}</strong>${mensual ? ` · después ${importe(mensual)}/mes, sin permanencia` : ' · pago único'}.</p>
       ${d.nota ? `<p>${escaparHtml(d.nota)}</p>` : ''}
       <p><a href="${url}" style="display:inline-block;background:#6E0C2B;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Pagar de forma segura</a></p>
       <p>En cuanto se confirme el pago, se activa solo en tu panel.</p>`).catch((e) => console.error('Enlace creado, pero no se pudo enviar el correo', e));
  }
  revalidatePath(`/admin-dkitchen/qr/${d.restauranteId}`);
  return { url };
}

export async function anularEnlaceAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('enlaceId'));
  const rest = uuid(formulario.get('restauranteId'));
  await anularEnlace(jwt, id);
  revalidatePath(`/admin-dkitchen/qr/${rest}`);
}
