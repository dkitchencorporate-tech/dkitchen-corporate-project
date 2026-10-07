'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { enviarEnlaceDeContrasena } from '@/lib/neon-auth';
import { enviarBienvenidaQr } from '@/lib/bienvenida';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';
import { nuevoToken } from '@/lib/equipo';
import { huellaToken } from '@/lib/sala';
import { reintentarTpvAdmin } from '@/lib/envio-tpv';
import { diagnosticar, CATEGORIAS, type Categoria } from '@/lib/soporte-n2';

/**
 * Acciones seguras del soporte N2 (0055). Reversibles, auditadas y anotadas en
 * el ticket. Nunca tocan dinero, plan, bajas ni borrados (eso es nivel 3).
 */
const UUID = /^[0-9a-f-]{36}$/i;
const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const volver: (ticket: string, q: string) => never = (ticket, q) => redirect(`/admin-dkitchen/soporte?${q}#t-${ticket}`);

async function contexto(formulario: FormData) {
  const jwt = await exigirAdmin();
  const ticket = String(formulario.get('ticketId') ?? '');
  const restaurante = String(formulario.get('restauranteId') ?? '');
  if (!UUID.test(ticket) || !UUID.test(restaurante)) redirect('/admin-dkitchen/soporte?e=datos');
  const d = await diagnosticar(jwt, restaurante);
  if (!d) volver(ticket, 'e=diagnostico');
  const anotar = (accion: string, detalle: Record<string, unknown>) =>
    comoCliente(jwt, (c) => c.query('SELECT dk.admin_ticket_anotar($1, $2, $3::jsonb)', [ticket, accion, JSON.stringify(detalle)]));
  return { jwt, ticket, restaurante, d, anotar };
}

export async function n2ReenviarAccesoAction(formulario: FormData) {
  const { ticket, d, anotar } = await contexto(formulario);
  if (!d.acceso?.email) volver(ticket, 'e=sin_correo');
  await enviarEnlaceDeContrasena(d.acceso.email);
  await anotar('reenviar_acceso', { email: d.acceso.email });
  volver(ticket, 'ok=acceso');
}

export async function n2BienvenidaAction(formulario: FormData) {
  const { ticket, d, anotar } = await contexto(formulario);
  if (!d.acceso?.email) volver(ticket, 'e=sin_correo');
  await enviarBienvenidaQr(d.acceso.email, `equipo de ${d.local.nombre}`, d.local.nombre, d.local.plan);
  await enviarEnlaceDeContrasena(d.acceso.email);
  await anotar('reenviar_bienvenida', { email: d.acceso.email });
  volver(ticket, 'ok=bienvenida');
}

/** Enlace nuevo para un miembro del equipo: se envía al correo del dueño; el token no se guarda ni se muestra. */
export async function n2RegenerarEnlaceAction(formulario: FormData) {
  const { jwt, ticket, d, anotar } = await contexto(formulario);
  const id = String(formulario.get('camareroId') ?? '');
  const miembro = d.equipo.find((e) => e.id === id && e.activo);
  if (!miembro || !d.acceso?.email) volver(ticket, 'e=miembro');
  const token = nuevoToken();
  const ok = await comoCliente(jwt, async (c) => (await c.query<{ ok: boolean }>('SELECT dk.admin_equipo_regenerar($1, $2) AS ok', [miembro.id, huellaToken(token)])).rows[0]?.ok === true);
  if (!ok) volver(ticket, 'e=miembro');
  const enlace = `${SITIO}/sala/${token}`;
  await enviarCorreoCliente(d.acceso.email, `Nuevo enlace de la app de sala para ${miembro.nombre}`,
    `<p style="margin:0 0 12px">Hola,</p>
     <p style="margin:0 0 12px">Hemos creado un enlace nuevo de la app de sala para <strong>${escaparHtml(miembro.nombre)}</strong> (${escaparHtml(d.local.nombre)}). Ábrelo en su móvil y guárdalo en la pantalla de inicio:</p>
     <p style="margin:0 0 16px"><a href="${enlace}" style="display:inline-block;background:#6E0C2B;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Abrir la app de sala</a></p>
     <p style="margin:0 0 12px;color:#6B7079;font-size:13px">El enlace anterior ya no funciona. No lo compartas fuera de tu equipo: quien lo tenga entra como ${escaparHtml(miembro.nombre)}.</p>`);
  await anotar('regenerar_enlace', { camarero: miembro.id, nombre: miembro.nombre, enviado_a: d.acceso.email });
  volver(ticket, 'ok=enlace');
}

export async function n2ReintentarTpvAction(formulario: FormData) {
  const { jwt, ticket, d, anotar } = await contexto(formulario);
  const ids = (d.tpv?.fallidos_7d ?? []).map((f) => f.id).slice(0, 10);
  if (!ids.length) volver(ticket, 'e=sin_fallidos');
  let enviados = 0;
  for (const id of ids) {
    const r = await reintentarTpvAdmin(jwt, id).catch(() => ({ enviado: false, motivo: 'error' }));
    if (r.enviado) enviados++;
    await anotar('reintentar_tpv', { registro: id, enviado: r.enviado, motivo: r.motivo ?? null });
  }
  volver(ticket, `ok=tpv&n=${enviados}&de=${ids.length}`);
}

/** Cierre con resolución: categoría, nivel, si el diagnóstico acertó y una nota. Cuenta para los 50. */
export async function n2ResolverAction(formulario: FormData) {
  const { jwt, ticket, d } = await contexto(formulario);
  const categoria = String(formulario.get('categoria') ?? '') as Categoria;
  const nivel = Number(formulario.get('nivel'));
  const acertado = formulario.get('acertado') === 'si' ? true : formulario.get('acertado') === 'no' ? false : null;
  const nota = String(formulario.get('resolucion') ?? '').trim().slice(0, 500);
  if (!(categoria in CATEGORIAS) || ![1, 2, 3].includes(nivel)) volver(ticket, 'e=categoria');
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_ticket_resolver($1, $2, $3::smallint, $4, $5, $6::jsonb)', [ticket, categoria, nivel, acertado, nota, JSON.stringify(d)]));
  revalidatePath('/admin-dkitchen/soporte');
  volver(ticket, 'ok=resuelto');
}
