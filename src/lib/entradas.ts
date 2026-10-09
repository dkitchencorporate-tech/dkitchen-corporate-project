import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { comoAprovisionamiento, comoVisitante } from '@/lib/db';
import { stripe } from '@/lib/payments/stripe';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';

/**
 * Venta de entradas de DKitchen Experience (0067, 09/10/2026).
 * El cobro es un cargo DIRECTO en la cuenta de Stripe del local (Connect Express): el dinero va al local y
 * DKitchen no cobra comisión. Nada se registra hasta que el servidor comprueba en Stripe que el pago está
 * hecho, por el importe correcto y para este evento.
 */

export interface EventoPublico {
  id: string; slug: string; local_nombre: string; titulo: string; descripcion: string; lugar: string; fecha: string;
  precio_centimos: number; aforo: number; vendidas: number; max_por_compra: number; imagen_url: string | null;
  stripe_cuenta: string | null; estado: 'venta' | 'cerrado';
}

export const SLUG_EVENTO = /^[a-z0-9-]{3,60}$/;

export async function eventoPublico(slug: string): Promise<EventoPublico | null> {
  if (!SLUG_EVENTO.test(slug)) return null;
  const { rows } = await comoVisitante((c) => c.query<EventoPublico>('SELECT * FROM dk.evento_publico($1)', [slug]));
  return rows[0] ?? null;
}

export const plazasLibres = (e: EventoPublico) => Math.max(0, e.aforo - e.vendidas);
export const ventaAbierta = (e: EventoPublico) => e.estado === 'venta' && Boolean(e.stripe_cuenta) && new Date(e.fecha).getTime() > Date.now() && plazasLibres(e) > 0;

export const euros = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
export const fechaEvento = (s: string) => new Date(s).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** Intento de pago en la cuenta del local. El importe lo fija el servidor con el precio de la base. */
export async function crearIntentoEntradas(e: EventoPublico, cantidad: number, nombre: string, email: string) {
  const pi = await stripe('POST', '/payment_intents', {
    amount: e.precio_centimos * cantidad,
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    receipt_email: email,
    description: `${cantidad} × ${e.titulo} · ${e.local_nombre}`,
    metadata: { dk_evento: e.id, dk_cantidad: cantidad, dk_nombre: nombre, dk_email: email },
  }, undefined, e.stripe_cuenta!);
  return { secreto: String(pi.client_secret), cuenta: e.stripe_cuenta! };
}

export interface EntradaEmitida { codigo: string; numero: number; qr: string }

/**
 * Confirma un pago en Stripe y emite las entradas (idempotente: recargar la página o llamar dos veces
 * devuelve las mismas entradas). Devuelve null si el pago no es válido para este evento.
 */
export async function emitirEntradas(e: EventoPublico, intento: string): Promise<{ entradas: EntradaEmitida[]; email: string; nombre: string; correoPendiente: boolean } | null> {
  if (!/^pi_[A-Za-z0-9]+$/.test(intento) || !e.stripe_cuenta) return null;
  const pi = await stripe('GET', `/payment_intents/${intento}`, {}, undefined, e.stripe_cuenta);
  const cantidad = Number(pi.metadata?.dk_cantidad);
  if (pi.status !== 'succeeded' || pi.metadata?.dk_evento !== e.id || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20
      || pi.currency !== 'eur' || pi.amount_received !== e.precio_centimos * cantidad) return null;
  const nombre = String(pi.metadata?.dk_nombre ?? '').slice(0, 120);
  const email = String(pi.metadata?.dk_email ?? '').slice(0, 254);
  const codigos = Array.from({ length: cantidad }, () => randomBytes(18).toString('base64url'));
  const { rows } = await comoAprovisionamiento((c) => c.query<{ codigo: string; numero: number }>(
    'SELECT * FROM dk.registrar_entradas($1, $2, $3, $4, $5, $6, $7)', [e.id, pi.id, cantidad, pi.amount_received, nombre, email, codigos]));
  const entradas = await Promise.all(rows.map(async (r) => ({ ...r, qr: await QRCode.toDataURL(r.codigo, { margin: 1, width: 420, errorCorrectionLevel: 'M' }) })));
  return { entradas, email, nombre, correoPendiente: pi.metadata?.dk_correo !== '1' };
}

/** Correo con las entradas. Se marca en el propio pago (dk_correo) para no repetirlo al recargar la página. */
export async function enviarCorreoEntradas(e: EventoPublico, email: string, nombre: string, urlEntradas: string, n: number) {
  await enviarCorreoCliente(email, `Tus entradas: ${e.titulo}`,
    `<p style="margin:0 0 12px">Hola${nombre ? ` ${escaparHtml(nombre)}` : ''},</p>
     <p style="margin:0 0 12px">Tienes ${n} ${n === 1 ? 'entrada' : 'entradas'} para <strong>${escaparHtml(e.titulo)}</strong> en ${escaparHtml(e.local_nombre)}, el ${escaparHtml(fechaEvento(e.fecha))}.</p>
     <p style="margin:0 0 12px">Enseña el código QR de cada entrada en la puerta. Puedes abrirlas siempre desde el botón de abajo.</p>`,
    { titulo: 'Tus entradas', boton: { texto: 'Ver mis entradas', url: urlEntradas }, restaurante: e.local_nombre });
}

export async function marcarCorreoEnviado(e: EventoPublico, intento: string) {
  await stripe('POST', `/payment_intents/${intento}`, { metadata: { dk_correo: '1' } }, undefined, e.stripe_cuenta!);
}

// ─────────────────────────────────────────────────────────────
// Alta del local en Stripe Connect (Express): enlace estable y firmado que karc0 envía al local.
// Cada visita genera un enlace de Stripe nuevo (los de Stripe caducan en minutos).
// ─────────────────────────────────────────────────────────────

function firmaAlta(cuenta: string): string {
  const s = process.env.STRIPE_SECRET_KEY;
  if (!s) throw new Error('Falta STRIPE_SECRET_KEY.');
  return createHmac('sha256', `dk-alta-cobro:${s}`).update(cuenta).digest('base64url').slice(0, 22);
}

export const urlAltaCobro = (sitio: string, cuenta: string, slug: string) =>
  `${sitio}/api/entradas/alta-cobro?c=${cuenta}&e=${slug}&f=${firmaAlta(cuenta)}`;

export function altaCobroValida(cuenta: string, f: string): boolean {
  if (!/^acct_[A-Za-z0-9]+$/.test(cuenta)) return false;
  const a = Buffer.from(firmaAlta(cuenta)), b = Buffer.from(f);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function crearCuentaLocal(localNombre: string, email: string | null): Promise<string> {
  const a = await stripe('POST', '/accounts', {
    type: 'express', country: 'ES', email: email || undefined,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { name: localNombre, mcc: '5812', product_description: 'Entradas para eventos gastronómicos del propio local' },
  });
  return String(a.id);
}

export async function enlaceAltaStripe(cuenta: string, volver: string, refrescar: string): Promise<string> {
  const l = await stripe('POST', '/account_links', { account: cuenta, refresh_url: refrescar, return_url: volver, type: 'account_onboarding' });
  return String(l.url);
}

export async function cuentaLista(cuenta: string): Promise<boolean> {
  const a = await stripe('GET', `/accounts/${cuenta}`);
  return Boolean(a.charges_enabled);
}

/** Clave de puerta del evento: derivada (solo Central la ve; en la base solo queda su hash). */
export function clavePuerta(eventoId: string): string {
  const s = process.env.STRIPE_SECRET_KEY;
  if (!s) throw new Error('Falta STRIPE_SECRET_KEY.');
  return createHmac('sha256', `dk-puerta:${s}`).update(eventoId).digest('base64url').slice(0, 16);
}
