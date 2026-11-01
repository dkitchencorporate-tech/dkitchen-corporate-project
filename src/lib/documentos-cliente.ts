import 'server-only';
import { stripe, refPago } from '@/lib/payments/stripe';
import { contratosDeCobro, contratoDe, rellenar, type Contrato } from '@/lib/contratos';

/**
 * Documentos del cliente (01/11/2026, automatización de Alex): de cada cobro pagado salen su
 * factura (la de Stripe, con IVA y, si los dio, sus datos fiscales) y sus contratos rellenados
 * con los datos del cliente, del pago y de la aceptación (fecha, IP y versión). Nada se escribe
 * a mano: todo sale de Stripe y de la metadata que puso el servidor al crear el cobro.
 */
type O = Record<string, any>;

const euros = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const fecha = (iso: string | number) => new Date(typeof iso === 'number' ? iso * 1000 : iso).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const ipCorta = (ip: string) => ip.replace(/(\d+\.\d+\.\d+)\.\d+$/, '$1.x').replace(/^([0-9a-f]+:[0-9a-f]+:[0-9a-f]+):.*$/i, '$1:…');

const BASE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
export const enlaceContrato = (factura: string) => `${BASE()}/documentos/contrato?r=${encodeURIComponent(refPago(factura))}`;

export type CobroDocumentado = {
  factura: string;
  numero: string;
  fecha: string;
  total: string;
  pdf: string | null;
  web: string | null;
  contratos: Contrato['id'][];
  valores: Record<string, string>;
  firmado: string;
};

/** Lee una factura pagada con todo lo necesario para sus contratos (null si no existe o no está pagada). */
export async function cobroDocumentado(factura: string): Promise<CobroDocumentado | null> {
  const f: O | null = await stripe('GET', `/invoices/${factura}`, { expand: ['customer'] }).catch(() => null);
  if (!f || f.status !== 'paid') return null;
  const idSub = f.parent?.subscription_details?.subscription;
  // La aceptación se guarda en el cobro tras crearlo: en una suscripción, se lee de la suscripción viva.
  const sub: O | null = idSub ? await stripe('GET', `/subscriptions/${idSub}`).catch(() => null) : null;
  const meta: Record<string, string> = { ...(f.parent?.subscription_details?.metadata ?? {}), ...(sub?.metadata ?? {}), ...(f.metadata ?? {}) };
  const cli: O = typeof f.customer === 'object' && f.customer ? f.customer : {};
  const nif = ((f.custom_fields ?? []) as O[]).find((x) => x?.name === 'NIF')?.value as string | undefined;
  const dir: O = f.customer_address ?? cli.address ?? {};
  const domicilio = [dir.line1, [dir.postal_code, dir.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const razon = String(f.customer_name || cli.metadata?.razon_social || cli.name || meta.nombreContacto || f.customer_email || 'el Cliente');
  const local = String(meta.restauranteNombre || meta.negocio || cli.metadata?.negocio || razon);
  const concepto = ((f.lines?.data ?? []) as O[]).map((l) => String(l.description ?? '')).filter(Boolean).join(' · ') || String(f.description ?? '');
  const pagado = f.status_transitions?.paid_at ? fecha(Number(f.status_transitions.paid_at)) : fecha(Number(f.created));
  const acepto = meta.terminos_aceptados ? `aceptado el ${fecha(meta.terminos_aceptados)}${meta.terminos_ip ? ` desde la IP ${ipCorta(meta.terminos_ip)}` : ''} (versión ${meta.terminos_version ?? '—'})` : 'aceptación al pagar';
  const nifTxt = nif ?? 'no facilitado (factura simplificada)';
  const domTxt = domicilio || 'no facilitado';
  const valores: Record<string, string> = {
    'razón social o nombre del titular del local': razon,
    'razón social o nombre del titular': razon,
    'NIF': nifTxt,
    'dirección': domTxt,
    'nombre comercial': local,
    'desde la ficha del cliente': `${razon} · NIF ${nifTxt} · ${domTxt}`,
    'desde la ficha': local,
    'slug': meta.slug || 'tu-marca',
    'concepto del cobro': concepto,
    'importe pagado': `${euros(Number(f.amount_paid ?? 0))} (IVA incluido) · factura ${f.number ?? factura}`,
    'desde Stripe y el registro de aceptación': `Pagado el ${pagado}; ${acepto}`,
    'desde el registro de aceptación al pagar': `${acepto}`,
    'Carta QR / Signature / Experience, desde la ficha': contratosDeCobro(meta).filter((c) => c !== 'encargado').map((c) => contratoDe(c).titulo.replace(/^Contrato (DKitchen )?/, '')).join(' · '),
  };
  return {
    factura, numero: String(f.number ?? factura), fecha: pagado, total: euros(Number(f.amount_paid ?? 0)),
    pdf: f.invoice_pdf ?? null, web: f.hosted_invoice_url ?? null,
    contratos: Number(f.amount_paid ?? 0) > 0 || meta.dk_prueba === '1' ? contratosDeCobro(meta) : [],
    valores, firmado: `Firmado electrónicamente: ${acepto}`,
  };
}

/** El contrato `id` de un cobro, ya rellenado. */
export function contratoRellenado(c: CobroDocumentado, id: Contrato['id']): Contrato {
  return rellenar(contratoDe(id), c.valores);
}

/** Facturas pagadas de un cliente de Stripe, la más reciente primero (para «Mis documentos»). */
export async function documentosDelCliente(cliente: string): Promise<{ factura: string; numero: string; fecha: string; total: string; pdf: string | null; contrato: string | null }[]> {
  const l: O = await stripe('GET', '/invoices', { customer: cliente, status: 'paid', limit: 50 });
  return ((l.data ?? []) as O[]).map((f) => ({
    factura: String(f.id), numero: String(f.number ?? f.id),
    fecha: fecha(Number(f.status_transitions?.paid_at ?? f.created)), total: euros(Number(f.amount_paid ?? 0)),
    pdf: f.invoice_pdf ?? null,
    // Los contratos se firman con el primer cobro de cada compra (no con las renovaciones).
    contrato: f.billing_reason === 'subscription_cycle' ? null : enlaceContrato(String(f.id)),
  }));
}
