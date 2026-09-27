import 'server-only';
import { comoCliente, comoVisitante } from '@/lib/db';

/**
 * Reservas de la carta (plan Ampliado, 0023). Alcance deliberadamente simple:
 * formulario → registro + aviso al negocio por correo y WhatsApp. Sin gestión
 * de mesas ni calendario. Plan, estado del local, fecha y duplicados los
 * valida dk.crear_reserva() en la base.
 */

export interface DatosReserva {
  nombre: string;
  telefono: string;
  fecha: string;
  hora: string;
  personas: number;
  notas: string | null;
}

export type ResultadoReserva =
  | { resultado: 'ok'; restaurante: string; emailNegocio: string | null; whatsapp: string | null }
  | { resultado: 'no_disponible' | 'fecha_invalida' | 'duplicada' | 'datos_invalidos' };

export async function crearReserva(slug: string, d: DatosReserva): Promise<ResultadoReserva> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.crear_reserva($1, $2, $3, $4, $5, $6, $7)', [
      slug, d.nombre, d.telefono, d.fecha, d.hora, d.personas, d.notas,
    ]);
    const r = rows[0];
    if (r?.resultado === 'ok') {
      return { resultado: 'ok', restaurante: r.restaurante, emailNegocio: r.email_negocio, whatsapp: r.whatsapp };
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
}

/** Próximas reservas y las de los últimos 7 días. */
export async function listarMisReservas(jwt: string, restauranteId: string): Promise<Reserva[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query(
      `SELECT id, nombre, telefono, to_char(fecha, 'YYYY-MM-DD') fecha, to_char(hora, 'HH24:MI') hora, personas, notas, estado, creada_en
         FROM reservas
        WHERE restaurante_id = $1 AND fecha >= current_date - 7
        ORDER BY fecha, hora
        LIMIT 200`,
      [restauranteId]
    );
    return rows.map((r) => ({
      id: r.id, nombre: r.nombre, telefono: r.telefono, fecha: r.fecha, hora: r.hora, personas: Number(r.personas),
      notas: r.notas, estado: r.estado, creadaEn: new Date(r.creada_en).toISOString(),
    }));
  });
}

export async function cambiarEstadoReserva(jwt: string, id: string, estado: Reserva['estado']): Promise<void> {
  await comoCliente(jwt, (c) => c.query('UPDATE reservas SET estado = $2 WHERE id = $1', [id, estado]));
}
