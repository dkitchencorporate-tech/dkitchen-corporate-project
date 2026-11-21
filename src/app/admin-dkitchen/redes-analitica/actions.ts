'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { esComercialActual } from '@/lib/rol-central';
import { parsearAdjuntosJson } from '@/lib/media-central';
import {
  REDES_SOCIALES,
  ESTADOS_ANALITICA,
  type CapturaRed,
  type EstadoAnaliticaRed,
  type RedSocial,
} from '@/lib/redes-analitica-tipos';
import {
  actualizarRedAnalitica,
  borrarRedAnalitica,
  crearRedAnalitica,
} from '@/lib/redes-analitica';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const RUTA = '/admin-dkitchen/redes-analitica';

async function exigirDireccionServer(): Promise<string> {
  const jwt = await exigirAdmin();
  if (await esComercialActual(jwt)) redirect('/admin-dkitchen/inicio');
  return jwt;
}

export async function crearEntradaRedAction(f: FormData) {
  const jwt = await exigirDireccionServer();
  const redRaw = String(f.get('red') ?? '');
  const fechaRaw = String(f.get('fecha') ?? '').trim();
  const titulo = String(f.get('titulo') ?? '').trim().slice(0, 160);
  const notasRaw = String(f.get('notas_alex') ?? '').trim().slice(0, 4000);
  const capturas = parsearAdjuntosJson(f.get('capturas'), 10, false) as CapturaRed[];

  if (!(redRaw in REDES_SOCIALES)) redirect(`${RUTA}?e=red`);
  if (titulo.length < 2) redirect(`${RUTA}?e=titulo`);
  const fecha = FECHA_ISO.test(fechaRaw) ? fechaRaw : null;
  const notasAlex = notasRaw || null;
  if (!capturas.length && !notasAlex) redirect(`${RUTA}?e=vacio`);

  try {
    await crearRedAnalitica(jwt, {
      fecha,
      red: redRaw as RedSocial,
      titulo,
      notasAlex,
      capturas,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    redirect(`${RUTA}?e=${/demasiados/i.test(msg) ? 'muchos' : 'base'}`);
  }

  revalidatePath(RUTA);
  redirect(`${RUTA}?ok=creado`);
}

export async function actualizarEntradaRedAction(f: FormData) {
  const jwt = await exigirDireccionServer();
  const id = String(f.get('id') ?? '');
  const estadoRaw = String(f.get('estado') ?? '');
  const notasAlex = String(f.get('notas_alex') ?? '').trim().slice(0, 4000) || null;
  const analisisDk = String(f.get('analisis_dk') ?? '').trim().slice(0, 8000) || null;
  const rumboDiario = String(f.get('rumbo_diario') ?? '').trim().slice(0, 4000) || null;

  if (!UUID.test(id) || !(estadoRaw in ESTADOS_ANALITICA)) redirect(`${RUTA}?e=datos`);

  try {
    await actualizarRedAnalitica(jwt, {
      id,
      notasAlex,
      analisisDk,
      rumboDiario,
      estado: estadoRaw as EstadoAnaliticaRed,
    });
  } catch {
    redirect(`${RUTA}?e=base#e-${id}`);
  }

  revalidatePath(RUTA);
  redirect(`${RUTA}?ok=actualizado#e-${id}`);
}

export async function borrarEntradaRedAction(f: FormData) {
  const jwt = await exigirDireccionServer();
  const id = String(f.get('id') ?? '');
  const confirmo = String(f.get('confirmo') ?? '');
  if (!UUID.test(id) || confirmo !== 'si') redirect(`${RUTA}?e=datos`);

  try {
    await borrarRedAnalitica(jwt, id);
  } catch {
    redirect(`${RUTA}?e=base`);
  }

  revalidatePath(RUTA);
  redirect(`${RUTA}?ok=borrado`);
}
