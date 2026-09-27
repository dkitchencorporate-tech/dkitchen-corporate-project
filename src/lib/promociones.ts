import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Promociones del banner de la carta (0023). RLS: cada dueño ve y edita solo
 * las suyas. Los límites del plan Básico (1 activa, sin programación) los
 * impone el trigger dk.tope_promociones(), no esta capa.
 */

export interface DatosPromocion {
  /** Opcional si hay imagen (0024: banner ya diseñado). */
  titulo: string | null;
  texto: string | null;
  imagenUrl: string | null;
  botonTexto: string | null;
  botonSeccion: string | null;
  inicio: string | null;
  fin: string | null;
  dias: number[] | null;
  horaInicio: string | null;
  horaFin: string | null;
  prioridad: number;
  activa: boolean;
}

export interface Promocion extends DatosPromocion {
  id: string;
  vistas: number;
  clics: number;
}

const COLUMNAS = `id, titulo, texto, imagen_url, boton_texto, boton_seccion, to_char(inicio, 'YYYY-MM-DD') inicio,
  to_char(fin, 'YYYY-MM-DD') fin, dias, to_char(hora_inicio, 'HH24:MI') hora_inicio, to_char(hora_fin, 'HH24:MI') hora_fin,
  prioridad, activa, vistas, clics`;

export async function listarPromociones(jwt: string, restauranteId: string): Promise<Promocion[]> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query(
      `SELECT ${COLUMNAS} FROM promociones WHERE restaurante_id = $1 ORDER BY activa DESC, prioridad DESC, creado_en DESC`,
      [restauranteId]
    );
    return rows.map((p) => ({
      id: p.id, titulo: p.titulo, texto: p.texto, imagenUrl: p.imagen_url, botonTexto: p.boton_texto,
      botonSeccion: p.boton_seccion, inicio: p.inicio, fin: p.fin, dias: p.dias, horaInicio: p.hora_inicio,
      horaFin: p.hora_fin, prioridad: p.prioridad, activa: p.activa, vistas: p.vistas, clics: p.clics,
    }));
  });
}

const valores = (d: DatosPromocion) => [
  d.titulo, d.texto, d.imagenUrl, d.botonTexto, d.botonSeccion, d.inicio, d.fin, d.dias, d.horaInicio, d.horaFin, d.prioridad, d.activa,
];

export async function crearPromocion(jwt: string, restauranteId: string, d: DatosPromocion): Promise<void> {
  await comoCliente(jwt, (c) =>
    c.query(
      `INSERT INTO promociones (restaurante_id, titulo, texto, imagen_url, boton_texto, boton_seccion, inicio, fin, dias,
                                hora_inicio, hora_fin, prioridad, activa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [restauranteId, ...valores(d)]
    )
  );
}

export async function editarPromocion(jwt: string, id: string, d: DatosPromocion): Promise<void> {
  await comoCliente(jwt, (c) =>
    c.query(
      `UPDATE promociones SET titulo = $2, texto = $3, imagen_url = $4, boton_texto = $5, boton_seccion = $6, inicio = $7,
              fin = $8, dias = $9, hora_inicio = $10, hora_fin = $11, prioridad = $12, activa = $13
        WHERE id = $1`,
      [id, ...valores(d)]
    )
  );
}

export async function eliminarPromocion(jwt: string, id: string): Promise<void> {
  await comoCliente(jwt, (c) => c.query('DELETE FROM promociones WHERE id = $1', [id]));
}
