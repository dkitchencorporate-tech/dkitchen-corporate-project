'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { esComercialActual } from '@/lib/rol-central';
import { ESTADOS_IDEA, PUBLICOS_IDEA, REDES_IDEA, SERVICIOS_IDEA, type EstadoIdea, type PublicoIdea, type RedIdea, type ServicioIdea } from '@/lib/ideas-contenido-tipos';
import { cambiarEstadoIdea, crearIdea, guardarIdea } from '@/lib/ideas-contenido';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUTA = '/admin-dkitchen/ideas';
const ZONAS = ['ideas', 'aprobar', 'plan', 'medicion'];

async function direccion(): Promise<string> {
  const jwt = await exigirAdmin();
  if (await esComercialActual(jwt)) redirect('/admin-dkitchen/inicio');
  return jwt;
}
const zonaDe = (f: FormData) => {
  const z = String(f.get('zona') ?? '');
  return ZONAS.includes(z) ? z : 'ideas';
};

export async function crearIdeaAction(f: FormData) {
  const jwt = await direccion();
  const titulo = String(f.get('titulo') ?? '').trim().slice(0, 160);
  const idea = String(f.get('idea') ?? '').trim().slice(0, 6000) || null;
  const publico = String(f.get('publico') ?? 'dueno');
  const servicio = String(f.get('servicio') ?? 'general');
  const red = String(f.get('red') ?? 'tiktok');
  if (titulo.length < 2) redirect(`${RUTA}?zona=ideas&e=titulo`);
  if (!(publico in PUBLICOS_IDEA) || !(servicio in SERVICIOS_IDEA) || !(red in REDES_IDEA)) redirect(`${RUTA}?zona=ideas&e=datos`);
  try {
    await crearIdea(jwt, { titulo, idea, publico: publico as PublicoIdea, servicio: servicio as ServicioIdea, red: red as RedIdea });
  } catch (e) {
    redirect(`${RUTA}?zona=ideas&e=${/demasiadas/i.test(e instanceof Error ? e.message : '') ? 'muchas' : 'base'}`);
  }
  revalidatePath(RUTA);
  redirect(`${RUTA}?zona=ideas&ok=creada`);
}

export async function estadoIdeaAction(f: FormData) {
  const jwt = await direccion();
  const id = String(f.get('id') ?? '');
  const estado = String(f.get('estado') ?? '');
  const nota = String(f.get('nota') ?? '').trim().slice(0, 4000) || null;
  const zona = zonaDe(f);
  if (!UUID.test(id) || !(estado in ESTADOS_IDEA)) redirect(`${RUTA}?zona=${zona}&e=datos`);
  try {
    await cambiarEstadoIdea(jwt, id, estado as EstadoIdea, nota);
  } catch {
    redirect(`${RUTA}?zona=${zona}&e=base`);
  }
  revalidatePath(RUTA);
  redirect(`${RUTA}?zona=${zona}&ok=${estado}`);
}

const CAMPOS = ['titulo', 'idea', 'serie', 'nicho', 'publico', 'servicio', 'red', 'formato', 'desarrollo', 'fecha_prevista', 'enlace', 'vistas', 'retencion_seg', 'compartidos', 'guardados', 'comentarios', 'aprendizaje'];
const NUMERICOS = new Set(['vistas', 'compartidos', 'guardados', 'comentarios']);

export async function guardarIdeaAction(f: FormData) {
  const jwt = await direccion();
  const id = String(f.get('id') ?? '');
  const zona = zonaDe(f);
  if (!UUID.test(id)) redirect(`${RUTA}?zona=${zona}&e=datos`);
  const campos: Record<string, string> = {};
  for (const k of CAMPOS) {
    if (!f.has(k)) continue;
    const v = String(f.get(k) ?? '').trim().slice(0, 12000);
    if (NUMERICOS.has(k) && v && !/^\d{1,9}$/.test(v)) redirect(`${RUTA}?zona=${zona}&e=numero`);
    if (k === 'retencion_seg' && v && !/^\d{1,4}([.,]\d{1,2})?$/.test(v)) redirect(`${RUTA}?zona=${zona}&e=numero`);
    if (k === 'fecha_prevista' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) redirect(`${RUTA}?zona=${zona}&e=datos`);
    if (k === 'enlace' && v && !/^https:\/\//.test(v)) redirect(`${RUTA}?zona=${zona}&e=enlace`);
    if (k === 'publico' && !(v in PUBLICOS_IDEA)) continue;
    if (k === 'servicio' && !(v in SERVICIOS_IDEA)) continue;
    if (k === 'red' && !(v in REDES_IDEA)) continue;
    campos[k] = v;
  }
  try {
    await guardarIdea(jwt, id, campos);
  } catch {
    redirect(`${RUTA}?zona=${zona}&e=base`);
  }
  revalidatePath(RUTA);
  redirect(`${RUTA}?zona=${zona}&ok=guardada#i-${id}`);
}
