'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { misServicios, guardarMisDatos } from '@/lib/mis-servicios';
import { enviarCorreoInterno, filasCorreo, escaparHtml } from '@/lib/email';

/**
 * «Mis servicios» (0111, 01/11): el cliente nos manda lo que necesitamos para su Signature o su Auditoría.
 * La base valida dueño, claves y tamaños (dk.mi_proyecto_datos); aquí solo se recogen los campos.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ARCHIVOS = 12;
const TIPOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']);

/** Campos que pedimos por servicio: [clave, etiqueta, longitud máxima]. */
const CAMPOS: Record<string, [string, string, number][]> = {
  signature: [
    ['marca', 'Nombre de la marca', 80], ['eslogan', 'Frase o eslogan', 160], ['color_1', 'Color principal', 20], ['color_2', 'Color secundario', 20],
    ['dominio', 'Dominio que quieres', 80], ['carta', 'Tu carta (enlace o texto)', 2000], ['redes', 'Instagram / redes', 200],
    ['horario', 'Horario', 300], ['notas', 'Algo más que debamos saber', 1000],
  ],
  auditoria: [
    ['canales', 'Dónde vendes hoy', 400], ['enlaces', 'Enlaces a tus fichas (Google, Glovo, Uber Eats…)', 1500],
    ['ventas_mes', 'Pedidos al mes aproximados', 40], ['objetivo', 'Qué quieres mejorar', 600],
    ['reunion_1', 'Primera preferencia para la reunión', 40], ['reunion_2', 'Segunda preferencia', 40], ['notas', 'Algo más', 1000],
  ],
};

const sesion = async () => { const jwt = await obtenerJwtDeSesion().catch(() => null); if (!jwt) redirect('/panel/iniciar-sesion'); return jwt; };
async function miServicio(jwt: string, id: string) {
  if (!UUID.test(id)) return null;
  return (await misServicios(jwt).catch(() => [])).find((p) => p.id === id) ?? null;
}

export async function datosAction(f: FormData) {
  const jwt = await sesion();
  const s = await miServicio(jwt, String(f.get('id') ?? ''));
  if (!s || !CAMPOS[s.producto]) redirect('/mis-servicios?e=datos');
  const canales = f.getAll('canal').map(String).filter((x) => /^[a-z_ ]{2,30}$/i.test(x)).slice(0, 10);
  const datos: Record<string, string | string[]> = {};
  for (const [k, , max] of CAMPOS[s.producto]) {
    const v = String(f.get(k) ?? '').trim().slice(0, max);
    if (v) datos[k] = v;
  }
  if (s.producto === 'auditoria' && canales.length) datos.canales = canales.join(', ');
  if (!Object.keys(datos).length) redirect(`/mis-servicios?e=vacio#s-${s.id}`);
  try {
    await guardarMisDatos(jwt, s.id, datos);
  } catch (e) {
    console.error('Mis servicios: datos no guardados', e);
    redirect(`/mis-servicios?e=base#s-${s.id}`);
  }
  await enviarCorreoInterno(`DATOS DEL CLIENTE: ${s.negocio ?? s.producto}`,
    `<p>El cliente ha enviado sus datos de <strong>${escaparHtml(s.producto)}</strong> desde su panel.</p>${filasCorreo(Object.entries(datos).map(([k, v]) => [k, String(v)]))}`).catch(() => {});
  revalidatePath('/mis-servicios');
  redirect(`/mis-servicios?ok=datos#s-${s.id}`);
}

/** Logo, fotos o carta en PDF: Vercel Blob en servicios/<proyecto>/ (las imágenes llegan ya reducidas). */
export async function subirArchivoAction(f: FormData): Promise<{ ok?: true; error?: string }> {
  const jwt = await sesion();
  const s = await miServicio(jwt, String(f.get('id') ?? ''));
  if (!s) return { error: 'No encontramos tu servicio.' };
  const actuales = Array.isArray(s.datos.archivos) ? (s.datos.archivos as string[]) : [];
  if (actuales.length >= MAX_ARCHIVOS) return { error: `Máximo ${MAX_ARCHIVOS} archivos.` };
  const archivo = f.get('archivo');
  if (!(archivo instanceof File)) return { error: 'No se recibió ningún archivo.' };
  if (!TIPOS.has(archivo.type)) return { error: 'Usa JPG, PNG, WebP, SVG o PDF.' };
  if (archivo.size > 4_000_000) return { error: 'El archivo supera los 4 MB.' };
  const ext = { 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'application/pdf': 'pdf' }[archivo.type] ?? 'jpg';
  try {
    const { url } = await put(`servicios/${s.id}/${randomUUID()}.${ext}`, archivo, { access: 'public', contentType: archivo.type });
    await guardarMisDatos(jwt, s.id, { archivos: [...actuales, url] });
  } catch {
    return { error: 'No se pudo guardar. Inténtalo de nuevo.' };
  }
  revalidatePath('/mis-servicios');
  return { ok: true };
}
