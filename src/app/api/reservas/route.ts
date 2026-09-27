import { NextResponse } from 'next/server';
import { crearReserva } from '@/lib/reservas';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';
import { enviarCorreoCliente, escaparHtml, filasCorreo } from '@/lib/email';

export const runtime = 'nodejs';

const SLUG = /^[a-z0-9-]{3,40}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const TELEFONO = /^\+?[0-9 ]{9,20}$/;

const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

/**
 * Reserva desde la carta pública (plan Ampliado). Dos frenos: por IP aquí y
 * por teléfono (2 min) en dk.crear_reserva(). El correo al negocio se envía
 * desde el servidor; el WhatsApp lo abre el propio cliente con el texto ya
 * escrito (no hay API de WhatsApp de por medio, por decisión del 19/09).
 */
export async function POST(peticion: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('reserva', ipDeLaPeticion(peticion)), 5, 600)) {
      return NextResponse.json({ resultado: 'limite' }, { status: 429 });
    }
  } catch (error) {
    console.error('No se pudo comprobar el freno de frecuencia:', (error as Error).message);
  }

  const c = (await peticion.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = String(c?.slug ?? '').toLowerCase();
  const nombre = String(c?.nombre ?? '').trim().slice(0, 80);
  const telefono = String(c?.telefono ?? '').trim();
  const fecha = String(c?.fecha ?? '');
  const hora = String(c?.hora ?? '');
  const personas = Math.trunc(Number(c?.personas));
  const notas = String(c?.notas ?? '').trim().slice(0, 300) || null;

  if (!SLUG.test(slug) || nombre.length < 2 || !TELEFONO.test(telefono) || !FECHA.test(fecha) || !HORA.test(hora) ||
      !Number.isInteger(personas) || personas < 1 || personas > 50) {
    return NextResponse.json({ resultado: 'datos_invalidos' }, { status: 400 });
  }

  try {
    const r = await crearReserva(slug, { nombre, telefono, fecha, hora, personas, notas });
    if (r.resultado !== 'ok') return NextResponse.json({ resultado: r.resultado }, { status: 200 });

    if (r.emailNegocio) {
      try {
        await enviarCorreoCliente(
          r.emailNegocio,
          `Nueva reserva: ${nombre} · ${personas} pers. · ${fechaLarga(fecha)} ${hora}`,
          `<p style="margin:0 0 8px">Has recibido una reserva desde la carta digital de <strong>${escaparHtml(r.restaurante)}</strong>.</p>` +
            filasCorreo([
              ['Nombre', nombre],
              ['Teléfono', telefono],
              ['Día', fechaLarga(fecha)],
              ['Hora', hora],
              ['Personas', String(personas)],
              ['Notas', notas],
            ]) +
            `<p style="margin:20px 0 0;font-size:14px;color:#6B6560">Llama al cliente para confirmarla y márcala como confirmada o cancelada en tu panel.</p>`,
          {
            titulo: 'Nueva reserva',
            preencabezado: `${nombre} · ${personas} pers. · ${fechaLarga(fecha)} a las ${hora}`,
            restaurante: r.restaurante,
            boton: { texto: 'Gestionar en mi panel', url: 'https://dkitchencorporate.es/panel' },
          }
        );
      } catch (error) {
        // La reserva ya está guardada y visible en el panel.
        console.error('Aviso de reserva por correo no enviado:', (error as Error).message);
      }
    }

    const mensaje = `Hola, soy ${nombre}. Acabo de pedir mesa desde vuestra carta: ${personas} ${personas === 1 ? 'persona' : 'personas'}, ${fechaLarga(fecha)} a las ${hora}.${notas ? ` Nota: ${notas}` : ''} Mi teléfono: ${telefono}.`;
    const whatsappUrl = r.whatsapp ? `https://wa.me/${r.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}` : null;
    return NextResponse.json({ resultado: 'ok', whatsappUrl });
  } catch (error) {
    console.error('Fallo registrando la reserva:', (error as Error).message);
    return NextResponse.json({ resultado: 'error' }, { status: 500 });
  }
}
