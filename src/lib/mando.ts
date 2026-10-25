import 'server-only';

import { comoAprovisionamiento } from '@/lib/db';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';

/**
 * Panel de mando de Central y parte diario (punto 8, 0056). Los datos salen
 * de dk.mando_datos(): Central los lee con dk.admin_mando() (super admin) y el
 * cron de las 08:30 con dk.parte_generar(), que además guarda el parte del día.
 */
export type Ventana = { hoy: number; d7: number; d30: number };
export type Alerta = {
  tipo: 'pago' | 'prueba' | 'baja' | 'reembolso' | 'disputa' | 'montaje' | 'dormido' | 'ticket' | 'signature' | 'ia' | 'neon' | 'webhook';
  gravedad: 'urgente' | 'aviso';
  texto: string;
  nombre?: string | null;
  restaurante_id?: string | null;
  ticket_id?: string;
};
export type DatosMando = {
  fecha: string;
  generado_en: string;
  altas: Ventana;
  pasos_pago: Ventana;
  bajas: Ventana;
  activos: number;
  /** Cuotas que de verdad se cobran (0061: sin prueba, demo, cortesía ni archivados), céntimos sin IVA. */
  ingreso_mensual_centimos?: number;
  en_prueba: number;
  fundadores: number;
  por_plan: Record<string, number>;
  por_socio: Record<string, number>;
  cobrado_centimos: { hoy: number; d30: number };
  fallidos_7d: number;
  tickets: { abiertos: number; abiertos_24h: number; n1: number; n2: number; n3: number; sin_nivel: number; hoy: number; resueltos_n2: number };
  ia: { gasto_usd: number; tope_usd: number };
  neon_mb: number;
  alertas: Alerta[];
  urgentes: number;
  necesita_humano: number;
  ultimo_parte?: { fecha: string; enviado_en: string | null; necesita_humano: number; urgentes: number } | null;
};

export const NOMBRE_ALERTA: Record<Alerta['tipo'], string> = {
  pago: 'Pagos', prueba: 'Pagos', baja: 'Pagos', reembolso: 'Pagos', disputa: 'Pagos',
  montaje: 'Locales atascados', dormido: 'Locales atascados',
  ticket: 'Tickets', signature: 'Oportunidades', ia: 'Topes técnicos', neon: 'Topes técnicos', webhook: 'Topes técnicos',
};

/** Dónde se resuelve cada alerta dentro de Central. */
export function enlaceAlerta(a: Alerta): string {
  if (a.tipo === 'ticket') return '/admin-dkitchen/soporte';
  if (a.tipo === 'signature') return '/admin-dkitchen/oportunidades';
  if (a.restaurante_id) return `/admin-dkitchen/qr/${a.restaurante_id}`;
  return '/admin-dkitchen/inicio';
}

const ORIGEN = 'https://dkitchencorporate.es';
const C = { texto: '#1A1714', suave: '#6B6560', borde: '#E7E3DE', vino: '#6E0C2B', ambar: '#9A6700' };

function celda(titulo: string, v: Ventana) {
  return `<td style="padding:10px 6px;text-align:center;border:1px solid ${C.borde};border-radius:10px">
    <div class="dk-suave" style="font-size:12px;color:${C.suave}">${titulo}</div>
    <div class="dk-texto" style="font-size:24px;font-weight:800;color:${C.texto}">${v.hoy}</div>
    <div class="dk-suave" style="font-size:11px;color:${C.suave}">7 d: ${v.d7} · 30 d: ${v.d30}</div></td>`;
}

/** Cuerpo del correo del parte (dentro de la plantilla común de DKitchen). */
export function htmlParte(d: DatosMando): string {
  const euros = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  const grupos = new Map<string, Alerta[]>();
  for (const a of d.alertas) grupos.set(NOMBRE_ALERTA[a.tipo], [...(grupos.get(NOMBRE_ALERTA[a.tipo]) ?? []), a]);
  const alertas = d.alertas.length === 0
    ? `<p style="margin:16px 0 0;font-weight:700">Nada necesita a una persona hoy. Todo en orden.</p>`
    : [...grupos].map(([g, lista]) => `<p style="margin:20px 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${C.suave}" class="dk-suave">${escaparHtml(g)}</p>
        <ul style="margin:0;padding-left:18px">${lista.map((a) => `<li style="margin:4px 0">
          <span style="font-weight:700;color:${a.gravedad === 'urgente' ? C.vino : C.ambar}">${a.gravedad === 'urgente' ? 'Urgente' : 'Aviso'}</span>
          · ${a.nombre ? `<a href="${ORIGEN}${enlaceAlerta(a)}" style="color:${C.texto};font-weight:600">${escaparHtml(a.nombre)}</a>: ` : ''}${escaparHtml(a.texto)}</li>`).join('')}</ul>`).join('');
  return `<p style="margin:0 0 14px">${d.necesita_humano === 0 ? 'Sin pendientes.' : `<strong>${d.necesita_humano}</strong> cosa(s) necesitan a una persona${d.urgentes ? `, <strong style="color:${C.vino}">${d.urgentes} urgente(s)</strong>` : ''}.`}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>${celda('Altas', d.altas)}${celda('Pasos a pago', d.pasos_pago)}${celda('Bajas', d.bajas)}</tr></table>
    <p class="dk-suave" style="margin:12px 0 0;font-size:13px;color:${C.suave}">
      ${d.activos} locales activos · ${d.en_prueba} en prueba · ${d.fundadores} fundadores ·
      cobrado hoy ${euros(d.cobrado_centimos.hoy)} (30 d: ${euros(d.cobrado_centimos.d30)}) ·
      tickets abiertos ${d.tickets.abiertos} (N1 ${d.tickets.n1} · N2 ${d.tickets.n2} · sin nivel ${d.tickets.sin_nivel}) ·
      N2 resueltos ${d.tickets.resueltos_n2}/50 · IA ${d.ia.gasto_usd} de ${d.ia.tope_usd} $ · base ${d.neon_mb} MB</p>
    ${alertas}`;
}

/** Cron de las 08:30: genera y guarda el parte del día y lo envía a karc0. */
export async function generarYEnviarParte(): Promise<DatosMando> {
  const d = await comoAprovisionamiento(async (c) => (await c.query<{ p: DatosMando }>('SELECT dk.parte_generar() AS p')).rows[0].p);
  const fecha = new Date(d.fecha + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const asunto = d.necesita_humano === 0
    ? `Parte DKitchen ${fecha}: todo en orden`
    : `Parte DKitchen ${fecha}: ${d.necesita_humano} pendiente(s)${d.urgentes ? `, ${d.urgentes} urgente(s)` : ''}`;
  await enviarCorreoInterno(asunto, htmlParte(d), { titulo: `Parte del ${fecha}`, boton: { texto: 'Abrir Central', url: `${ORIGEN}/admin-dkitchen/inicio` } });
  await comoAprovisionamiento((c) => c.query('SELECT dk.parte_enviado($1)', [d.fecha]));
  return d;
}
