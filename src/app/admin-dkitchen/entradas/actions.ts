'use server';

import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { clavePuerta, crearCuentaLocal, cuentaLista } from '@/lib/entradas';
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

/** Portada del evento (31/10): foto ya reducida en el navegador → Vercel Blob en eventos/. */
export async function subirPortadaEventoAction(f: FormData): Promise<{ url?: string; error?: string }> {
  await exigirAdmin();
  const archivo = f.get('archivo');
  if (!(archivo instanceof File)) return { error: 'No se recibió ninguna foto.' };
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) return { error: 'Usa una foto JPG, PNG o WebP.' };
  if (archivo.size > 950_000) return { error: 'La foto es demasiado grande.' };
  const ext = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg';
  try {
    const { url } = await put(`eventos/${randomUUID()}.${ext}`, archivo, { access: 'public', contentType: archivo.type });
    return { url };
  } catch {
    return { error: 'No se pudo guardar la foto. Inténtalo de nuevo.' };
  }
}

/**
 * Central → Entradas (0067). Permisos y validación en la base (dk.admin_evento_*); aquí solo se recogen
 * campos y se habla con Stripe Connect.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const campo = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);
// Experience unificado (decisión 1 de karc0, 01/11): los eventos viven dentro de Servicios → Experience.
const volver = (q: string): never => redirect(`/admin-dkitchen/servicios/experience?${q}`);
const refrescar = () => { revalidatePath('/admin-dkitchen/servicios/experience'); revalidatePath('/admin-dkitchen/entradas'); };
/** Proyecto Experience al que pertenece un evento nuevo: el elegido en el tablero o el abierto de ese local. */
async function proyectoDelLocal(jwt: string, proyecto: string | null, local: string): Promise<string | null> {
  if (proyecto && UUID.test(proyecto)) return proyecto;
  try {
    return await comoCliente(jwt, async (c) => (await c.query<{ id: string }>("SELECT p->>'id' AS id FROM jsonb_array_elements(dk.admin_proyectos('experience', NULL, false)) p WHERE lower(p->>'negocio') = lower($1) AND p->>'fase' IN ('solicitud', 'llamada', 'contrato_pago', 'concepto') LIMIT 1", [local])).rows[0]?.id ?? null);
  } catch { return null; }
}
/** Mueve el proyecto Experience del local a la fase del evento (sin fallar si no hay proyecto). */
async function faseProyecto(jwt: string, proyecto: string | null, local: string | null, desde: string[], fase: string) {
  try {
    await comoCliente(jwt, async (c) => {
      const id = proyecto && UUID.test(proyecto) ? proyecto
        : local ? (await c.query<{ id: string }>("SELECT p->>'id' AS id FROM jsonb_array_elements(to_jsonb(dk.admin_proyectos('experience', NULL, false))) p WHERE lower(p->>'negocio') = lower($1) AND p->>'fase' = ANY($2) LIMIT 1", [local, desde])).rows[0]?.id : null;
      if (id) await c.query('SELECT dk.admin_proyecto_fase($1, $2, NULL)', [id, fase]);
    });
  } catch (e) { console.error('Experience: fase del proyecto no movida', e); }
}
/** Líneas «a | b | c» de un textarea (landing del evento, 0084). */
const lineas = (f: FormData, k: string, max: number) => campo(f, k, 6000).split(/\r?\n/).map((l) => l.split('|').map((x) => x.trim())).filter((l) => l.some(Boolean)).slice(0, max);

export async function guardarEventoAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = campo(f, 'id', 36);
  const euros = Number(campo(f, 'precio', 10).replace(',', '.'));
  const fechaLocal = campo(f, 'fecha', 20); // AAAA-MM-DDTHH:MM, hora de Madrid
  const datos = {
    slug: campo(f, 'slug', 60).toLowerCase(),
    local_nombre: campo(f, 'local_nombre', 120),
    titulo: campo(f, 'titulo', 140),
    descripcion: campo(f, 'descripcion', 3000),
    lugar: campo(f, 'lugar', 300),
    fecha: fechaLocal ? `${fechaLocal.replace('T', ' ')}:00 Europe/Madrid` : '',
    precio_centimos: Math.round(euros * 100),
    aforo: Number(campo(f, 'aforo', 6)),
    max_por_compra: Number(campo(f, 'max_por_compra', 3) || 6),
    imagen_url: campo(f, 'imagen_url', 500),
    formato: campo(f, 'formato', 40),
    muestra: f.get('muestra') === '1',
    // Landing de venta (0084): la página /e/<slug> la lee con leerLanding (solo textos, con topes).
    landing: {
      subtitulo: campo(f, 'l_subtitulo', 160),
      historia: campo(f, 'l_historia', 3000).replace(/\r\n/g, '\n'),
      menu: lineas(f, 'l_menu', 12).map(([pase = '', plato = '', bebida = '']) => ({ pase, plato, bebida })),
      programa: lineas(f, 'l_programa', 12).map(([hora = '', que = '']) => ({ hora, que })),
      incluye: lineas(f, 'l_incluye', 12).map(([x = '']) => x),
      anfitrion: campo(f, 'l_anf_nombre', 80) ? { nombre: campo(f, 'l_anf_nombre', 80), rol: campo(f, 'l_anf_rol', 80), texto: campo(f, 'l_anf_texto', 400) } : null,
      direccion: campo(f, 'l_direccion', 200),
      mapa: campo(f, 'l_mapa', 400),
      faq: lineas(f, 'l_faq', 10).map(([p = '', r = '']) => ({ p, r })),
      avisos: campo(f, 'l_avisos', 400),
    },
  };
  if (!Number.isFinite(euros) || !fechaLocal) volver('e=datos');
  // Vínculo evento ↔ proyecto (0084): con él, el cliente ve su evento en /mi-experience.
  const proyectoId = UUID.test(id) ? null : await proyectoDelLocal(jwt, campo(f, 'proyecto', 36) || null, datos.local_nombre);
  if (proyectoId) (datos as Record<string, unknown>).proyecto_id = proyectoId;
  let nuevo = '';
  try {
    nuevo = await comoCliente(jwt, async (c) => (await c.query('SELECT dk.admin_evento_guardar($1, $2) AS id', [UUID.test(id) ? id : null, datos])).rows[0].id);
  } catch (e) {
    console.error('Guardar evento:', e);
    volver('e=guardar');
  }
  if (proyectoId) await faseProyecto(jwt, proyectoId, null, [], 'evento_montado');
  refrescar();
  volver(`ok=guardado&ev=${nuevo}`);
}

export async function conectarCobroAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = campo(f, 'id', 36);
  if (!UUID.test(id)) volver('e=datos');
  let cuenta = '';
  try {
    cuenta = await crearCuentaLocal(campo(f, 'local_nombre', 120), campo(f, 'email', 254) || null);
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_evento_estado($1, NULL, $2, NULL)', [id, cuenta]));
  } catch (e) {
    console.error('Crear cuenta de cobro:', e);
    volver('e=connect');
  }
  refrescar();
  volver(`ok=cuenta&ev=${id}`);
}

export async function cambiarEstadoAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = campo(f, 'id', 36);
  const estado = campo(f, 'estado', 10);
  const cuenta = campo(f, 'cuenta', 60);
  if (!UUID.test(id) || !['borrador', 'venta', 'cerrado'].includes(estado)) volver('e=datos');
  if (estado === 'venta') {
    const lista = cuenta ? await cuentaLista(cuenta).catch(() => false) : false;
    if (!lista) volver(`e=cobro&ev=${id}`);
  }
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_evento_estado($1, $2, NULL, NULL)', [id, estado]));
  } catch (e) {
    console.error('Estado del evento:', e);
    volver('e=estado');
  }
  if (estado === 'venta' || estado === 'cerrado') {
    const local = await comoCliente(jwt, async (c) => (await c.query<{ l: string }>('SELECT local_nombre AS l FROM dk.admin_eventos() WHERE id = $1', [id])).rows[0]?.l ?? null).catch(() => null);
    await faseProyecto(jwt, null, local, estado === 'venta' ? ['evento_montado', 'concepto', 'contrato_pago'] : ['venta_abierta'], estado === 'venta' ? 'venta_abierta' : 'celebrado');
  }
  refrescar();
  volver(`ok=estado&ev=${id}`);
}

/** Activa la puerta del evento: guarda el hash de su clave derivada (Central enseña el enlace con la clave). */
export async function nuevaClavePuertaAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = campo(f, 'id', 36);
  if (!UUID.test(id)) volver('e=datos');
  const clave = clavePuerta(id);
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_evento_estado($1, NULL, NULL, $2)', [id, createHash('sha256').update(clave).digest('hex')]));
  } catch (e) {
    console.error('Clave de puerta:', e);
    volver('e=estado');
  }
  refrescar();
  volver(`ok=clave&ev=${id}`);
}
