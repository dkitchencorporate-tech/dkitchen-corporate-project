import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Central → Competencia (0082): base viva de competidores. karc0 añade nombre + web + nota;
 * Claude audita y rellena la ficha (precio, qué les funciona, sus clientes visibles para prospectar,
 * qué copiamos). Todo pasa por funciones SECURITY DEFINER que exigen admin.
 */
export interface Competidor {
  id: string; nombre: string; web: string | null; categoria: string; tamano: string | null; zona: string | null;
  compite_con: string | null; amenaza: 'alta' | 'media' | 'baja' | null; precio: string | null; propuesta: string | null;
  fuerte: string | null; debil: string | null; les_funciona: string | null; clientes: string | null; copiar: string | null;
  fuentes: string | null; origen: 'karc0' | 'claude'; estado: 'por_auditar' | 'auditado' | 'vigilar' | 'descartado';
  nota_karc0: string | null; auditado_en: string | null; creado_en: string;
}

export const CATEGORIAS: Record<string, string> = {
  carta_qr: 'Carta QR', tpv: 'TPV', pedidos: 'Pedidos y delivery', reservas: 'Reservas', app_marca: 'App de marca',
  eventos: 'Eventos', agencia: 'Agencia', marketing: 'Marketing', otro: 'Otro',
};
export const ESTADOS: Record<Competidor['estado'], string> = {
  por_auditar: 'Por auditar', auditado: 'Auditado', vigilar: 'En vigilancia', descartado: 'Descartado',
};

export async function verCompetidores(jwt: string): Promise<Competidor[]> {
  return comoCliente(jwt, async (c) => (await c.query<{ l: Competidor[] }>('SELECT dk.admin_competidores() AS l')).rows[0]?.l ?? []);
}

export async function nuevoCompetidor(jwt: string, nombre: string, web: string, nota: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_competidor_nuevo($1, $2, $3)', [nombre, web || null, nota || null]));
}

export async function notaCompetidor(jwt: string, id: string, nota: string, reauditar: boolean) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_competidor_nota($1, $2, $3)', [id, nota, reauditar]));
}
