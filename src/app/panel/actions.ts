'use server';

import { revalidatePath } from 'next/cache';
import { obtenerJwtDeSesion, identidadActual } from '@/lib/sesion';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { obtenerMiRestaurante, actualizarDatosLocal, type DatosLocal } from '@/lib/mi-restaurante';
import { atenderLlamada, llamadasPendientes } from '@/lib/llamadas-camarero';
import {
  crearSeccion as dbCrearSeccion,
  editarSeccion as dbEditarSeccion,
  eliminarSeccion as dbEliminarSeccion,
  crearPlato as dbCrearPlato,
  editarPlato as dbEditarPlato,
  eliminarPlato as dbEliminarPlato,
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
import { cambiarEstadoReserva as dbCambiarEstadoReserva, marcarAvisada as dbMarcarAvisada } from '@/lib/reservas';
import { avisarEstadoAlCliente, whatsappParaCliente } from '@/lib/correos-reserva';
import { crearCheckoutServicio, crearCheckoutUpgradeAmpliado } from '@/lib/payments/whop';
import { estadoServicios, tiene, registrarOferta as dbRegistrarOferta, type Servicio } from '@/lib/servicios';
import { guardarMesa, eliminarMesa, crearCamarero, desactivarCamarero } from '@/lib/sala';
import { fijarIdiomas, guardarTraducciones, type Traduccion } from '@/lib/idiomas';

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

export async function crearSeccionAction(nombre: string) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbCrearSeccion(jwt, restaurante.id, nombre);
  revalidatePath('/panel');
}

export async function editarSeccionAction(seccionId: string, nombre: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEditarSeccion(jwt, seccionId, nombre);
  revalidatePath('/panel');
}

export async function eliminarSeccionAction(seccionId: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEliminarSeccion(jwt, seccionId);
  revalidatePath('/panel');
}

export async function crearPlatoAction(datos: DatosPlato) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbCrearPlato(jwt, restaurante.id, datos);
  revalidatePath('/panel');
}

export async function editarPlatoAction(platoId: string, datos: Partial<DatosPlato> & { disponible?: boolean }) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEditarPlato(jwt, platoId, datos);
  revalidatePath('/panel');
}

export async function eliminarPlatoAction(platoId: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEliminarPlato(jwt, platoId);
  revalidatePath('/panel');
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
}

export async function crearTicketAction(datos: { asunto: string; mensaje: string }) {
  const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
  await dbCrearTicket(jwt, restaurante.id, datos, {
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
  });
  revalidatePath('/panel');
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
  revalidatePath(`/m/${restaurante.slug}`);
}

export async function iniciarUpgradeAmpliadoAction(): Promise<{ url: string }> {
  const { identidad, restaurante } = await requerirSesionYRestaurante();
  if (restaurante.plan === 'ampliado') throw new Error('Ya tienes el plan Ampliado.');
  return crearCheckoutUpgradeAmpliado({
    restauranteId: restaurante.id,
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
    nombreContacto: identidad.nombre,
    origen: 'https://dkitchencorporate.es',
  });
}

export async function llamadasPendientesAction() {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  if (restaurante.plan !== 'ampliado') return [];
  return llamadasPendientes(jwt, restaurante.id);
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
  if (/plan|promoción|banner|Ampliado/i.test(m)) throw new Error(m);
  throw new Error('No se pudo guardar. Revisa los datos e inténtalo de nuevo.');
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
    botonTexto: limpio(d.botonTexto, 30),
    botonSeccion: d.botonSeccion && UUID.test(d.botonSeccion) ? d.botonSeccion : null,
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
  revalidatePath(`/m/${restaurante.slug}`);
}

export async function editarPromocionAction(id: string, d: DatosPromocion) {
  if (!UUID.test(id)) throw new Error('Promoción no válida.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbEditarPromocion(jwt, id, limpiarPromocion(d)).catch(mensajeBase);
  revalidatePath('/panel');
  revalidatePath(`/m/${restaurante.slug}`);
}

export async function eliminarPromocionAction(id: string) {
  if (!UUID.test(id)) throw new Error('Promoción no válida.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbEliminarPromocion(jwt, id);
  revalidatePath('/panel');
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

const SERVICIOS_VALIDOS: Servicio[] = ['setup_esencial', 'setup_experto', 'idiomas', 'plano_mesas', 'app_sala', 'conexion_tpv', 'pack_sala'];

/** Pago de un servicio: el precio lo decide la base; aquí solo se valida la elección. */
export async function comprarServicioAction(servicio: Servicio): Promise<{ url: string }> {
  if (!SERVICIOS_VALIDOS.includes(servicio)) throw new Error('Servicio no válido.');
  const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
  const estado = await estadoServicios(jwt, restaurante.id);
  const item = estado.catalogo.find((c) => c.servicio === servicio);
  if (!item) throw new Error('Servicio no disponible.');
  if (tiene(estado.contratados, servicio)) throw new Error('Ya tienes este servicio.');
  if (item.requiereAmpliado && restaurante.plan !== 'ampliado') throw new Error('Los Módulos de Sala requieren el plan Ampliado.');
  const origen = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
  await dbRegistrarOferta(jwt, servicio, 'aceptada').catch(() => {});
  return crearCheckoutServicio({
    servicio, nombre: item.nombre, tipo: item.tipo, precioCentimos: item.precioCentimos,
    restauranteId: restaurante.id, restauranteNombre: restaurante.nombre, email: identidad.email, origen,
  });
}

export async function registrarOfertaAction(oferta: string, tipo: 'mostrada' | 'cerrada') {
  if (!/^[a-z_]{3,30}$/.test(oferta) || !['mostrada', 'cerrada'].includes(tipo)) return;
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
}

export async function eliminarMesaAction(id: string) {
  if (!UUID.test(id)) throw new Error('Mesa no válida.');
  const { jwt } = await requerirSesionYRestaurante();
  await eliminarMesa(jwt, id);
  revalidatePath('/panel');
}

/** Devuelve el enlace de acceso del camarero UNA vez (solo se guarda su huella). */
export async function crearCamareroAction(nombre: string): Promise<{ enlace: string }> {
  const n = (nombre ?? '').trim().slice(0, 40);
  if (!n) throw new Error('Pon el nombre del camarero.');
  const { jwt } = await requerirSesionYRestaurante();
  const token = await crearCamarero(jwt, n).catch(mensajeSala);
  revalidatePath('/panel');
  const origen = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
  return { enlace: `${origen}/sala/${token}` };
}

export async function desactivarCamareroAction(id: string) {
  if (!UUID.test(id)) throw new Error('Camarero no válido.');
  const { jwt } = await requerirSesionYRestaurante();
  await desactivarCamarero(jwt, id);
  revalidatePath('/panel');
}

export async function fijarIdiomasAction(idiomas: string[]) {
  const validos = ['en', 'fr', 'de', 'it', 'pt', 'ca'];
  const lista = [...new Set((idiomas ?? []).filter((i) => validos.includes(i)))].slice(0, 3);
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await fijarIdiomas(jwt, lista).catch((e: unknown) => {
    const m = e instanceof Error ? e.message : '';
    throw new Error(/Pack de idiomas/.test(m) ? m : 'No se pudieron guardar los idiomas.');
  });
  revalidatePath('/panel');
  revalidatePath(`/m/${restaurante.slug}`);
}

export async function guardarTraduccionesAction(lista: Traduccion[]) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  const limpia = (lista ?? [])
    .filter((t) => ['plato', 'seccion'].includes(t.entidad) && UUID.test(t.entidadId) && ['en', 'fr', 'de', 'it', 'pt', 'ca'].includes(t.idioma)
      && ['nombre', 'descripcion'].includes(t.campo))
    .slice(0, 600)
    .map((t) => ({ ...t, texto: String(t.texto ?? '').slice(0, 300) }));
  await guardarTraducciones(jwt, restaurante.id, limpia).catch(() => { throw new Error('No se pudieron guardar las traducciones.'); });
  revalidatePath('/panel');
  revalidatePath(`/m/${restaurante.slug}`);
}
