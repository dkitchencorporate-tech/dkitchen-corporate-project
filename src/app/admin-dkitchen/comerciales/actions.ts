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
