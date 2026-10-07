import 'server-only';
import { QR_MENU, AUDITORIA_CANALES, BASE_OPERATIVA, FUNDADOR, type PlanQr } from '@/lib/pricing-config';
import type { DatosCheckoutQr, DatosCheckoutAuditoria, DatosCheckoutNucleoOperativo } from './tipos';
import {
  asegurarCliente,
  crearFacturaUnica,
  crearSuscripcion,
  finPruebaQr,
  stripe,
  urlPago,
  cancelarAlFinalDelPeriodo,
  type ObjetoStripe,
} from './stripe';

/**
 * Cobros de DKitchen sobre Stripe (08/10/2026). Mismas funciones y firmas que
 * tenía whop.ts, para que las rutas solo cambien el import. Cada una crea el
 * cobro en Stripe (factura o suscripción) y devuelve la URL de nuestra página
 * /pago, donde el cliente paga con el Payment Element.
 *
 * `metadata.producto` es lo que entiende /api/webhooks/stripe (los mismos
 * valores que usaba el webhook de Whop) y `metadata.destino` es la página de
 * bienvenida del paso 3.
 */

const DIA = 86400;

/** Mismo día del mes, N meses después, a las 09:00 UTC (segundos Unix). */
function dentroDeMeses(meses: number, desde = new Date()): number {
  return Math.floor(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth() + meses, desde.getUTCDate(), 9) / 1000);
}

/** N días después, a las 09:00 UTC (segundos Unix). */
function dentroDeDias(dias: number, desde = new Date()): number {
  const d = new Date(desde.getTime() + dias * DIA * 1000);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 9) / 1000);
}

const productoQr = (plan: PlanQr) => `dk_qr_${plan}`;

// ─────────────────────────────────────────────────────────────
// QR Menú. Local: 1 € + IVA hoy y gratis hasta el primer día 12 pasados 30 días.
// Carta y Sala (decisión A, 07/10): la cuota se paga desde el primer día.
// ─────────────────────────────────────────────────────────────

export async function crearCheckoutQr(datos: DatosCheckoutQr): Promise<{ url: string }> {
  const plan = QR_MENU.planes[datos.plan];
  const cliente = await asegurarCliente({ email: datos.email, nombre: datos.nombreContacto, negocio: datos.restauranteNombre });
  const id = await crearSuscripcion({
    cliente,
    cuota: { producto: productoQr(datos.plan), nombre: `QR Menú · Plan ${plan.nombre} (cuota mensual)`, centimos: plan.mensual * 100 },
    hoy: plan.primerMesSimbolico ? [{ producto: 'dk_qr_primer_mes', nombre: 'QR Menú · Primer mes', centimos: QR_MENU.primerMes * 100 }] : undefined,
    finPrueba: plan.primerMesSimbolico ? finPruebaQr() : undefined,
    metadata: {
      producto: 'qr-menu',
      plan: datos.plan,
      restauranteNombre: datos.restauranteNombre,
      slugBase: datos.slugBase,
      email: datos.email,
      nombreContacto: datos.nombreContacto,
      concepto: `QR Menú · Plan ${plan.nombre}`,
      destino: `/qr/bienvenida?email=${encodeURIComponent(datos.email)}&nombre=${encodeURIComponent(datos.nombreContacto)}&restaurante=${encodeURIComponent(datos.restauranteNombre)}`,
    },
  });
  return { url: urlPago(datos.origen, id) };
}

// ─────────────────────────────────────────────────────────────
// DKitchen Signature: entrada + mantenimiento automático desde el mes 3
// ─────────────────────────────────────────────────────────────

const PRODUCTO_MANTENIMIENTO = 'dk_signature_mantenimiento';
const NOMBRE_MANTENIMIENTO = `DKitchen Signature · Mantenimiento tramo Arranque (desde el mes ${BASE_OPERATIVA.mantenimiento.empiezaEnMes})`;

/**
 * Pago único: hoy la entrada (700 € + IVA) y la cuota de mantenimiento
 * empieza sola al terminar los meses gratis (decisión de karc0 del 08/10).
 * En cuotas: 375 € + IVA hoy y al mes siguiente; tras la 2.ª cuota, el
 * webhook cambia la suscripción a la cuota de mantenimiento (mes 3).
 */
async function crearSignature(d: {
  email: string; nombreContacto: string; restauranteNombre: string; telefono?: string; origen: string;
  enCuotas: boolean; extra?: Record<string, string>; destino: string;
}): Promise<{ url: string }> {
  const cliente = await asegurarCliente({ email: d.email, nombre: d.nombreContacto, negocio: d.restauranteNombre, telefono: d.telefono });
  const meta = {
    producto: 'nucleo-operativo',
    email: d.email,
    nombreContacto: d.nombreContacto,
    restauranteNombre: d.restauranteNombre,
    telefono: d.telefono,
    concepto: 'DKitchen Signature · mantenimiento',
    destino: d.destino,
    ...d.extra,
  };
  const { cuotas, importeCuota } = BASE_OPERATIVA.fraccionado;
  const id = d.enCuotas
    ? await crearSuscripcion({
        cliente,
        cuota: { producto: 'dk_signature_entrada_cuota', nombre: `DKitchen Signature · Entrada en ${cuotas} cuotas`, centimos: importeCuota * 100 },
        metadata: { ...meta, fase: 'cuotas', cuotas: String(cuotas), concepto: `DKitchen Signature · cuota de la entrada (${cuotas} × ${importeCuota} €)` },
      })
    : await crearSuscripcion({
        cliente,
        cuota: { producto: PRODUCTO_MANTENIMIENTO, nombre: NOMBRE_MANTENIMIENTO, centimos: BASE_OPERATIVA.mantenimiento.mensual * 100 },
        hoy: [{ producto: 'dk_signature_entrada', nombre: 'DKitchen Signature · Entrada (pago único)', centimos: BASE_OPERATIVA.pagoUnico * 100 }],
        finPrueba: dentroDeMeses(BASE_OPERATIVA.mantenimiento.mesesGratis),
        metadata: { ...meta, fase: 'mantenimiento' },
      });
  return { url: urlPago(d.origen, id) };
}

/** Tras la última cuota de la entrada: la misma suscripción pasa a la cuota de mantenimiento. */
export async function pasarSignatureAMantenimiento(suscripcion: string): Promise<void> {
  const s = await stripe('GET', `/subscriptions/${suscripcion}`);
  const item = (s.items?.data ?? [])[0] as ObjetoStripe | undefined;
  if (!item || s.metadata?.fase !== 'cuotas') return;
  const { asegurarProducto } = await import('./stripe');
  await asegurarProducto(PRODUCTO_MANTENIMIENTO, NOMBRE_MANTENIMIENTO);
  await stripe('POST', `/subscriptions/${suscripcion}`, {
    items: [{ id: item.id, price_data: { currency: 'eur', product: PRODUCTO_MANTENIMIENTO, unit_amount: BASE_OPERATIVA.mantenimiento.mensual * 100, recurring: { interval: 'month' } } }],
    proration_behavior: 'none',
    metadata: { fase: 'mantenimiento', concepto: 'DKitchen Signature · mantenimiento' },
  }, `dk-signature-mant-${suscripcion}`);
}

export async function crearCheckoutNucleoOperativo(datos: DatosCheckoutNucleoOperativo): Promise<{ url: string }> {
  return crearSignature({ ...datos, enCuotas: false, destino: '/base-operativa/bienvenida' });
}

// ─────────────────────────────────────────────────────────────
// Pagos únicos: Auditoría (order-bump y /pagar), servicios
// ─────────────────────────────────────────────────────────────

export async function crearCheckoutAuditoria(datos: DatosCheckoutAuditoria): Promise<{ url: string }> {
  const cliente = await asegurarCliente({ email: datos.email, nombre: datos.nombreContacto, negocio: datos.restauranteNombre });
  const id = await crearFacturaUnica(cliente, [{ producto: 'dk_auditoria', nombre: 'Auditoría de canales + Escandallo', centimos: AUDITORIA_CANALES.precioOferta * 100 }], {
    producto: 'auditoria',
    email: datos.email,
    nombreContacto: datos.nombreContacto,
    restauranteNombre: datos.restauranteNombre ?? '',
    destino: '/qr/bienvenida?auditoria=ok',
  }, 'Auditoría de canales + Escandallo');
  return { url: urlPago(datos.origen, id) };
}

/**
 * Pago directo desde /pagar/<producto>. El `producto` de metadata es el que
 * entiende el webhook y `embudo` marca el pago en el seguimiento (0032).
 */
export async function crearCheckoutProductoDirecto(datos: {
  id: string;
  metadataPago: string;
  titulo: string;
  precio: number;
  email: string;
  nombreContacto: string;
  restauranteNombre: string;
  telefono: string;
  detalle: string;
  origen: string;
  fraccionado?: { cuotas: number; importeCuota: number; dias: number; ref: string };
}): Promise<{ url: string }> {
  const extra = { embudo: datos.id, detalle: datos.detalle };
  const destino = `/pagar/gracias?p=${encodeURIComponent(datos.id)}`;
  if (datos.metadataPago === 'nucleo-operativo') {
    return crearSignature({
      email: datos.email, nombreContacto: datos.nombreContacto, restauranteNombre: datos.restauranteNombre, telefono: datos.telefono,
      origen: datos.origen, enCuotas: Boolean(datos.fraccionado), destino,
      extra: datos.fraccionado ? { ...extra, fraccionado: String(datos.fraccionado.cuotas), ref: datos.fraccionado.ref } : extra,
    });
  }
  const cliente = await asegurarCliente({ email: datos.email, nombre: datos.nombreContacto, negocio: datos.restauranteNombre, telefono: datos.telefono });
  const id = await crearFacturaUnica(cliente, [{ producto: `dk_${datos.id.replace(/[^a-z0-9]/gi, '_')}`, nombre: datos.titulo, centimos: Math.round(datos.precio * 100) }], {
    producto: datos.metadataPago,
    email: datos.email,
    nombreContacto: datos.nombreContacto,
    restauranteNombre: datos.restauranteNombre,
    telefono: datos.telefono,
    destino,
    ...extra,
  }, datos.titulo);
  return { url: urlPago(datos.origen, id) };
}

/**
 * Servicios del QR (0027). El importe llega ya decidido por la base
 * (dk.precio_servicio). Pago único o suscripción mensual según catálogo.
 */
export async function crearCheckoutServicio(datos: {
  servicio: string;
  nombre: string;
  tipo: 'unico' | 'mensual';
  precioCentimos: number;
  restauranteId: string;
  restauranteNombre: string;
  email: string;
  origen: string;
}): Promise<{ url: string }> {
  const cliente = await asegurarCliente({ email: datos.email, nombre: datos.restauranteNombre, negocio: datos.restauranteNombre });
  const meta = {
    producto: 'servicio-qr',
    servicio: datos.servicio,
    restauranteId: datos.restauranteId,
    restauranteNombre: datos.restauranteNombre,
    email: datos.email,
    concepto: `QR Menú · ${datos.nombre}`,
    destino: '/panel?pestana=modulos&pago=ok',
  };
  const linea = { producto: `dk_qr_${datos.servicio}`, nombre: `QR Menú · ${datos.nombre}`, centimos: Math.round(datos.precioCentimos) };
  const id = datos.tipo === 'mensual'
    ? await crearSuscripcion({ cliente, cuota: linea, metadata: meta })
    : await crearFacturaUnica(cliente, [linea], meta, linea.nombre);
  return { url: urlPago(datos.origen, id) };
}

// ─────────────────────────────────────────────────────────────
// Subida de plan (Carta → Local → Sala), conservando el día de cobro
// ─────────────────────────────────────────────────────────────

/**
 * Suscripción nueva a 25 €/mes que empieza el mismo día que se renovaba la
 * Básica. Hoy se paga solo la diferencia proporcional de los días que quedan
 * (nada si la Básica está aún en prueba). El webhook cancela la Básica al
 * momento, así que nunca se cobran las dos.
 */
export async function crearCheckoutUpgradeAmpliado(datos: Omit<DatosCambioPlan, 'planActual' | 'planDestino'>): Promise<{ url: string }> {
  return crearCheckoutCambioPlan({ ...datos, planActual: 'basico', planDestino: 'ampliado' });
}

interface DatosCambioPlan {
  restauranteId: string;
  restauranteNombre: string;
  email: string;
  nombreContacto: string;
  origen: string;
  suscripcionActual?: string | null;
  planActual: PlanQr;
  planDestino: Exclude<PlanQr, 'basico'>;
}

export async function crearCheckoutCambioPlan(datos: DatosCambioPlan): Promise<{ url: string }> {
  const basico = QR_MENU.planes[datos.planActual];
  const ampliado = QR_MENU.planes[datos.planDestino];
  if (ampliado.mensual <= basico.mensual) throw new Error('Solo se puede subir de plan.');
  const cliente = await asegurarCliente({ email: datos.email, nombre: datos.nombreContacto, negocio: datos.restauranteNombre });
  let finPrueba: number | undefined;
  let diferencia = 0;
  if (datos.suscripcionActual?.startsWith('sub_')) {
    const actual = await stripe('GET', `/subscriptions/${datos.suscripcionActual}`).catch(() => null);
    const item = actual?.items?.data?.[0] as ObjetoStripe | undefined;
    const fin = Number(item?.current_period_end ?? 0);
    const inicio = Number(item?.current_period_start ?? 0);
    const ahora = Date.now() / 1000;
    if (actual && ['active', 'trialing', 'past_due'].includes(actual.status) && fin > ahora + DIA) {
      finPrueba = fin;
      if (actual.status !== 'trialing' && fin > inicio) {
        diferencia = Math.round(((ampliado.mensual - basico.mensual) * 100 * (fin - ahora)) / (fin - inicio));
      }
    }
  }
  const id = await crearSuscripcion({
    cliente,
    cuota: { producto: productoQr(datos.planDestino), nombre: `QR Menú · Plan ${ampliado.nombre} (cuota mensual)`, centimos: ampliado.mensual * 100 },
    hoy: diferencia > 50 ? [{ producto: 'dk_qr_upgrade_diferencia', nombre: `Cambio a Plan ${ampliado.nombre} · diferencia hasta tu próximo cobro`, centimos: diferencia }] : undefined,
    finPrueba,
    metadata: {
      producto: 'qr-upgrade',
      planDestino: datos.planDestino,
      restauranteId: datos.restauranteId,
      restauranteNombre: datos.restauranteNombre,
      email: datos.email,
      nombreContacto: datos.nombreContacto,
      suscripcionAnterior: datos.suscripcionActual ?? undefined,
      concepto: `QR Menú · Plan ${ampliado.nombre}`,
      destino: '/panel?upgrade=ok',
    },
  });
  return { url: urlPago(datos.origen, id) };
}

// ─────────────────────────────────────────────────────────────
// Fundador (0051): plan Sala al 40 %, 124,20 € + IVA cada trimestre, sin prueba
// ─────────────────────────────────────────────────────────────

/**
 * Alta directa de Fundador desde la landing privada /fundador. Quien comprueba
 * que el programa sigue abierto es la ruta (dk.fundador_estado) y, otra vez,
 * el webhook al ocupar la plaza (dk.fundador_marcar).
 */
export async function crearCheckoutFundador(datos: Omit<DatosCheckoutQr, 'plan'>): Promise<{ url: string }> {
  const cliente = await asegurarCliente({ email: datos.email, nombre: datos.nombreContacto, negocio: datos.restauranteNombre });
  const centimos = Math.round(FUNDADOR.trimestre * 100);
  const id = await crearSuscripcion({
    cliente,
    cuota: { producto: 'dk_qr_sala_fundador', nombre: 'DKitchen · Plan Sala Fundador (cuota trimestral, 40 % vitalicio)', centimos },
    intervaloMeses: 3,
    metadata: {
      producto: 'fundador',
      plan: 'sala',
      restauranteNombre: datos.restauranteNombre,
      slugBase: datos.slugBase,
      email: datos.email,
      nombreContacto: datos.nombreContacto,
      concepto: 'Plan Sala · Fundador',
      destino: `/qr/bienvenida?email=${encodeURIComponent(datos.email)}&nombre=${encodeURIComponent(datos.nombreContacto)}&restaurante=${encodeURIComponent(datos.restauranteNombre)}`,
    },
  });
  return { url: urlPago(datos.origen, id) };
}

// ─────────────────────────────────────────────────────────────
// Enlaces de Central (0030) y «Quedarme con todo» / Fundador (0034)
// ─────────────────────────────────────────────────────────────

/**
 * Los importes vienen de la fila enlaces_pago (los fija la base), nunca del
 * navegador. Con cuota mensual: hoy el primer cobro y la cuota empieza tras
 * los días gratis hasta el día de cobro común (o al mes si no hay días).
 */
export async function crearCheckoutEnlaceAdmin(datos: {
  enlaceId: string;
  restauranteId: string;
  restauranteNombre: string;
  email: string;
  concepto: string;
  primerCentimos: number;
  mensualCentimos: number;
  diasGratis?: number;
  origen: string;
}): Promise<{ url: string }> {
  const cliente = await asegurarCliente({ email: datos.email, nombre: datos.restauranteNombre, negocio: datos.restauranteNombre });
  const concepto = `DKitchen · ${datos.concepto}`.slice(0, 200);
  const meta = {
    producto: 'enlace-admin',
    enlaceId: datos.enlaceId,
    restauranteId: datos.restauranteId,
    restauranteNombre: datos.restauranteNombre,
    email: datos.email,
    concepto,
    destino: '/panel?pestana=plan&pago=ok',
  };
  const primer = Math.round(datos.primerCentimos);
  const mensual = Math.round(datos.mensualCentimos);
  const dias = Math.max(0, Math.round(datos.diasGratis ?? 0));
  const id = mensual > 0
    ? await crearSuscripcion({
        cliente,
        cuota: { producto: 'dk_enlace_cuota', nombre: 'DKitchen · Cuota mensual acordada', centimos: mensual },
        hoy: primer > 0 ? [{ producto: 'dk_enlace_primer', nombre: 'DKitchen · Primer cobro acordado', centimos: primer }] : undefined,
        finPrueba: dias > 0 ? dentroDeDias(dias) : dentroDeMeses(1),
        metadata: meta,
      })
    : await crearFacturaUnica(cliente, [{ producto: 'dk_enlace_unico', nombre: concepto, centimos: primer }], meta, concepto);
  return { url: urlPago(datos.origen, id) };
}

// ─────────────────────────────────────────────────────────────
// Baja (H2)
// ─────────────────────────────────────────────────────────────

/** Cancela la suscripción de Stripe al final del periodo pagado. Nunca lanza. */
export async function cancelarMembresiaAlFinalDelPeriodo(suscripcion: string) {
  if (!suscripcion.startsWith('sub_')) return { ok: false as const, error: `La referencia ${suscripcion} no es una suscripción de Stripe` };
  return cancelarAlFinalDelPeriodo(suscripcion);
}
