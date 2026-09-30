import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * CRUD real de la carta del propio restaurante — a diferencia de
 * pedidos_nivel_b/marcas, aquí no hace falta ninguna función dk.* mediadora:
 * las políticas RLS de menu_items/menu_secciones ("item_del_propietario",
 * "seccion_del_propietario") ya conceden ALL a dk_auth con dueño = fila,
 * verificado contra dk.identidad_actual() en la propia base — es el patrón
 * correcto cuando no hay nada que recalcular server-side, solo pertenencia.
 */

export interface SeccionPropia {
  id: string;
  nombre: string;
  orden: number;
}

export interface PlatoPropio {
  id: string;
  seccionId: string | null;
  nombre: string;
  descripcion: string | null;
  precio: string;
  fotoUrl: string | null;
  alergenos: string[];
  disponible: boolean;
  orden: number;
  /** Combo del Estudio (0037): sus alérgenos se calculan solos. */
  esCombo?: boolean;
}

export async function listarMiCarta(
  jwt: string,
  restauranteId: string
): Promise<{ secciones: SeccionPropia[]; platos: PlatoPropio[] }> {
  return comoCliente(jwt, async (c) => {
    const { rows: secciones } = await c.query<{ id: string; nombre: string; orden: number }>(
      `SELECT id, nombre, orden FROM menu_secciones WHERE restaurante_id = $1 ORDER BY orden, nombre`,
      [restauranteId]
    );
    const { rows: platos } = await c.query<{
      id: string;
      seccion_id: string | null;
      nombre: string;
      descripcion: string | null;
      precio: string;
      foto_url: string | null;
      alergenos: string[];
      disponible: boolean;
      orden: number;
      es_combo: boolean;
    }>(
      `SELECT id, seccion_id, nombre, descripcion, precio, foto_url, alergenos, disponible, orden, es_combo
         FROM menu_items WHERE restaurante_id = $1 ORDER BY orden, nombre`,
      [restauranteId]
    );
    return {
      secciones,
      platos: platos.map((p) => ({
        id: p.id,
        seccionId: p.seccion_id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        fotoUrl: p.foto_url,
        alergenos: p.alergenos ?? [],
        disponible: p.disponible,
        orden: p.orden,
        esCombo: p.es_combo,
      })),
    };
  });
}

export async function crearSeccion(jwt: string, restauranteId: string, nombre: string): Promise<SeccionPropia> {
  return comoCliente(jwt, async (c) => {
    const { rows: existentes } = await c.query<{ max: number | null }>(
      `SELECT max(orden) AS max FROM menu_secciones WHERE restaurante_id = $1`,
      [restauranteId]
    );
    const orden = (existentes[0]?.max ?? -1) + 1;
    const { rows } = await c.query<{ id: string; nombre: string; orden: number }>(
      `INSERT INTO menu_secciones (restaurante_id, nombre, orden) VALUES ($1, $2, $3) RETURNING id, nombre, orden`,
      [restauranteId, nombre, orden]
    );
    return rows[0];
  });
}

export async function editarSeccion(jwt: string, seccionId: string, nombre: string): Promise<void> {
  await comoCliente(jwt, (c) => c.query(`UPDATE menu_secciones SET nombre = $2 WHERE id = $1`, [seccionId, nombre]));
}

export async function eliminarSeccion(jwt: string, seccionId: string): Promise<void> {
  await comoCliente(jwt, (c) => c.query(`DELETE FROM menu_secciones WHERE id = $1`, [seccionId]));
}

export interface DatosPlato {
  seccionId: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  fotoUrl: string | null;
  alergenos: string[];
}

export async function crearPlato(jwt: string, restauranteId: string, datos: DatosPlato): Promise<PlatoPropio> {
  return comoCliente(jwt, async (c) => {
    const { rows: existentes } = await c.query<{ max: number | null }>(
      `SELECT max(orden) AS max FROM menu_items WHERE restaurante_id = $1`,
      [restauranteId]
    );
    const orden = (existentes[0]?.max ?? -1) + 1;
    const { rows } = await c.query<{
      id: string;
      seccion_id: string | null;
      nombre: string;
      descripcion: string | null;
      precio: string;
      foto_url: string | null;
      alergenos: string[];
      disponible: boolean;
      orden: number;
    }>(
      `INSERT INTO menu_items (restaurante_id, seccion_id, nombre, descripcion, precio, foto_url, alergenos, disponible, orden)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
       RETURNING id, seccion_id, nombre, descripcion, precio, foto_url, alergenos, disponible, orden`,
      [restauranteId, datos.seccionId, datos.nombre, datos.descripcion, datos.precio, datos.fotoUrl, datos.alergenos, orden]
    );
    const p = rows[0];
    return {
      id: p.id,
      seccionId: p.seccion_id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      fotoUrl: p.foto_url,
      alergenos: p.alergenos ?? [],
      disponible: p.disponible,
      orden: p.orden,
    };
  });
}

export async function editarPlato(
  jwt: string,
  platoId: string,
  datos: Partial<DatosPlato> & { disponible?: boolean }
): Promise<void> {
  await comoCliente(jwt, async (c) => {
    const campos: string[] = [];
    const valores: unknown[] = [];
    let i = 1;

    if (datos.seccionId !== undefined) { campos.push(`seccion_id = $${++i}`); valores.push(datos.seccionId); }
    if (datos.nombre !== undefined) { campos.push(`nombre = $${++i}`); valores.push(datos.nombre); }
    if (datos.descripcion !== undefined) { campos.push(`descripcion = $${++i}`); valores.push(datos.descripcion); }
    if (datos.precio !== undefined) { campos.push(`precio = $${++i}`); valores.push(datos.precio); }
    if (datos.fotoUrl !== undefined) { campos.push(`foto_url = $${++i}`); valores.push(datos.fotoUrl); }
    if (datos.alergenos !== undefined) { campos.push(`alergenos = $${++i}`); valores.push(datos.alergenos); }
    if (datos.disponible !== undefined) { campos.push(`disponible = $${++i}`); valores.push(datos.disponible); }

    if (campos.length === 0) return;
    await c.query(`UPDATE menu_items SET ${campos.join(', ')} WHERE id = $1`, [platoId, ...valores]);
  });
}

export async function eliminarPlato(jwt: string, platoId: string): Promise<void> {
  await comoCliente(jwt, (c) => c.query(`DELETE FROM menu_items WHERE id = $1`, [platoId]));
}
