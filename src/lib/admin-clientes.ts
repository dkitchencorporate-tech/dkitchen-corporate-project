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
