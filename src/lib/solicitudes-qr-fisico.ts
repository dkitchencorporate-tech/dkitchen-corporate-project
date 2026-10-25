import 'server-only';
import { comoCliente } from '@/lib/db';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';

export type TipoQrFisico = 'etiquetas' | 'vinilo' | 'atril' | 'metacrilato';
export type EstadoQrFisico = 'solicitado' | 'presupuestado' | 'pagado' | 'en_produccion' | 'enviado';

export interface SolicitudQrFisico {
  id: string;
  tipo: TipoQrFisico;
  cantidad: number;
  direccionEnvio: string;
  notas: string | null;
  precioCentimos: number | null;
  estado: EstadoQrFisico;
  creadoEn: string;
}

/**
 * Crea la solicitud y avisa a Alex por correo — nunca se cobra aquí.
 * Precio y pago siempre van por presupuesto manual (email/WhatsApp) antes de
 * producción, decisión explícita de Alex (2026-09-22): ni siquiera las
 * etiquetas de precio "público" en pricing-config.ts se cobran solas.
 */
export async function crearSolicitudQrFisico(
  jwt: string,
  restauranteId: string,
  datos: { tipo: TipoQrFisico; cantidad: number; direccionEnvio: string; notas?: string },
  contexto: { restauranteNombre: string; email: string }
): Promise<SolicitudQrFisico> {
  const solicitud = await comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{
      id: string;
      tipo: TipoQrFisico;
      cantidad: number;
      direccion_envio: string;
      notas: string | null;
      precio_centimos: number | null;
      estado: EstadoQrFisico;
      creado_en: string;
    }>(
      `INSERT INTO solicitudes_qr_fisico (restaurante_id, tipo, cantidad, direccion_envio, notas)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tipo, cantidad, direccion_envio, notas, precio_centimos, estado, creado_en`,
      [restauranteId, datos.tipo, datos.cantidad, datos.direccionEnvio, datos.notas ?? null]
    );
    return rows[0];
  });

  try {
    await enviarCorreoInterno(
      `QR FÍSICO solicitado: ${escaparHtml(contexto.restauranteNombre)} (${solicitud.tipo} x${solicitud.cantidad})`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6E0C2B;">Nueva solicitud de QR físico — pendiente de presupuesto</h2>
        <p><strong>Restaurante:</strong> ${escaparHtml(contexto.restauranteNombre)}</p>
        <p><strong>Correo:</strong> ${escaparHtml(contexto.email)}</p>
        <p><strong>Tipo:</strong> ${escaparHtml(solicitud.tipo)} — <strong>Cantidad:</strong> ${solicitud.cantidad}</p>
        <p><strong>Envío a:</strong> ${escaparHtml(solicitud.direccion_envio)}</p>
        ${solicitud.notas ? `<p><strong>Notas:</strong> ${escaparHtml(solicitud.notas)}</p>` : ''}
        <p>Responde con el presupuesto por email o WhatsApp y marca el estado desde el panel interno.</p>
      </div>`
    );
  } catch (error) {
    console.error('No se pudo avisar de la solicitud de QR físico:', error);
  }

  return {
    id: solicitud.id,
    tipo: solicitud.tipo,
    cantidad: solicitud.cantidad,
    direccionEnvio: solicitud.direccion_envio,
    notas: solicitud.notas,
    precioCentimos: solicitud.precio_centimos,
    estado: solicitud.estado,
    creadoEn: solicitud.creado_en,
  };
}

export async function listarMisSolicitudesQrFisico(jwt: string, restauranteId: string): Promise<SolicitudQrFisico[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{
      id: string;
      tipo: TipoQrFisico;
      cantidad: number;
      direccion_envio: string;
      notas: string | null;
      precio_centimos: number | null;
      estado: EstadoQrFisico;
      creado_en: string;
    }>(
      `SELECT id, tipo, cantidad, direccion_envio, notas, precio_centimos, estado, creado_en
         FROM solicitudes_qr_fisico WHERE restaurante_id = $1 ORDER BY creado_en DESC`,
      [restauranteId]
    );
    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      cantidad: r.cantidad,
      direccionEnvio: r.direccion_envio,
      notas: r.notas,
      precioCentimos: r.precio_centimos,
      estado: r.estado,
      creadoEn: r.creado_en,
    }));
  });
}
