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
