import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Estudio de carta (0037): etiquetas, promociones con fechas, combos con
 * precio cerrado y datos legales del negocio. La pertenencia la garantizan
 * las políticas RLS; las reglas (promo < precio, combos sin combos dentro,
 * mismo restaurante, máximo 12 platos) las comprueba la propia base.
 */

export type Etiqueta = 'especial' | 'nuevo' | 'recomendado';
export const ETIQUETAS: Etiqueta[] = ['especial', 'nuevo', 'recomendado'];

export interface ExtraPlato {
  id: string;
  etiqueta: Etiqueta | null;
  precioPromo: string | null;
  promoDesde: string | null;
  promoHasta: string | null;
  esCombo: boolean;
  componentes: { itemId: string; cantidad: number }[];
}

export async function listarExtras(jwt: string, restauranteId: string): Promise<ExtraPlato[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query(
      `SELECT m.id, m.etiqueta, m.precio_promo, to_char(m.promo_desde, 'YYYY-MM-DD') promo_desde,
              to_char(m.promo_hasta, 'YYYY-MM-DD') promo_hasta, m.es_combo,
              coalesce((SELECT json_agg(json_build_object('itemId', ci.item_id, 'cantidad', ci.cantidad))
                          FROM menu_combo_items ci WHERE ci.combo_id = m.id), '[]') componentes
         FROM menu_items m WHERE m.restaurante_id = $1`,
      [restauranteId]
    );
    return rows.map((r) => ({
      id: r.id, etiqueta: r.etiqueta, precioPromo: r.precio_promo, promoDesde: r.promo_desde,
      promoHasta: r.promo_hasta, esCombo: r.es_combo, componentes: r.componentes,
    }));
  });
}

export async function guardarExtras(
  jwt: string,
  platoId: string,
  d: { etiqueta: Etiqueta | null; precioPromo: number | null; promoDesde: string | null; promoHasta: string | null }
) {
  await comoCliente(jwt, (c) => c.query(
    `UPDATE menu_items SET etiqueta = $2, precio_promo = $3, promo_desde = $4, promo_hasta = $5 WHERE id = $1`,
    [platoId, d.etiqueta, d.precioPromo, d.promoDesde, d.promoHasta]));
}

export interface DatosCombo {
  nombre: string;
  descripcion: string | null;
  precio: number;
  seccionId: string | null;
  fotoUrl: string | null;
  componentes: { itemId: string; cantidad: number }[];
}

/** Crea o actualiza un combo y sus platos en una sola transacción. */
export async function guardarCombo(jwt: string, restauranteId: string, comboId: string | null, d: DatosCombo): Promise<string> {
  return comoCliente(jwt, async (c) => {
    await c.query('SAVEPOINT combo');
    try {
      let id = comboId;
      if (id) {
        const r = await c.query(
          `UPDATE menu_items SET nombre = $2, descripcion = $3, precio = $4, seccion_id = $5, foto_url = $6
            WHERE id = $1 AND es_combo RETURNING id`,
          [id, d.nombre, d.descripcion, d.precio, d.seccionId, d.fotoUrl]);
        if (!r.rowCount) throw new Error('Combo no encontrado.');
        await c.query('DELETE FROM menu_combo_items WHERE combo_id = $1', [id]);
      } else {
        const { rows } = await c.query(
          `INSERT INTO menu_items (restaurante_id, seccion_id, nombre, descripcion, precio, foto_url, alergenos, disponible, orden, es_combo)
           VALUES ($1, $2, $3, $4, $5, $6, '{}', true,
                   (SELECT coalesce(max(orden), -1) + 1 FROM menu_items WHERE restaurante_id = $1), true)
           RETURNING id`,
          [restauranteId, d.seccionId, d.nombre, d.descripcion, d.precio, d.fotoUrl]);
        id = rows[0].id as string;
      }
      for (const x of d.componentes) {
        await c.query('INSERT INTO menu_combo_items (combo_id, item_id, cantidad) VALUES ($1, $2, $3)', [id, x.itemId, x.cantidad]);
      }
      // Los alérgenos del combo son la suma de los de sus platos (obligatorio informar).
      await c.query(
        `UPDATE menu_items SET alergenos = coalesce((SELECT array_agg(DISTINCT a ORDER BY a) FROM menu_combo_items ci
            JOIN menu_items m ON m.id = ci.item_id, unnest(m.alergenos) a WHERE ci.combo_id = $1), '{}') WHERE id = $1`,
        [id]);
      await c.query('RELEASE SAVEPOINT combo');
      return id!;
    } catch (e) {
      await c.query('ROLLBACK TO SAVEPOINT combo');
      throw e;
    }
  });
}

export interface DatosLegal {
  titular: string | null;
  nif: string | null;
  email: string | null;
  domicilio: string | null;
  activo: boolean;
}

export async function obtenerLegal(jwt: string, restauranteId: string): Promise<DatosLegal> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query(
      'SELECT legal_titular, legal_nif, legal_email, legal_domicilio, legal_activo FROM restaurantes WHERE id = $1', [restauranteId]);
    const r = rows[0] ?? {};
    return { titular: r.legal_titular ?? null, nif: r.legal_nif ?? null, email: r.legal_email ?? null, domicilio: r.legal_domicilio ?? null, activo: !!r.legal_activo };
  });
}

export async function guardarLegal(jwt: string, restauranteId: string, d: DatosLegal) {
  await comoCliente(jwt, (c) => c.query(
    `UPDATE restaurantes SET legal_titular = $2, legal_nif = $3, legal_email = $4, legal_domicilio = $5, legal_activo = $6 WHERE id = $1`,
    [restauranteId, d.titular, d.nif, d.email, d.domicilio, d.activo]));
}
