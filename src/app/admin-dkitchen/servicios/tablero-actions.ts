'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';
import { PRODUCTOS_PROYECTO, nombreFase, textoFaseCliente, type ProductoProyecto } from '@/lib/proyectos';

/**
 * Tableros de servicio (decisión 8 de karc0, 01/11): cambio de fase con UN botón.
 * La base valida permisos y fases (dk.admin_proyecto_fase); el cliente recibe el aviso de su fase.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const VOLVER = /^\/admin-dkitchen\/servicios\/[a-z]+$/;

export async function moverFaseAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const fase = String(f.get('fase') ?? '').slice(0, 40);
  const volver = String(f.get('volver') ?? '');
  const destino = VOLVER.test(volver) ? volver : '/admin-dkitchen/servicios/signature';
  if (!UUID.test(id) || !/^[a-z_]+$/.test(fase)) redirect(`${destino}?e=fase`);
  let r: { email: string; nombre: string | null; producto: ProductoProyecto; fase: string; anterior: string } | undefined;
  try {
    r = await comoCliente(jwt, async (c) => (await c.query('SELECT dk.admin_proyecto_fase($1, $2, NULL) AS r', [id, fase])).rows[0]?.r);
  } catch {
    redirect(`${destino}?e=fase`);
  }
  if (r && r.fase !== r.anterior && f.get('avisar') !== 'no' && textoFaseCliente(r.producto, r.fase) && r.email) {
    const producto = PRODUCTOS_PROYECTO[r.producto];
    await enviarCorreoCliente(r.email, `Tu ${producto === 'Auditoría' ? 'auditoría' : `proyecto ${producto}`}: ${nombreFase(r.producto, r.fase).toLowerCase()}`,
      `<p style="margin:0 0 12px">Hola${r.nombre ? ` ${escaparHtml(r.nombre)}` : ''},</p>
       <p style="margin:0 0 12px">${escaparHtml(textoFaseCliente(r.producto, r.fase))}</p>
       <p style="margin:0">Un saludo,<br>El equipo de DKitchen</p>`)
      .then(() => comoCliente(jwt, (c) => c.query('SELECT dk.admin_proyecto_anotar($1, $2, $3, NULL, NULL)', [id, 'correo', `Aviso de fase al cliente: ${nombreFase(r!.producto, r!.fase)}`])))
      .catch((e) => console.error('Tablero: aviso de fase no enviado', e));
  }
  revalidatePath(destino);
  redirect(`${destino}?ok=fase&id=${id}`);
}
