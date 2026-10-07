import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe (08/10/2026, migración desde Whop; decisión de karc0 del 07/10).
 * API REST con fetch, sin SDK, igual que hacía whop.ts. Versión fijada:
 * 2026-09-30.endive (docs.stripe.com/changelog, comprobado el 08/10).
 *
 * Reglas:
 * - Todo cobro es una FACTURA de Stripe con el IVA (21 %) desglosado y
 *   añadido aparte: las suscripciones por su primera factura y los pagos
 *   únicos por una factura suelta. El precio sale siempre del servidor.
 * - El cliente paga en nuestra propia página /pago (Payment Element), nunca
 *   en una página de Stripe. /pago recibe una referencia firmada (refPago).
 * - Nada de `billing_cycle_anchor`: el día de cobro sale de `trial_end`
 *   (el ciclo se ancla al final de la prueba), que no cambia entre versiones.
 */

const BASE = 'https://api.stripe.com/v1';
export const VERSION_API_STRIPE = '2026-09-30.endive';
export const IVA_PORCENTAJE = 21;

function clave(): string {
  const v = process.env.STRIPE_SECRET_KEY;
  if (!v) throw new Error('Falta STRIPE_SECRET_KEY.');
  return v;
}

/** true si las claves de Stripe están puestas (las rutas responden 503 si no). */
export const stripeConfigurado = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);

export const modoPruebaStripe = () => (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_');

type Valor = string | number | boolean | null | undefined | Valor[] | { [k: string]: Valor };

/** Codifica objetos anidados al formato de Stripe: a[b][0][c]=v. */
function codificar(params: Record<string, Valor>): string {
  const partes: string[] = [];
  const recorrer = (v: Valor, k: string) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((x, i) => recorrer(x, `${k}[${i}]`));
    else if (typeof v === 'object') for (const [h, x] of Object.entries(v)) recorrer(x, `${k}[${h}]`);
    else partes.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  };
  for (const [k, v] of Object.entries(params)) recorrer(v, k);
  return partes.join('&');
}

export class ErrorStripe extends Error {
  constructor(public estado: number, public codigo: string | undefined, mensaje: string) {
    super(mensaje);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ObjetoStripe = Record<string, any>;

export async function stripe(
  metodo: 'GET' | 'POST' | 'DELETE',
  ruta: string,
  params: Record<string, Valor> = {},
  idempotencia?: string
): Promise<ObjetoStripe> {
  const cuerpo = codificar(params);
  const url = metodo === 'GET' && cuerpo ? `${BASE}${ruta}?${cuerpo}` : `${BASE}${ruta}`;
  const r = await fetch(url, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${clave()}`,
      'Stripe-Version': VERSION_API_STRIPE,
      ...(metodo === 'GET' ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }),
      ...(idempotencia ? { 'Idempotency-Key': idempotencia } : {}),
    },
    body: metodo === 'GET' ? undefined : cuerpo,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorStripe(r.status, j?.error?.code, `Stripe ${r.status}: ${j?.error?.message ?? 'sin detalle'}`);
  return j;
}

// ─────────────────────────────────────────────────────────────
// Catálogo: productos con id fijo y tipo de IVA único
// ─────────────────────────────────────────────────────────────

/** Producto con id propio (dk_…): idempotente, se crea la primera vez. */
export async function asegurarProducto(id: string, nombre: string): Promise<string> {
  try {
    await stripe('GET', `/products/${id}`);
  } catch (e) {
    if (!(e instanceof ErrorStripe) || e.estado !== 404) throw e;
    try {
      await stripe('POST', '/products', { id, name: nombre.slice(0, 250) });
    } catch (e2) {
      // Dos peticiones a la vez: la otra ya lo creó.
      if (!(e2 instanceof ErrorStripe) || e2.codigo !== 'resource_already_exists') throw e2;
    }
  }
  return id;
}

let ivaEnCache: string | null = null;

/** Tipo de IVA del 21 % añadido aparte (exclusive), marcado con metadata dk=iva21. */
export async function tipoIva(): Promise<string> {
  if (ivaEnCache) return ivaEnCache;
  const lista = await stripe('GET', '/tax_rates', { active: true, inclusive: false, limit: 100 });
  const hallado = (lista.data as ObjetoStripe[]).find((t) => t.metadata?.dk === 'iva21' && Number(t.percentage) === IVA_PORCENTAJE);
  ivaEnCache = hallado?.id ?? (await stripe('POST', '/tax_rates', {
    display_name: 'IVA', description: 'IVA España 21 %', jurisdiction: 'ES', country: 'ES',
    percentage: IVA_PORCENTAJE, inclusive: false, tax_type: 'vat', metadata: { dk: 'iva21' },
  }, 'dk-iva21-v1')).id;
  return ivaEnCache!;
}

export const conIva = (centimos: number) => Math.round(centimos * (1 + IVA_PORCENTAJE / 100));

// ─────────────────────────────────────────────────────────────
// Clientes
// ─────────────────────────────────────────────────────────────

export interface DatosCliente {
  email: string;
  nombre: string;
  negocio?: string;
  telefono?: string;
}

/** Reutiliza el cliente por correo; si no existe, lo crea (facturas en español). */
export async function asegurarCliente(d: DatosCliente): Promise<string> {
  const email = d.email.trim().toLowerCase();
  const lista = await stripe('GET', '/customers', { email, limit: 1 });
  const existente = (lista.data as ObjetoStripe[])[0];
  const datos = {
    name: (d.negocio || d.nombre).slice(0, 200),
    phone: d.telefono || undefined,
    preferred_locales: ['es'],
    metadata: { contacto: d.nombre.slice(0, 200), ...(d.negocio ? { negocio: d.negocio.slice(0, 200) } : {}) },
  };
  if (existente) {
    await stripe('POST', `/customers/${existente.id}`, datos);
    return existente.id as string;
  }
  return (await stripe('POST', '/customers', { email, ...datos })).id as string;
}

// ─────────────────────────────────────────────────────────────
// Referencia firmada para /pago (nadie puede pedir el secreto de un pago ajeno)
// ─────────────────────────────────────────────────────────────

function firma(id: string): string {
  return createHmac('sha256', `dk-pago:${clave()}`).update(id).digest('base64url').slice(0, 22);
}

export const refPago = (id: string) => `${id}.${firma(id)}`;

export function leerRefPago(ref: string | null | undefined): string | null {
  const [id, f] = String(ref ?? '').split('.');
  if (!id || !f || !/^(in|sub)_[A-Za-z0-9]+$/.test(id)) return null;
  const a = Buffer.from(firma(id));
  const b = Buffer.from(f);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/**
 * En una preview de Vercel el pago se abre en la propia preview (allí están
 * las claves de prueba), aunque quien llama pase el dominio de producción.
 */
function origenPago(origen: string): string {
  const rama = process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_BRANCH_URL : undefined;
  return rama ? `https://${rama}` : origen;
}

export const urlPago = (origen: string, id: string) => `${origenPago(origen)}/pago?r=${encodeURIComponent(refPago(id))}`;

// ─────────────────────────────────────────────────────────────
// Cobros
// ─────────────────────────────────────────────────────────────

export interface Linea {
  /** Id fijo del producto en Stripe (dk_…). */
  producto: string;
  nombre: string;
  centimos: number;
}

/**
 * Metadata común de todo cobro. `producto` es lo que entiende el webhook y
 * `destino` es la página a la que vuelve el cliente tras pagar (paso 3).
 * Stripe limita cada valor a 500 caracteres.
 */
export type Metadata = Record<string, string | undefined>;

const limpiar = (m: Metadata) =>
  Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v).slice(0, 500)]));

/**
 * Receta del cobro (07/10/2026): lo necesario para rehacerlo idéntico con un
 * código promocional (las facturas ya finalizadas no admiten descuentos). Si no
 * cabe en los 500 caracteres de Stripe, ese cobro no admite códigos.
 */
const RECETA = 'dk_receta';
const receta = (o: unknown) => { const t = JSON.stringify(o); return t.length <= 500 ? t : undefined; };
const descuentos = (promocion?: string) => (promocion ? [{ promotion_code: promocion }] : undefined);

/** Pago único: factura suelta con sus líneas e IVA, finalizada y lista para pagar en /pago. */
export async function crearFacturaUnica(cliente: string, lineas: Linea[], metadata: Metadata, descripcion: string, promocion?: string): Promise<string> {
  const iva = await tipoIva();
  const factura = await stripe('POST', '/invoices', {
    customer: cliente,
    collection_method: 'charge_automatically',
    auto_advance: false,
    pending_invoice_items_behavior: 'exclude',
    description: descripcion.slice(0, 500),
    discounts: descuentos(promocion),
    metadata: limpiar({ ...metadata, [RECETA]: receta({ l: lineas }) }),
  });
  for (const l of lineas) {
    await asegurarProducto(l.producto, l.nombre);
    await stripe('POST', '/invoiceitems', {
      customer: cliente,
      invoice: factura.id,
      currency: 'eur',
      amount: Math.round(l.centimos),
      description: l.nombre.slice(0, 500),
      tax_rates: [iva],
      metadata: { producto: l.producto },
    });
  }
  await stripe('POST', `/invoices/${factura.id}/finalize`, { auto_advance: false });
  return factura.id as string;
}

export interface DatosSuscripcion {
  cliente: string;
  /** Cuota recurrente mensual (sin IVA). */
  cuota: Linea;
  /** Cargos de hoy además de la cuota (el 1 € del QR, la entrada de Signature…). */
  hoy?: Linea[];
  /** Cada cuántos meses se cobra la cuota (Fundador: 3). Por defecto, 1. */
  intervaloMeses?: number;
  /** Fin de la prueba (segundos Unix): hasta entonces no se cobra la cuota. */
  finPrueba?: number;
  metadata: Metadata;
  /** Código promocional ya validado (promo_…). */
  promocion?: string;
}

/**
 * Suscripción incompleta hasta que el cliente paga en /pago. Con prueba,
 * Stripe ancla el ciclo al final de la prueba: si la prueba acaba un día 12,
 * se cobra cada día 12.
 */
export async function crearSuscripcion(d: DatosSuscripcion): Promise<string> {
  const iva = await tipoIva();
  await asegurarProducto(d.cuota.producto, d.cuota.nombre);
  for (const l of d.hoy ?? []) await asegurarProducto(l.producto, l.nombre);
  const sub = await stripe('POST', '/subscriptions', {
    customer: d.cliente,
    items: [{ price_data: { currency: 'eur', product: d.cuota.producto, unit_amount: Math.round(d.cuota.centimos), recurring: { interval: 'month', interval_count: d.intervaloMeses ?? 1 } } }],
    add_invoice_items: (d.hoy ?? []).map((l) => ({
      price_data: { currency: 'eur', product: l.producto, unit_amount: Math.round(l.centimos) },
      tax_rates: [iva],
    })),
    default_tax_rates: [iva],
    trial_end: d.finPrueba,
    trial_settings: d.finPrueba ? { end_behavior: { missing_payment_method: 'cancel' } } : undefined,
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    discounts: descuentos(d.promocion),
    metadata: limpiar({ ...d.metadata, [RECETA]: receta({ c: d.cuota, h: d.hoy ?? [], t: d.finPrueba ?? null, m: d.intervaloMeses ?? 1 }) }),
    expand: ['latest_invoice'],
  });
  // Hoy no se cobra nada (upgrade en prueba, enlace sin primer cobro): la
  // tarjeta se guarda con un SetupIntent propio, enlazado a la suscripción por
  // metadata; el webhook (setup_intent.succeeded) la deja como tarjeta de cobro.
  if (Number(sub.latest_invoice?.amount_due ?? 0) === 0) {
    const si = await stripe('POST', '/setup_intents', {
      customer: d.cliente, usage: 'off_session', automatic_payment_methods: { enabled: true },
      metadata: { suscripcion: sub.id },
    });
    await stripe('POST', `/subscriptions/${sub.id}`, { metadata: { setup_intent: si.id } });
  }
  return sub.id as string;
}

/** Primer día 12 (09:00 UTC ≈ 10–11 h en Madrid) a partir de `desde`. */
export function proximoDia12(desde: Date): number {
  let t = Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), 12, 9);
  if (t < desde.getTime()) t = Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth() + 1, 12, 9);
  return Math.floor(t / 1000);
}

/** QR (decisión de karc0 del 08/10): gratis hasta el primer día 12 que caiga pasados 30 días. */
export const finPruebaQr = (ahora = new Date()) => proximoDia12(new Date(ahora.getTime() + 30 * 86400000));

// ─────────────────────────────────────────────────────────────
// Lo que necesita la página /pago
// ─────────────────────────────────────────────────────────────

export interface ResumenPago {
  id: string;
  tipo: 'pago' | 'tarjeta';
  /** Secreto del PaymentIntent (pago) o del SetupIntent (tarjeta, cobro de 0 € hoy). */
  secreto: string | null;
  estado: 'pendiente' | 'pagado' | 'caducado';
  lineas: { nombre: string; centimos: number }[];
  baseCentimos: number;
  ivaCentimos: number;
  totalCentimos: number;
  recurrente: { cuotaCentimos: number; desde: number | null; nombre: string; meses?: number } | null;
  metadata: Record<string, string>;
  email: string | null;
  /** Código promocional aplicado (importe descontado hoy, sin IVA). */
  descuento: { codigo: string; centimos: number; texto: string } | null;
  /** Si el cobro admite códigos (los creados antes del 07/10 no llevan receta). */
  admiteCodigo: boolean;
}

function lineasDe(factura: ObjetoStripe) {
  return ((factura.lines?.data ?? []) as ObjetoStripe[])
    .filter((l) => Number(l.amount) !== 0)
    .map((l) => ({ nombre: String(l.description ?? ''), centimos: Number(l.amount) }));
}

function totalesDe(factura: ObjetoStripe) {
  const iva = ((factura.total_taxes ?? []) as ObjetoStripe[]).reduce((s, t) => s + Number(t.amount ?? 0), 0);
  return { baseCentimos: Number(factura.total_excluding_tax ?? factura.subtotal ?? 0), ivaCentimos: iva, totalCentimos: Number(factura.total ?? 0) };
}

const eurosTexto = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

async function descuentoDe(lista: unknown, factura: ObjetoStripe | undefined): Promise<ResumenPago['descuento']> {
  const d = ((Array.isArray(lista) ? lista : []) as ObjetoStripe[]).find((x) => x && typeof x === 'object' && x.promotion_code);
  if (!d) return null;
  const pc = (typeof d.promotion_code === 'object' ? d.promotion_code : {}) as ObjetoStripe;
  // Un cupón de una sola vez ya no figura en la suscripción, solo en su primera factura (sin expandir el cupón).
  const idCupon = pc.promotion?.coupon ?? d.source?.coupon;
  const c = (typeof idCupon === 'string' ? await stripe('GET', `/coupons/${encodeURIComponent(idCupon)}`).catch(() => ({})) : idCupon ?? {}) as ObjetoStripe;
  const cuanto = c.percent_off ? `${c.percent_off} %` : c.amount_off ? eurosTexto(Number(c.amount_off)) : '';
  const cuando = c.duration === 'forever' ? 'en todos los cobros' : c.duration === 'repeating' ? `durante ${c.duration_in_months} meses` : 'en este pago';
  const centimos = ((factura?.total_discount_amounts ?? []) as ObjetoStripe[]).reduce((t, x) => t + Number(x.amount ?? 0), 0);
  return { codigo: String(pc.code ?? ''), centimos, texto: cuanto ? `−${cuanto} ${cuando}` : '' };
}

export async function resumenPago(id: string): Promise<ResumenPago | null> {
  try {
    if (id.startsWith('in_')) {
      const f = await stripe('GET', `/invoices/${id}`, { expand: ['confirmation_secret', 'customer', 'discounts.promotion_code.promotion.coupon'] });
      return {
        id, tipo: 'pago', secreto: f.confirmation_secret?.client_secret ?? null,
        estado: f.status === 'paid' ? 'pagado' : f.status === 'open' ? 'pendiente' : 'caducado',
        lineas: lineasDe(f), ...totalesDe(f), recurrente: null, metadata: f.metadata ?? {},
        email: f.customer_email ?? f.customer?.email ?? null,
        descuento: await descuentoDe(f.discounts, f), admiteCodigo: Boolean(f.metadata?.[RECETA]),
      };
    }
    const s = await stripe('GET', `/subscriptions/${id}`, { expand: ['latest_invoice.confirmation_secret', 'latest_invoice.discounts.promotion_code', 'customer', 'discounts.promotion_code.promotion.coupon'] });
    const f = s.latest_invoice as ObjetoStripe;
    const cobraHoy = Number(f?.amount_due ?? 0) > 0;
    const item = (s.items?.data?.[0] ?? {}) as ObjetoStripe;
    const si = !cobraHoy && s.metadata?.setup_intent ? await stripe('GET', `/setup_intents/${s.metadata.setup_intent}`) : null;
    const pagado = cobraHoy ? f?.status === 'paid' && s.status !== 'incomplete' : si?.status === 'succeeded';
    return {
      id, tipo: cobraHoy ? 'pago' : 'tarjeta',
      secreto: cobraHoy ? f?.confirmation_secret?.client_secret ?? null : si?.client_secret ?? null,
      estado: s.status === 'incomplete_expired' || s.status === 'canceled' ? 'caducado' : pagado ? 'pagado' : 'pendiente',
      lineas: f ? lineasDe(f) : [], ...(f ? totalesDe(f) : { baseCentimos: 0, ivaCentimos: 0, totalCentimos: 0 }),
      recurrente: {
        cuotaCentimos: Number(item.price?.unit_amount ?? 0),
        meses: Number(item.price?.recurring?.interval_count ?? 1),
        desde: s.status === 'trialing' || s.status === 'incomplete' ? (s.trial_end ?? null) : (s.items?.data?.[0]?.current_period_end ?? null),
        nombre: String(s.metadata?.concepto ?? ''),
      },
      metadata: s.metadata ?? {},
      email: s.customer?.email ?? null,
      descuento: await descuentoDe(s.discounts?.length ? s.discounts : f?.discounts, f), admiteCodigo: Boolean(s.metadata?.[RECETA]),
    };
  } catch (e) {
    console.error(`Stripe: no se pudo leer el pago ${id}:`, e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Códigos promocionales (07/10/2026): se crean en el Dashboard de Stripe
// (Productos → Cupones → código). Se validan aquí y Stripe aplica las
// restricciones del código (caducidad, usos, importe mínimo, productos).
// ─────────────────────────────────────────────────────────────

async function buscarCodigo(codigo: string): Promise<ObjetoStripe | null> {
  const limpio = codigo.trim().slice(0, 60);
  if (!/^[A-Za-z0-9_-]{2,60}$/.test(limpio)) return null;
  for (const c of [...new Set([limpio, limpio.toUpperCase()])]) {
    const l = await stripe('GET', '/promotion_codes', { code: c, active: true, limit: 1 });
    if ((l.data as ObjetoStripe[])[0]) return (l.data as ObjetoStripe[])[0];
  }
  return null;
}

/** Claves de la metadata que no se copian al rehacer un cobro. */
const INTERNAS = new Set([RECETA, 'setup_intent', 'terminos_version', 'terminos_aceptados', 'terminos_ip', 'sustituida_por']);
const metaCopiable = (m: Record<string, string> | undefined) => Object.fromEntries(Object.entries(m ?? {}).filter(([k]) => !INTERNAS.has(k)));

/**
 * Aplica (o quita, con código vacío) un código promocional a un cobro aún sin
 * pagar: rehace el cobro idéntico con el descuento y anula el anterior. Devuelve
 * el id del cobro nuevo. Nunca lanza: los errores vuelven como texto para el cliente.
 */
export async function aplicarCodigo(id: string, codigo: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const actual = await resumenPago(id);
    if (!actual || actual.estado !== 'pendiente') return { ok: false, error: 'Este pago ya no se puede modificar.' };
    if (!actual.admiteCodigo) return { ok: false, error: 'Este pago no admite códigos. Vuelve a empezar desde la página del producto.' };
    const promo = codigo.trim() ? await buscarCodigo(codigo) : null;
    if (codigo.trim() && !promo) return { ok: false, error: 'Ese código no existe o ya no está activo.' };
    const rec = JSON.parse(actual.metadata[RECETA]);
    let nuevo: string;
    if (id.startsWith('in_')) {
      const f = await stripe('GET', `/invoices/${id}`);
      nuevo = await crearFacturaUnica(String(f.customer), rec.l, metaCopiable(f.metadata), String(f.description ?? ''), promo?.id);
      await stripe('POST', `/invoices/${id}/void`).catch((e) => console.error(`No se pudo anular la factura ${id}:`, e));
    } else {
      const s = await stripe('GET', `/subscriptions/${id}`);
      nuevo = await crearSuscripcion({ cliente: String(s.customer), cuota: rec.c, hoy: rec.h, finPrueba: rec.t ?? undefined, intervaloMeses: rec.m ?? 1, metadata: metaCopiable(s.metadata), promocion: promo?.id });
      // Marca para que el webhook no avise de una «suscripción terminada» que solo se ha sustituido.
      await stripe('POST', `/subscriptions/${id}`, { metadata: { sustituida_por: nuevo } }).catch(() => {});
      await stripe('DELETE', `/subscriptions/${id}`).catch((e) => console.error(`No se pudo cancelar la suscripción ${id}:`, e));
    }
    return { ok: true, id: nuevo };
  } catch (e) {
    console.error(`No se pudo aplicar el código a ${id}:`, e);
    if (e instanceof ErrorStripe && e.estado < 500) return { ok: false, error: 'Ese código no se puede usar en este pedido.' };
    return { ok: false, error: 'No se pudo aplicar el código. Inténtalo de nuevo en unos segundos.' };
  }
}

/** Registra la aceptación de los términos (A4) en el objeto que se paga: fecha, IP y versión. */
export async function registrarTerminos(id: string, ip: string, version: string): Promise<void> {
  const ruta = id.startsWith('in_') ? `/invoices/${id}` : `/subscriptions/${id}`;
  await stripe('POST', ruta, { metadata: { terminos_version: version, terminos_aceptados: new Date().toISOString(), terminos_ip: ip.slice(0, 60) } });
}

// ─────────────────────────────────────────────────────────────
// Gestión posterior
// ─────────────────────────────────────────────────────────────

/** Baja desde el panel (H2): cancela al final del periodo pagado. Nunca lanza. */
export async function cancelarAlFinalDelPeriodo(suscripcion: string): Promise<{ ok: true; finPeriodo: number | null } | { ok: false; error: string }> {
  try {
    const s = await stripe('POST', `/subscriptions/${encodeURIComponent(suscripcion)}`, { cancel_at_period_end: true });
    return { ok: true, finPeriodo: s.cancel_at ?? s.items?.data?.[0]?.current_period_end ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Suscripciones vivas (activa, en prueba o con impago) de un cliente, la más reciente primero. */
export async function suscripcionesVivas(cliente: string): Promise<ObjetoStripe[]> {
  if (!cliente.startsWith('cus_')) return [];
  const l = await stripe('GET', '/subscriptions', { customer: cliente, status: 'all', limit: 20 });
  return (l.data as ObjetoStripe[]).filter((x) => ['active', 'trialing', 'past_due', 'unpaid'].includes(x.status) && !x.cancel_at_period_end);
}

/**
 * Baja desde el panel: cancela al final del periodo TODAS las suscripciones
 * vivas del cliente (plan, módulos mensuales, upgrade). Nunca lanza.
 */
export async function cancelarTodoAlFinalDelPeriodo(cliente: string): Promise<{ ok: true; finPeriodo: number | null; n: number } | { ok: false; error: string }> {
  try {
    const vivas = await suscripcionesVivas(cliente);
    if (!vivas.length) return { ok: false, error: `El cliente ${cliente} no tiene suscripciones activas en Stripe` };
    let fin: number | null = null;
    for (const s of vivas) {
      const r = await cancelarAlFinalDelPeriodo(s.id);
      if (!r.ok) return r;
      fin = Math.max(fin ?? 0, r.finPeriodo ?? 0) || null;
    }
    return { ok: true, finPeriodo: fin, n: vivas.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Portal de cliente de Stripe: cambiar la tarjeta y descargar las facturas. */
export async function urlPortalCliente(cliente: string, volver: string): Promise<string> {
  return (await stripe('POST', '/billing_portal/sessions', { customer: cliente, return_url: volver, locale: 'es' })).url as string;
}

// ─────────────────────────────────────────────────────────────
// Webhook
// ─────────────────────────────────────────────────────────────

/**
 * Firma de Stripe (docs.stripe.com/webhooks#verify-manually): cabecera
 * `t=…,v1=…`, HMAC-SHA256 de `${t}.${cuerpo}` con el secreto whsec_ tal cual.
 * Tolerancia de 5 minutos contra repeticiones.
 */
export function firmaWebhookValida(cuerpo: string, cabecera: string | null, secreto: string, toleranciaS = 300): boolean {
  if (!cabecera) return false;
  const partes = cabecera.split(',').map((p) => p.split('='));
  const t = partes.find(([k]) => k === 't')?.[1];
  const firmas = partes.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !firmas.length || Math.abs(Date.now() / 1000 - Number(t)) > toleranciaS) return false;
  const esperada = Buffer.from(createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex'));
  return firmas.some((f) => {
    const b = Buffer.from(f ?? '');
    return b.length === esperada.length && timingSafeEqual(b, esperada);
  });
}
