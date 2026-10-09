'use server';

import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { clavePuerta, crearCuentaLocal, cuentaLista } from '@/lib/entradas';

/**
 * Central → Entradas (0067). Permisos y validación en la base (dk.admin_evento_*); aquí solo se recogen
 * campos y se habla con Stripe Connect.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const campo = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);
const volver = (q: string): never => redirect(`/admin-dkitchen/entradas?${q}`);

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
  };
  if (!Number.isFinite(euros) || !fechaLocal) volver('e=datos');
  let nuevo = '';
  try {
    nuevo = await comoCliente(jwt, async (c) => (await c.query('SELECT dk.admin_evento_guardar($1, $2) AS id', [UUID.test(id) ? id : null, datos])).rows[0].id);
  } catch (e) {
    console.error('Guardar evento:', e);
    volver('e=guardar');
  }
  revalidatePath('/admin-dkitchen/entradas');
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
  revalidatePath('/admin-dkitchen/entradas');
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
  revalidatePath('/admin-dkitchen/entradas');
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
  revalidatePath('/admin-dkitchen/entradas');
  volver(`ok=clave&ev=${id}`);
}
