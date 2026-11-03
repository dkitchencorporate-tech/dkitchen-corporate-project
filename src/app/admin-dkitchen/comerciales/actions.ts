'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/guard-admin';
import { comoCliente } from '@/lib/db';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';

/** Zona de comerciales (0112): OK de palancas, habilitación (la decide la base) y peticiones de OK. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const volver = (q: string): never => redirect(`/admin-dkitchen/comerciales?${q}`);
const msg = (e: unknown) => encodeURIComponent(String((e as Error)?.message ?? '').replace(/^.*?ERROR:\s*/, '').slice(0, 140));

export async function decidirPalancaAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  if (!UUID.test(id)) volver('e=datos');
  const aprobar = f.get('aprobar') === '1';
  const decision: Record<string, unknown> = { nota: String(f.get('nota') ?? '').slice(0, 300) };
  const pct = Number(f.get('pct')); if (Number.isFinite(pct) && pct > 0) decision.pct = Math.min(50, Math.round(pct));
  const cuotas = Number(f.get('cuotas')); if (Number.isInteger(cuotas) && cuotas >= 2 && cuotas <= 24) decision.cuotas = cuotas;
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_palanca_decidir($1, $2, $3::jsonb)', [id, aprobar, JSON.stringify(decision)]));
  } catch (e) { volver(`e=base&m=${msg(e)}`); }
  revalidatePath('/admin-dkitchen/comerciales');
  volver(aprobar ? 'ok=aprobada' : 'ok=rechazada');
}

export async function habilitarAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  if (!UUID.test(id)) volver('e=datos');
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_habilitar_comercial($1)', [id]));
  } catch (e) { volver(`e=base&m=${msg(e)}`); }
  revalidatePath('/admin-dkitchen/comerciales');
  volver('ok=habilitado');
}

/** Panel de Control Manual del Comercial (0117, petición de Alex en Buzón Agentes IA): servicios, zonas y demos. */
export async function guardarConfigComercialAction(
  identidadId: string,
  config: { servicios: string[]; zonas: string[]; puede_crear_demos: boolean; tope_demos?: number; tope_imagenes_demo?: number },
): Promise<{ ok?: true; error?: string }> {
  const jwt = await exigirAdmin();
  if (!UUID.test(identidadId)) return { error: 'Comercial no válido.' };
  try {
    await comoCliente(jwt, (c) =>
      c.query('SELECT dk.admin_config_comercial_guardar($1, $2::jsonb)', [
        identidadId,
        JSON.stringify({
          servicios: Array.isArray(config.servicios) ? config.servicios : [],
          zonas: Array.isArray(config.zonas) ? config.zonas : [],
          puede_crear_demos: Boolean(config.puede_crear_demos),
          tope_demos: Number.isFinite(config.tope_demos) ? config.tope_demos : 10,
          tope_imagenes_demo: Number.isFinite(config.tope_imagenes_demo) ? config.tope_imagenes_demo : 10,
        }),
      ]),
    );
  } catch (e) {
    return { error: decodeURIComponent(msg(e)) || 'No se pudo guardar el perfil del comercial.' };
  }
  revalidatePath('/admin-dkitchen/comerciales');
  revalidatePath('/admin-dkitchen/inicio');
  return { ok: true };
}

export async function cambiarRolComercialAction(f: FormData) {
  const jwt = await exigirAdmin();
  const id = String(f.get('id') ?? '');
  const rol = String(f.get('rol') ?? '');
  if (!UUID.test(id) || !['comercial', 'en_formacion'].includes(rol)) volver('e=datos');
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.admin_cambiar_rol_equipo($1, $2)', [id, rol]));
  } catch (e) { volver(`e=base&m=${msg(e)}`); }
  revalidatePath('/admin-dkitchen/comerciales');
  volver('ok=perfil');
}

/** Pedir el OK de una palanca (desde el alta o la ficha). Dirección recibe un aviso al momento. */
export async function solicitarPalancaAction(tipo: string, local: string, detalle: Record<string, unknown>): Promise<{ ok?: true; error?: string }> {
  const jwt = await exigirAdmin();
  if (!['descuento', 'montaje_gratis', 'experience_piloto', 'signature_fraccionado', 'signature_financiado'].includes(tipo)) return { error: 'Palanca no válida.' };
  if (String(local).trim().length < 2) return { error: 'Escribe el nombre del local.' };
  try {
    await comoCliente(jwt, (c) => c.query('SELECT dk.palanca_solicitar($1, $2, $3::jsonb)', [tipo, String(local).trim(), JSON.stringify(detalle ?? {})]));
  } catch (e) { return { error: decodeURIComponent(msg(e)) || 'No se pudo pedir el OK.' }; }
  await enviarCorreoInterno(`OK PEDIDO: ${tipo.replace('_', ' ')} · ${local}`,
    `<p>Un comercial pide el OK de dirección para <strong>${escaparHtml(tipo.replace('_', ' '))}</strong> en <strong>${escaparHtml(local)}</strong>.</p><p><a href="https://dkitchencorporate.es/admin-dkitchen/comerciales">Aprobar o rechazar en Central</a> (también desde el móvil).</p>`).catch(() => {});
  revalidatePath('/admin-dkitchen/comerciales');
  return { ok: true };
}
