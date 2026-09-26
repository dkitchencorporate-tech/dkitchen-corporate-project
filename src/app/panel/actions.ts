'use server';

import { revalidatePath } from 'next/cache';
import { obtenerJwtDeSesion, identidadActual } from '@/lib/sesion';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { obtenerMiRestaurante, actualizarDatosLocal, type DatosLocal } from '@/lib/mi-restaurante';
import { atenderLlamada, llamadasPendientes } from '@/lib/llamadas-camarero';
import { crearCheckoutUpgradeAmpliado } from '@/lib/payments/whop';
import {
  crearSeccion as dbCrearSeccion,
  editarSeccion as dbEditarSeccion,
  eliminarSeccion as dbEliminarSeccion,
  crearPlato as dbCrearPlato,
  editarPlato as dbEditarPlato,
  eliminarPlato as dbEliminarPlato,
  type DatosPlato,
} from '@/lib/menu-propietario';
import { crearSolicitudQrFisico as dbCrearSolicitudQrFisico, type TipoQrFisico } from '@/lib/solicitudes-qr-fisico';
import { crearTicket as dbCrearTicket } from '@/lib/tickets';

/**
 * Todas las acciones repiten el mismo patrón: obtener el JWT + el
 * restaurante del propio dueño de la sesión, nunca confiar en un
 * restauranteId que llegue del formulario del cliente — evita que alguien
 * manipule el DOM para escribir en la carta de otro restaurante. RLS ya lo
 * impediría a nivel de base de datos, pero resolverlo aquí también evita una
 * llamada que sabemos que va a fallar.
 */
async function requerirSesionYRestaurante() {
  const jwt = await obtenerJwtDeSesion();
  const identidad = await identidadActual();
  if (!jwt || !identidad) throw new Error('No has iniciado sesión.');
  const restaurante = await obtenerMiRestaurante(jwt);
  if (!restaurante) throw new Error('No se encontró tu restaurante.');
  return { jwt, identidad, restaurante };
}

export async function crearSeccionAction(nombre: string) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbCrearSeccion(jwt, restaurante.id, nombre);
  revalidatePath('/panel');
}

export async function editarSeccionAction(seccionId: string, nombre: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEditarSeccion(jwt, seccionId, nombre);
  revalidatePath('/panel');
}

export async function eliminarSeccionAction(seccionId: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEliminarSeccion(jwt, seccionId);
  revalidatePath('/panel');
}

export async function crearPlatoAction(datos: DatosPlato) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  await dbCrearPlato(jwt, restaurante.id, datos);
  revalidatePath('/panel');
}

export async function editarPlatoAction(platoId: string, datos: Partial<DatosPlato> & { disponible?: boolean }) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEditarPlato(jwt, platoId, datos);
  revalidatePath('/panel');
}

export async function eliminarPlatoAction(platoId: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await dbEliminarPlato(jwt, platoId);
  revalidatePath('/panel');
}

export async function crearSolicitudQrFisicoAction(datos: {
  tipo: TipoQrFisico;
  cantidad: number;
  direccionEnvio: string;
  notas?: string;
}) {
  const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
  await dbCrearSolicitudQrFisico(jwt, restaurante.id, datos, {
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
  });
  revalidatePath('/panel');
}

export async function crearTicketAction(datos: { asunto: string; mensaje: string }) {
  const { jwt, identidad, restaurante } = await requerirSesionYRestaurante();
  await dbCrearTicket(jwt, restaurante.id, datos, {
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
  });
  revalidatePath('/panel');
}

const TIPOS_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Sube una foto (ya comprimida en el navegador) al almacén público de Vercel Blob. */
export async function subirImagenAction(formulario: FormData): Promise<{ url: string }> {
  const { restaurante } = await requerirSesionYRestaurante();
  const archivo = formulario.get('archivo');
  if (!(archivo instanceof File)) throw new Error('No se recibió ninguna imagen.');
  if (!TIPOS_IMAGEN.has(archivo.type)) throw new Error('Formato no admitido (usa JPG, PNG o WebP).');
  if (archivo.size > 950_000) throw new Error('La imagen supera el tamaño máximo.');
  const extension = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg';
  const { url } = await put(`restaurantes/${restaurante.id}/${randomUUID()}.${extension}`, archivo, {
    access: 'public',
    contentType: archivo.type,
  });
  return { url };
}

function limpio(valor: string | null | undefined, max: number): string | null {
  const v = (valor ?? '').trim();
  return v ? v.slice(0, max) : null;
}

function urlSegura(valor: string | null | undefined): string | null {
  const v = (valor ?? '').trim();
  return /^https:\/\//.test(v) ? v.slice(0, 300) : null;
}

export async function actualizarLocalAction(d: DatosLocal) {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  const nombre = (d.nombre ?? '').trim().slice(0, 80);
  if (!nombre) throw new Error('El nombre del local es obligatorio.');
  await actualizarDatosLocal(jwt, restaurante.id, {
    nombre,
    logoUrl: urlSegura(d.logoUrl),
    colorMarca: /^#[0-9a-f]{6}$/i.test(d.colorMarca ?? '') ? d.colorMarca : null,
    descripcion: limpio(d.descripcion, 280),
    telefono: limpio(d.telefono, 30),
    direccion: limpio(d.direccion, 160),
    horario: limpio(d.horario, 200),
    instagram: limpio(d.instagram?.replace(/^@/, ''), 60),
    urlResenas: urlSegura(d.urlResenas),
  });
  revalidatePath('/panel');
  revalidatePath(`/m/${restaurante.slug}`);
}

export async function iniciarUpgradeAmpliadoAction(): Promise<{ url: string }> {
  const { identidad, restaurante } = await requerirSesionYRestaurante();
  if (restaurante.plan === 'ampliado') throw new Error('Ya tienes el plan Ampliado.');
  return crearCheckoutUpgradeAmpliado({
    restauranteId: restaurante.id,
    restauranteNombre: restaurante.nombre,
    email: identidad.email,
    nombreContacto: identidad.nombre,
    origen: 'https://dkitchencorporate.es',
  });
}

export async function llamadasPendientesAction() {
  const { jwt, restaurante } = await requerirSesionYRestaurante();
  if (restaurante.plan !== 'ampliado') return [];
  return llamadasPendientes(jwt, restaurante.id);
}

export async function atenderLlamadaAction(llamadaId: string) {
  const { jwt } = await requerirSesionYRestaurante();
  await atenderLlamada(jwt, llamadaId);
}
