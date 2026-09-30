import 'server-only';
import { comoCliente } from '@/lib/db';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';

export type EstadoTicket = 'abierto' | 'respondido' | 'cerrado';

export interface Ticket {
  id: string;
  asunto: string;
  mensaje: string;
  estado: EstadoTicket;
  respuesta: string | null;
  creadoEn: string;
  respondidoEn: string | null;
}

export async function crearTicket(
  jwt: string,
  restauranteId: string,
  datos: { asunto: string; mensaje: string; origen?: 'formulario' | 'chat'; contexto?: Record<string, unknown> | null },
  contexto: { restauranteNombre: string; email: string }
): Promise<Ticket> {
  const ticket = await comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{
      id: string;
      asunto: string;
      mensaje: string;
      estado: EstadoTicket;
      respuesta: string | null;
      creado_en: string;
      respondido_en: string | null;
    }>(
      `INSERT INTO tickets_soporte (restaurante_id, asunto, mensaje, origen, contexto)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, asunto, mensaje, estado, respuesta, creado_en, respondido_en`,
      [restauranteId, datos.asunto, datos.mensaje, datos.origen ?? 'formulario', datos.contexto ? JSON.stringify(datos.contexto) : null]
    );
    return rows[0];
  });

  try {
    await enviarCorreoInterno(
      `TICKET DE SOPORTE: ${escaparHtml(contexto.restauranteNombre)} — ${escaparHtml(ticket.asunto)}`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #D9531E;">Nuevo ticket de soporte</h2>
        <p><strong>Restaurante:</strong> ${escaparHtml(contexto.restauranteNombre)}</p>
        <p><strong>Correo:</strong> ${escaparHtml(contexto.email)}</p>
        <p><strong>Asunto:</strong> ${escaparHtml(ticket.asunto)}</p>
        <p>${escaparHtml(ticket.mensaje)}</p>
        ${datos.origen === 'chat' ? `<p style="color:#6B7079;font-size:13px"><strong>Desde el chat de ayuda.</strong> ${escaparHtml(JSON.stringify(datos.contexto ?? {}))}</p>` : ''}
      </div>`
    );
  } catch (error) {
    console.error('No se pudo avisar del ticket de soporte:', error);
  }

  return {
    id: ticket.id,
    asunto: ticket.asunto,
    mensaje: ticket.mensaje,
    estado: ticket.estado,
    respuesta: ticket.respuesta,
    creadoEn: ticket.creado_en,
    respondidoEn: ticket.respondido_en,
  };
}

export async function listarMisTickets(jwt: string, restauranteId: string): Promise<Ticket[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{
      id: string;
      asunto: string;
      mensaje: string;
      estado: EstadoTicket;
      respuesta: string | null;
      creado_en: string;
      respondido_en: string | null;
    }>(
      `SELECT id, asunto, mensaje, estado, respuesta, creado_en, respondido_en
         FROM tickets_soporte WHERE restaurante_id = $1 ORDER BY creado_en DESC`,
      [restauranteId]
    );
    return rows.map((r) => ({
      id: r.id,
      asunto: r.asunto,
      mensaje: r.mensaje,
      estado: r.estado,
      respuesta: r.respuesta,
      creadoEn: r.creado_en,
      respondidoEn: r.respondido_en,
    }));
  });
}
