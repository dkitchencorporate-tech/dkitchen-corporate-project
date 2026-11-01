'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { lanzarFlujoMarcas } from '@/lib/marcas-signature';

/** «Preparar marca» (0113): la base valida dirección, pago, nombre corto y que no esté ya en marcha. */
const UUID = /^[0-9a-f-]{36}$/i;
const VOLVER = /^\/admin-dkitchen\/(qr\/[0-9a-f-]{36}\?tab=signature|proyectos\/[0-9a-f-]{36}|servicios\/signature)$/;

export async function pedirMarcaAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('proyecto') ?? '');
  const volver = String(f.get('volver') ?? '');
  const destino = VOLVER.test(volver) ? volver : '/admin-dkitchen/servicios/signature';
  const sep = destino.includes('?') ? '&' : '?';
  if (!UUID.test(id)) redirect(`${destino}${sep}marca=error`);
  const datos = ['slug', 'nombre', 'color', 'preajuste', 'ciudad'].map((k) => String(f.get(k) ?? '').trim().slice(0, 80));
  let fallo: string | null = null;
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_marca_pedir($1, $2, $3, $4, $5, $6)', [id, ...datos]));
  } catch (e) {
    const m = String((e as Error)?.message ?? '');
    fallo = /requiere direccion|no autorizado/.test(m) ? 'permiso' : /ya está/.test(m) ? 'ya' : /después del pago/.test(m) ? 'pago'
      : /slug|marcas_signature_slug|check/.test(m) ? 'nombre' : 'base';
  }
  if (fallo) redirect(`${destino}${sep}marca=${fallo}`);
  const ya = await lanzarFlujoMarcas();
  revalidatePath(destino.split('?')[0]);
  redirect(`${destino}${sep}marca=${ya ? 'lanzada' : 'cola'}`);
}
