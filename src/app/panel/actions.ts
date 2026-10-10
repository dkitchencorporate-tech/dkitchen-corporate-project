'use server';

import { revalidatePath } from 'next/cache';
import { claveDeLimite, limiteSuperado } from '@/lib/limite-frecuencia';
import { escaneosRango as dbEscaneosRango } from '@/lib/escaneos-cliente';
import { mejorarTexto as dbMejorarTexto, type TipoTexto } from '@/lib/texto-ia';
import { responderAyuda, type MensajeAyuda } from '@/lib/ayuda-ia';
import { saldoIa as dbSaldoIa, generarImagen as dbGenerarImagen, limpiarTextoIa } from '@/lib/ia';
import { moverSeccion as dbMoverSeccion, guardarExtras as dbGuardarExtras, guardarCombo as dbGuardarCombo, guardarLegal as dbGuardarLegal, ETIQUETAS, type Etiqueta, type DatosCombo, type DatosLegal } from '@/lib/estudio';
import { obtenerJwtDeSesion, identidadActual } from '@/lib/sesion';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { obtenerMiRestaurante, actualizarDatosLocal, type DatosLocal, guardarEstilo, guardarPortada as dbGuardarPortada } from '@/lib/mi-restaurante';
import { atenderLlamada, llamadasPendientes } from '@/lib/llamadas-camarero';
import {
  crearSeccion as dbCrearSeccion,
  editarSeccion as dbEditarSeccion,
  eliminarSeccion as dbEliminarSeccion,
  crearPlato as dbCrearPlato,
  editarPlato as dbEditarPlato,
  eliminarPlato as dbEliminarPlato,
  listarMiCarta,
  guardarDescripcionSeccion as dbGuardarDescripcionSeccion,
  type DatosPlato,
} from '@/lib/menu-propietario';
import { crearSolicitudQrFisico as dbCrearSolicitudQrFisico, type TipoQrFisico } from '@/lib/solicitudes-qr-fisico';
import { crearTicket as dbCrearTicket } from '@/lib/tickets';
import {
  crearPromocion as dbCrearPromocion,
  editarPromocion as dbEditarPromocion,
  eliminarPromocion as dbEliminarPromocion,
  type DatosPromocion,
} from '@/lib/promociones';
import { cambiarEstadoReserva as dbCambiarEstadoReserva, marcarAvisada as dbMarcarAvisada, listarMisReservas } from '@/lib/reservas';
import { avisarEstadoAlCliente, whatsappParaCliente } from '@/lib/correos-reserva';
import { crearCheckoutServicio, crearCheckoutCambioPlan, crearCheckoutEnlaceAdmin } from '@/lib/payments/cobros';
import { PLANES_QR, esPlanQr } from '@/lib/pricing-config';
import { cancelarTodoAlFinalDelPeriodo, suscripcionesVivas, urlPortalCliente } from '@/lib/payments/stripe';
import { quedarmeConTodo, fijarUrlPrueba } from '@/lib/prueba';
import { estadoServicios, tiene, registrarOferta as dbRegistrarOferta, type Servicio } from '@/lib/servicios';
import { guardarMesa, eliminarMesa, guardarPlano, cargarPlano, type MesaPlano, type ElementoPlano } from '@/lib/sala';
import { equipoDueno, crearMiembro, editarMiembro, regenerarEnlace, asignarZona } from '@/lib/equipo';
import type { RolSala } from '@/lib/equipo-tipos';
import { fijarIdiomas } from '@/lib/idiomas';
import {
  mesasEnVivo as dbMesasEnVivo, cuentaDetalle as dbCuentaDetalle, rondaRevisada as dbRondaRevisada, cerrarCuenta as dbCerrarCuenta,
  anularLinea as dbAnularLinea, anularCuenta as dbAnularCuenta, resumenSala as dbResumenSala, informeCuentas as dbInformeCuentas,
  informeAnulaciones as dbInformeAnulaciones, type Filtro,
  panelCarta as dbPanelCarta, panelAbrirCuenta as dbPanelAbrirCuenta, panelRegistrar as dbPanelRegistrar,
  panelCambiarCantidad as dbPanelCambiarCantidad, panelMoverCuenta as dbPanelMoverCuenta,
} from '@/lib/comandero';
import { reenviarRegistroAlTpv } from '@/lib/envio-tpv';
import { tutorialEstado as dbTutorialEstado, tutorialAvanzar as dbTutorialAvanzar, tutorialCompletar as dbTutorialCompletar } from '@/lib/tutorial';

/** Todo cambio del panel se ve al momento en la carta pública (01/10: antes tardaba hasta 60 s). */
function refrescarCartas() {
  revalidatePath('/m/[slug]', 'page');
  revalidatePath('/m/[slug]/legal', 'page');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** WhatsApp en formato internacional sin espacios (+34600111222). España por defecto. */
function normalizarWhatsapp(valor: string | null | undefined): string | null {
  const limpio = (valor ?? '').replace(/[\s-]/g, '');
  if (!limpio) return null;
  const conPrefijo = limpio.startsWith('+') ? limpio : /^[6789][0-9]{8}$/.test(limpio) ? `+34${limpio}` : limpio;
  if (!/^\+?[0-9]{9,15}$/.test(conPrefijo)) throw new Error('El WhatsApp debe ser un número de teléfono válido.');
  return conPrefijo;
}

/**
 * Todas las acciones repiten el mismo patrón: obtener el JWT + el
 * restaurante del propio dueño de la sesión, nunca confiar en un
 * restauranteId que llegue del formulario del cliente — evita que alguien
 * manipule el DOM para escribir en la carta de otro restaurante. RLS ya lo
 * impediría a nivel de base de datos, pero resolverlo aquí también evita una
 * llamada que sabemos que va a fallar.
 */
async function requerirSesionYRestaurante() {
  const jwt = await obtenerJwtDeSesion();
  const identidad = await identidadActual();
  if (!jwt || !identidad) throw new Error('No has iniciado sesión.');
  const restaurante = await obtenerMiRestaurante(jwt);
  if (!restaurante) throw new Error('No se encontró tu restaurante.');
  return { jwt, identidad, restaurante };
}

/**
 * Pagos, cambios de plan y baja: solo el dueño. El socio en puesta a punto (0052)
 * edita la carta de su cliente, pero nunca toca su dinero ni su suscripción.
 */
async function requerirDueno() {
  const r = await requerirSesionYRestaurante();
  if (r.restaurante.puestaAPunto) throw new Error('Esto solo lo puede hacer el dueño del local desde su cuenta.');
  return r;
}

export async function crearSeccionAction(nombre: string) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbCrearSeccion(jwt, restaurante.id, nombre);
  revalidatePath('/panel');
  refrescarCartas();
}

export async function editarSeccionAction(seccionId: string, nombre: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEditarSeccion(jwt, seccionId, nombre);
  revalidatePath('/panel');
  refrescarCartas();
}

export async function eliminarSeccionAction(seccionId: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEliminarSeccion(jwt, seccionId);
  revalidatePath('/panel');
  refrescarCartas();
}

export async function crearPlatoAction(datos: DatosPlato) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbCrearPlato(jwt, restaurante.id, datos);
  revalidatePath('/panel');
  refrescarCartas();
}

export async function editarPlatoAction(platoId: string, datos: Partial<DatosPlato> & { disponible?: boolean }) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEditarPlato(jwt, platoId, datos);
  revalidatePath('/panel');
  refrescarCartas();
}

export async function eliminarPlatoAction(platoId: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEliminarPlato(jwt, platoId);
  revalidatePath('/panel');
  refrescarCartas();
}

export async function crearSolicitudQrFisicoAction(datos: {
  tipo: TipoQrFisico;
  cantidad: number;
  direccionEnvio: string;
  notas?: string;
}) {
  const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
  await dbCrearSolicitudQrFisico(jwt, restaurante.id, datos, {
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
  });
  revalidatePath('/panel');
  refrescarCartas();
}

export async function crearTicketAction(datos: { asunto: string; mensaje: string }) {
  const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
  await dbCrearTicket(jwt, restaurante.id, datos, {
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
  });
  revalidatePath('/panel');
  refrescarCartas();
}

/** Paso a una persona desde el chat de ayuda: el contexto se limpia aquí y el plan lo pone el servidor. */
async function crearTicketAyudaAction_(datos: {
  asunto: string;
  mensaje: string;
  contexto: { seccion: string | null; camino: string[]; busquedas: string[]; pagina?: string; conversacion?: string[] };
}) {
  const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const lista = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(-n).map((x) => texto(x, 200)).filter(Boolean) : []);
  const asunto = texto(datos?.asunto, 120) || 'Ayuda: consulta desde el chat';
  const mensaje = texto(datos?.mensaje, 2000);
  if (mensaje.length < 3) throw new Error('Cuéntanos qué necesitas.');
  const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
  if (await limiteSuperado(claveDeLimite('ticket-chat', restaurante.id), 5, 10 * 60)) throw new Error('Has enviado varios mensajes seguidos. Espera unos minutos.');
  const c: Partial<typeof datos.contexto> = datos.contexto ?? {};
  const contexto = {
    seccion: /^[a-z_]{2,20}$/.test(String(c.seccion ?? '')) ? c.seccion : null,
    camino: lista(c.camino, 12),
    busquedas: lista(c.busquedas, 6),
    // Conversación con la ayuda IA (punto 6): la persona que responde la ve entera.
    conversacion: Array.isArray(c.conversacion) ? c.conversacion.slice(-10).map((x) => texto(x, 600)).filter(Boolean) : [],
    pagina: texto(c.pagina, 120) || null,
    plan: restaurante.plan,
    nivel: restaurante.nivelDiseno,
  };
  await dbCrearTicket(jwt, restaurante.id, { asunto, mensaje, origen: 'chat', contexto }, {
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
  });
  revalidatePath('/panel');
  refrescarCartas();
}

const TIPOS_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Sube una foto (ya comprimida en el navegador) al almacén público de Vercel Blob. */
export async function subirImagenAction(formulario: FormData): Promise<{ url: string }> {
  const { restaurante } = await requerirSesionYRestaurante();
  const archivo = formulario.get('archivo');
  if (!(archivo instanceof File)) throw new Error('No se recibió ninguna imagen.');
  if (!TIPOS_IMAGEN.has(archivo.type)) throw new Error('Formato no admitido (usa JPG, PNG o WebP).');
  if (archivo.size > 950_000) throw new Error('La imagen supera el tamaño máximo.');
  const extension = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg';
  const { url } = await put(`restaurantes/${restaurante.id}/${randomUUID()}.${extension}`, archivo, {
    access: 'public',
    contentType: archivo.type,
  });
  return { url };
}

function limpio(valor: string | null | undefined, max: number): string | null {
  const v = (valor ?? '').trim();
  return v ? v.slice(0, max) : null;
}

function urlSegura(valor: string | null | undefined): string | null {
  const v = (valor ?? '').trim();
  return /^https:\/\//.test(v) ? v.slice(0, 300) : null;
}

export async function actualizarLocalAction(d: DatosLocal) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  const nombre = (d.nombre ?? '').trim().slice(0, 80);
  if (!nombre) throw new Error('El nombre del local es obligatorio.');
  await actualizarDatosLocal(jwt, restaurante.id, {
    nombre,
    logoUrl: urlSegura(d.logoUrl),
    colorMarca: /^#[0-9a-f]{6}$/i.test(d.colorMarca ?? '') ? d.colorMarca : null,
    descripcion: limpio(d.descripcion, 280),
    telefono: limpio(d.telefono, 30),
    direccion: limpio(d.direccion, 160),
    horario: limpio(d.horario, 200),
    instagram: limpio(d.instagram?.replace(/^@/, ''), 60),
    urlResenas: urlSegura(d.urlResenas),
    whatsapp: normalizarWhatsapp(d.whatsapp),
  }).catch((e: unknown) => {
    const m = e instanceof Error ? e.message : '';
    // Mensajes de 0026 (paleta / diseño asignado por DKitchen) ya redactados para el cliente
    if (/paleta|DKitchen/.test(m)) throw new Error(m);
    throw new Error('No se pudo guardar. Revisa los datos e inténtalo de nuevo.');
  });
  revalidatePath('/panel');
  refrescarCartas();
  revalidatePath(`/m/${restaurante.slug}`);
}

export async function iniciarUpgradeAmpliadoAction(): Promise<{ url: string }> {
  return iniciarCambioPlanAction('ampliado');
}

/** Subida de plan (Carta → Local → Sala, 0050). Bajar de plan se pide por Soporte. */
export async function iniciarCambioPlanAction(destino: 'ampliado' | 'sala'): Promise<{ url: string }> {
  if (destino !== 'ampliado' && destino !== 'sala') throw new Error('Plan no válido.');
  const { jwt, identidad, restaurante } = await requerirDueno();
  const actual = esPlanQr(restaurante.plan) ? restaurante.plan : 'basico';
  if (PLANES_QR.indexOf(destino) <= PLANES_QR.indexOf(actual)) throw new Error('Ya tienes ese plan o uno superior.');
  // La suscripción viva en Stripe: la nueva conserva su día de cobro y el webhook la cancela.
  const cliente = await clienteStripe(jwt, restaurante.id);
  const basica = cliente ? (await suscripcionesVivas(cliente).catch(() => [])).find((x) => ['qr-menu', 'enlace-admin', 'qr-upgrade'].includes(String(x.metadata?.producto))) : undefined;
  return crearCheckoutCambioPlan({
    planActual: actual,
    planDestino: destino,
    restauranteId: restaurante.id,
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
    nombreContacto: identidad.nombre,
    origen: 'https://dkitchencorporate.es',
    suscripcionActual: basica?.id ?? null,
  });
}

/** Id del cliente en Stripe (cus_…) del restaurante, o null si no paga por Stripe. */
async function clienteStripe(jwt: string, restauranteId: string): Promise<string | null> {
  const { comoCliente } = await import('@/lib/db');
  const c = await comoCliente(jwt, async (q) => (await q.query<{ c: string | null }>('SELECT stripe_customer_id AS c FROM restaurantes WHERE id = $1', [restauranteId])).rows[0]?.c ?? null);
  return c?.startsWith('cus_') ? c : null;
}

/** Portal de Stripe (H2): cambiar la tarjeta y descargar las facturas, sin pasar por DKitchen. */
export async function portalFacturasAction(): Promise<{ url?: string; error?: string }> {
  try {
    const { jwt, restaurante } = await requerirDueno();
    const cliente = await clienteStripe(jwt, restaurante.id);
    if (!cliente) return { error: 'Tu plan no tiene pagos con tarjeta todavía. Si necesitas una factura, escríbenos desde Soporte.' };
    return { url: await urlPortalCliente(cliente, `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es'}/panel?pestana=plan`) };
  } catch (e) {
    console.error('Portal de Stripe falló', e);
    return { error: 'No se pudo abrir la gestión de pagos. Inténtalo en unos minutos.' };
  }
}

/**
 * «Quedarme con todo» (0034). El importe, los días gratis hasta el día de
 * cobro y los módulos los calcula dk.prueba_quedarme en la base; aquí solo
 * se crea el pago en Stripe con esos datos.
 */
export async function quedarmeConTodoAction(): Promise<{ url?: string; error?: string }> {
  try {
    const { jwt, identidad, restaurante } = await requerirDueno();
    const p = await quedarmeConTodo(jwt, restaurante.id);
    const nombres: Record<string, string> = { pack_sala: 'Pack Sala', plano_mesas: 'Plano de mesas', app_sala: 'App de sala', conexion_tpv: 'Conexión TPV' };
    const { url } = await crearCheckoutEnlaceAdmin({
      enlaceId: p.enlace, restauranteId: restaurante.id, restauranteNombre: restaurante.nombre, email: identidad.email,
      concepto: ['Plan Sala', ...p.servicios.map((x) => nombres[x] ?? x)].join(' + '),
      primerCentimos: p.primer, mensualCentimos: p.mensual, diasGratis: p.dias,
      origen: process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es',
    });
    await fijarUrlPrueba(jwt, p.enlace, url);
    return { url };
  } catch (e) {
    console.error('Quedarme con todo falló', e);
    return { error: 'No hemos podido preparar el pago. Inténtalo en unos minutos o escríbenos desde Soporte.' };
  }
}

export async function llamadasPendientesAction() {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  return llamadasPendientes(jwt, restaurante.id);
}

// ---------------------------------------------------------------------------
// Montaje guiado (0049, B5): la base comprueba las tareas y abona +10 créditos una vez.
// ---------------------------------------------------------------------------
export async function tutorialEstadoAction() {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  return dbTutorialEstado(jwt, restaurante.id);
}

export async function tutorialAvanzarAction(paso: number, qr: boolean) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  return dbTutorialAvanzar(jwt, restaurante.id, Math.min(50, Math.max(0, Math.trunc(Number(paso)) || 0)), qr === true);
}

export async function tutorialCompletarAction() {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  try {
    const r = await dbTutorialCompletar(jwt, restaurante.id);
    revalidatePath('/panel');
    return r;
  } catch (e) {
    if (/tutorial_incompleto/.test(String((e as Error)?.message))) throw new Error('Aún falta alguna tarea del montaje: revisa la lista.');
    throw e;
  }
}

/** Reservas en tiempo real (B4): el panel las vuelve a pedir cada 10 s. */
export async function misReservasAction() {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  return listarMisReservas(jwt, restaurante.id);
}

export async function atenderLlamadaAction(llamadaId: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await atenderLlamada(jwt, llamadaId);
}

// ---------------------------------------------------------------------------
// Promociones (banner de la carta) y reservas — 0023. Los límites por plan
// (1 promoción activa y sin programación en Básico) los aplica la base; aquí
// se valida el formato y se traduce el error a un mensaje claro.
// ---------------------------------------------------------------------------

function mensajeBase(error: unknown): never {
  const m = error instanceof Error ? error.message : '';
  // Los RAISE de 0023 ya vienen redactados para el cliente.
  if (/plan|promoción|banner|Local|Sala/i.test(m)) throw new Error(m);
  throw new Error('No se pudo guardar. Revisa los datos e inténtalo de nuevo.');
}

/** Destino del botón del banner: solo valores conocidos y el dato que cada uno necesita. */
function destinoBoton(d: DatosPromocion): Pick<DatosPromocion, 'botonDestino' | 'botonSeccion' | 'botonPlato'> {
  const destino = (['inicio', 'seccion', 'plato', 'reservar', 'ninguno'] as const).includes(d.botonDestino) ? d.botonDestino : (d.botonSeccion ? 'seccion' : 'inicio');
  const seccion = d.botonSeccion && UUID.test(d.botonSeccion) ? d.botonSeccion : null;
  const plato = d.botonPlato && UUID.test(d.botonPlato) ? d.botonPlato : null;
  if (destino === 'seccion' && !seccion) throw new Error('Elige la sección a la que lleva el botón.');
  if (destino === 'plato' && !plato) throw new Error('Elige el plato al que lleva el botón.');
  return { botonDestino: destino, botonSeccion: destino === 'seccion' ? seccion : null, botonPlato: destino === 'plato' ? plato : null };
}

function limpiarPromocion(d: DatosPromocion): DatosPromocion {
  const titulo = (d.titulo ?? '').trim().slice(0, 60) || null;
  if (!titulo && !urlSegura(d.imagenUrl)) throw new Error('El banner necesita una imagen o un título.');
  const fecha = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const hora = (v: string | null) => (v && /^\d{2}:\d{2}$/.test(v) ? v : null);
  const dias = Array.isArray(d.dias) ? [...new Set(d.dias.filter((x) => Number.isInteger(x) && x >= 1 && x <= 7))] : null;
  return {
    titulo,
    texto: limpio(d.texto, 160),
    imagenUrl: urlSegura(d.imagenUrl),
    botonTexto: d.botonDestino === 'ninguno' ? null : limpio(d.botonTexto, 30),
    ...destinoBoton(d),
    inicio: fecha(d.inicio),
    fin: fecha(d.fin),
    dias: dias && dias.length > 0 && dias.length < 7 ? dias : null,
    horaInicio: hora(d.horaInicio),
    horaFin: hora(d.horaFin),
    prioridad: Math.min(9, Math.max(0, Math.trunc(Number(d.prioridad) || 0))),
    activa: Boolean(d.activa),
  };
}

export async function crearPromocionAction(d: DatosPromocion) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbCrearPromocion(jwt, restaurante.id, limpiarPromocion(d)).catch(mensajeBase);
  revalidatePath('/panel');
  refrescarCartas();
  revalidatePath(`/m/${restaurante.slug}`);
}

export async function editarPromocionAction(id: string, d: DatosPromocion) {
  if (!UUID.test(id)) throw new Error('Promoción no válida.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbEditarPromocion(jwt, id, limpiarPromocion(d)).catch(mensajeBase);
  revalidatePath('/panel');
  refrescarCartas();
  revalidatePath(`/m/${restaurante.slug}`);
}

export async function eliminarPromocionAction(id: string) {
  if (!UUID.test(id)) throw new Error('Promoción no válida.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbEliminarPromocion(jwt, id);
  revalidatePath('/panel');
  refrescarCartas();
  revalidatePath(`/m/${restaurante.slug}`);
}

/**
 * Confirmar o cancelar una reserva. Si el cliente dejó su correo, recibe el
 * aviso automáticamente con la marca del restaurante. Devuelve el enlace de
 * WhatsApp con el mensaje ya escrito para que el dueño lo envíe con un toque
 * (el envío automático por la API de WhatsApp es un upsell aparte).
 */
export async function cambiarEstadoReservaAction(
  id: string,
  estado: 'confirmada' | 'cancelada' | 'pendiente'
): Promise<{ correoEnviado: boolean; whatsappUrl: string | null }> {
  if (!UUID.test(id) || !['confirmada', 'cancelada', 'pendiente'].includes(estado)) throw new Error('Datos no válidos.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  const reserva = await dbCambiarEstadoReserva(jwt, id, estado);
  if (!reserva) throw new Error('No se encontró la reserva.');
  revalidatePath('/panel');
  refrescarCartas();
  if (estado === 'pendiente') return { correoEnviado: false, whatsappUrl: null };

  const marca = { nombre: restaurante.nombre, logoUrl: restaurante.logoUrl, color: restaurante.colorMarca };
  let correoEnviado = false;
  if (reserva.email) {
    try {
      await avisarEstadoAlCliente(marca, reserva, estado, { telefono: restaurante.telefono, direccion: restaurante.direccion });
      await dbMarcarAvisada(jwt, id);
      correoEnviado = true;
    } catch (error) {
      console.error('Aviso de reserva al cliente no enviado:', (error as Error).message);
    }
  }
  return { correoEnviado, whatsappUrl: whatsappParaCliente(marca, reserva, estado) };
}

// ---------------------------------------------------------------------------
// Servicios, ofertas, Sala e idiomas (0027)
// ---------------------------------------------------------------------------

const SERVICIOS_VALIDOS: Servicio[] = ['setup_esencial', 'setup_experto', 'idioma_extra', 'bono_ia'];

/** Pago de un servicio: el precio lo decide la base; aquí solo se valida la elección. */
export async function comprarServicioAction(servicio: Servicio): Promise<{ url: string }> {
  if (!SERVICIOS_VALIDOS.includes(servicio)) throw new Error('Servicio no válido.');
  const { jwt, identidad, restaurante } = await requerirDueno();
  const estado = await estadoServicios(jwt, restaurante.id);
  const item = estado.catalogo.find((c) => c.servicio === servicio);
  if (!item) throw new Error('Servicio no disponible.');
  if (servicio !== 'idioma_extra' && tiene(estado.contratados, servicio)) throw new Error('Ya tienes este servicio.');
  if (item.requiereAmpliado && restaurante.plan === 'basico') throw new Error('Este extra requiere el plan Local.');
  const origen = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
  await dbRegistrarOferta(jwt, servicio, 'aceptada').catch(() => {});
  return crearCheckoutServicio({
    servicio, nombre: item.nombre, tipo: item.tipo, precioCentimos: item.precioCentimos,
    restauranteId: restaurante.id, restauranteNombre: restaurante.nombre, email: identidad.email, origen,
  });
}

export async function registrarOfertaAction(oferta: string, tipo: 'mostrada' | 'cerrada' | 'aceptada') {
  if (!/^[a-z_]{3,30}$/.test(oferta) || !['mostrada', 'cerrada', 'aceptada'].includes(tipo)) return;
  const { jwt } = await requerirSesionYRestaurante();
  await dbRegistrarOferta(jwt, oferta, tipo);
  if (tipo === 'cerrada') revalidatePath('/panel');
}

function mensajeSala(e: unknown): never {
  const m = e instanceof Error ? e.message : '';
  if (/Módulos|App de sala|Máximo|Pack/.test(m)) throw new Error(m);
  if (/duplicate key|mesas_restaurante_id_numero_key/.test(m)) throw new Error('Ya existe una mesa con ese número.');
  throw new Error('No se pudo guardar. Revisa los datos.');
}

export async function guardarMesaAction(m: {
  id?: string; numero: string; zona: string; forma: 'cuadrada' | 'redonda' | 'rectangular'; plazas: number; x: number; y: number; camareroId: string | null;
}) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  const numero = String(m.numero ?? '').trim();
  if (!/^[A-Za-z0-9-]{1,12}$/.test(numero)) throw new Error('El número de mesa solo admite letras, números y guiones (máx. 12).');
  if (m.id && !UUID.test(m.id)) throw new Error('Mesa no válida.');
  if (m.camareroId && !UUID.test(m.camareroId)) throw new Error('Camarero no válido.');
  const acotar = (v: number) => Math.min(100, Math.max(0, Math.round(Number(v) * 100) / 100 || 0));
  await guardarMesa(jwt, restaurante.id, {
    id: m.id, numero, zona: (limpio(m.zona, 30) ?? 'Sala'), forma: ['cuadrada', 'redonda', 'rectangular'].includes(m.forma) ? m.forma : 'cuadrada',
    plazas: Math.min(30, Math.max(1, Math.trunc(Number(m.plazas)) || 4)), x: acotar(m.x), y: acotar(m.y), camareroId: m.camareroId,
  }).catch(mensajeSala);
  revalidatePath('/panel');
  refrescarCartas();
}

export async function eliminarMesaAction(id: string) {
  if (!UUID.test(id)) throw new Error('Mesa no válida.');
  const { jwt } = await requerirSesionYRestaurante();
  await eliminarMesa(jwt, id);
  revalidatePath('/panel');
  refrescarCartas();
}

export async function fijarIdiomasAction(idiomas: string[]) {
  const validos = ['en', 'fr', 'de', 'it', 'pt', 'ca'];
  const lista = [...new Set((idiomas ?? []).filter((i) => validos.includes(i)))].slice(0, 3);
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await fijarIdiomas(jwt, lista).catch((e: unknown) => {
    const m = e instanceof Error ? e.message : '';
    throw new Error(/idioma/.test(m) ? m : 'No se pudieron guardar los idiomas.');
  });
  revalidatePath('/panel');
  refrescarCartas();
  revalidatePath(`/m/${restaurante.slug}`);
}

/** Guarda el plano completo de una vez (editor de sala). */
export async function guardarPlanoAction(mesas: MesaPlano[], elementos: ElementoPlano[]) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  if (!Array.isArray(mesas) || !Array.isArray(elementos) || mesas.length > 200 || elementos.length > 200) throw new Error('Plano demasiado grande.');
  const acotar = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) * 100) / 100 || min));
  const numeros = new Set<string>();
  const mesasLimpias = mesas.map((m) => {
    const numero = String(m.numero ?? '').trim();
    if (!/^[A-Za-z0-9-]{1,12}$/.test(numero)) throw new Error(`Número de mesa no válido: «${numero}».`);
    if (numeros.has(numero)) throw new Error(`La mesa ${numero} está repetida.`);
    numeros.add(numero);
    return {
      id: m.id && UUID.test(m.id) ? m.id : undefined, numero, zona: limpio(m.zona, 30) ?? 'Sala',
      forma: (['cuadrada', 'redonda', 'rectangular'].includes(m.forma) ? m.forma : 'cuadrada') as MesaPlano['forma'],
      plazas: Math.min(30, Math.max(1, Math.trunc(Number(m.plazas)) || 4)),
      x: acotar(m.x, 0, 100), y: acotar(m.y, 0, 100), ancho: acotar(m.ancho, 2, 40), alto: acotar(m.alto, 2, 40),
      camareroId: m.camareroId && UUID.test(m.camareroId) ? m.camareroId : null,
    };
  });
  const elementosLimpios = elementos.map((e) => ({
    tipo: (['pared', 'division', 'barra', 'puerta', 'zona'].includes(e.tipo) ? e.tipo : 'pared') as ElementoPlano['tipo'],
    x: acotar(e.x, 0, 100), y: acotar(e.y, 0, 100), ancho: acotar(e.ancho, 0.5, 100), alto: acotar(e.alto, 0.5, 100),
    etiqueta: limpio(e.etiqueta, 30), color: /^#[0-9a-fA-F]{6}$/.test(e.color ?? '') ? e.color : null,
    camareroId: e.camareroId && UUID.test(e.camareroId) ? e.camareroId : null,
  }));
  await guardarPlano(jwt, restaurante.id, mesasLimpias, elementosLimpios).catch(mensajeSala);
  revalidatePath('/panel');
  refrescarCartas();
}

/** Asigna un grupo de mesas a un camarero (o las libera con camareroId null). */
export async function asignarMesasAction(camareroId: string | null, mesaIds: string[]) {
  if (camareroId && !UUID.test(camareroId)) throw new Error('Camarero no válido.');
  const ids = (mesaIds ?? []).filter((i) => UUID.test(i)).slice(0, 200);
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  const plano = await cargarPlano(jwt, restaurante.id);
  const mesas = plano.mesas.map((m) => (ids.includes(m.id) ? { ...m, camareroId } : m.camareroId === camareroId && camareroId ? { ...m, camareroId: null } : m));
  await guardarPlano(jwt, restaurante.id, mesas, plano.elementos).catch(mensajeSala);
  revalidatePath('/panel');
  refrescarCartas();
}

/** Estilo de la carta elegido por el cliente (0031). Lista blanca aquí y en la base. */
export async function guardarEstiloAction(e: { plantilla: string; fondo: string; letra: string; color: string }) {
  if (!['clasica', 'editorial', 'visual', 'express'].includes(e?.plantilla) || !['papel', 'blanco', 'oscuro'].includes(e?.fondo)
      || !['sans', 'serif'].includes(e?.letra) || !/^#[0-9a-f]{6}$/i.test(e?.color ?? '')) throw new Error('Estilo no válido.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await guardarEstilo(jwt, restaurante.id, { ...e, color: e.color.toUpperCase() }).catch((err: unknown) => {
    const m = err instanceof Error ? err.message : '';
    throw new Error(/paleta|DKitchen/.test(m) ? m : 'No se pudo guardar el estilo.');
  });
  revalidatePath('/panel');
  refrescarCartas();
  revalidatePath(`/m/${restaurante.slug}`);
}

/**
 * Baja del servicio desde el panel (29/09/2026, condiciones §4): queda como
 * ticket en Central (Soporte), aviso interno para cancelar la suscripción en
 * Stripe al final del periodo, y confirmación al cliente. El servicio sigue
 * activo hasta el final del periodo pagado.
 */
export async function solicitarBajaAction(motivo: string) {
  const { jwt, identidad, restaurante } = await requerirDueno();
  const texto = String(motivo ?? '').trim().slice(0, 1000) || 'Sin motivo indicado.';
  await dbCrearTicket(jwt, restaurante.id, { asunto: 'Solicitud de baja', mensaje: `El cliente pide la baja del servicio. Motivo: ${texto}` }, {
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
  });
  const { enviarCorreoInterno, enviarCorreoCliente, escaparHtml } = await import('@/lib/email');
  // H2: la baja cancela al momento, al final del periodo pagado, todas las
  // suscripciones del cliente en Stripe. Si falla, aviso para hacerlo a mano.
  let cancelada: { ok: true; finPeriodo: number | null } | { ok: false; error: string } = { ok: false, error: 'Sin cliente de Stripe asociado' };
  try {
    const cliente = await clienteStripe(jwt, restaurante.id);
    if (cliente) cancelada = await cancelarTodoAlFinalDelPeriodo(cliente);
  } catch (e) {
    cancelada = { ok: false, error: `No se pudo leer el cliente de Stripe: ${e instanceof Error ? e.message : String(e)}` };
  }
  const fin = cancelada.ok && cancelada.finPeriodo ? new Date(cancelada.finPeriodo * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }) : null;
  // 0061: deja la fecha de fin en la base; ese día el webhook (o el cron) suspende el local.
  // Si Stripe no dio fecha, la baja queda para gestionarla a mano desde Central (aviso interno).
  if (cancelada.ok && cancelada.finPeriodo) {
    const { comoCliente } = await import('@/lib/db');
    const dia = new Date(cancelada.finPeriodo * 1000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    await comoCliente(jwt, (c) => c.query('SELECT dk.panel_programar_baja($1, $2::date, $3)', [restaurante.id, dia, texto]))
      .catch((e) => console.error('Baja: no se pudo guardar la fecha de fin', e));
  }
  await enviarCorreoInterno(`BAJA: ${restaurante.nombre}${cancelada.ok ? ' (Stripe cancelado)' : ' (CANCELAR EN STRIPE A MANO)'}`,
    `<p><strong>${escaparHtml(restaurante.nombre)}</strong> (${escaparHtml(identidad.email)}) ha pedido la baja desde su panel.</p>
     ${cancelada.ok
       ? `<p>La renovación ya está cancelada en Stripe${fin ? `; el acceso termina el ${escaparHtml(fin)}` : ''}. No hace falta hacer nada más.</p>`
       : `<p><strong>Cancela sus suscripciones en Stripe antes del próximo cobro.</strong> La cancelación automática falló: ${escaparHtml(cancelada.error)}</p>`}
     <p>Motivo: ${escaparHtml(texto)}</p>`).catch((e) => console.error('Baja: aviso interno no enviado', e));
  await enviarCorreoCliente(identidad.email, `Hemos recibido tu baja · ${restaurante.nombre}`,
    `<p>Hola,</p>
     <p>Hemos recibido tu solicitud de baja de la carta digital de <strong>${escaparHtml(restaurante.nombre)}</strong>. ${cancelada.ok ? 'Ya hemos cancelado la renovación: no se te volverá a cobrar.' : 'Cancelamos la renovación antes de tu próximo cobro y te lo confirmamos por correo.'}</p>
     <p>Tu carta sigue activa hasta el final del periodo que ya pagaste. Después, tu QR mostrará una página informativa (nunca un error) y guardaremos tu carta 60 días por si quieres volver o pedirnos una copia.</p>
     <p>Si ha sido un error o quieres contarnos algo, responde a este correo.</p>`,
    { titulo: 'Baja recibida' }).catch((e) => console.error('Baja: confirmación no enviada', e));
  revalidatePath('/panel');
  refrescarCartas();
}

// ---------------------------------------------------------------------------
// Estudio de carta (0037): etiquetas, promociones, combos y legales
// ---------------------------------------------------------------------------

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const importe = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 9999 ? Math.round(n * 100) / 100 : null;
};
const textoEstudio = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
function errorEstudio(e: unknown): never {
  throw new Error(traducirErrorEstudio(e));
}
function traducirErrorEstudio(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (/promo_check/.test(m)) return ('El precio de promoción debe ser menor que el precio normal y la fecha de inicio anterior a la de fin.');
  if (/combo|12 platos|otro restaurante/.test(m)) return (m.replace(/^.*?: /, '').replace(/^\w/, (x) => x.toUpperCase()) + '.');
  if (/legal_nif/.test(m)) return ('El NIF/CIF no es válido (solo letras, números y guiones).');
  if (/legal_email/.test(m)) return ('El correo legal no es válido.');
  // Mensajes propios ya escritos en español: se respetan. Los técnicos (base de datos, red) no se enseñan.
  if (m && !/violates|constraint|syntax|relation|permission|column|null value|duplicate|ECONN|timeout|fetch|Server Components|sesión no es válida/i.test(m)) return m;
  return 'No se pudo guardar. Revisa los datos e inténtalo de nuevo.';
}

async function guardarExtrasPlatoAction_(platoId: string, d: { etiqueta: string | null; precioPromo: string | number | null; promoDesde: string | null; promoHasta: string | null }) {
  if (!UUID.test(platoId)) throw new Error('Plato no válido.');
  const { jwt } = await requerirSesionYRestaurante();
  const etiqueta = d.etiqueta && (ETIQUETAS as string[]).includes(d.etiqueta) ? (d.etiqueta as Etiqueta) : null;
  const precioPromo = d.precioPromo === null || d.precioPromo === '' ? null : importe(d.precioPromo);
  if (d.precioPromo !== null && d.precioPromo !== '' && precioPromo === null) throw new Error('Precio de promoción no válido.');
  const fecha = (f: string | null) => (f && FECHA.test(f) ? f : null);
  try {
    await dbGuardarExtras(jwt, platoId, { etiqueta, precioPromo, promoDesde: precioPromo === null ? null : fecha(d.promoDesde), promoHasta: precioPromo === null ? null : fecha(d.promoHasta) });
  } catch (e) { errorEstudio(e); }
  revalidatePath('/panel');
  refrescarCartas();
}

async function guardarComboAction_(comboId: string | null, d: DatosCombo) {
  if (comboId !== null && !UUID.test(comboId)) throw new Error('Combo no válido.');
  const nombre = textoEstudio(d?.nombre, 80);
  const precio = importe(d?.precio);
  if (!nombre) throw new Error('Ponle un nombre al combo.');
  if (precio === null || precio <= 0) throw new Error('Pon el precio del combo.');
  const vistos = new Set<string>();
  const componentes = (Array.isArray(d.componentes) ? d.componentes : [])
    .filter((x) => x && UUID.test(String(x.itemId)) && !vistos.has(x.itemId) && vistos.add(x.itemId))
    .map((x) => ({ itemId: x.itemId, cantidad: Math.min(20, Math.max(1, Math.round(Number(x.cantidad) || 1))) }));
  if (componentes.length < 2) throw new Error('Un combo necesita al menos 2 platos.');
  if (componentes.length > 12) throw new Error('Un combo admite como máximo 12 platos.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  try {
    await dbGuardarCombo(jwt, restaurante.id, comboId, {
      nombre, precio, componentes,
      descripcion: textoEstudio(d.descripcion, 300),
      seccionId: d.seccionId && UUID.test(d.seccionId) ? d.seccionId : null,
      fotoUrl: typeof d.fotoUrl === 'string' && /^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\//.test(d.fotoUrl) ? d.fotoUrl : null,
    });
  } catch (e) { errorEstudio(e); }
  revalidatePath('/panel');
  refrescarCartas();
}

async function guardarLegalAction_(d: DatosLegal) {
  const nif = textoEstudio(d?.nif, 12)?.toUpperCase().replace(/\s/g, '') ?? null;
  const datos: DatosLegal = {
    titular: textoEstudio(d?.titular, 160), nif, email: textoEstudio(d?.email, 160)?.toLowerCase() ?? null,
    domicilio: textoEstudio(d?.domicilio, 240), activo: !!d?.activo,
  };
  if (datos.activo && (!datos.titular || !datos.email)) throw new Error('Para publicar tus páginas legales hacen falta el titular y un correo de contacto.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  try { await dbGuardarLegal(jwt, restaurante.id, datos); } catch (e) { errorEstudio(e); }
  revalidatePath('/panel');
  refrescarCartas();
}

async function moverSeccionAction_(seccionId: string, direccion: -1 | 1) {
  if (!UUID.test(seccionId) || (direccion !== -1 && direccion !== 1)) throw new Error('Datos no válidos.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbMoverSeccion(jwt, restaurante.id, seccionId, direccion);
  revalidatePath('/panel');
  refrescarCartas();
}

// ---------------------------------------------------------------------------
// Imágenes con IA (0038)
// ---------------------------------------------------------------------------

const FOTO_PROPIA = /^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\/restaurantes\/[0-9a-f-]{36}\//;

export async function saldoIaAction() {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  return dbSaldoIa(jwt, restaurante.id);
}

async function generarImagenIaAction_(d: { modo: 'plato' | 'banner' | 'portada' | 'logo'; texto: string; imagenBase?: string | null; plato?: { nombre?: string; descripcion?: string | null } }) {
  const modo = (['banner', 'portada', 'logo'] as const).find((m) => m === d?.modo) ?? 'plato';
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  // La foto base solo puede ser del propio almacén del restaurante.
  const base = typeof d.imagenBase === 'string' && FOTO_PROPIA.test(d.imagenBase) && d.imagenBase.includes(`/restaurantes/${restaurante.id}/`) ? d.imagenBase : null;
  const estilo = `${restaurante.nombre}; estilo de carta ${restaurante.plantilla || 'clásico'}, color de marca ${restaurante.colorMarca || 'neutro'}`;
  let contexto = estilo;
  if (modo === 'logo' || modo === 'portada') {
    // Logo y portada: identidad del local, sin platos que empujen a la IA a pintar comida.
    contexto = `Nombre del restaurante: «${restaurante.nombre}»; color de marca ${restaurante.colorMarca || 'libre'}`;
  } else if (modo === 'plato') {
    const nombre = limpiarTextoIa(d.plato?.nombre, 80);
    const desc = limpiarTextoIa(d.plato?.descripcion, 200);
    contexto += nombre ? `. Plato: ${nombre}${desc ? ` (${desc})` : ''}` : '';
  } else if (!limpiarTextoIa(d.texto)) {
    // Banner sin indicaciones: se inspira en la carta. Con indicaciones, manda lo que pide el cliente.
    const carta = await listarMiCarta(jwt, restaurante.id).catch(() => ({ platos: [] as { nombre: string; disponible: boolean }[] }));
    const destacados = carta.platos.filter((p) => p.disponible).slice(0, 6).map((p) => limpiarTextoIa(p.nombre, 60)).filter(Boolean);
    if (destacados.length) contexto += `. Platos de su carta: ${destacados.join(', ')}`;
  }
  const r = await dbGenerarImagen(jwt, { id: restaurante.id, nombre: restaurante.nombre }, { modo, texto: limpiarTextoIa(d.texto), contexto, nombre: restaurante.nombre, imagenBase: base });
  return r;
}

// ---------------------------------------------------------------------------
// Envoltorios (01/10/2026): Next.js oculta en producción el mensaje de los errores
// lanzados desde el servidor; estas acciones devuelven { ok, error } en español.
// ---------------------------------------------------------------------------
type Resultado<T> = ({ ok: true } & T) | { ok: false; error: string };
async function envolver<T extends object | void>(fn: () => Promise<T>): Promise<Resultado<T extends object ? T : object>> {
  try {
    const r = await fn();
    return { ok: true, ...((r ?? {}) as object) } as Resultado<T extends object ? T : object>;
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    return { ok: false, error: traducirErrorEstudio(e) };
  }
}
export async function guardarExtrasPlatoAction(...a: Parameters<typeof guardarExtrasPlatoAction_>) { return envolver(() => guardarExtrasPlatoAction_(...a)); }
export async function guardarComboAction(...a: Parameters<typeof guardarComboAction_>) { return envolver(() => guardarComboAction_(...a)); }
export async function guardarLegalAction(...a: Parameters<typeof guardarLegalAction_>) { return envolver(() => guardarLegalAction_(...a)); }
export async function moverSeccionAction(...a: Parameters<typeof moverSeccionAction_>) { return envolver(() => moverSeccionAction_(...a)); }
export async function generarImagenIaAction(...a: Parameters<typeof generarImagenIaAction_>) { return envolver(() => generarImagenIaAction_(...a)); }
export async function crearTicketAyudaAction(...a: Parameters<typeof crearTicketAyudaAction_>) { return envolver(() => crearTicketAyudaAction_(...a)); }

/**
 * Soporte nivel 1 con IA (punto 6, 0054). La base reserva el mensaje (permiso,
 * 30 al día por local y tope mensual global de IA); después se anota el coste
 * real. Si la IA falla, el mensaje no cuenta como gasto.
 */
async function preguntarAyudaIaAction_(historial: MensajeAyuda[], seccion: string | null) {
  const lista = (Array.isArray(historial) ? historial : [])
    .filter((m) => m && (m.rol === 'yo' || m.rol === 'ia') && typeof m.texto === 'string')
    .map((m) => ({ rol: m.rol, texto: m.texto.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 600) }))
    .filter((m) => m.texto)
    .slice(-8);
  if (lista.at(-1)?.rol !== 'yo') throw new Error('Escribe tu duda.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  const { comoCliente } = await import('@/lib/db');
  let reserva: { uso: string; quedan: number };
  try {
    reserva = await comoCliente(jwt, async (c) => (await c.query<{ uso: string; quedan: number }>('SELECT * FROM dk.ayuda_ia_reservar($1)', [restaurante.id])).rows[0]);
  } catch (e) {
    const m = String((e as Error)?.message ?? '');
    if (m.includes('ayuda_tope_diario')) return { tope: 'diario' as const };
    if (m.includes('ia_tope_global')) return { tope: 'global' as const };
    throw e;
  }
  const seccionValida = typeof seccion === 'string' && /^[a-z]{2,20}$/.test(seccion) ? seccion : null;
  try {
    const r = await responderAyuda(jwt, restaurante, lista, seccionValida);
    await comoCliente(jwt, (c) => c.query('SELECT dk.ayuda_ia_coste($1, $2)', [reserva.uso, r.coste])).catch(() => {});
    return { respuesta: r.respuesta, ir: r.ir, ticket: r.ticket, quedan: reserva.quedan };
  } catch (e) {
    const coste = Number((e as { coste?: number })?.coste ?? 0);
    await comoCliente(jwt, (c) => c.query('SELECT dk.ayuda_ia_coste($1, $2)', [reserva.uso, coste])).catch(() => {});
    console.error('Ayuda IA:', e);
    throw new Error('La ayuda con IA no ha respondido. Prueba con los temas de abajo o habla con una persona.');
  }
}
export async function preguntarAyudaIaAction(...a: Parameters<typeof preguntarAyudaIaAction_>) { return envolver(() => preguntarAyudaIaAction_(...a)); }

// Corrector y mejora de textos (01/10/2026): 80 usos al día por restaurante.
async function mejorarTextoAction_(tipo: TipoTexto, texto: string, contexto?: string) {
  if (!['corregir', 'titulo', 'descripcion', 'instruccion'].includes(tipo)) throw new Error('Tipo no válido.');
  const { restaurante } = await requerirSesionYRestaurante();
  if (await limiteSuperado(claveDeLimite('texto-ia', restaurante.id), 80, 24 * 60 * 60)) throw new Error('Has usado mucho el asistente de textos hoy. Mañana podrás seguir.');
  const ctx = [restaurante.nombre, typeof contexto === 'string' ? contexto.replace(/[\u0000-\u001f]/g, ' ').slice(0, 150) : ''].filter(Boolean).join(' · ');
  return { texto: await dbMejorarTexto(tipo, String(texto ?? ''), ctx) };
}
export async function mejorarTextoAction(...a: Parameters<typeof mejorarTextoAction_>) { return envolver(() => mejorarTextoAction_(...a)); }

async function guardarPortadaAction_(url: string | null, conNombre = false) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  const valida = url === null || (typeof url === 'string' && FOTO_PROPIA.test(url) && url.includes(`/restaurantes/${restaurante.id}/`));
  if (!valida) throw new Error('La imagen no es válida. Súbela de nuevo.');
  await dbGuardarPortada(jwt, restaurante.id, url, !!conNombre);
  revalidatePath('/panel');
  refrescarCartas();
  revalidatePath(`/m/${restaurante.slug}`);
}
export async function guardarPortadaAction(...a: Parameters<typeof guardarPortadaAction_>) { return envolver(() => guardarPortadaAction_(...a)); }

async function guardarDescripcionSeccionAction_(seccionId: string, descripcion: string) {
  if (!UUID.test(seccionId)) throw new Error('Categoría no válida.');
  const { jwt } = await requerirSesionYRestaurante();
  await dbGuardarDescripcionSeccion(jwt, seccionId, textoEstudio(descripcion, 200));
  revalidatePath('/panel');
  refrescarCartas();
}
export async function guardarDescripcionSeccionAction(...a: Parameters<typeof guardarDescripcionSeccionAction_>) { return envolver(() => guardarDescripcionSeccionAction_(...a)); }

/** Alta rápida de un plato desde su categoría (Estudio). */
async function crearPlatoRapidoAction_(d: { seccionId: string; nombre: string; precio: string | number; descripcion?: string }) {
  if (!UUID.test(d?.seccionId)) throw new Error('Categoría no válida.');
  const nombre = textoEstudio(d.nombre, 80);
  const precio = importe(d.precio);
  if (!nombre) throw new Error('Escribe el nombre del plato.');
  if (precio === null || precio <= 0) throw new Error('Escribe el precio (por ejemplo 9,50).');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbCrearPlato(jwt, restaurante.id, { seccionId: d.seccionId, nombre, precio, descripcion: textoEstudio(d.descripcion, 300), fotoUrl: null, alergenos: [] });
  revalidatePath('/panel');
  refrescarCartas();
}
export async function crearPlatoRapidoAction(...a: Parameters<typeof crearPlatoRapidoAction_>) { return envolver(() => crearPlatoRapidoAction_(...a)); }

async function escaneosRangoAction_(desde: string, hasta: string, agrupar: 'day' | 'week' | 'month') {
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!fecha.test(desde) || !fecha.test(hasta) || desde > hasta) throw new Error('Elige un rango de fechas válido.');
  if (!['day', 'week', 'month'].includes(agrupar)) throw new Error('Agrupación no válida.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  return { filas: await dbEscaneosRango(jwt, restaurante.id, desde, hasta, agrupar) };
}
export async function escaneosRangoAction(...a: Parameters<typeof escaneosRangoAction_>) { return envolver(() => escaneosRangoAction_(...a)); }

// ------------------------------------------------------------------ comandero (0045)
// Devuelven { ok, error } en vez de lanzar: en producción Next oculta el mensaje
// de los errores lanzados y el encargado debe ver el motivo real (en español).
type Res<T> = { ok: true; datos: T } | { ok: false; error: string };

async function comandero<T>(fn: (jwt: string) => Promise<T>): Promise<Res<T>> {
  try {
    const { jwt } = await requerirSesionYRestaurante();
    return { ok: true, datos: await fn(jwt) };
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    const propio = /Comandero Pro|App de sala|motivo|Rango de fechas|histórico|historial|no válid|Cantidad/i.test(m);
    if (!propio) console.error('Comandero:', m);
    return { ok: false, error: propio ? m : 'No se pudo completar. Inténtalo de nuevo.' };
  }
}

function filtroValido(f: Filtro): Filtro {
  if (!FECHA.test(f?.desde ?? '') || !FECHA.test(f?.hasta ?? '')) throw new Error('Rango de fechas no válido.');
  const mesa = f.mesa && /^[A-Za-z0-9-]{1,12}$/.test(f.mesa) ? f.mesa : null;
  const camareroId = f.camareroId && UUID.test(f.camareroId) ? f.camareroId : null;
  return { desde: f.desde, hasta: f.hasta, mesa, camareroId };
}

export async function mesasEnVivoAction() { return comandero((jwt) => dbMesasEnVivo(jwt)); }

export async function cuentaDetalleAction(id: string) {
  return comandero((jwt) => { if (!UUID.test(id)) throw new Error('x'); return dbCuentaDetalle(jwt, id); });
}

export async function rondaRevisadaAction(id: string) {
  return comandero((jwt) => { if (!UUID.test(id)) throw new Error('x'); return dbRondaRevisada(jwt, id); });
}

export async function cerrarCuentaAction(id: string) {
  return comandero((jwt) => { if (!UUID.test(id)) throw new Error('x'); return dbCerrarCuenta(jwt, id); });
}

export async function anularLineaAction(id: string, motivo: string) {
  return comandero((jwt) => { if (!UUID.test(id)) throw new Error('x'); return dbAnularLinea(jwt, id, String(motivo ?? '').slice(0, 200)); });
}

export async function anularCuentaAction(id: string, motivo: string) {
  return comandero((jwt) => { if (!UUID.test(id)) throw new Error('x'); return dbAnularCuenta(jwt, id, String(motivo ?? '').slice(0, 200)); });
}

export async function resumenSalaAction(f: Filtro) { return comandero((jwt) => dbResumenSala(jwt, filtroValido(f))); }

export async function informeCuentasAction(f: Filtro) { return comandero((jwt) => dbInformeCuentas(jwt, filtroValido(f))); }

export async function informeAnulacionesAction(f: Filtro) {
  return comandero((jwt) => { const v = filtroValido(f); return dbInformeAnulaciones(jwt, v.desde, v.hasta); });
}

// ------------------------------------------------------------------ pedidos del encargado (0046, B2)
const MESA = /^[A-Za-z0-9-]{1,12}$/;

export async function cartaPedidosAction() { return comandero((jwt) => dbPanelCarta(jwt)); }

export async function abrirMesaAction(mesa: string, comensales: number | null) {
  return comandero((jwt) => {
    if (!MESA.test(String(mesa ?? ''))) throw new Error('Número de mesa no válido.');
    const n = Math.trunc(Number(comensales));
    return dbPanelAbrirCuenta(jwt, mesa, n >= 1 && n <= 99 ? n : null);
  });
}

/** Añade una ronda desde el panel y, si hay TPV conectado, la envía al momento. */
export async function anadirRondaAction(mesa: string, lineas: { plato_id: string; cantidad: number; nota?: string }[]) {
  return comandero(async (jwt) => {
    const limpias = (Array.isArray(lineas) ? lineas : [])
      .filter((l) => UUID.test(String(l?.plato_id ?? '')))
      .slice(0, 60)
      .map((l) => ({ plato_id: String(l.plato_id), cantidad: Math.min(50, Math.max(1, Math.trunc(Number(l.cantidad)) || 1)), nota: String(l.nota ?? '').slice(0, 120) }));
    if (!MESA.test(String(mesa ?? '')) || limpias.length === 0) throw new Error('Pedido no válido.');
    const id = await dbPanelRegistrar(jwt, mesa, limpias);
    if (!id) throw new Error('Pedido no válido.');
    const tpv = await reenviarRegistroAlTpv(jwt, id);
    return { id, tpv };
  });
}

export async function cambiarCantidadAction(lineaId: string, cantidad: number, motivo: string) {
  return comandero((jwt) => {
    if (!UUID.test(lineaId)) throw new Error('x');
    const n = Math.trunc(Number(cantidad));
    if (!(n >= 0 && n <= 50)) throw new Error('Cantidad no válida (de 0 a 50).');
    return dbPanelCambiarCantidad(jwt, lineaId, n, String(motivo ?? '').trim().slice(0, 200) || null);
  });
}

export async function moverMesaAction(cuentaId: string, mesa: string) {
  return comandero((jwt) => {
    if (!UUID.test(cuentaId) || !MESA.test(String(mesa ?? ''))) throw new Error('Número de mesa no válido.');
    return dbPanelMoverCuenta(jwt, cuentaId, mesa);
  });
}

export async function reenviarTpvAction(registroId: string) {
  return comandero((jwt) => { if (!UUID.test(registroId)) throw new Error('x'); return reenviarRegistroAlTpv(jwt, registroId); });
}

// ------------------------------------------------------------------ equipo de sala (0047, B3)
const ROLES: RolSala[] = ['camarero', 'encargado'];
const enlaceSala = (token: string) => `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es'}/sala/${token}`;

async function equipo<T>(fn: (jwt: string) => Promise<T>): Promise<Res<T>> {
  try {
    const { jwt } = await requerirSesionYRestaurante();
    return { ok: true, datos: await fn(jwt) };
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    // P0001 = mensaje pensado para el dueño (tope, nombre, rol, App de sala)
    const propio = (e as { code?: string })?.code === 'P0001' || /no válid|Pon el nombre/i.test(m);
    if (!propio) console.error('Equipo:', m);
    return { ok: false, error: propio ? m : 'No se pudo completar. Inténtalo de nuevo.' };
  }
}

export async function equipoAction() { return equipo((jwt) => equipoDueno(jwt)); }

/** Alta: devuelve el enlace personal UNA vez (en la base solo queda su huella). */
export async function crearMiembroAction(nombre: string, rol: RolSala) {
  return equipo(async (jwt) => {
    const n = String(nombre ?? '').trim().slice(0, 40);
    if (!n) throw new Error('Pon el nombre del camarero.');
    if (!ROLES.includes(rol)) throw new Error('Rol no válido.');
    const token = await crearMiembro(jwt, n, rol);
    revalidatePath('/panel');
    return { enlace: enlaceSala(token) };
  });
}

export async function editarMiembroAction(id: string, cambios: { nombre?: string; rol?: RolSala; activo?: boolean }) {
  return equipo(async (jwt) => {
    if (!UUID.test(id)) throw new Error('Camarero no válido.');
    const limpio = {
      nombre: typeof cambios?.nombre === 'string' ? cambios.nombre.trim().slice(0, 40) : undefined,
      rol: cambios?.rol && ROLES.includes(cambios.rol) ? cambios.rol : undefined,
      activo: typeof cambios?.activo === 'boolean' ? cambios.activo : undefined,
    };
    if (limpio.nombre === '') throw new Error('Pon el nombre del camarero.');
    const ok = await editarMiembro(jwt, id, limpio);
    revalidatePath('/panel');
    return ok;
  });
}

/** Enlace nuevo: el anterior deja de funcionar al momento (móvil perdido, cambio de persona). */
export async function regenerarEnlaceAction(id: string) {
  return equipo(async (jwt) => {
    if (!UUID.test(id)) throw new Error('Camarero no válido.');
    const token = await regenerarEnlace(jwt, id);
    if (!token) throw new Error('Ese acceso no está activo.');
    return { enlace: enlaceSala(token) };
  });
}

export async function asignarZonaAction(zona: string, camareroId: string | null) {
  return equipo(async (jwt) => {
    const z = String(zona ?? '').trim();
    if (!z || z.length > 30) throw new Error('Zona no válida.');
    if (camareroId && !UUID.test(camareroId)) throw new Error('Camarero no válido.');
    const n = await asignarZona(jwt, z, camareroId);
    revalidatePath('/panel');
    refrescarCartas();
    return n;
  });
}

/** El dueño retira o devuelve a su asesor el permiso de editar la carta (0052, auditado en la base). */
export async function socioPermisoAction(permitir: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { jwt } = await requerirDueno();
    const { comoCliente } = await import('@/lib/db');
    await comoCliente(jwt, (c) => c.query('SELECT dk.socio_permiso_mio($1)', [permitir === true]));
    revalidatePath('/panel');
    return { ok: true };
  } catch (e) {
    console.error('Permiso del socio:', e);
    return { ok: false, error: 'No se pudo guardar el permiso. Inténtalo en unos segundos.' };
  }
}

/**
 * «Quiero una llamada» de la tarjeta de Signature (0057): lead en Central →
 * Oportunidades, alerta en el panel de mando y aviso por correo a karc0.
 * Solo el dueño (el socio en puesta a punto no pide Signature por él).
 */
export async function pedirLlamadaSignatureAction(telefono?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { jwt, identidad, restaurante } = await requerirDueno();
    const { comoCliente } = await import('@/lib/db');
    const { enviarCorreoInterno, filasCorreo, escaparHtml } = await import('@/lib/email');
    const d = await comoCliente(jwt, async (c) => (await c.query<{ d: Record<string, unknown> }>('SELECT dk.signature_pedir_llamada() AS d')).rows[0].d);
    const tel = String(telefono ?? '').replace(/[^\d+ ]/g, '').slice(0, 20) || restaurante.telefono || null;
    await enviarCorreoInterno(`LEAD SIGNATURE: ${restaurante.nombre} pide una llamada`,
      `<p><strong>${escaparHtml(restaurante.nombre)}</strong> ha pulsado «Quiero una llamada» en la tarjeta de Signature de su panel.</p>${filasCorreo([
        ['Correo', identidad.email], ['Teléfono', tel], ['Plan', String(d.plan ?? '')], ['Fundador', d.fundador ? 'Sí' : 'No'],
        ['Escaneos 30 días', String(d.escaneos ?? 0)], ['Reservas 30 días', String(d.reservas ?? 0)], ['Llamadas al camarero 30 días', String(d.llamadas ?? 0)]])}`,
      { boton: { texto: 'Abrir Oportunidades', url: 'https://dkitchencorporate.es/admin-dkitchen/oportunidades' } }).catch((e) => console.error('Lead Signature: correo no enviado', e));
    revalidatePath('/panel');
    return { ok: true };
  } catch (e) {
    console.error('Lead Signature:', e);
    return { ok: false, error: e instanceof Error && /dueño/.test(e.message) ? e.message : 'No se pudo enviar. Inténtalo en unos segundos.' };
  }
}
