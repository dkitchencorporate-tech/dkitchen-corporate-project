import 'server-only';
import { comoCliente, comoVisitante } from '@/lib/db';

/**
 * Reservas de la carta (plan Ampliado, 0023 + 0025). Alcance deliberadamente
 * simple: formulario → registro + aviso al negocio (correo con su marca) y
 * acuse al cliente si deja su correo. Al confirmar o cancelar, el dueño avisa
 * al cliente por correo (automático) y por WhatsApp (enlace con el mensaje
 * escrito; el envío automático por la API de WhatsApp es un upsell aparte).
 * Plan, estado del local, fecha y duplicados los valida dk.crear_reserva().
 */

export interface DatosReserva {
  nombre: string;
  telefono: string;
  email: string | null;
  fecha: string;
  hora: string;
  personas: number;
  notas: string | null;
}

export interface MarcaLocal {
  nombre: string;
  logoUrl: string | null;
  color: string | null;
}

export type ResultadoReserva =
  | { resultado: 'ok'; marca: MarcaLocal; emailNegocio: string | null; whatsapp: string | null }
  | { resultado: 'no_disponible' | 'fecha_invalida' | 'duplicada' | 'datos_invalidos' };

export async function crearReserva(slug: string, d: DatosReserva): Promise<ResultadoReserva> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.crear_reserva($1, $2, $3, $4, $5, $6, $7, $8)', [
      slug, d.nombre, d.telefono, d.email, d.fecha, d.hora, d.personas, d.notas,
    ]);
    const r = rows[0];
    if (r?.resultado === 'ok') {
      return {
        resultado: 'ok',
        marca: { nombre: r.restaurante, logoUrl: r.logo_url, color: r.color_marca },
        emailNegocio: r.email_negocio,
        whatsapp: r.whatsapp,
      };
    }
    const conocidos = ['no_disponible', 'fecha_invalida', 'duplicada', 'datos_invalidos'] as const;
    const resultado = conocidos.find((k) => k === r?.resultado) ?? 'datos_invalidos';
    return { resultado };
  });
}

export interface Reserva extends DatosReserva {
  id: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada';
  creadaEn: string;
  avisadoEn: string | null;
}

/** Próximas reservas y las de los últimos 7 días. */
export async function listarMisReservas(jwt: string, restauranteId: string): Promise<Reserva[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query(
      `SELECT id, nombre, telefono, email, to_char(fecha, 'YYYY-MM-DD') fecha, to_char(hora, 'HH24:MI') hora, personas, notas,
              estado, creada_en, avisado_en
         FROM reservas
        WHERE restaurante_id = $1 AND fecha >= current_date - 7
        ORDER BY fecha, hora
        LIMIT 200`,
      [restauranteId]
    );
    return rows.map(aReserva);
  });
}

function aReserva(r: Record<string, unknown>): Reserva {
  return {
    id: String(r.id), nombre: String(r.nombre), telefono: String(r.telefono), email: (r.email as string | null) ?? null,
    fecha: String(r.fecha), hora: String(r.hora), personas: Number(r.personas), notas: (r.notas as string | null) ?? null,
    estado: r.estado as Reserva['estado'], creadaEn: new Date(r.creada_en as string).toISOString(),
    avisadoEn: r.avisado_en ? new Date(r.avisado_en as string).toISOString() : null,
  };
}

/** Cambia el estado y devuelve la reserva actualizada (para avisar al cliente). */
export async function cambiarEstadoReserva(jwt: string, id: string, estado: Reserva['estado']): Promise<Reserva | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query(
      `UPDATE reservas SET estado = $2 WHERE id = $1
       RETURNING id, nombre, telefono, email, to_char(fecha, 'YYYY-MM-DD') fecha, to_char(hora, 'HH24:MI') hora, personas, notas,
                 estado, creada_en, avisado_en`,
      [id, estado]
    );
    return rows[0] ? aReserva(rows[0]) : null;
  });
}

export async function marcarAvisada(jwt: string, id: string): Promise<void> {
  await comoCliente(jwt, (c) => c.query('UPDATE reservas SET avisado_en = now() WHERE id = $1', [id]));
}
