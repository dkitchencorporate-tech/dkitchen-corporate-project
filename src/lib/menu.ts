import 'server-only';

import { comoVisitante } from '@/lib/db';

/**
 * CONSULTAS DEL MOTOR DE QR DE CARTA
 *
 * Todo lo de aquí se ejecuta con el sombrero `dk_anon`: quien escanea un QR
 * pegado en una mesa no tiene sesión, ni la va a tener.
 *
 * Eso significa que este módulo **no filtra nada por su cuenta**. No hay un
 * `WHERE activo = true` escrito a mano en ninguna consulta. Los restaurantes
 * desactivados y los platos agotados no aparecen porque las políticas de la
 * base no se los enseñan a `dk_anon`, no porque aquí nos acordemos de excluirlos.
 *
 * La diferencia importa: un filtro en el código se olvida al escribir la
 * consulta siguiente. Una política no se olvida nunca.
 */

export interface PlatoCarta {
  id: string;
  seccionId: string | null;
  nombre: string;
  descripcion: string | null;
  precio: string;
  fotoUrl: string | null;
  alergenos: string[];
}

export interface SeccionCarta {
  id: string;
  nombre: string;
  platos: PlatoCarta[];
}

export interface Carta {
  slug: string;
  nombre: string;
  logoUrl: string | null;
  plan?: string;
  colorMarca?: string | null;
  descripcion?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  horario?: string | null;
  instagram?: string | null;
  urlResenas?: string | null;
  secciones: SeccionCarta[];
  /** Platos que no están asignados a ninguna sección. */
  sueltos: PlatoCarta[];
}

/**
 * Carta pública de un restaurante.
 *
 * Devuelve null si no hay nada que mostrar, sin distinguir entre "no existe" y
 * "está desactivado". Quien pregunta no tiene por qué poder deducir qué
 * restaurantes son clientes nuestros probando slugs.
 *
 * El slug se normaliza a minúsculas aquí, en la frontera, igual que
 * `/r/{codigo}` ya hacía con el código. La restricción de la tabla solo
 * admite slugs en minúsculas, así que sin esto una URL tecleada o compartida
 * con una mayúscula de más devuelve un 404 en vez del menú, en lugar de
 * resolver como cabría esperar.
 */
export async function obtenerCarta(slugOriginal: string): Promise<Carta | null> {
  const slug = slugOriginal.toLowerCase();
  return comoVisitante(async (c) => {
    const { rows: restaurantes } = await c.query<{
      id: string;
      slug: string;
      nombre: string;
      logo_url: string | null;
      plan: string;
      color_marca: string | null;
      descripcion: string | null;
      telefono: string | null;
      direccion: string | null;
      horario: string | null;
      instagram: string | null;
      url_resenas: string | null;
    }>(
      `SELECT id, slug, nombre, logo_url, plan, color_marca, descripcion, telefono,
              direccion, horario, instagram, url_resenas
         FROM restaurantes WHERE slug = $1`,
      [slug]
    );

    const restaurante = restaurantes[0];
    if (!restaurante) return null;

    const { rows: secciones } = await c.query<{ id: string; nombre: string }>(
      'SELECT id, nombre FROM menu_secciones WHERE restaurante_id = $1 ORDER BY orden, nombre',
      [restaurante.id]
    );

    const { rows: platos } = await c.query<{
      id: string;
      seccion_id: string | null;
      nombre: string;
      descripcion: string | null;
      precio: string;
      foto_url: string | null;
      alergenos: string[];
    }>(
      `SELECT id, seccion_id, nombre, descripcion, precio, foto_url, alergenos
         FROM menu_items
        WHERE restaurante_id = $1
        ORDER BY orden, nombre`,
      [restaurante.id]
    );

    const enCarta = (p: (typeof platos)[number]): PlatoCarta => ({
      id: p.id,
      seccionId: p.seccion_id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      fotoUrl: p.foto_url,
      alergenos: p.alergenos ?? [],
    });

    return {
      slug: restaurante.slug,
      nombre: restaurante.nombre,
      logoUrl: restaurante.logo_url,
      plan: restaurante.plan,
      colorMarca: restaurante.color_marca,
      descripcion: restaurante.descripcion,
      telefono: restaurante.telefono,
      direccion: restaurante.direccion,
      horario: restaurante.horario,
      instagram: restaurante.instagram,
      urlResenas: restaurante.url_resenas,
      secciones: secciones
        .map((s) => ({
          id: s.id,
          nombre: s.nombre,
          platos: platos.filter((p) => p.seccion_id === s.id).map(enCarta),
        }))
        // Una sección cuyos platos están todos agotados no se enseña vacía.
        .filter((s) => s.platos.length > 0),
      sueltos: platos.filter((p) => p.seccion_id === null).map(enCarta),
    };
  });
}

/**
 * Registra un escaneo y devuelve a dónde hay que llevar a quien lo hizo.
 *
 * El registro y la resolución son la misma operación, dentro de `dk.resolver_codigo`.
 * No es una comodidad: `dk_anon` no tiene permiso de escritura sobre `escaneos`,
 * así que no existe forma de apuntar un escaneo que no corresponda a un código
 * real y activo. Nadie puede inflar las cifras de un restaurante ajeno ni
 * falsear la fecha, que es de donde sale el umbral mensual del ciclo de vida.
 */
export async function resolverCodigo(
  codigo: string,
  userAgent: string | null,
  pais: string | null
): Promise<{ slug: string; nombre: string } | null> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query<{ slug: string; nombre: string }>(
      'SELECT slug, nombre FROM dk.resolver_codigo($1, $2, $3)',
      [codigo, userAgent, pais]
    );
    return rows[0] ?? null;
  });
}
