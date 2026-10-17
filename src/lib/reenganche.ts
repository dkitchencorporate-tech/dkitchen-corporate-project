import 'server-only';
import { comoAprovisionamiento } from '@/lib/db';
import { enviarCorreoCliente, escaparHtml, type OpcionesCorreo } from '@/lib/email';
import { nombrePlan } from '@/lib/pricing-config';

/**
 * Reenganche de bajas (0081, decisión de karc0 del 17/10/2026). Tres correos:
 *   · día 0 (baja desde el panel o desde Central): «las puertas siguen abiertas» + enlace de vuelta;
 *   · día 30 (cron): «tu carta sigue guardada», solo a quien sigue en la lista de exclientes;
 *   · día 53 (cron, aviso legal de la 0041): «se borra en 7 días», ahora con el enlace de vuelta.
 * La lista de exclientes (suscriptores_marketing) se apoya en la LSSI art. 21.2: cada correo comercial
 * lleva la baja de la lista con un clic (/baja-lista/<token> y cabecera List-Unsubscribe).
 */

const SITIO = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const fechaLarga = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
const eur = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: c % 100 ? 2 : 0 }) + ' €';

export const urlVuelta = (token: string) => `${SITIO()}/volver/${token}`;
export const urlBajaLista = (token: string) => `${SITIO()}/baja-lista/${token}`;

/** Cabeceras de baja con un clic (RFC 8058): Gmail y Outlook enseñan su propio botón «Cancelar suscripción». */
export function cabecerasBaja(token: string | null): OpcionesCorreo['cabeceras'] {
  if (!token) return undefined;
  return {
    'List-Unsubscribe': `<${SITIO()}/api/lista/baja?t=${token}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/** Pie con la baja de la lista (solo si la persona sigue suscrita). */
export function pieBajaLista(token: string | null): string {
  if (!token) return '';
  return `<p style="margin-top:28px;font-size:12px;color:#9A938C">Te escribimos porque fuiste cliente de DKitchen. Si no quieres recibir más correos nuestros,
    <a href="${urlBajaLista(token)}" style="color:#9A938C">date de baja de esta lista con un clic</a>.</p>`;
}

/** Día 0: tokens para el correo de baja. Nunca lanza: si falla, el correo de baja sale como antes. */
export async function prepararReenganche(restauranteId: string): Promise<{ vuelta: string | null; bajaLista: string | null }> {
  try {
    const r = await comoAprovisionamiento(async (c) => (await c.query<{ vuelta: string; baja_lista: string | null }>(
      'SELECT * FROM dk.reenganche_preparar($1)', [restauranteId])).rows[0]);
    return { vuelta: r?.vuelta ?? null, bajaLista: r?.baja_lista ?? null };
  } catch (e) {
    console.error('Reenganche: no se pudieron preparar los enlaces', e);
    return { vuelta: null, bajaLista: null };
  }
}

/** Botón dentro del cuerpo (el de la plantilla iría debajo del pie de la lista). */
const boton = (texto: string, url: string) =>
  `<p style="margin:22px 0"><a href="${url}" style="display:inline-block;background:#6E0C2B;color:#fff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">${escaparHtml(texto)}</a></p>`;

/** Día 0: el párrafo «las puertas siguen abiertas» para los correos de baja. */
export function bloquePuertasAbiertas(vuelta: string | null, bajaLista: string | null): string {
  if (!vuelta) return '';
  return `<p><strong>Las puertas siguen abiertas.</strong> Tu carta queda guardada tal y como la dejaste: platos, fotos, precios y el mismo QR de tus mesas.
     Si cambias de idea, vuelves con un clic y sigue funcionando al momento.</p>
   ${boton('Volver a DKitchen', urlVuelta(vuelta))}
   ${pieBajaLista(bajaLista)}`;
}

type Fila30 = { nombre: string; email: string; plan: string; precio_centimos: number; borrado_el: string; vuelta: string; baja_lista: string };

/** Día 30 (cron diario): «tu carta sigue guardada». Devuelve cuántos se enviaron. */
export async function enviarReenganche30(): Promise<number> {
  const filas = await comoAprovisionamiento(async (c) => (await c.query<Fila30>('SELECT * FROM dk.reenganche_30_pendientes()')).rows);
  let enviados = 0;
  for (const f of filas) {
    const borrado = fechaLarga(new Date(f.borrado_el).toISOString());
    await enviarCorreoCliente(f.email, `Tu carta de ${f.nombre} sigue guardada`,
      `<p>Hola,</p>
       <p>Hace un mes que <strong>${escaparHtml(f.nombre)}</strong> dejó DKitchen. Tu carta sigue guardada tal y como la dejaste: platos, fotos, precios y el mismo QR que ya tienes en las mesas.</p>
       <p>Si quieres volver, es un clic: pagas tu plan ${escaparHtml(nombrePlan(f.plan))} (${eur(f.precio_centimos)} + IVA al mes, sin permanencia) y tu carta vuelve a funcionar al momento, sin montar nada de nuevo.</p>
       ${boton('Volver con mi carta', urlVuelta(f.vuelta))}
       <p>La guardamos hasta el <strong>${escaparHtml(borrado)}</strong>.</p>
       ${pieBajaLista(f.baja_lista)}`,
      { titulo: 'Tu carta sigue guardada', cabeceras: cabecerasBaja(f.baja_lista) })
      .then(() => { enviados++; })
      .catch((e) => console.error(`Reenganche día 30: no se pudo escribir a ${f.email}`, e));
  }
  return enviados;
}

export type Aviso53 = { nombre: string; email: string; borrado_el: string; plan: string; precio_centimos: number; vuelta: string | null; baja_lista: string | null; comercial: boolean };

/** Día 53: aviso legal de borrado («se borra en 7 días») con el enlace de vuelta. */
export async function enviarAviso53(a: Aviso53): Promise<void> {
  const borrado = fechaLarga(new Date(a.borrado_el).toISOString());
  const volver = a.comercial && a.vuelta;
  await enviarCorreoCliente(a.email, `Tu carta de ${a.nombre} se borra en 7 días`,
    `<p>Hola,</p>
     <p>Como te dijimos al darte de baja, guardamos la carta de <strong>${escaparHtml(a.nombre)}</strong> durante 60 días. Se borrará definitivamente el <strong>${escaparHtml(borrado)}</strong>: platos, fotos y QR.</p>
     ${volver ? `<p>Si quieres conservarla, vuelve antes de esa fecha: pagas tu plan ${escaparHtml(nombrePlan(a.plan))} (${eur(a.precio_centimos)} + IVA al mes, sin permanencia) y sigue funcionando al momento.</p>${boton('Conservar mi carta', urlVuelta(a.vuelta!))}` : ''}
     <p>Si prefieres que te enviemos una copia antes, responde a este correo.</p>
     ${volver ? pieBajaLista(a.baja_lista) : ''}`,
    { titulo: 'Se borra en 7 días', cabeceras: volver ? cabecerasBaja(a.baja_lista) : undefined });
}
