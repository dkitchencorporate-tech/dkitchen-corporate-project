import 'server-only';
import { comoCliente } from '@/lib/db';
import { QR_MENU, esPlanQr } from '@/lib/pricing-config';

/**
 * Ficha 360 → Comunicación (0089, 18/10/2026). Plantillas de correo y WhatsApp
 * con los datos reales del cliente, notas internas, llamadas y recordatorios.
 * Todo lo enviado queda en public.cliente_comunicaciones (se ve en la ficha).
 */
export type Canal = 'email' | 'whatsapp' | 'nota' | 'llamada' | 'recordatorio';
export interface Comunicacion { id: string; canal: Canal; plantilla: string | null; asunto: string | null; cuerpo: string | null; recordarEn: string | null; hecho: boolean; creadoEn: string }
export interface UsoPlan { que: string; usados: number; tope: number; topeMax: number }
export interface DatosPlantilla { contacto: string | null; local: string; plan: string; slug: string; proximoCobro?: string | null }
export interface Plantilla { id: string; nombre: string; cuando: string; asunto: string; texto: string }

const SITIO = 'https://dkitchencorporate.es';
export const NOMBRES_USO: Record<string, string> = {
  productos: 'Platos', mesas: 'Mesas', camareros: 'Camareros', reservas_mes: 'Reservas este mes', banners: 'Banners activos', comandas_tpv_mes: 'Comandas al TPV este mes', idiomas: 'Idiomas',
};

/** Plantillas (texto plano; el correo lo envuelve en la plantilla de marca). */
export function plantillas(d: DatosPlantilla): Plantilla[] {
  const hola = `Hola${d.contacto ? ` ${d.contacto.split(' ')[0]}` : ''}`;
  const plan = esPlanQr(d.plan) ? QR_MENU.planes[d.plan] : null;
  const carta = `${SITIO}/${d.slug}`;
  return [
    { id: 'bienvenida', nombre: 'Bienvenida', cuando: 'Recién dado de alta',
      asunto: `Bienvenido a DKitchen, ${d.local}`,
      texto: `${hola}:\n\nTu carta de ${d.local} ya está en marcha: ${carta}\n\nTres primeros pasos (5 minutos):\n1. Entra en tu panel (${SITIO}/panel) y revisa tus platos y precios.\n2. Marca los alérgenos de cada plato.\n3. Descarga tu QR (Panel → QR) y ponlo en las mesas.\n\nSi te atascas, respóndenos a este correo o escríbenos por WhatsApp y lo vemos contigo.\n\nUn saludo,\nAlex · DKitchen` },
    { id: 'como_usar', nombre: 'Cómo sacarle partido', cuando: 'A los 3–7 días',
      asunto: `3 trucos para tu carta de ${d.local}`,
      texto: `${hola}:\n\nTres cosas que más usan los locales con DKitchen:\n· Cambiar un precio desde el móvil (Panel → Carta): en todas las mesas al momento.\n· Promociones del día con un banner (Panel → Promociones).\n· Llamar al camarero y pedir la cuenta desde la mesa: ya funciona en tu QR.\n\n¿Quieres que lo repasemos 10 minutos por teléfono? Respóndeme con una hora.\n\nAlex · DKitchen` },
    { id: 'seguimiento', nombre: 'Seguimiento', cuando: 'Cada mes o si no entra al panel',
      asunto: `¿Qué tal va tu carta, ${d.local}?`,
      texto: `${hola}:\n\nTe escribo para ver qué tal va la carta digital en ${d.local}. ¿Hay algo que te gustaría cambiar o que no te convenza?\n\nCualquier cosa, respóndeme aquí mismo.\n\nAlex · DKitchen` },
    { id: 'renovacion', nombre: 'Aviso de cobro', cuando: 'Unos días antes del cobro',
      asunto: `Tu próxima cuota de DKitchen${d.proximoCobro ? ` (${d.proximoCobro})` : ''}`,
      texto: `${hola}:\n\nTe recordamos que ${d.proximoCobro ? `el ${d.proximoCobro}` : 'en los próximos días'} se renueva tu plan ${plan?.nombre ?? ''}${plan ? ` (${plan.mensual} € + IVA)` : ''} con la tarjeta que tienes guardada. No tienes que hacer nada; Stripe te enviará la factura.\n\nSi quieres cambiar de plan o de tarjeta, respóndenos a este correo.\n\nAlex · DKitchen` },
    { id: 'pago_fallido', nombre: 'Pago no realizado', cuando: 'Si el cobro ha fallado',
      asunto: `No hemos podido cobrar tu cuota · ${d.local}`,
      texto: `${hola}:\n\nNo hemos podido cobrar la cuota de tu plan. Tu carta sigue funcionando unos días más, pero para no cortarla necesitamos que actualices la tarjeta desde tu panel (${SITIO}/panel → Mi plan).\n\nSi ha sido un error del banco o prefieres otra forma de pago, respóndeme y lo resolvemos.\n\nAlex · DKitchen` },
    { id: 'mejora_plan', nombre: 'Propuesta de mejora de plan', cuando: 'Cerca de los límites de su plan',
      asunto: `${d.local} se está quedando corta en su plan`,
      texto: `${hola}:\n\nTu carta está funcionando muy bien y te estás acercando a los límites del plan ${plan?.nombre ?? ''}. Con el plan siguiente tendrías más platos, mesas, camareros, comandas al TPV e idiomas.\n\n¿Te paso el enlace para cambiarlo? Te explico antes qué cambia en tu cuota.\n\nAlex · DKitchen` },
    { id: 'signature', nombre: 'Invitación a Signature', cuando: 'Cliente con volumen o pedidos a domicilio',
      asunto: `Tu propia app con la marca de ${d.local}`,
      texto: `${hola}:\n\nCon el movimiento que tiene ${d.local}, tiene sentido dar el salto a tu propia app (DKitchen Signature): pedidos y pagos con tu marca, sin comisiones por pedido, y te la montamos a partir de tu carta.\n\n¿Te lo enseño en una llamada de 15 minutos? Más info: ${SITIO}/signature\n\nAlex · DKitchen` },
    { id: 'personalizado', nombre: 'Mensaje libre', cuando: 'Cualquier otra cosa', asunto: `DKitchen · ${d.local}`, texto: `${hola}:\n\n\n\nAlex · DKitchen` },
  ];
}

const fila = (r: Record<string, unknown>): Comunicacion => ({
  id: String(r.id), canal: r.canal as Canal, plantilla: (r.plantilla as string) ?? null, asunto: (r.asunto as string) ?? null, cuerpo: (r.cuerpo as string) ?? null,
  recordarEn: r.recordar_en ? new Date(r.recordar_en as string).toISOString().slice(0, 10) : null, hecho: !!r.hecho, creadoEn: new Date(r.creado_en as string).toISOString(),
});

export async function verComunicaciones(jwt: string, restaurante: string): Promise<Comunicacion[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_comunicaciones($1)', [restaurante])).rows.map(fila));
}
export async function anotarComunicacion(jwt: string, restaurante: string, canal: Canal, plantilla: string, asunto: string, cuerpo: string, recordarEn: string | null) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_comunicacion_anotar($1, $2, $3, $4, $5, $6::date)', [restaurante, canal, plantilla, asunto, cuerpo, recordarEn]));
}
export async function recordatorioHecho(jwt: string, id: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.admin_recordatorio_hecho($1)', [id]));
}
export async function recordatoriosPendientes(jwt: string): Promise<{ id: string; restauranteId: string | null; local: string | null; cuerpo: string | null; recordarEn: string }[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_recordatorios_pendientes()')).rows.map((r) => ({
    id: r.id, restauranteId: r.restaurante_id, local: r.local, cuerpo: r.cuerpo, recordarEn: new Date(r.recordar_en).toISOString().slice(0, 10),
  })));
}
export async function usoPlanCliente(jwt: string, restaurante: string): Promise<UsoPlan[]> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT * FROM dk.admin_uso_plan($1)', [restaurante])).rows.map((r) => ({ que: r.que, usados: r.usados, tope: r.tope, topeMax: r.tope_max })));
}
