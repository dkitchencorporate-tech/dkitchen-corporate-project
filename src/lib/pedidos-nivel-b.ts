import 'server-only';
import { comoAprovisionamiento } from '@/lib/db';

/**
 * Tubería común de post-pago del Nivel B (Parte 8, Sección 8) — comparte el
 * rol dk_aprovisionamiento con el resto de webhooks de pago (0013): mismo
 * perfil de confianza, cada función nueva sigue concediendo EXECUTE una por
 * una, nunca acceso directo a tabla.
 */

export type ProductoNivelB = 'auditoria' | 'experience' | 'nucleo-operativo' | 'dark-kitchen-ruta-b';

export interface PedidoNivelB {
  id: string;
  token: string;
  yaExistia: boolean;
}

export async function crearPedidoNivelB(datos: {
  producto: ProductoNivelB;
  referenciaPago: string;
  email: string;
  nombreContacto: string;
  restauranteNombre?: string;
  importeCentimos: number;
}): Promise<PedidoNivelB> {
  return comoAprovisionamiento(async (c) => {
    const { rows } = await c.query<{ id: string; token: string; ya_existia: boolean }>(
      `SELECT * FROM dk.crear_pedido_nivel_b($1, $2, $3, $4, $5, $6)`,
      [
        datos.producto,
        datos.referenciaPago,
        datos.email,
        datos.nombreContacto,
        datos.restauranteNombre ?? null,
        datos.importeCentimos,
      ]
    );
    const fila = rows[0];
    if (!fila) throw new Error('dk.crear_pedido_nivel_b no devolvió fila.');
    return { id: fila.id, token: fila.token, yaExistia: fila.ya_existia };
  });
}

export interface PedidoPorToken {
  id: string;
  producto: ProductoNivelB;
  nombreContacto: string;
  restauranteNombre: string | null;
  estado: string;
}

export async function pedidoPorToken(token: string): Promise<PedidoPorToken | null> {
  return comoAprovisionamiento(async (c) => {
    const { rows } = await c.query<{
      id: string;
      producto: ProductoNivelB;
      nombre_contacto: string;
      restaurante_nombre: string | null;
      estado: string;
    }>(`SELECT * FROM dk.pedido_por_token($1)`, [token]);
    const fila = rows[0];
    if (!fila) return null;
    return {
      id: fila.id,
      producto: fila.producto,
      nombreContacto: fila.nombre_contacto,
      restauranteNombre: fila.restaurante_nombre,
      estado: fila.estado,
    };
  });
}

export async function guardarIntake(token: string, datos: unknown): Promise<void> {
  await comoAprovisionamiento((c) => c.query(`SELECT dk.guardar_intake($1, $2::jsonb)`, [token, JSON.stringify(datos)]));
}

export async function marcarEstadoPedido(id: string, estado: string): Promise<void> {
  await comoAprovisionamiento((c) => c.query(`SELECT dk.marcar_estado_pedido($1, $2)`, [id, estado]));
}

export async function marcarContratoEnviado(id: string): Promise<void> {
  await comoAprovisionamiento((c) => c.query(`SELECT dk.marcar_contrato_enviado($1)`, [id]));
}

export async function marcarFacturaEmitida(id: string): Promise<void> {
  await comoAprovisionamiento((c) => c.query(`SELECT dk.marcar_factura_emitida($1)`, [id]));
}

export interface PedidoPendienteMantenimiento {
  id: string;
  email: string;
  nombreContacto: string;
  restauranteNombre: string | null;
}

/** Pedidos de Núcleo Operativo con 60+ días desde el pago y sin disparar (0017). */
export async function pedidosPendientesMantenimientoNucleoOperativo(): Promise<PedidoPendienteMantenimiento[]> {
  return comoAprovisionamiento(async (c) => {
    const { rows } = await c.query<{
      id: string;
      email: string;
      nombre_contacto: string;
      restaurante_nombre: string | null;
    }>(`SELECT * FROM dk.pedidos_pendientes_mantenimiento_nucleo_operativo()`);
    return rows.map((fila) => ({
      id: fila.id,
      email: fila.email,
      nombreContacto: fila.nombre_contacto,
      restauranteNombre: fila.restaurante_nombre,
    }));
  });
}

export async function marcarMantenimientoDisparado(id: string): Promise<void> {
  await comoAprovisionamiento((c) => c.query(`SELECT dk.marcar_mantenimiento_disparado($1)`, [id]));
}
