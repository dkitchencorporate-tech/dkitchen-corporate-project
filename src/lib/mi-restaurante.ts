import 'server-only';
import { comoCliente } from '@/lib/db';

export interface MiRestaurante {
  id: string;
  slug: string;
  nombre: string;
  logoUrl: string | null;
  plan: string;
  activo: boolean;
  colorMarca: string | null;
  estadoAcceso: string;
  descripcion: string | null;
  telefono: string | null;
  direccion: string | null;
  horario: string | null;
  instagram: string | null;
  urlResenas: string | null;
  plantilla: string;
  nivelDiseno: string;
  /** Foto de cabecera de la carta (0043). Sin ella, la carta usa la primera foto de un plato. */
  portadaUrl?: string | null;
  portadaConNombre?: boolean;
  idiomas: string[];
  whatsapp: string | null;
  creadoEn: string;
  estiloFondo: string;
  estiloLetra: string;
}

/** El restaurante del cliente que ha iniciado sesión — nunca de otro. */
export async function obtenerMiRestaurante(jwt: string): Promise<MiRestaurante | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{
      id: string;
      slug: string;
      nombre: string;
      logo_url: string | null;
      plan: string;
      activo: boolean;
      color_marca: string | null;
      estado_acceso: string;
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
      idiomas: string[];
      whatsapp: string | null;
      creado_en: Date;
      estilo_fondo: string;
      estilo_letra: string;
    }>(
      `SELECT id, slug, nombre, logo_url, plan, activo, color_marca, estado_acceso,
              descripcion, telefono, direccion, horario, instagram, url_resenas, plantilla, nivel_diseno, idiomas, whatsapp, creado_en, estilo_fondo, estilo_letra, portada_url, portada_con_nombre
         FROM restaurantes
        WHERE propietario = dk.identidad_actual()`
    );
    const fila = rows[0];
    if (!fila) return null;
    return {
      id: fila.id,
      slug: fila.slug,
      nombre: fila.nombre,
      logoUrl: fila.logo_url,
      plan: fila.plan,
      activo: fila.activo,
      colorMarca: fila.color_marca,
      estadoAcceso: fila.estado_acceso,
      descripcion: fila.descripcion,
      telefono: fila.telefono,
      direccion: fila.direccion,
      horario: fila.horario,
      instagram: fila.instagram,
      urlResenas: fila.url_resenas,
      plantilla: fila.plantilla,
      nivelDiseno: fila.nivel_diseno,
      portadaUrl: fila.portada_url,
      portadaConNombre: fila.portada_con_nombre,
      idiomas: fila.idiomas ?? [],
      whatsapp: fila.whatsapp,
      creadoEn: new Date(fila.creado_en).toISOString(),
      estiloFondo: fila.estilo_fondo,
      estiloLetra: fila.estilo_letra,
    };
  });
}

/** El código QR activo del restaurante — la carta apunta siempre a /r/{codigo}. */
export async function obtenerCodigoQr(jwt: string, restauranteId: string): Promise<string | null> {
  return comoCliente(jwt, async (c) => {
    const { rows } = await c.query<{ codigo: string }>(
      `SELECT codigo FROM codigos_qr WHERE restaurante_id = $1 AND activo = true LIMIT 1`,
      [restauranteId]
    );
    return rows[0]?.codigo ?? null;
  });
}

export interface DatosLocal {
  nombre: string;
  logoUrl: string | null;
  colorMarca: string | null;
  descripcion: string | null;
  telefono: string | null;
  direccion: string | null;
  horario: string | null;
  instagram: string | null;
  urlResenas: string | null;
  whatsapp: string | null;
}

/** Solo columnas con GRANT UPDATE a dk_auth (plan y estado quedan fuera por diseño). */
export async function actualizarDatosLocal(jwt: string, restauranteId: string, d: DatosLocal): Promise<void> {
  await comoCliente(jwt, async (c) => {
    await c.query(
      `UPDATE restaurantes
          SET nombre = $2, logo_url = $3, color_marca = $4, descripcion = $5, telefono = $6,
              direccion = $7, horario = $8, instagram = $9, url_resenas = $10, whatsapp = $11
        WHERE id = $1`,
      [restauranteId, d.nombre, d.logoUrl, d.colorMarca, d.descripcion, d.telefono, d.direccion, d.horario, d.instagram, d.urlResenas, d.whatsapp]
    );
  });
}

/** Estilo de la carta (0031). El disparador dk.control_diseno_cliente valida nivel y paleta. */
export async function guardarEstilo(jwt: string, restauranteId: string, e: { plantilla: string; fondo: string; letra: string; color: string }) {
  await comoCliente(jwt, (c) => c.query(
    'UPDATE restaurantes SET plantilla = $2, estilo_fondo = $3, estilo_letra = $4, color_marca = $5 WHERE id = $1',
    [restauranteId, e.plantilla, e.fondo, e.letra, e.color]));
}

/** Foto de portada (0043). */
export async function guardarPortada(jwt: string, restauranteId: string, url: string | null, conNombre = false) {
  await comoCliente(jwt, (c) => c.query('UPDATE restaurantes SET portada_url = $2, portada_con_nombre = $3 WHERE id = $1', [restauranteId, url, !!url && conNombre]));
}
