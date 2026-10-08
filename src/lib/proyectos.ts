import 'server-only';
import { comoAprovisionamiento, comoCliente } from '@/lib/db';

/**
 * Proyectos (0060, bloque 1 de AUTOMATIZACION_PRODUCTOS_2026-10-08.md): el
 * seguimiento común de Signature, Experience, Auditoría, Dark Kitchen y QR
 * físico. Nacen del webhook de Stripe, de las solicitudes de la web o a mano
 * en Central, y avanzan por las fases de su producto (las mismas que
 * dk.proyecto_fases en la base; si cambias una, cambia la otra).
 */

export type ProductoProyecto = 'signature' | 'experience' | 'auditoria' | 'dark_kitchen' | 'qr_fisico';

export const PRODUCTOS_PROYECTO: Record<ProductoProyecto, string> = {
  signature: 'Signature',
  experience: 'Experience',
  auditoria: 'Auditoría',
  dark_kitchen: 'Dark Kitchen',
  qr_fisico: 'QR físico',
};

/** [clave, nombre en Central, qué le contamos al cliente al llegar a esa fase]. */
export const FASES: Record<ProductoProyecto, [string, string, string][]> = {
  signature: [
    ['solicitud', 'Solicitud', 'Hemos recibido tu solicitud y te llamaremos para prepararte una propuesta.'],
    ['pagado', 'Pagado', 'Tu pago está confirmado. Ahora te enviamos el contrato.'],
    ['contrato_enviado', 'Contrato enviado', 'Te hemos enviado el contrato para que lo firmes.'],
    ['contrato_firmado', 'Contrato firmado', 'Contrato firmado. Siguiente paso: recoger tu marca, tu carta y tus fotos.'],
    ['datos_recibidos', 'Datos recibidos', 'Tenemos todo lo necesario y empezamos a construir tu app.'],
    ['en_construccion', 'En construcción', 'Estamos construyendo tu app.'],
    ['primera_version', 'Primera versión', 'Tu primera versión está lista para que la revises y pidas cambios.'],
    ['publicado', 'Publicado', 'Tu app ya está publicada y lista para vender.'],
    ['mantenimiento', 'Mantenimiento', 'Tu app está en mantenimiento: la cuidamos y la tenemos al día.'],
    ['descartado', 'Descartado', ''],
  ],
  experience: [
    ['solicitud', 'Solicitud', 'Hemos recibido tu solicitud de evento y te llamaremos para cerrar formato, fecha y aforo.'],
    ['llamada', 'Llamada hecha', 'Ya hemos hablado. Te enviamos el contrato y el enlace de pago.'],
    ['contrato_pago', 'Contrato y pago', 'Pago confirmado. Preparamos la videollamada de arranque.'],
    ['concepto', 'Concepto', 'Te hemos enviado el concepto del evento para que lo apruebes.'],
    ['evento_montado', 'Evento montado', 'Tu evento está montado: web y entradas listas.'],
    ['venta_abierta', 'Venta abierta', 'La venta de entradas está abierta.'],
    ['celebrado', 'Celebrado', '¡Evento celebrado! Te preparamos la liquidación y los datos.'],
    ['cerrado', 'Cerrado', 'Evento cerrado con su liquidación. Gracias por confiar en nosotros.'],
    ['descartado', 'Descartado', ''],
  ],
  auditoria: [
    ['solicitud', 'Solicitud', 'Hemos recibido tu solicitud de auditoría y te enviaremos el enlace de pago.'],
    ['pagada', 'Pagada', 'Pago confirmado. Te escribimos para fijar la reunión.'],
    ['reunion_fijada', 'Reunión fijada', 'Reunión fijada. Preparamos tu informe.'],
    ['informe_entregado', 'Informe entregado', 'Te hemos entregado el informe con las mejoras ordenadas por impacto.'],
    ['cerrada', 'Cerrada', 'Auditoría cerrada. Gracias por confiar en nosotros.'],
    ['descartado', 'Descartado', ''],
  ],
  dark_kitchen: [
    ['solicitud', 'Solicitud', 'Hemos recibido tu solicitud y te propondremos día y hora para la entrevista de admisión.'],
    ['llamada', 'Entrevista hecha', 'Ya hemos hablado. Te preparamos la propuesta.'],
    ['propuesta_contrato', 'Propuesta y contrato', 'Te hemos enviado la propuesta y el contrato.'],
    ['en_marcha', 'En marcha', 'Tu marca está en marcha.'],
    ['cerrada', 'Cerrada', 'Proyecto cerrado.'],
    ['descartado', 'Descartado', ''],
  ],
  qr_fisico: [
    ['pedido', 'Pedido', 'Hemos recibido tu pedido de QR físico.'],
    ['en_produccion', 'En producción', 'Tus QR están en producción.'],
    ['enviado', 'Enviado', 'Tus QR van de camino.'],
    ['entregado', 'Entregado', 'Pedido entregado.'],
    ['descartado', 'Descartado', ''],
  ],
};

export const nombreFase = (producto: string, fase: string) =>
  FASES[producto as ProductoProyecto]?.find(([k]) => k === fase)?.[1] ?? fase.replace(/_/g, ' ');
export const textoFaseCliente = (producto: string, fase: string) =>
  FASES[producto as ProductoProyecto]?.find(([k]) => k === fase)?.[2] ?? '';

/** Interés del formulario de la web → producto con proyecto (los demás son consultas, no proyectos). */
export const PRODUCTO_DE_INTERES: Record<string, ProductoProyecto> = {
  signature: 'signature', modelo: 'signature', experience: 'experience',
  auditoria: 'auditoria', 'dark-kitchen': 'dark_kitchen', marcas: 'dark_kitchen',
};

export interface AltaProyecto {
  email: string;
  nombre?: string | null;
  telefono?: string | null;
  negocio?: string | null;
  referencia?: string | null;
  importe?: number | null;
  stripe_cliente?: string | null;
  stripe_factura?: string | null;
  stripe_suscripcion?: string | null;
  comercial?: string | null;
  pedido_id?: string | null;
  datos?: Record<string, unknown>;
  texto?: string;
}

/**
 * Alta desde el webhook o los formularios (rol dk_aprovisionamiento).
 * Idempotente y nunca lanza: un fallo aquí no puede tumbar un cobro ni una
 * solicitud (queda en el log y el aviso interno sigue saliendo).
 */
export async function crearProyecto(producto: ProductoProyecto, origen: 'pago' | 'solicitud', d: AltaProyecto): Promise<{ id: string; resultado: string } | null> {
  try {
    return await comoAprovisionamiento(async (c) =>
      (await c.query<{ id: string; resultado: string }>('SELECT id, resultado FROM dk.proyecto_crear($1, $2, $3::jsonb)', [producto, origen, JSON.stringify(d)])).rows[0] ?? null);
  } catch (e) {
    console.error(`Proyecto ${producto} (${origen}) no creado:`, e);
    return null;
  }
}

export interface ProyectoFila {
  id: string;
  producto: ProductoProyecto;
  fase: string;
  origen: string;
  email: string;
  nombre: string | null;
  telefono: string | null;
  negocio: string | null;
  siguiente_paso: string | null;
  siguiente_fecha: string | null;
  importe_centimos: number | null;
  contrato_estado: string | null;
  comercial: string | null;
  creado_en: string;
  actualizado_en: string;
  vencido: boolean;
}

export interface ProyectoFicha extends Omit<ProyectoFila, 'vencido'> {
  datos: Record<string, unknown>;
  datos_fiscales: Record<string, string> | null;
  contrato_ref: string | null;
  contrato_firmado_en: string | null;
  contrato_pdf_url: string | null;
  stripe_cliente: string | null;
  stripe_factura: string | null;
  stripe_suscripcion: string | null;
  referencia_pago: string | null;
  fases: string[];
  eventos: { tipo: string; fase: string | null; texto: string | null; creado_en: string; autor: string | null }[];
  intake: Record<string, unknown> | null;
  token_intake: string | null;
}

export const listarProyectos = (jwt: string, f: { producto?: string; fase?: string; hoy?: boolean }) =>
  comoCliente(jwt, async (c) => (await c.query<{ l: ProyectoFila[] }>('SELECT dk.admin_proyectos($1, $2, $3) AS l', [f.producto || null, f.fase || null, !!f.hoy])).rows[0]?.l ?? []);

export const fichaProyecto = (jwt: string, id: string) =>
  comoCliente(jwt, async (c) => (await c.query<{ p: ProyectoFicha | null }>('SELECT dk.admin_proyecto($1) AS p', [id])).rows[0]?.p ?? null);

export const resumenProyectos = (jwt: string) =>
  comoCliente(jwt, async (c) => (await c.query<{ r: { abiertos: number; hoy: number; nuevos_7d: number } }>('SELECT dk.admin_proyectos_resumen() AS r')).rows[0]?.r);
