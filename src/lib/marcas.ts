import 'server-only';
import { comoCliente, comoAprovisionamiento } from '@/lib/db';

/**
 * Dark Kitchen Ruta B (Parte 8, Sección 5) — marcas virtuales añadidas sobre
 * una cocina que ya opera. El precio de desarrollo se recalcula siempre en
 * `dk.crear_marca_ruta_b` (0016) según el orden real de marcas del
 * restaurante — nunca se confía en un precio calculado fuera de la base de
 * datos para lo que se guarda.
 */

/**
 * Cuántas marcas tiene ya el restaurante — la usa el checkout (con sesión
 * real del cliente) para mostrar el precio correcto ANTES de pagar. El
 * precio que se le muestra aquí es solo informativo: `dk.crear_marca_ruta_b`
 * vuelve a calcularlo por su cuenta al confirmar el pago.
 */
export async function contarMarcasActivas(jwt: string, restauranteId: string): Promise<number> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{ contar_marcas_activas: number }>(
      `SELECT dk.contar_marcas_activas($1)`,
      [restauranteId]
    );
    return rows[0]?.contar_marcas_activas ?? 0;
  });
}

export interface Marca {
  id: string;
  restauranteId: string;
  nombre: string;
  orden: number;
  precioDesarrolloCentimos: number;
}

/** Solo la llama el webhook de pago, tras `payment.succeeded` — nunca la app. */
export async function crearMarcaRutaB(
  restauranteId: string,
  nombre: string,
  referenciaPago: string
): Promise<Marca> {
  return comoAprovisionamiento(async (c) => {
    const { rows } = await c.query<{
      id: string;
      restaurante_id: string;
      nombre: string;
      orden: number;
      precio_desarrollo_centimos: number;
    }>(`SELECT * FROM dk.crear_marca_ruta_b($1, $2, $3)`, [restauranteId, nombre, referenciaPago]);
    const fila = rows[0];
    if (!fila) throw new Error('dk.crear_marca_ruta_b no devolvió fila.');
    return {
      id: fila.id,
      restauranteId: fila.restaurante_id,
      nombre: fila.nombre,
      orden: fila.orden,
      precioDesarrolloCentimos: fila.precio_desarrollo_centimos,
    };
  });
}
