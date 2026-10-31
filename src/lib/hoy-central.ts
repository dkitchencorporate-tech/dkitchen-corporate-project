import 'server-only';
import { list, put } from '@vercel/blob';
import { stripe, type ObjetoStripe } from '@/lib/payments/stripe';

/**
 * Panel «Hoy» de Central (decisión 5 de karc0, 01/11): datos de dinero REAL.
 * - Cobrado: cargos pagados en la cuenta de Stripe de DKitchen (sin los de entradas, que van a cada local).
 * - Pendiente: facturas abiertas (enlaces enviados aún sin pagar).
 * - Objetivo mensual: lo fija dirección (01/11: 3.000 €), guardado en Blob para cambiarlo desde Central.
 */
const RUTA_OBJETIVO = 'central/objetivo-mensual.json';
export const OBJETIVO_INICIAL = 3000;

export async function objetivoMensual(): Promise<number> {
  try {
    const { blobs } = await list({ prefix: RUTA_OBJETIVO, limit: 1 });
    if (!blobs[0]) return OBJETIVO_INICIAL;
    const j = await (await fetch(`${blobs[0].url}?v=${blobs[0].uploadedAt.getTime()}`, { cache: 'no-store' })).json();
    const n = Number(j?.euros);
    return Number.isFinite(n) && n > 0 ? n : OBJETIVO_INICIAL;
  } catch {
    return OBJETIVO_INICIAL;
  }
}

export async function guardarObjetivoMensual(euros: number): Promise<void> {
  await put(RUTA_OBJETIVO, JSON.stringify({ euros, actualizado: new Date().toISOString() }), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
  });
}

export type Dinero = { dias: { dia: string; euros: number }[]; mesCobrado: number; pendiente: number; nPendientes: number; ok: boolean };

const diaMadrid = (s: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(s * 1000));

/** Cobrado por día (30 días), cobrado en el mes en curso y pendiente de enlaces; euros sin IVA no: importe cobrado real. */
export async function dineroReal(): Promise<Dinero> {
  const hoy = Date.now();
  const dias = Array.from({ length: 30 }, (_, i) => ({ dia: diaMadrid((hoy - (29 - i) * 864e5) / 1000), euros: 0 }));
  const inicioMes = diaMadrid(hoy / 1000).slice(0, 8) + '01';
  try {
    const desde = Math.floor((hoy - 31 * 864e5) / 1000);
    const [cargos, abiertas] = await Promise.all([
      stripe('GET', '/charges', { created: { gte: desde }, limit: 100 }),
      stripe('GET', '/invoices', { status: 'open', limit: 100 }),
    ]);
    let mes = 0;
    for (const c of (cargos.data ?? []) as ObjetoStripe[]) {
      if (!c.paid || c.status !== 'succeeded') continue;
      const euros = (Number(c.amount ?? 0) - Number(c.amount_refunded ?? 0)) / 100;
      const d = diaMadrid(Number(c.created));
      const fila = dias.find((x) => x.dia === d);
      if (fila) fila.euros += euros;
      if (d >= inicioMes) mes += euros;
    }
    const pend = ((abiertas.data ?? []) as ObjetoStripe[]).filter((f) => Number(f.created) >= desde);
    return { dias, mesCobrado: Math.round(mes * 100) / 100, pendiente: pend.reduce((s, f) => s + Number(f.amount_due ?? 0), 0) / 100, nPendientes: pend.length, ok: true };
  } catch (e) {
    console.error('Hoy: Stripe no respondió', e);
    return { dias, mesCobrado: 0, pendiente: 0, nPendientes: 0, ok: false };
  }
}
