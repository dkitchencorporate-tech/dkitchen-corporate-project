import { comoCliente } from '@/lib/db';

/** Seguimiento en vivo de cuentas piloto (0078). Solo admins con 2FA (lo exige la base). */
export type EventoSeguimiento = { id: number; sesion: string; tipo: string; pantalla: string | null; objetivo: string | null; detalle: string | null; ms: number | null; creadoEn: string };

export async function cuentaEnSeguimiento(jwt: string, restauranteId: string): Promise<{ activo: boolean; desde: string; hasta: string | null } | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.admin_seguimiento_cuenta($1)', [restauranteId]);
    const r = rows[0];
    return r ? { activo: r.activo, desde: new Date(r.desde).toISOString(), hasta: r.hasta ? new Date(r.hasta).toISOString() : null } : null;
  });
}

export async function eventosSeguimiento(jwt: string, restauranteId: string): Promise<EventoSeguimiento[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.admin_seguimiento($1, 2000)', [restauranteId]);
    return rows.map((r) => ({ id: Number(r.id), sesion: r.sesion, tipo: r.tipo, pantalla: r.pantalla, objetivo: r.objetivo, detalle: r.detalle, ms: r.ms, creadoEn: new Date(r.creado_en).toISOString() }));
  });
}
