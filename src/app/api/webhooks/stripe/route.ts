import { comoAprovisionamiento } from '@/lib/db';
import { NextResponse } from 'next/server';
import {
  aprovisionarClienteQr,
  avisarAltaQr,
  esClienteExistente,
  registrarPagoRecuperado,
  registrarPagoFallido,
} from '@/lib/payments/aprovisionar';
import { enviarCorreoInterno, enviarCorreoCliente, escaparHtml, filasCorreo } from '@/lib/email';
import { PRODUCTOS_PAGO, PRODUCTOS_WEBHOOK_GENERICO } from '@/lib/productos-pago';
import { crearPedidoNivelB } from '@/lib/pedidos-nivel-b';
import { dispararTuberiaPostPago } from '@/lib/tuberia-nivel-b';
import { BASE_OPERATIVA, esPlanQr, nombrePlan } from '@/lib/pricing-config';
import { firmaWebhookValida, stripe, type ObjetoStripe } from '@/lib/payments/stripe';
import { pasarSignatureAMantenimiento } from '@/lib/payments/cobros';

export const runtime = 'nodejs';

/**
 * Webhook de Stripe (08/10/2026, sustituye a /api/webhooks/whop). Eventos:
 * - invoice.paid: alta (primera factura) o renovación de cada producto.
 * - setup_intent.succeeded: alta sin cobro hoy (solo se guarda la tarjeta).
 * - invoice.payment_failed: abre el ciclo de gracia propio (0012).
 * - customer.subscription.deleted, charge.refunded, charge.dispute.created:
 *   aviso interno (H6).
 * Idempotencia: el alta de QR por id de evento (stripe_eventos_procesados);
 * el resto de funciones de la base, por id de factura.
 * Un 500 hace que Stripe reintente; solo se devuelve cuando reintentar sirve.
 */

interface Contexto {
  idEvento: string;
  /** Id del cobro (factura in_… o SetupIntent seti_…): referencia de pago en la base. */
  idPago: string;
  cliente: string;
  suscripcion: string | null;
  meta: Record<string, string>;
  /** Importe cobrado hoy, con IVA, en céntimos. */
  importe: number;
  origen: string;
}

const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ recibido: true, ...extra });
const fallo = (motivo: string) => NextResponse.json({ error: motivo }, { status: 500 });
const euros = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export async function POST(request: Request) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secreto) {
    console.error('Falta STRIPE_WEBHOOK_SECRET.');
    return NextResponse.json({ error: 'No configurado' }, { status: 500 });
  }
  const cuerpo = await request.text();
  if (!firmaWebhookValida(cuerpo, request.headers.get('stripe-signature'), secreto)) {
    console.error('Firma de webhook de Stripe inválida.');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }
  let evento: ObjetoStripe;
  try { evento = JSON.parse(cuerpo); } catch { return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 }); }

  const o = evento.data?.object as ObjetoStripe;
  const origen = new URL(request.url).origin;

  switch (evento.type) {
    case 'invoice.paid': {
      const subDet = o.parent?.subscription_details as ObjetoStripe | undefined;
      const ctx: Contexto = {
        idEvento: evento.id, idPago: o.id, cliente: String(o.customer ?? ''),
        suscripcion: subDet?.subscription ? String(subDet.subscription) : null,
        meta: { ...(o.metadata ?? {}), ...(subDet?.metadata ?? {}) },
        importe: Number(o.amount_paid ?? 0), origen,
      };
      // 0 € al crear (prueba sin cobro hoy): el alta llega con setup_intent.succeeded.
      if (o.billing_reason === 'subscription_create' && ctx.importe === 0) return ok({ ignorado: 'factura de 0 €' });
      if (o.billing_reason === 'subscription_cycle' || o.billing_reason === 'subscription_update') return renovacion(ctx);
      return alta(ctx);
    }
    case 'setup_intent.succeeded': {
      const sub = String(o.metadata?.suscripcion ?? '');
      if (!sub.startsWith('sub_')) return ok();
      try {
        const s = await stripe('POST', `/subscriptions/${sub}`, { default_payment_method: o.payment_method });
        return alta({ idEvento: evento.id, idPago: o.id, cliente: String(s.customer), suscripcion: sub, meta: s.metadata ?? {}, importe: 0, origen });
      } catch (e) {
        console.error(`No se pudo fijar la tarjeta de ${sub}:`, e);
        return fallo('Fallo fijando la tarjeta');
      }
    }
    case 'invoice.payment_failed': {
      if (o.billing_reason === 'subscription_cycle' && o.customer) {
        await registrarPagoFallido(String(o.customer)).catch((e) => console.error('Gracia: no se pudo registrar el impago', e));
        await enviarCorreoInterno(`COBRO FALLIDO: ${o.customer_name ?? o.customer_email ?? o.customer}`,
          `<p>Stripe no ha podido cobrar una renovación. Se abre el periodo de gracia (0012) y Stripe reintentará según su configuración.</p>${filasCorreo([
            ['Cliente', o.customer_name], ['Correo', o.customer_email], ['Importe', euros(Number(o.amount_due ?? 0))], ['Factura', o.id]])}`).catch(() => {});
      }
      return ok();
    }
    case 'customer.subscription.deleted': {
      // Sustituida al aplicar un código promocional en /pago: no es una baja.
      if (o.metadata?.sustituida_por) return ok({ ignorado: 'sustituida' });
      await enviarCorreoInterno(`SUSCRIPCIÓN TERMINADA en Stripe: ${o.metadata?.restauranteNombre ?? o.metadata?.concepto ?? o.id}`,
        `<p>La suscripción ya no está activa (baja al final del periodo, prueba sin tarjeta o impago agotado).</p>${filasCorreo([
          ['Concepto', o.metadata?.concepto], ['Restaurante', o.metadata?.restauranteNombre], ['Correo', o.metadata?.email], ['Suscripción', o.id], ['Motivo', o.cancellation_details?.reason]])}`).catch(() => {});
      return ok();
    }
    case 'charge.refunded':
    case 'charge.dispute.created': {
      const disputa = evento.type === 'charge.dispute.created';
      await enviarCorreoInterno(`${disputa ? 'DISPUTA ABIERTA (contracargo)' : 'REEMBOLSO'} en Stripe: ${euros(Number(o.amount ?? 0))}`,
        `<p>${disputa ? 'Un cliente ha abierto una disputa con su banco. Responde con pruebas desde el panel de Stripe antes de la fecha límite.' : 'Se ha devuelto un cobro. Si corresponde, suspende el servicio en Central.'}</p>${filasCorreo([
          ['Importe', euros(Number(o.amount ?? 0))], ['Cargo', disputa ? o.charge : o.id], ['Motivo', o.reason], ['Correo', o.billing_details?.email ?? o.receipt_email]])}`).catch(() => {});
      return ok();
    }
    default:
      return ok();
  }
}

// ─────────────────────────────────────────────────────────────
// Renovaciones
// ─────────────────────────────────────────────────────────────

async function renovacion(ctx: Contexto) {
  const { meta } = ctx;
  if (meta.producto === 'nucleo-operativo' && meta.fase === 'cuotas' && ctx.suscripcion) {
    try {
      await pasarSignatureAMantenimiento(ctx.suscripcion);
    } catch (e) {
      console.error('Signature: no se pudo pasar a mantenimiento', e);
      return fallo('Fallo pasando a mantenimiento');
    }
    await enviarCorreoInterno(`CUOTA COBRADA · DKitchen Signature · ${meta.nombreContacto || meta.email}`,
      `<p>Stripe ha cobrado la última cuota de la entrada (${BASE_OPERATIVA.fraccionado.importeCuota} € + IVA). La suscripción pasa sola al mantenimiento de ${BASE_OPERATIVA.mantenimiento.mensual} €/mes desde el mes ${BASE_OPERATIVA.mantenimiento.empiezaEnMes}.</p>${filasCorreo([['Correo', meta.email], ['Factura', ctx.idPago]])}`).catch(() => {});
    return ok({ renovacion: true });
  }
  // Cualquier renovación cobrada cierra un ciclo de gracia abierto (0012).
  await registrarPagoRecuperado(ctx.cliente).catch((e) => console.error('Gracia: no se pudo cerrar el ciclo', e));
  return ok({ renovacion: true });
}

// ─────────────────────────────────────────────────────────────
// Altas (primer cobro de cada producto)
// ─────────────────────────────────────────────────────────────

async function alta(ctx: Contexto) {
  const { meta } = ctx;

  // Pagos desde /pagar/<producto>: se anota en el embudo (0032) y el cliente
  // recibe su confirmación. Nunca bloquea el alta del producto.
  const productoDirecto = meta.embudo ? PRODUCTOS_PAGO[meta.embudo] : undefined;
  if (productoDirecto) {
    await comoAprovisionamiento((c) => c.query('SELECT dk.embudo_pagado($1)', [productoDirecto.id])).catch((e) => console.error('Embudo: no se pudo anotar el pago', e));
    if (productoDirecto.metadataPago !== 'nucleo-operativo' && meta.email) {
      await enviarCorreoCliente(meta.email, `Pago confirmado · ${productoDirecto.nombre}`,
        `<p>Hola ${escaparHtml(meta.nombreContacto)},</p>
         <p>Hemos recibido tu pago de <strong>${euros(ctx.importe)}</strong> (IVA incluido) por <strong>${escaparHtml(productoDirecto.nombre)}</strong>. Stripe te envía la factura en un correo aparte. Gracias por confiar en DKitchen.</p>
         <p><strong>Qué pasa ahora:</strong></p>
         <ul>${productoDirecto.despues.map(([c, t]) => `<li><strong>${escaparHtml(c)}:</strong> ${escaparHtml(t)}</li>`).join('')}</ul>
         <p>Si tienes cualquier duda, responde a este correo.</p><p>Un saludo,<br>El equipo de DKitchen</p>`).catch((e) => console.error('Pago directo: confirmación no enviada', e));
    }
  }

  if (PRODUCTOS_WEBHOOK_GENERICO.includes(String(meta.producto))) {
    if (productoDirecto) {
      await enviarCorreoInterno(`PAGO DIRECTO (${euros(ctx.importe)}): ${productoDirecto.nombre} · ${meta.nombreContacto || meta.email}`,
        `<h2>${escaparHtml(productoDirecto.nombre)} pagado</h2>${filasCorreo([['Nombre', meta.nombreContacto], ['Negocio', meta.restauranteNombre], ['Correo', meta.email], ['Teléfono', meta.telefono], ['Factura (Stripe)', ctx.idPago]])}`).catch(() => {});
    }
    return ok();
  }

  switch (meta.producto) {
    case 'auditoria': {
      await enviarCorreoInterno(`AUDITORÍA PAGADA (${euros(ctx.importe)}): ${meta.nombreContacto || meta.email}`,
        `<p>Han pagado la Auditoría + Escandallo. Agenda la reunión 1 a 1:</p>${filasCorreo([['Nombre', meta.nombreContacto], ['Correo', meta.email], ['Teléfono', meta.telefono], ['Restaurante', meta.restauranteNombre], ['Factura (Stripe)', ctx.idPago]])}`).catch((e) => console.error('Aviso de Auditoría no enviado', e));
      return ok();
    }

    case 'nucleo-operativo': {
      const enCuotas = meta.fase === 'cuotas';
      const importeEntrada = (enCuotas ? BASE_OPERATIVA.fraccionado.cuotas * BASE_OPERATIVA.fraccionado.importeCuota : BASE_OPERATIVA.pagoUnico) * 100;
      try {
        const pedido = await crearPedidoNivelB({
          producto: 'nucleo-operativo',
          referenciaPago: ctx.suscripcion ?? ctx.idPago,
          email: meta.email,
          nombreContacto: meta.nombreContacto,
          restauranteNombre: meta.restauranteNombre || undefined,
          importeCentimos: importeEntrada,
        });
        if (!pedido.yaExistia) {
          await dispararTuberiaPostPago({
            id: pedido.id, producto: 'nucleo-operativo', token: pedido.token, email: meta.email,
            nombreContacto: meta.nombreContacto, restauranteNombre: meta.restauranteNombre || undefined,
            importeCentimos: importeEntrada, origen: ctx.origen,
          });
        }
      } catch (e) {
        console.error(`No se pudo procesar el pago de Signature (${ctx.idPago}):`, e);
        return fallo('Fallo procesando el pedido');
      }
      return ok();
    }

    case 'servicio-qr': {
      try {
        const r = await comoAprovisionamiento(async (c) => (await c.query<{ r: string }>('SELECT dk.registrar_pago_servicio($1, $2, $3) AS r', [meta.restauranteId, meta.servicio, ctx.idPago])).rows[0]?.r);
        if (r === 'ok') {
          await enviarCorreoInterno(`NUEVO SERVICIO: ${meta.servicio} · ${meta.restauranteNombre}`,
            `<p><strong>${escaparHtml(meta.restauranteNombre)}</strong> (${escaparHtml(meta.email)}) ha contratado <strong>${escaparHtml(meta.servicio)}</strong>. Revisa la entrega en Central: ficha del cliente → Servicios.</p>${filasCorreo([['Factura (Stripe)', ctx.idPago]])}`).catch(() => {});
        }
      } catch (e) {
        console.error(`No se pudo registrar el servicio (${ctx.idPago}):`, e);
        return fallo('Fallo registrando servicio');
      }
      return ok();
    }

    case 'enlace-admin': {
      try {
        const r = await comoAprovisionamiento(async (c) => (await c.query<{ r: string }>('SELECT dk.aplicar_enlace_pago($1, $2, $3) AS r', [meta.enlaceId, ctx.idPago, ctx.cliente])).rows[0]?.r);
        if (r === 'ok') {
          await enviarCorreoInterno(`PAGO DE ENLACE: ${meta.restauranteNombre}`,
            `<p><strong>${escaparHtml(meta.restauranteNombre)}</strong> (${escaparHtml(meta.email)}) ha pagado el enlace preparado en Central. Ya está aplicado.</p>${filasCorreo([['Importe hoy', euros(ctx.importe)], ['Factura (Stripe)', ctx.idPago]])}`).catch(() => {});
        }
      } catch (e) {
        console.error(`No se pudo aplicar el enlace de pago (${ctx.idPago}):`, e);
        return fallo('Fallo aplicando enlace');
      }
      return ok();
    }

    case 'qr-upgrade': {
      try {
        const destino = meta.planDestino === 'sala' ? 'sala' : 'ampliado';
        const aplicado = await comoAprovisionamiento(async (c) => (await c.query<{ ok: boolean }>('SELECT dk.aplicar_cambio_plan($1, $2, $3) AS ok', [meta.restauranteId, destino, ctx.suscripcion ?? ctx.idPago])).rows[0]?.ok === true);
        // Reenvío de Stripe de un upgrade ya aplicado: nada que hacer.
        if (!aplicado) return ok({ duplicado: true });
        // La anterior se cancela al momento: el día de cobro ya lo conserva la nueva.
        let anterior = 'sin suscripción anterior';
        if (meta.suscripcionAnterior?.startsWith('sub_')) {
          anterior = await stripe('DELETE', `/subscriptions/${meta.suscripcionAnterior}`, { prorate: false })
            .then(() => 'cancelada en Stripe')
            .catch((e) => `NO SE PUDO CANCELAR (${e instanceof Error ? e.message : e}): cancélala a mano en Stripe`);
        }
        await enviarCorreoInterno(`SUBIDA A ${nombrePlan(destino).toUpperCase()}: ${meta.restauranteNombre}`,
          `<p><strong>${escaparHtml(meta.restauranteNombre)}</strong> (${escaparHtml(meta.email)}) ha pasado al plan ${nombrePlan(destino)}.</p>${filasCorreo([
            ['Suscripción anterior', anterior], ['Suscripción nueva', ctx.suscripcion]])}`).catch(() => {});
      } catch (e) {
        console.error(`No se pudo aplicar el upgrade (${ctx.idPago}):`, e);
        return fallo('Fallo aplicando upgrade');
      }
      return ok();
    }

    case 'qr-menu':
      return altaQr(ctx);

    case 'fundador':
      return altaFundador(ctx);

    default:
      console.warn(`Webhook de Stripe: cobro ${ctx.idPago} sin producto conocido (${meta.producto ?? '¿?'}).`);
      return ok();
  }
}

/**
 * Fundador (0051): misma alta que QR (plan Sala) y, después, la plaza. Si el
 * programa se cerró entre el checkout y el pago, se respeta igual (ya ha
 * pagado) y se avisa a karc0.
 */
async function altaFundador(ctx: Contexto) {
  const res = await altaQr(ctx);
  if (res.status !== 200 || !ctx.cliente) return res;
  try {
    const dentro = await comoAprovisionamiento(async (c) => (await c.query<{ ok: boolean }>('SELECT dk.fundador_marcar($1) AS ok', [ctx.cliente])).rows[0]?.ok === true);
    if (!dentro) {
      await enviarCorreoInterno(`FUNDADOR FUERA DE PLAZO: ${ctx.meta.restauranteNombre}`,
        `<p>Ha pagado Fundador con el programa ya cerrado (plazas o plazo). Se le ha respetado el precio. Revisa en Central.</p>${filasCorreo([['Correo', ctx.meta.email], ['Cliente de Stripe', ctx.cliente], ['Suscripción', ctx.suscripcion]])}`).catch(() => {});
    }
  } catch (e) {
    console.error(`No se pudo ocupar la plaza de Fundador (${ctx.idPago}):`, e);
    return fallo('Fallo marcando Fundador');
  }
  return res;
}

/**
 * Socio en el sistema (0052): si el pago llegó con código de vendedor, el alta
 * queda atribuida a ese socio. La base decide (código activo, la primera
 * atribución manda) y es idempotente; un fallo aquí nunca tumba el alta.
 */
async function atribuirVendedor(ctx: Contexto) {
  const codigo = String(ctx.meta.vendedor ?? '').trim();
  if (!codigo || !ctx.cliente) return;
  try {
    await comoAprovisionamiento((c) => c.query('SELECT dk.socio_atribuir($1, $2, $3)', [ctx.cliente, codigo, String(ctx.meta.vendedor_origen ?? 'enlace')]));
  } catch (e) {
    console.error(`No se pudo atribuir el alta al socio ${codigo} (${ctx.idPago}):`, e);
  }
}

async function altaQr(ctx: Contexto) {
  const { meta } = ctx;
  const { plan, restauranteNombre, slugBase, nombreContacto, email } = meta;
  const base = { idPago: ctx.idPago, idEvento: ctx.idEvento, referenciaCliente: ctx.cliente, email, restauranteNombre, nombreContacto };
  if (!esPlanQr(plan)) {
    await avisarAltaQr('fallo', base, `Pago sin plan válido en la metadata (plan=${String(plan)})`);
    return ok();
  }
  if (!restauranteNombre || !slugBase || !nombreContacto || !email || !ctx.cliente || !ctx.suscripcion) {
    await avisarAltaQr('fallo', { ...base, plan }, 'Pago con la metadata incompleta: falta local, slug, contacto, correo o suscripción');
    return ok();
  }
  // Stripe puede repetir un evento ya atendido: si este cliente ya tiene
  // restaurante, no se intenta crear la cuenta otra vez (daría un falso
  // «ALTA QR FALLIDA»). Si es un segundo local con el mismo correo, se avisa.
  if (await esClienteExistente(ctx.cliente).catch(() => false)) {
    const s = ctx.suscripcion ? await stripe('GET', `/subscriptions/${ctx.suscripcion}`).catch(() => null) : null;
    if (s?.metadata?.alta_hecha !== 'si') {
      await enviarCorreoInterno(`QR: cliente que ya tenía carta ha pagado otra alta (${restauranteNombre})`,
        `<p>El cliente de Stripe ya tiene un restaurante, así que no se ha creado otro automáticamente. Si es un segundo local, créalo en Central; si es un duplicado, reembolsa el cobro en Stripe.</p>${filasCorreo([['Restaurante pedido', restauranteNombre], ['Correo', email], ['Cliente de Stripe', ctx.cliente], ['Suscripción', ctx.suscripcion], ['Factura', ctx.idPago]])}`).catch(() => {});
    }
    await atribuirVendedor(ctx);
    return ok({ duplicado: true });
  }
  const resultado = await aprovisionarClienteQr({
    idEvento: ctx.idEvento, email, nombreContacto, plan, restauranteNombre, slugBase,
    referenciaCliente: ctx.cliente,
    referenciaSuscripcion: ctx.suscripcion,
  });
  if (!resultado.ok) return resultado.motivo === 'db_fallo' ? fallo('Fallo aprovisionando') : ok({ aprovisionado: false });
  await atribuirVendedor(ctx);
  // Marca para distinguir un reenvío de Stripe de un segundo local con el mismo correo.
  await stripe('POST', `/subscriptions/${ctx.suscripcion}`, { metadata: { alta_hecha: 'si' } }).catch(() => {});
  return ok({ aprovisionado: true });
}
