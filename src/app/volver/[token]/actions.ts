'use server';

import { redirect } from 'next/navigation';
import { comoAprovisionamiento } from '@/lib/db';
import { crearCheckoutEnlaceAdmin } from '@/lib/payments/cobros';
import { reanudarTodo, suscripcionesVivas } from '@/lib/payments/stripe';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';
import { nombrePlan } from '@/lib/pricing-config';

/**
 * Enlace de vuelta de los correos de baja (0081). El token es lo único que llega del navegador:
 * el plan y el importe los decide la base (dk.vuelta_preparar, dk.precio_plan) y el webhook de
 * Stripe reactiva la cuenta al pagar (dk.aplicar_enlace_pago).
 */
const TOKEN = /^[0-9a-f]{32}$/;
const SITIO = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';

type Preparado = { enlace: string; restaurante_id: string; nombre: string; email: string | null; plan: string; centimos: number; url: string | null; cliente_stripe: string | null };

export async function volverConMiCartaAction(formulario: FormData) {
  const token = String(formulario.get('token') ?? '');
  if (!TOKEN.test(token)) redirect('/qr');
  // redirect() lanza una excepción: nunca dentro del try (el catch la tomaría por un fallo).
  let destino = '';
  try {
    const p = await comoAprovisionamiento(async (c) => (await c.query<Preparado>('SELECT * FROM dk.vuelta_preparar($1)', [token])).rows[0]);
    if (!p?.email) throw new Error('La cuenta no tiene correo');
    // Una suscripción vieja todavía viva (p. ej. suspensión por impago) = doble cobro: lo resuelve una persona.
    const vivas = p.cliente_stripe?.startsWith('cus_') ? await suscripcionesVivas(p.cliente_stripe) : [];
    if (vivas.length) {
      await enviarCorreoInterno(`VUELTA BLOQUEADA: ${p.nombre}`,
        `<p><strong>${escaparHtml(p.nombre)}</strong> (${escaparHtml(p.email)}) quiere volver, pero aún tiene ${vivas.length} suscripción(es) viva(s) en Stripe. Revisa el cobro y reactívalo desde Central.</p>`).catch(() => {});
      destino = `/volver/${token}?revision=1`;
    } else if (p.url) {
      destino = p.url;
    } else {
      ({ url: destino } = await crearCheckoutEnlaceAdmin({
        enlaceId: p.enlace, restauranteId: p.restaurante_id, restauranteNombre: p.nombre, email: p.email,
        concepto: `Plan ${nombrePlan(p.plan)} · vuelta`, primerCentimos: p.centimos, mensualCentimos: p.centimos, origen: SITIO(),
      }));
      await comoAprovisionamiento((c) => c.query('SELECT dk.vuelta_fijar_url($1, $2)', [p.enlace, destino]));
      await enviarCorreoInterno(`VUELTA EN CURSO: ${p.nombre}`,
        `<p><strong>${escaparHtml(p.nombre)}</strong> (${escaparHtml(p.email)}) ha pulsado «Volver con mi carta» y va a pagar el plan ${escaparHtml(nombrePlan(p.plan))}. Si no termina el pago, merece una llamada.</p>`).catch(() => {});
    }
  } catch (e) {
    console.error('Vuelta: no se pudo preparar el pago', e);
    redirect(`/volver/${token}?error=1`);
  }
  redirect(destino);
}

type DatosAnular = { restaurante_id: string; nombre: string; stripe_customer_id: string | null };

export async function anularMiBajaAction(formulario: FormData) {
  const token = String(formulario.get('token') ?? '');
  if (!TOKEN.test(token)) redirect('/qr');
  try {
    const d = await comoAprovisionamiento(async (c) => (await c.query<DatosAnular>('SELECT * FROM dk.vuelta_datos_anular($1)', [token])).rows[0]);
    if (!d) throw new Error('No hay una baja pendiente');
    // Como en Central: primero se reanuda la renovación en Stripe; si falla, la baja sigue en pie.
    if (d.stripe_customer_id) {
      const r = await reanudarTodo(d.stripe_customer_id);
      if (!r.ok) throw new Error(r.error);
    }
    await comoAprovisionamiento((c) => c.query('SELECT dk.vuelta_anular_baja($1)', [token]));
    await enviarCorreoInterno(`BAJA ANULADA por el cliente: ${d.nombre}`,
      `<p><strong>${escaparHtml(d.nombre)}</strong> ha anulado su baja desde el enlace del correo. La renovación en Stripe vuelve a estar activa.</p>`).catch(() => {});
  } catch (e) {
    console.error('Vuelta: no se pudo anular la baja', e);
    redirect(`/volver/${token}?error=1`);
  }
  redirect(`/volver/${token}?anulada=1`);
}
