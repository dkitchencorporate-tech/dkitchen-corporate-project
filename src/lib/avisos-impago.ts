import 'server-only';
import { comoAprovisionamiento } from '@/lib/db';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';
import { avanzarCalendarioGracia } from '@/lib/payments/aprovisionar';

/**
 * Correos AL CLIENTE durante un impago (H16, 08/10/2026). Calendario propio (0012):
 * día 0 cobro fallido (webhook de Stripe) → gracia, todo funciona → día 12 solo
 * lectura (la carta sigue visible, el panel no edita) → día 30 suspendido.
 * Recordatorios los días 9 y 27 (0059). Nunca lanzan: el cron y el webhook no
 * dependen del correo.
 */

const SITIO = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const PLAN = () => `${SITIO()}/panel?pestana=plan`;
const hola = (nombre?: string | null) => `<p style="margin:0 0 12px">Hola${nombre ? ` ${escaparHtml(nombre)}` : ''},</p>`;
const AYUDA = '<p style="margin:16px 0 0;font-size:13px;color:#6B6560">Si ya lo has resuelto, ignora este correo. ¿Algún problema con el cobro? Responde a este correo y lo vemos contigo.</p>';

/** Día 0: Stripe no ha podido cobrar la renovación (invoice.payment_failed). */
export async function avisarCobroFallido(d: { email?: string | null; nombre?: string | null; importe: string; urlFactura?: string | null }): Promise<void> {
  if (!d.email) return;
  const url = d.urlFactura && /^https:\/\//.test(d.urlFactura) ? d.urlFactura : PLAN();
  await enviarCorreoCliente(
    d.email,
    'No hemos podido cobrar tu renovación de DKitchen',
    `${hola(d.nombre)}
     <p style="margin:0 0 12px">Hemos intentado cobrar la renovación de tu plan (<strong>${escaparHtml(d.importe)}</strong>) y el banco la ha rechazado. Suele ser una tarjeta caducada o sin saldo.</p>
     <p style="margin:0 0 12px"><strong>Tu carta y tu panel siguen funcionando con normalidad.</strong> Tienes 12 días para actualizar el pago; después, el panel pasa a solo lectura (tus clientes siguen viendo la carta) y el día 30 el servicio se suspende.</p>
     <p style="margin:0">Pulsa el botón para pagar con otra tarjeta. También puedes cambiarla desde tu panel → Plan.</p>${AYUDA}`,
    { titulo: 'Revisa tu forma de pago', boton: { texto: 'Actualizar el pago', url } }
  ).catch((e) => console.error(`Impago: no se pudo avisar a ${d.email}`, e));
}

type Aviso = { nombre: string; email: string; contacto: string | null; fase: 'solo_lectura' | 'suspendido' | 'recordatorio'; dias: number };

function correoDeFase(a: Aviso): { asunto: string; titulo: string; cuerpo: string } {
  const local = `<strong>${escaparHtml(a.nombre)}</strong>`;
  if (a.fase === 'solo_lectura') {
    return {
      asunto: `Tu panel está en solo lectura · ${a.nombre}`,
      titulo: 'Tu panel está en solo lectura',
      cuerpo: `<p style="margin:0 0 12px">Seguimos sin poder cobrar la renovación de ${local}. Desde hoy tu panel está en <strong>solo lectura</strong>: tus clientes siguen viendo la carta, pero no puedes cambiar platos ni precios.</p>
               <p style="margin:0">En cuanto actualices el pago, todo vuelve a la normalidad al momento. Si no, el servicio se suspenderá dentro de 18 días.</p>`,
    };
  }
  if (a.fase === 'suspendido') {
    return {
      asunto: `Servicio suspendido · ${a.nombre}`,
      titulo: 'Hemos suspendido tu servicio',
      cuerpo: `<p style="margin:0 0 12px">Han pasado 30 días sin poder cobrar la renovación de ${local} y hemos suspendido el servicio.</p>
               <p style="margin:0">Guardamos tu carta y tus datos: si actualizas el pago, la reactivamos tal y como estaba. Si prefieres dejarlo, no tienes que hacer nada.</p>`,
    };
  }
  const antesDeSuspender = a.dias >= 27;
  return {
    asunto: antesDeSuspender ? `Quedan 3 días para la suspensión · ${a.nombre}` : `Quedan 3 días para el modo solo lectura · ${a.nombre}`,
    titulo: 'Recordatorio de pago pendiente',
    cuerpo: antesDeSuspender
      ? `<p style="margin:0">La renovación de ${local} sigue pendiente. Si no se actualiza el pago en 3 días, <strong>el servicio se suspenderá</strong> y la carta dejará de estar disponible para tus clientes.</p>`
      : `<p style="margin:0">La renovación de ${local} sigue pendiente. Tu carta y tu panel funcionan, pero en 3 días el panel pasará a <strong>solo lectura</strong> si no se actualiza el pago.</p>`,
  };
}

/**
 * Cron diario: avanza el calendario de gracia y avisa al cliente de cada cambio.
 * Si la 0059 aún no está en la base, vuelve a la función de 0012 (sin avisos).
 */
export async function avanzarGraciaConAvisos(): Promise<number> {
  let avisos: Aviso[];
  try {
    avisos = await comoAprovisionamiento(async (c) => (await c.query<Aviso>('SELECT nombre, email, contacto, fase, dias FROM dk.avanzar_calendario_gracia_avisos()')).rows);
  } catch (e) {
    console.error('Gracia: falta dk.avanzar_calendario_gracia_avisos (0059); sigo sin avisos', e);
    return avanzarCalendarioGracia();
  }
  for (const a of avisos) {
    const { asunto, titulo, cuerpo } = correoDeFase(a);
    await enviarCorreoCliente(a.email, asunto, `${hola(a.contacto)}${cuerpo}${AYUDA}`, { titulo, boton: { texto: 'Actualizar el pago', url: PLAN() } })
      .catch((e) => console.error(`Gracia: no se pudo avisar a ${a.email}`, e));
  }
  return avisos.filter((a) => a.fase !== 'recordatorio').length;
}
