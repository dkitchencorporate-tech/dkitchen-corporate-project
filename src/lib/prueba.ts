import 'server-only';
import { comoCliente, comoAprovisionamiento } from '@/lib/db';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';

/**
 * Prueba «todo incluido» por tiempo y día de cobro común (migración 0034).
 * Todos los importes y fechas los calcula la base (dk.resumen_cobro,
 * dk.prueba_quedarme); aquí solo se leen y se muestran.
 */

export interface ResumenCobro {
  plan: string;
  precio_plan: number;
  /** Precio Fundador vigente (0051). */
  fundador?: boolean;
  items: { servicio: string; nombre: string; tipo: 'unico' | 'mensual'; precio: number; origen: 'pago' | 'regalo' | 'demo' | 'plan' }[];
  valor_mensual: number;
  paga_mensual: number;
  prueba_hasta: string | null;
  primer_cobro: string | null;
  proximo_cobro: string | null;
  dia_cobro: number;
  estado_acceso: string;
  cobro_si_paga_hoy: string;
}

export async function resumenCobro(jwt: string, restauranteId: string): Promise<ResumenCobro | null> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.resumen_cobro($1) AS r', [restauranteId])).rows[0]?.r ?? null);
}

export async function quedarmeConTodo(jwt: string, restauranteId: string): Promise<{ enlace: string; mensual: number; primer: number; dias: number; cobro: string; servicios: string[] }> {
  return comoCliente(jwt, async (c) => (await c.query('SELECT dk.prueba_quedarme($1) AS r', [restauranteId])).rows[0].r);
}

export async function fijarUrlPrueba(jwt: string, enlaceId: string, url: string) {
  await comoCliente(jwt, (c) => c.query('SELECT dk.prueba_enlace_url($1, $2)', [enlaceId, url]));
}

export const euros = (centimos: number) => (centimos / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
// Fecha en hora de Madrid: una fecha de la base llega como medianoche de Madrid (22:00 o 23:00 UTC del día anterior).
export const fechaLarga = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
export const diasHasta = (iso: string) => Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000);

/** Cron diario: cierra pruebas vencidas y avisa a 3 días y a 1 día del final. */
export async function avanzarPruebas(): Promise<number> {
  const { vencidas, avisos } = await comoAprovisionamiento(async (c) => ({
    vencidas: (await c.query<{ n: number }>('SELECT dk.avanzar_pruebas() AS n')).rows[0]?.n ?? 0,
    avisos: (await c.query<{ nombre: string; email: string; contacto: string | null; prueba_hasta: string; dias: number }>('SELECT * FROM dk.pruebas_por_avisar()')).rows,
  }));
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
  for (const a of avisos) {
    const fin = fechaLarga(new Date(a.prueba_hasta).toISOString());
    await enviarCorreoCliente(a.email, a.dias === 1 ? `Mañana termina tu prueba · ${a.nombre}` : `Quedan ${a.dias} días de tu prueba · ${a.nombre}`,
      `<p>Hola${a.contacto ? ' ' + escaparHtml(a.contacto) : ''},</p>
       <p>Tu prueba con todo incluido en <strong>${escaparHtml(a.nombre)}</strong> termina el <strong>${fin}</strong>.</p>
       <p>Si te quedas antes de esa fecha, <strong>no pagas nada hasta el día 12 del mes siguiente</strong>: todos los días que queden hasta entonces siguen siendo gratis, con todos los módulos.</p>
       <p><a href="${sitio}/panel?pestana=plan" style="display:inline-block;background:#6E0C2B;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Quedarme con todo</a></p>
       <p>Si no haces nada, tu carta sigue visible para tus clientes, pero el panel pasará a solo lectura.</p>`)
      .catch((e) => console.error(`No se pudo avisar del fin de prueba a ${a.email}`, e));
  }
  return vencidas;
}

/**
 * Borrado a los 60 días de la baja (0041): aviso por correo 7 días antes y,
 * al cumplirse, borrado del restaurante (en la base, en cascada) y de sus fotos.
 */
export async function purgarBajas(): Promise<number> {
  const { avisos, borrados } = await comoAprovisionamiento(async (c) => ({
    avisos: (await c.query<{ nombre: string; email: string; borrado_el: string }>('SELECT * FROM dk.bajas_por_avisar()')).rows,
    borrados: (await c.query<{ restaurante_id: string }>('SELECT * FROM dk.purgar_bajas()')).rows,
  }));
  for (const a of avisos) {
    await enviarCorreoCliente(a.email, `Tu carta se borrará el ${fechaLarga(new Date(a.borrado_el).toISOString())} · ${a.nombre}`,
      `<p>Hola,</p>
       <p>Como te dijimos al darte de baja, guardamos la carta de <strong>${escaparHtml(a.nombre)}</strong> durante 60 días. Se borrará definitivamente el <strong>${fechaLarga(new Date(a.borrado_el).toISOString())}</strong>.</p>
       <p>Si quieres volver o que te enviemos una copia antes, responde a este correo.</p>`)
      .catch((e) => console.error(`No se pudo avisar del borrado a ${a.email}`, e));
  }
  for (const b of borrados) {
    try {
      const { list, del } = await import('@vercel/blob');
      let cursor: string | undefined;
      do {
        const r = await list({ prefix: `restaurantes/${b.restaurante_id}/`, cursor, limit: 1000 });
        if (r.blobs.length) await del(r.blobs.map((x) => x.url));
        cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor);
    } catch (e) { console.error(`Borrado 60 días: fotos de ${b.restaurante_id} no borradas`, e); }
  }
  return borrados.length;
}
