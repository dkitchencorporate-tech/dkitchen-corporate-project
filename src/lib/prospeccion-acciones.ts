'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { comoCliente } from '@/lib/db';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { esBaseCrm, esEstado, hoyMadrid, type BaseCrm } from '@/lib/prospeccion';

/**
 * Acciones del CRM de prospección (0058), compartidas por Central y /socio.
 * La autorización la decide la base en cada función (dk.prosp_rol: super admin
 * con 2FA o socio con 2FA; el socio solo toca lo suyo). Aquí solo se valida la
 * forma de los datos y a qué página volver.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const CAMPOS = ['nombre', 'tipo', 'zona', 'barrio', 'direccion', 'telefono', 'instagram', 'web', 'contacto', 'plataformas',
  'ticket_medio', 'mesas', 'competidores', 'notas', 'fuente', 'referido_por', 'place_id', 'puntuacion', 'muestra_url',
  'oferta', 'propuesta_texto', 'siguiente_accion', 'siguiente_fecha', 'apertura_prevista', 'nota_guia', 'comercial_id'] as const;

async function contexto(f: FormData) {
  const jwt = await obtenerJwtDeSesion().catch(() => null);
  if (!jwt) redirect('/panel/iniciar-sesion');
  const base = String(f.get('base') ?? '');
  if (!esBaseCrm(base)) throw new Error('Origen no válido.');
  return { jwt, base: base as BaseCrm };
}

const idDe = (f: FormData, k = 'id') => {
  const id = String(f.get(k) ?? '');
  if (!UUID.test(id)) throw new Error('Identificador no válido.');
  return id;
};

/** Mensaje corto para el usuario a partir del error de Postgres (sin detalles internos). */
function aviso(e: unknown) {
  const m = (e as Error).message || '';
  if (/no autorizado/.test(m)) return 'permiso';
  if (/check constraint|invalid input|out of range|violates/.test(m)) return 'datos';
  if (/no encontrado/.test(m)) return 'slug';
  if (/motivo/.test(m)) return 'motivo';
  return 'error';
}

/** Alta (sin id) o edición de la ficha. Solo se envían los campos presentes en el formulario. */
export async function guardarProspectoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = f.get('id') ? idDe(f) : null;
  const datos: Record<string, string | boolean> = {};
  for (const k of CAMPOS) {
    if (!f.has(k)) continue;
    let v = String(f.get(k) ?? '').trim();
    if (k === 'instagram') v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '');
    if (k === 'muestra_url' && v && !/^https:\/\//.test(v)) v = 'https://' + v.replace(/^http:\/\//, '');
    if ((k === 'siguiente_fecha' || k === 'apertura_prevista') && v && !FECHA.test(v)) continue;
    datos[k] = v;
  }
  if (f.has('no_contactar_campo')) datos.no_contactar = f.get('no_contactar') === 'on';
  let nuevo: string;
  try {
    nuevo = await comoCliente(jwt, async (c) => (await c.query<{ id: string }>('SELECT dk.prosp_guardar($1, $2) AS id', [id, datos])).rows[0].id);
  } catch (e) {
    redirect(`${base}${id ? '/' + id : ''}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${nuevo}?ok=guardado`);
}

export async function estadoProspectoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const estado = String(f.get('estado') ?? '');
  if (!esEstado(estado)) redirect(`${base}/${id}?e=datos`);
  const motivo = String(f.get('motivo') ?? '') || null;
  const slug = String(f.get('slug') ?? '').trim() || null;
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_estado($1, $2, $3, $4)', [id, estado, estado === 'descartado' ? motivo : null, estado === 'cliente' ? slug : null]));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${id}?ok=estado`);
}

export async function anotarContactoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const fecha = String(f.get('fecha') ?? '');
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_anotar($1, $2, $3, $4, $5)', [
      id, String(f.get('tipo') ?? 'nota'), String(f.get('texto') ?? '').slice(0, 1000),
      String(f.get('siguiente') ?? '').slice(0, 200), FECHA.test(fecha) ? fecha : null]));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${id}?ok=anotado`);
}

/** Ruta de hoy: cada campo orden_<id> con un número entra en la ruta, ordenado de menor a mayor. */
export async function guardarRutaAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const paradas: { id: string; n: number }[] = [];
  for (const [k, v] of f.entries()) {
    if (!k.startsWith('orden_')) continue;
    const id = k.slice(6); const n = Number(v);
    if (UUID.test(id) && String(v).trim() !== '' && Number.isFinite(n)) paradas.push({ id, n });
  }
  paradas.sort((a, b) => a.n - b.n);
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_ruta($1, $2::uuid[])', [hoyMadrid(), paradas.map((p) => p.id)]));
  } catch (e) {
    redirect(`${base}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}?ok=ruta#ruta`);
}

export async function crearPropuestaAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_propuesta_token($1)', [id]));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(`${base}/${id}`);
  redirect(`${base}/${id}?ok=propuesta#propuesta`);
}

export async function guardarMiContactoAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.prosp_mi_contacto_guardar($1, $2)', [
      String(f.get('nombre_publico') ?? '').slice(0, 80), String(f.get('telefono') ?? '').slice(0, 20)]));
  } catch (e) {
    redirect(`${base}?e=${aviso(e)}`);
  }
  redirect(`${base}?ok=contacto`);
}

export async function reasignarAction(f: FormData) {
  const { jwt, base } = await contexto(f);
  const id = idDe(f);
  const comercial = idDe(f, 'comercial');
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_prosp_reasignar($1, $2)', [id, comercial]));
  } catch (e) {
    redirect(`${base}/${id}?e=${aviso(e)}`);
  }
  revalidatePath(base);
  redirect(`${base}/${id}?ok=reasignado`);
}
