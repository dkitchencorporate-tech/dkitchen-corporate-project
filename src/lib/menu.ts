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
  /** Estudio (0037). Opcionales: los espejos antiguos no los traen. */
  etiqueta?: 'especial' | 'nuevo' | 'recomendado' | null;
  /** Precio normal tachado mientras hay una promoción vigente (`precio` ya es el de promoción). */
  precioAnterior?: string | null;
  /** Platos que incluye un combo. */
  combo?: { id?: string; nombre: string; cantidad: number }[] | null;
  /** Lo que se ahorra con el combo frente a pedir sus platos sueltos. */
  ahorro?: string | null;
}

export interface SeccionCarta {
  id: string;
  nombre: string;
  descripcion?: string | null;
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
  /** clasica | visual | express (0023). Ausente en espejos antiguos → clásica. */
  plantilla?: string;
  /** esencial | autor | signature (0026). Ausente en espejos antiguos → esencial. */
  nivelDiseno?: string;
  /** papel | blanco | oscuro y sans | serif (0031). */
  estiloFondo?: string;
  estiloLetra?: string;
  /** Foto de cabecera elegida por el cliente (0043). */
  portadaUrl?: string | null;
  /** La portada ya lleva el nombre escrito: no se repite encima (0044). */
  portadaConNombre?: boolean;
  /** Idiomas activos del Pack de idiomas (0027). */
  idiomas?: string[];
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
      plantilla: string;
      nivel_diseno: string;
      portada_url: string | null;
      portada_con_nombre: boolean;
      estilo_fondo: string;
      estilo_letra: string;
      idiomas: string[];
    }>(
      `SELECT id, slug, nombre, logo_url, plan, color_marca, descripcion, telefono,
              direccion, horario, instagram, url_resenas, plantilla, nivel_diseno, idiomas, estilo_fondo, estilo_letra, portada_url, portada_con_nombre
         FROM restaurantes WHERE slug = $1`,
      [slug]
    );

    const restaurante = restaurantes[0];
    if (!restaurante) return null;

    const { rows: secciones } = await c.query<{ id: string; nombre: string; descripcion: string | null }>(
      'SELECT id, nombre, descripcion FROM menu_secciones WHERE restaurante_id = $1 ORDER BY orden, nombre',
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
      etiqueta: 'especial' | 'nuevo' | 'recomendado' | null;
      precio_anterior: string | null;
      combo: { id?: string; nombre: string; cantidad: number }[] | null;
      ahorro: string | null;
    }>(
      `SELECT m.id, m.seccion_id, m.nombre, m.descripcion, dk.precio_vigente(m) AS precio, m.foto_url,
              CASE WHEN m.es_combo THEN coalesce((SELECT array_agg(DISTINCT a ORDER BY a) FROM menu_combo_items ci
                     JOIN menu_items i ON i.id = ci.item_id, unnest(i.alergenos) a WHERE ci.combo_id = m.id), '{}') ELSE m.alergenos END AS alergenos,
              m.etiqueta,
              CASE WHEN dk.precio_vigente(m) < m.precio THEN m.precio END AS precio_anterior,
              CASE WHEN m.es_combo THEN (SELECT json_agg(json_build_object('id', i.id, 'nombre', i.nombre, 'cantidad', ci.cantidad) ORDER BY i.orden)
                                           FROM menu_combo_items ci JOIN menu_items i ON i.id = ci.item_id WHERE ci.combo_id = m.id) END AS combo,
              CASE WHEN m.es_combo THEN nullif(greatest((SELECT sum(dk.precio_vigente(i) * ci.cantidad) FROM menu_combo_items ci
                                           JOIN menu_items i ON i.id = ci.item_id WHERE ci.combo_id = m.id) - dk.precio_vigente(m), 0), 0) END AS ahorro
         FROM menu_items m
        WHERE m.restaurante_id = $1
          -- Un combo con algún plato agotado no se muestra (las políticas ya ocultan los agotados a dk_anon).
          AND (NOT m.es_combo OR (SELECT count(*) FROM menu_combo_items ci WHERE ci.combo_id = m.id)
                = (SELECT count(*) FROM menu_combo_items ci JOIN menu_items i ON i.id = ci.item_id WHERE ci.combo_id = m.id))
        ORDER BY m.orden, m.nombre`,
      [restaurante.id]
    );

    // Mayúscula inicial en la carta (muchos clientes escriben todo en minúsculas).
    const may = (t: string | null) => (t ? t.charAt(0).toLocaleUpperCase('es') + t.slice(1) : t);
    const enCarta = (p: (typeof platos)[number]): PlatoCarta => ({
      id: p.id,
      seccionId: p.seccion_id,
      nombre: may(p.nombre) ?? p.nombre,
      descripcion: may(p.descripcion),
      precio: p.precio,
      fotoUrl: p.foto_url,
      alergenos: p.alergenos ?? [],
      etiqueta: p.etiqueta,
      precioAnterior: p.precio_anterior,
      combo: p.combo,
      ahorro: p.ahorro,
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
      plantilla: restaurante.plantilla,
      nivelDiseno: restaurante.nivel_diseno,
      portadaUrl: restaurante.portada_url ?? null,
      portadaConNombre: !!restaurante.portada_con_nombre,
      estiloFondo: restaurante.estilo_fondo,
      estiloLetra: restaurante.estilo_letra,
      idiomas: restaurante.idiomas ?? [],
      secciones: secciones
        .map((s) => ({
          id: s.id,
          nombre: s.nombre.charAt(0).toLocaleUpperCase('es') + s.nombre.slice(1),
          descripcion: s.descripcion,
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

export interface Banner {
  id: string;
  /** Opcional: un banner puede ser solo imagen ya diseñada (0024). */
  titulo: string | null;
  texto: string | null;
  imagenUrl: string | null;
  botonTexto: string | null;
  botonSeccion: string | null;
  /** inicio | seccion | plato | reservar | ninguno (0037). */
  botonDestino?: string;
  botonPlato?: string | null;
}

/**
 * Banners que tocan mostrar AHORA en el carrusel de la carta (fechas, días y
 * horas en hora de Madrid, prioridad primero; 1 en Básico, hasta 3 en
 * Ampliado). Lo decide dk.banners_vigentes() (0024): la tabla de promociones
 * no es legible por dk_anon.
 */
export async function obtenerBanners(slug: string): Promise<Banner[]> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.banners_vigentes($1)', [slug.toLowerCase()]);
    return rows.map((p) => ({
      id: p.id, titulo: p.titulo, texto: p.texto, imagenUrl: p.imagen_url, botonTexto: p.boton_texto, botonSeccion: p.boton_seccion,
      botonDestino: p.boton_destino ?? 'inicio', botonPlato: p.boton_plato ?? null,
    }));
  });
}

/** Vista o clic del banner. Anti-inflado por visitante dentro de la función SQL. */
export async function registrarEventoPromocion(promocionId: string, tipo: 'vista' | 'clic', clave: string): Promise<void> {
  await comoVisitante((c) => c.query('SELECT dk.registrar_evento_promocion($1, $2, $3)', [promocionId, tipo, clave]));
}

/** Datos legales del negocio (0037). Solo existen si el propio cliente los ha publicado. */
export interface LegalNegocio { nombre: string; titular: string; nif: string | null; email: string; domicilio: string | null; telefono: string | null }

export async function obtenerLegalPublico(slug: string): Promise<LegalNegocio | null> {
  return comoVisitante(async (c) => {
    const { rows } = await c.query('SELECT * FROM dk.legal_publico($1)', [slug.toLowerCase()]);
    return rows[0] ?? null;
  });
}
