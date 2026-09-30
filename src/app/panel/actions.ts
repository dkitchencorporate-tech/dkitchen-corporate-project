'use server';

import { revalidatePath } from 'next/cache';
import { claveDeLimite, limiteSuperado } from '@/lib/limite-frecuencia';
import { guardarExtras as dbGuardarExtras, guardarCombo as dbGuardarCombo, guardarLegal as dbGuardarLegal, ETIQUETAS, type Etiqueta, type DatosCombo, type DatosLegal } from '@/lib/estudio';
import { obtenerJwtDeSesion, identidadActual } from '@/lib/sesion';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { obtenerMiRestaurante, actualizarDatosLocal, type DatosLocal, guardarEstilo } from '@/lib/mi-restaurante';
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
import { crearCheckoutServicio, crearCheckoutUpgradeAmpliado, crearCheckoutEnlaceAdmin } from '@/lib/payments/whop';
import { quedarmeConTodo, fijarUrlPrueba } from '@/lib/prueba';
import { estadoServicios, tiene, registrarOferta as dbRegistrarOferta, type Servicio } from '@/lib/servicios';
import { guardarMesa, eliminarMesa, crearCamarero, desactivarCamarero, guardarPlano, cargarPlano, type MesaPlano, type ElementoPlano } from '@/lib/sala';
import { fijarIdiomas } from '@/lib/idiomas';

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

/** Paso a una persona desde el chat de ayuda: el contexto se limpia aquí y el plan lo pone el servidor. */
export async function crearTicketAyudaAction(datos: {
  asunto: string;
  mensaje: string;
  contexto: { seccion: string | null; camino: string[]; busquedas: string[]; pagina?: string };
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
    pagina: texto(c.pagina, 120) || null,
    plan: restaurante.plan,
    nivel: restaurante.nivelDiseno,
  };
  await dbCrearTicket(jwt, restaurante.id, { asunto, mensaje, origen: 'chat', contexto }, {
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

/**
 * «Quedarme con todo» (0034). El importe, los días gratis hasta el día de
 * cobro y los módulos los calcula dk.prueba_quedarme en la base; aquí solo
 * se crea el pago en Whop con esos datos.
 */
export async function quedarmeConTodoAction(): Promise<{ url?: string; error?: string }> {
  try {
    const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
    const p = await quedarmeConTodo(jwt, restaurante.id);
    const nombres: Record<string, string> = { pack_sala: 'Pack Sala', plano_mesas: 'Plano de mesas', app_sala: 'App de sala', conexion_tpv: 'Conexión TPV' };
    const { url } = await crearCheckoutEnlaceAdmin({
      enlaceId: p.enlace, restauranteId: restaurante.id, restauranteNombre: restaurante.nombre, email: identidad.email,
      concepto: ['Plan Ampliado', ...p.servicios.map((x) => nombres[x] ?? x)].join(' + '),
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
  revalidatePath(`/m/${restaurante.slug}`);
}

/**
 * Baja del servicio desde el panel (29/09/2026, condiciones §4): queda como
 * ticket en Central (Soporte), aviso interno para cancelar la suscripción en
 * Whop antes del próximo cobro, y confirmación al cliente. El servicio sigue
 * activo hasta el final del periodo pagado.
 */
export async function solicitarBajaAction(motivo: string) {
  const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
  const texto = String(motivo ?? '').trim().slice(0, 1000) || 'Sin motivo indicado.';
  await dbCrearTicket(jwt, restaurante.id, { asunto: 'Solicitud de baja', mensaje: `El cliente pide la baja del servicio. Motivo: ${texto}` }, {
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
  });
  const { enviarCorreoInterno, enviarCorreoCliente, escaparHtml } = await import('@/lib/email');
  await enviarCorreoInterno(`BAJA: ${restaurante.nombre}`,
    `<p><strong>${escaparHtml(restaurante.nombre)}</strong> (${escaparHtml(identidad.email)}) ha pedido la baja desde su panel.</p>
     <p><strong>Cancela su suscripción en Whop antes del próximo cobro.</strong> El servicio sigue activo hasta el final del periodo pagado.</p>
     <p>Motivo: ${escaparHtml(texto)}</p>`).catch((e) => console.error('Baja: aviso interno no enviado', e));
  await enviarCorreoCliente(identidad.email, `Hemos recibido tu baja · ${restaurante.nombre}`,
    `<p>Hola,</p>
     <p>Hemos recibido tu solicitud de baja de la carta digital de <strong>${escaparHtml(restaurante.nombre)}</strong>. No se te volverá a cobrar.</p>
     <p>Tu carta sigue activa hasta el final del periodo que ya pagaste. Después, tu QR mostrará una página informativa (nunca un error) y guardaremos tu carta 60 días por si quieres volver o pedirnos una copia.</p>
     <p>Si ha sido un error o quieres contarnos algo, responde a este correo.</p>`,
    { titulo: 'Baja recibida' }).catch((e) => console.error('Baja: confirmación no enviada', e));
  revalidatePath('/panel');
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
  const m = e instanceof Error ? e.message : '';
  if (/promo_check/.test(m)) throw new Error('El precio de promoción debe ser menor que el precio normal y la fecha de inicio anterior a la de fin.');
  if (/combo|12 platos|otro restaurante/.test(m)) throw new Error(m.replace(/^.*?: /, '').replace(/^\w/, (x) => x.toUpperCase()) + '.');
  if (/legal_nif/.test(m)) throw new Error('El NIF/CIF no es válido (solo letras, números y guiones).');
  if (/legal_email/.test(m)) throw new Error('El correo legal no es válido.');
  throw new Error('No se pudo guardar. Revisa los datos e inténtalo de nuevo.');
}

export async function guardarExtrasPlatoAction(platoId: string, d: { etiqueta: string | null; precioPromo: string | number | null; promoDesde: string | null; promoHasta: string | null }) {
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
}

export async function guardarComboAction(comboId: string | null, d: DatosCombo) {
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
}

export async function guardarLegalAction(d: DatosLegal) {
  const nif = textoEstudio(d?.nif, 12)?.toUpperCase().replace(/\s/g, '') ?? null;
  const datos: DatosLegal = {
    titular: textoEstudio(d?.titular, 160), nif, email: textoEstudio(d?.email, 160)?.toLowerCase() ?? null,
    domicilio: textoEstudio(d?.domicilio, 240), activo: !!d?.activo,
  };
  if (datos.activo && (!datos.titular || !datos.email)) throw new Error('Para publicar tus páginas legales hacen falta el titular y un correo de contacto.');
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  try { await dbGuardarLegal(jwt, restaurante.id, datos); } catch (e) { errorEstudio(e); }
  revalidatePath('/panel');
}
