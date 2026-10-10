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
  archivarCliente, marcarDemo, programarBaja, anularBaja, clienteStripeAdmin,
} from '@/lib/admin-clientes';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_PUESTA } from '@/lib/socio-codigo';
import { cancelarTodoAlFinalDelPeriodo, reanudarTodo } from '@/lib/payments/stripe';
import { enviarCorreoCliente, enviarCorreoInterno, escaparHtml, escaparTexto } from '@/lib/email';
import { cifrar } from '@/lib/cifrado';
import { guardarTraducciones, type Traduccion } from '@/lib/idiomas';
import { esPlanQr, nombrePlan } from '@/lib/pricing-config';

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
  if (!esPlanQr(plan)) throw new Error('Plan no válido.');
  await cambiarPlanCliente(jwt, id, plan);
  revalidatePath('/admin-dkitchen/qr');
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function responderTicketAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('ticketId'));
  const respuesta = String(formulario.get('respuesta') ?? '').trim();
  if (!respuesta || respuesta.length > 4000) throw new Error('La respuesta debe tener entre 1 y 4000 caracteres.');
  // Fallo 4 del recorrido 114: el borrador N2 trae huecos que hay que rellenar antes de enviar.
  if (/\[(respuesta|pasos)\]/i.test(respuesta)) redirect('/admin-dkitchen/soporte?e=hueco');
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

const SERVICIOS_ADMIN = ['setup_esencial', 'setup_experto', 'idiomas', 'idioma_extra', 'plano_mesas', 'app_sala', 'conexion_tpv', 'pack_sala'];
const PUNTOS_SETUP = ['carta', 'imagenes', 'banner', 'google', 'redes', 'material', 'soporte', 'formacion'];

export async function servicioAdminAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const servicio = String(formulario.get('servicio'));
  const accion = String(formulario.get('accion'));
  // Fuera regalos (0061): un módulo se activa pagando (enlace de pago) o con la prueba con fecha.
  if (!SERVICIOS_ADMIN.includes(servicio) || !['cancelar', 'entregado'].includes(accion)) throw new Error('Acción no válida.');
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
export async function crearClienteAction(datos: { email: string; contacto: string; local: string; plan: string; todo: boolean; dias?: number | null; demoInterna: boolean; cartaEjemplo: boolean }): Promise<{ id?: string; error?: string }> {
  const jwt = await exigirAdmin();
  const email = String(datos.email ?? '').trim().toLowerCase();
  const contacto = String(datos.contacto ?? '').trim().slice(0, 80);
  const local = String(datos.local ?? '').trim().slice(0, 80);
  const plan = esPlanQr(datos.plan) ? datos.plan : 'basico';
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
  // Sin regalos (0061): la prueba siempre tiene fecha; «todo sin fecha» solo en una cuenta demo interna.
  const dias = Math.round(Number(datos.dias ?? 15));
  if (datos.todo && (!Number.isFinite(dias) || dias < 1 || dias > 120)) return { error: 'La prueba debe durar entre 1 y 120 días.' };
  if (datos.demoInterna) { await marcarDemo(jwt, id, true); await regalarTodo(jwt, id, null); }
  else if (datos.todo) await regalarTodo(jwt, id, dias);
  if (datos.cartaEjemplo) await cargarCartaDemo(jwt, id).catch(() => 0);
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
  setup_esencial: 'Puesta a punto', setup_experto: 'Carta de Autor', idiomas: 'Idiomas (antiguo)', idioma_extra: 'Idioma extra', plano_mesas: 'Plano de mesas',
  app_sala: 'App de sala', conexion_tpv: 'Conexión TPV', pack_sala: 'Pack Sala',
};

export async function crearEnlaceAction(d: { restauranteId: string; plan: string; servicios: string[]; primer: number; mensual: number; nota: string; enviar: boolean }): Promise<{ url?: string; error?: string }> {
  if (!UUID.test(d.restauranteId)) return { error: 'Cliente no válido.' };
  const jwt = await exigirAdmin();
  const plan = esPlanQr(d.plan) ? d.plan : null;
  const servicios = [...new Set((d.servicios ?? []).filter((s) => SERVICIOS_ADMIN.includes(s)))];
  const primer = Math.round(Number(d.primer) * 100), mensual = Math.round(Number(d.mensual || 0) * 100);
  if (!plan && servicios.length === 0) return { error: 'Elige un plan o al menos un servicio.' };
  if (!Number.isFinite(primer) || primer < 100 || primer > 1000000) return { error: 'El primer cobro debe estar entre 1 € y 10.000 €.' };
  if (!Number.isFinite(mensual) || mensual < 0 || mensual > 1000000) return { error: 'La cuota mensual no es válida.' };
  const ficha = await fichaCliente(jwt, d.restauranteId);
  if (!ficha?.restaurante || !ficha.email) return { error: 'El cliente no tiene correo.' };

  const id = await crearEnlace(jwt, d.restauranteId, { plan, servicios, primer, mensual, nota: String(d.nota ?? '').slice(0, 300) });
  const concepto = [plan ? `Plan ${nombrePlan(plan)}` : null, ...servicios.map((s) => NOMBRES[s])].filter(Boolean).join(' + ');
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

// ---------------------------------------------------------------------------
// Bloque 1b (0061): baja al final del periodo, archivo, demo interna y modo soporte
// ---------------------------------------------------------------------------
const MOTIVOS_BAJA = ['Lo pide el cliente', 'Impago', 'Cierra el local', 'Se va a otra solución', 'Prueba sin pagar', 'Duplicado o error', 'Otro'];
const fechaLarga = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
const hoyMadrid = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

/**
 * Dar de baja desde Central: cancela en Stripe TODAS sus suscripciones al
 * final del periodo pagado (sin reembolsos) y deja la fecha en la base. Ese
 * día el webhook (o el cron, de respaldo) suspende el local: carta pública
 * fuera, panel cerrado y arranca el borrado a 60 días. Sin suscripción viva
 * (prueba, cortesía antigua), la baja es inmediata. Correo al cliente si se pide.
 */
export async function darDeBajaAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const motivoLista = String(formulario.get('motivo') ?? '');
  const detalle = String(formulario.get('detalle') ?? '').trim().slice(0, 600);
  if (!MOTIVOS_BAJA.includes(motivoLista)) throw new Error('Elige el motivo de la baja.');
  if (formulario.get('confirmo') !== 'on') throw new Error('Marca la casilla de confirmación.');
  const avisar = formulario.get('avisar') === 'on';

  let fecha = hoyMadrid();
  let stripeTxt = 'Sin suscripción en Stripe: baja inmediata.';
  const cliente = await clienteStripeAdmin(jwt, id);
  if (cliente) {
    const r = await cancelarTodoAlFinalDelPeriodo(cliente);
    if (r.ok && r.finPeriodo) {
      fecha = new Date(r.finPeriodo * 1000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
      stripeTxt = `Stripe: ${r.n} suscripción(es) cancelada(s) al final del periodo.`;
    } else if (!r.ok && !/no tiene suscripciones activas/.test(r.error)) {
      // No se toca la base si Stripe falla: así no queda una baja a medias.
      throw new Error(`Stripe no respondió y no se ha dado de baja: ${r.error}`);
    }
  }
  const motivo = detalle ? `${motivoLista}: ${detalle}` : motivoLista;
  const b = await programarBaja(jwt, id, fecha, motivo);
  await enviarCorreoInterno(`BAJA desde Central: ${b.nombre}`,
    `<p><strong>${escaparHtml(b.nombre)}</strong>: ${b.inmediata ? 'baja inmediata' : `deja de estar activo el ${escaparHtml(fechaLarga(fecha))}`}.</p><p>${escaparHtml(stripeTxt)}</p><p>Motivo: ${escaparHtml(motivo)}</p>`).catch(() => {});
  if (avisar && b.email) {
    await enviarCorreoCliente(b.email, `Baja confirmada · ${b.nombre}`,
      `<p>Hola${b.contacto ? ' ' + escaparHtml(b.contacto) : ''},</p>
       <p>Te confirmamos la baja de la carta digital de <strong>${escaparHtml(b.nombre)}</strong>.${cliente ? ' Ya no se te volverá a cobrar.' : ''}</p>
       <p>${b.inmediata ? 'La carta deja de estar disponible hoy.' : `Tu carta y tu panel siguen activos hasta el <strong>${escaparHtml(fechaLarga(fecha))}</strong>, el final del periodo que ya pagaste.`} Después, tu QR mostrará una página informativa (nunca un error) y guardaremos tu carta 60 días por si quieres volver o pedirnos una copia.</p>
       <p>Si ha sido un error o quieres contarnos algo, responde a este correo.</p>`, { titulo: 'Baja confirmada' }).catch((e) => console.error('Baja: correo al cliente no enviado', e));
  }
  if (b.inmediata) revalidatePath('/m/[slug]', 'page');
  revalidatePath('/admin-dkitchen/qr');
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

/** Anular una baja que aún no ha llegado: vuelve a activar la renovación en Stripe y borra la fecha. */
export async function anularBajaAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  const cliente = await clienteStripeAdmin(jwt, id);
  if (cliente) {
    const r = await reanudarTodo(cliente);
    if (!r.ok) throw new Error(`Stripe no respondió y la baja sigue programada: ${r.error}`);
  }
  await anularBaja(jwt, id);
  revalidatePath('/admin-dkitchen/qr');
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function archivarAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  await archivarCliente(jwt, id, formulario.get('archivar') === '1');
  revalidatePath('/admin-dkitchen/qr');
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

export async function demoInternaAction(formulario: FormData) {
  const jwt = await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  await marcarDemo(jwt, id, formulario.get('demo') === '1');
  revalidatePath('/admin-dkitchen/qr');
  revalidatePath(`/admin-dkitchen/qr/${id}`);
}

/**
 * «Entrar en su panel» (modo soporte): el panel normal pasa a mostrar ESE
 * local, como la puesta a punto del socio (cookie de 12 h). La base solo lo
 * permite al super admin con 2FA (dk.gestiona, 0061) y cada cambio queda en
 * el historial como «DKitchen». El cobro sigue gestionándose en la ficha.
 */
export async function entrarSoporteAction(formulario: FormData) {
  await exigirAdmin();
  const id = uuid(formulario.get('restauranteId'));
  (await cookies()).set(COOKIE_PUESTA, id, { path: '/', maxAge: 12 * 3600, httpOnly: true, secure: true, sameSite: 'lax' });
  redirect('/panel');
}
