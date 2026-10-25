'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';
import { PRODUCTOS_PROYECTO, nombreFase, textoFaseCliente, type ProductoProyecto } from '@/lib/proyectos';

/**
 * Acciones de Central → Proyectos (0060, H13). Toda la validación de
 * permisos y fases la hace la base (dk.admin_proyecto_*); aquí solo se
 * recogen los campos y, si karc0 lo marca, se avisa al cliente por correo.
 */
const UUID = /^[0-9a-f-]{36}$/i;
const ficha = (id: string, q: string): never => redirect(`/admin-dkitchen/proyectos/${id}?${q}`);
const campo = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);

function idDe(f: FormData) {
  const id = campo(f, 'id', 36);
  if (!UUID.test(id)) redirect('/admin-dkitchen/proyectos?e=datos');
  return id;
}

export async function avanzarFaseAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = idDe(f);
  const fase = campo(f, 'fase', 40);
  const nota = campo(f, 'nota', 1000);
  let r: { email: string; nombre: string | null; negocio: string | null; producto: ProductoProyecto; fase: string; anterior: string } | undefined;
  try {
    r = await comoCliente(jwt, async (c) => (await c.query('SELECT dk.admin_proyecto_fase($1, $2, $3) AS r', [id, fase, nota || null])).rows[0]?.r);
  } catch {
    ficha(id, 'e=fase');
  }
  if (r && f.get('avisar') === 'on' && r.fase !== r.anterior && textoFaseCliente(r.producto, r.fase)) {
    const producto = PRODUCTOS_PROYECTO[r.producto];
    try {
      await enviarCorreoCliente(r.email, `Tu ${producto === 'Auditoría' ? 'auditoría' : `proyecto ${producto}`}: ${nombreFase(r.producto, r.fase).toLowerCase()}`,
        `<p style="margin:0 0 12px">Hola${r.nombre ? ` ${escaparHtml(r.nombre)}` : ''},</p>
         <p style="margin:0 0 12px">${escaparHtml(textoFaseCliente(r.producto, r.fase))}</p>
         ${nota && f.get('nota_al_cliente') === 'on' ? `<p style="margin:0 0 12px">${escaparHtml(nota).replace(/\n/g, '<br>')}</p>` : ''}
         <p style="margin:0 0 12px">Si tienes cualquier duda, responde a este correo.</p>
         <p style="margin:0">Un saludo,<br>El equipo de DKitchen</p>`);
      await comoCliente(jwt, (c) => c.query('SELECT dk.admin_proyecto_anotar($1, $2, $3, NULL, NULL)', [id, 'correo', `Aviso de fase al cliente: ${nombreFase(r!.producto, r!.fase)}`]));
    } catch (e) {
      console.error('Proyectos: aviso de fase no enviado', e);
      ficha(id, 'ok=fase&e=correo');
    }
    revalidatePath('/admin-dkitchen/proyectos');
    ficha(id, 'ok=fase_aviso');
  }
  revalidatePath('/admin-dkitchen/proyectos');
  ficha(id, 'ok=fase');
}

export async function anotarAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = idDe(f);
  const fecha = campo(f, 'fecha', 10);
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_proyecto_anotar($1, $2, $3, $4, $5::date)', [
      id, campo(f, 'tipo', 10) || 'nota', campo(f, 'texto', 1000) || null, campo(f, 'siguiente', 200) || null, /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
    ]));
  } catch {
    ficha(id, 'e=anotar');
  }
  revalidatePath('/admin-dkitchen/proyectos');
  ficha(id, 'ok=anotado');
}

export async function guardarDatosAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = idDe(f);
  const fiscales = { razon_social: campo(f, 'razon_social', 160), nif: campo(f, 'nif', 20).toUpperCase(), direccion: campo(f, 'direccion', 250) };
  const datos = {
    nombre: campo(f, 'nombre', 120), telefono: campo(f, 'telefono', 30), negocio: campo(f, 'negocio', 120), email: campo(f, 'email', 254),
    contrato_estado: campo(f, 'contrato_estado', 20),
    datos_fiscales: Object.values(fiscales).some(Boolean) ? fiscales : null,
  };
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_proyecto_guardar($1, NULL, $2::jsonb)', [id, JSON.stringify(datos)]));
  } catch {
    ficha(id, 'e=datos');
  }
  revalidatePath('/admin-dkitchen/proyectos');
  ficha(id, 'ok=datos');
}

export async function crearProyectoAction(f: FormData) {
  const jwt = await exigirAdmin();
  const producto = campo(f, 'producto', 20);
  if (!(producto in PRODUCTOS_PROYECTO)) redirect('/admin-dkitchen/proyectos?e=datos');
  let id: string | undefined;
  try {
    id = await comoCliente(jwt, async (c) => (await c.query<{ id: string }>('SELECT dk.admin_proyecto_guardar(NULL, $1, $2::jsonb) AS id', [producto, JSON.stringify({
      email: campo(f, 'email', 254), nombre: campo(f, 'nombre', 120), telefono: campo(f, 'telefono', 30), negocio: campo(f, 'negocio', 120),
    })])).rows[0]?.id);
  } catch {
    redirect('/admin-dkitchen/proyectos?e=crear');
  }
  revalidatePath('/admin-dkitchen/proyectos');
  if (!id) redirect('/admin-dkitchen/proyectos?e=crear');
  ficha(id, 'ok=creado');
}
