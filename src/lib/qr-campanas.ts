import 'server-only';
import { comoVisitante, HAY_BASE_DE_DATOS } from '@/lib/db';

/**
 * QR de campaña de DKitchen (0071): lo impreso apunta a /q/<codigo> y el destino
 * se cambia desde Central. Escaneos, clics de botonera, formularios y saltos a
 * WhatsApp se registran en la base (funciones SECURITY DEFINER, sin acceso a tablas).
 */
export const CODIGO_CAMPANA = /^[a-z0-9-]{3,32}$/;
export type TipoEvento = 'clic' | 'formulario' | 'whatsapp';

export async function resolverQrCampana(codigo: string): Promise<string | null> {
  if (!HAY_BASE_DE_DATOS || !CODIGO_CAMPANA.test(codigo)) return null;
  return comoVisitante(async (c) => (await c.query<{ d: string | null }>('SELECT dk.qr_campana_resolver($1) AS d', [codigo])).rows[0]?.d ?? null);
}

export async function eventoQrCampana(codigo: string, tipo: TipoEvento, detalle: string): Promise<void> {
  if (!HAY_BASE_DE_DATOS || !CODIGO_CAMPANA.test(codigo)) return;
  await comoVisitante((c) => c.query('SELECT dk.qr_campana_evento($1, $2, $3)', [codigo, tipo, detalle.slice(0, 120)]));
}

export interface DatosContacto {
  origen: string; nombre: string; negocio: string; tipo: string; localidad: string;
  interes: 'carta' | 'signature' | 'experience' | 'no_se'; consulta: string; franja: 'manana' | 'tarde' | 'noche' | 'cuando_sea';
}

export async function registrarContacto(d: DatosContacto): Promise<string> {
  return comoVisitante(async (c) => (await c.query<{ id: string }>(
    'SELECT dk.contacto_registrar($1, $2, $3, $4, $5, $6, $7, $8) AS id',
    [d.origen, d.nombre, d.negocio, d.tipo, d.localidad, d.interes, d.consulta, d.franja])).rows[0].id);
}
