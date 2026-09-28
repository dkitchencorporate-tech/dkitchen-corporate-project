import 'server-only';
import { comoCliente } from '@/lib/db';

export interface ClienteQr {
  restauranteId: string;
  nombre: string;
  slug: string;
  plan: string;
  estadoAcceso: string;
  activo: boolean;
  creadoEn: string;
  email: string | null;
  contacto: string | null;
  codigoQr: string | null;
  platos: number;
  escaneosMes: number;
  escaneosTotal: number;
  ticketsAbiertos: number;
  solicitudesQrPendientes: number;
}

export async function listarClientesQr(jwt: string): Promise<ClienteQr[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.admin_resumen_clientes()');
    return rows.map((r) => ({
      restauranteId: r.restaurante_id,
      nombre: r.nombre,
      slug: r.slug,
      plan: r.plan,
      estadoAcceso: r.estado_acceso,
      activo: r.activo,
      creadoEn: new Date(r.creado_en).toISOString(),
      email: r.email,
      contacto: r.contacto,
      codigoQr: r.codigo_qr,
      platos: Number(r.platos),
      escaneosMes: Number(r.escaneos_mes),
      escaneosTotal: Number(r.escaneos_total),
      ticketsAbiertos: Number(r.tickets_abiertos),
      solicitudesQrPendientes: Number(r.solicitudes_qr_pendientes),
    }));
  });
}

// ---------------------------------------------------------------------------
// Super admin (0021): ficha, historial, soporte y acciones. Cada función SQL
// comprueba dk.es_admin() dentro de la base; la app no decide quién es admin.
// ---------------------------------------------------------------------------

export interface FichaCliente {
  restaurante: {
    id: string; nombre: string; slug: string; plan: string; estado_acceso: string; activo: boolean;
    creado_en: string; pago_fallido_desde: string | null; logo_url: string | null; color_marca: string | null;
    descripcion: string | null; telefono: string | null; direccion: string | null; horario: string | null;
    instagram: string | null; url_resenas: string | null;
    plantilla?: string; nivel_diseno?: string;
  };
  email: string | null;
  contacto: string | null;
  ultimo_acceso: string | null;
  codigos: string[];
  platos: number;
  secciones: number;
  escaneos_30d: { dia: string; n: number }[];
  llamadas_30d: number;
}

export interface EntradaHistorial {
  ocurridoEn: string;
  accion: string;
  detalle: { id?: string; cambios?: Record<string, { antes?: unknown; despues?: unknown }>; [k: string]: unknown } | null;
  quien: 'cliente' | 'DKitchen' | 'sistema';
}

export interface TicketAdmin {
  id: string; restauranteId: string; restaurante: string; asunto: string; mensaje: string;
  estado: 'abierto' | 'respondido' | 'cerrado'; respuesta: string | null; creadoEn: string; respondidoEn: string | null;
}

export interface SolicitudQrAdmin {
  id: string; restauranteId: string; restaurante: string; tipo: string; cantidad: number;
  direccionEnvio: string | null; notas: string | null; estado: string; creadoEn: string;
}

export async function fichaCliente(jwt: string, restauranteId: string): Promise<FichaCliente | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT dk.admin_ficha_cliente($1) AS r', [restauranteId]);
    return (rows[0]?.r as FichaCliente) ?? null;
  });
}

export async function historialCliente(jwt: string, restauranteId: string): Promise<EntradaHistorial[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.admin_historial_cliente($1)', [restauranteId]);
    return rows.map((r) => ({
      ocurridoEn: new Date(r.ocurrido_en).toISOString(),
      accion: r.accion,
      detalle: r.detalle,
      quien: r.quien,
    }));
  });
}

export async function bandejaSoporte(jwt: string): Promise<TicketAdmin[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.admin_bandeja_soporte()');
    return rows.map((r) => ({
      id: r.id, restauranteId: r.restaurante_id, restaurante: r.restaurante, asunto: r.asunto, mensaje: r.mensaje,
      estado: r.estado, respuesta: r.respuesta, creadoEn: new Date(r.creado_en).toISOString(),
      respondidoEn: r.respondido_en ? new Date(r.respondido_en).toISOString() : null,
    }));
  });
}

export async function solicitudesQrAdmin(jwt: string): Promise<SolicitudQrAdmin[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.admin_solicitudes_qr()');
    return rows.map((r) => ({
      id: r.id, restauranteId: r.restaurante_id, restaurante: r.restaurante, tipo: r.tipo, cantidad: Number(r.cantidad),
      direccionEnvio: r.direccion_envio, notas: r.notas, estado: r.estado, creadoEn: new Date(r.creado_en).toISOString(),
    }));
  });
}

export async function cambiarEstadoCliente(jwt: string, restauranteId: string, estado: 'activo' | 'suspendido') {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_cambiar_estado($1, $2)', [restauranteId, estado]));
}

export async function cambiarPlanCliente(jwt: string, restauranteId: string, plan: 'basico' | 'ampliado') {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_cambiar_plan($1, $2)', [restauranteId, plan]));
}

export async function responderTicket(
  jwt: string, ticketId: string, respuesta: string, cerrar: boolean
): Promise<{ email: string; asunto: string; restaurante: string } | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.admin_responder_ticket($1, $2, $3)', [ticketId, respuesta, cerrar]);
    return rows[0] ?? null;
  });
}

export async function cambiarEstadoSolicitudQr(jwt: string, solicitudId: string, estado: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_estado_solicitud_qr($1, $2)', [solicitudId, estado]));
}

/** Asigna plantilla, nivel y color de la carta (0026: solo DKitchen puede). */
export async function asignarDiseno(jwt: string, restauranteId: string, plantilla: string, nivel: string, color: string | null) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_asignar_diseno($1, $2, $3, $4)', [restauranteId, plantilla, nivel, color]));
}

// ---------------------------------------------------------------------------
// Servicios y conexión TPV (0027)
// ---------------------------------------------------------------------------
export interface ServicioAdmin { servicio: string; estado: string; origen: string; contratadoEn: string; checklist: Record<string, boolean> }

export async function serviciosCliente(jwt: string, restauranteId: string): Promise<ServicioAdmin[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query(
      `SELECT servicio, estado, origen, contratado_en, checklist FROM servicios_contratados
        WHERE restaurante_id = $1 AND estado <> 'cancelado' ORDER BY contratado_en`, [restauranteId]);
    return rows.map((r) => ({ servicio: r.servicio, estado: r.estado, origen: r.origen, contratadoEn: new Date(r.contratado_en).toISOString(), checklist: r.checklist ?? {} }));
  });
}

export async function adminServicio(jwt: string, restauranteId: string, servicio: string, accion: string, checklist?: Record<string, boolean>) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_servicio($1, $2, $3, $4)', [restauranteId, servicio, accion, checklist ? JSON.stringify(checklist) : null]));
}

export async function adminConexionTpv(jwt: string, restauranteId: string, proveedor: string, endpoint: string, credencialCifrada: string | null, activa: boolean) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_conexion_tpv($1, $2, $3, $4, $5)', [restauranteId, proveedor, endpoint, credencialCifrada, activa]));
}

// ---------------------------------------------------------------------------
// Clientes de cortesía y demos (0029)
// ---------------------------------------------------------------------------
export async function regalarTodo(jwt: string, restauranteId: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_regalar_todo($1)', [restauranteId]));
}

export async function cargarCartaDemo(jwt: string, restauranteId: string): Promise<number> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.admin_carta_demo($1) AS n', [restauranteId])).rows[0].n);
}

// ---------------------------------------------------------------------------
// Enlaces de pago preparados en Central (0030)
// ---------------------------------------------------------------------------
export interface EnlacePago {
  id: string; plan: string | null; servicios: string[]; primerCentimos: number; mensualCentimos: number;
  nota: string | null; url: string | null; estado: 'pendiente' | 'pagado' | 'anulado'; creadoEn: string; pagadoEn: string | null;
}

export async function listarEnlaces(jwt: string, restauranteId: string): Promise<EnlacePago[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM enlaces_pago WHERE restaurante_id = $1 ORDER BY creado_en DESC LIMIT 20', [restauranteId]);
    return rows.map((r) => ({
      id: r.id, plan: r.plan, servicios: r.servicios ?? [], primerCentimos: r.primer_cobro_centimos, mensualCentimos: r.mensual_centimos,
      nota: r.nota, url: r.url, estado: r.estado, creadoEn: new Date(r.creado_en).toISOString(), pagadoEn: r.pagado_en ? new Date(r.pagado_en).toISOString() : null,
    }));
  });
}

export async function crearEnlace(jwt: string, restauranteId: string, e: { plan: string | null; servicios: string[]; primer: number; mensual: number; nota: string }): Promise<string> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.admin_crear_enlace($1, $2, $3, $4, $5, $6) AS id', [restauranteId, e.plan, e.servicios, e.primer, e.mensual, e.nota])).rows[0].id);
}

export async function fijarUrlEnlace(jwt: string, enlaceId: string, url: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_enlace_url($1, $2)', [enlaceId, url]));
}

export async function anularEnlace(jwt: string, enlaceId: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_anular_enlace($1)', [enlaceId]));
}

export async function catalogoPrecios(jwt: string): Promise<{ servicio: string; nombre: string; tipo: string; precio: number }[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT servicio, nombre, tipo, dk.precio_servicio(servicio) AS precio FROM catalogo_servicios ORDER BY precio_centimos')).rows);
}
