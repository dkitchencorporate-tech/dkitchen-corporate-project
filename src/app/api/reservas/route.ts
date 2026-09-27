import { NextResponse } from 'next/server';
import { crearReserva } from '@/lib/reservas';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';
import { avisarNuevaReservaAlNegocio, acusarReservaAlCliente, fechaLarga } from '@/lib/correos-reserva';

export const runtime = 'nodejs';

const SLUG = /^[a-z0-9-]{3,40}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const TELEFONO = /^\+?[0-9 ]{9,20}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/**
 * Reserva desde la carta pública (plan Ampliado). Dos frenos: por IP aquí y
 * por teléfono (2 min) en dk.crear_reserva(). Los correos (al dueño y, si deja
 * su correo, acuse al cliente) llevan la marca del restaurante. El WhatsApp al
 * negocio lo abre el propio cliente con el texto ya escrito.
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
  const emailBruto = String(c?.email ?? '').trim().toLowerCase();
  const fecha = String(c?.fecha ?? '');
  const hora = String(c?.hora ?? '');
  const personas = Math.trunc(Number(c?.personas));
  const notas = String(c?.notas ?? '').trim().slice(0, 300) || null;

  if (!SLUG.test(slug) || nombre.length < 2 || !TELEFONO.test(telefono) || !FECHA.test(fecha) || !HORA.test(hora) ||
      !Number.isInteger(personas) || personas < 1 || personas > 50 || (emailBruto && (!EMAIL.test(emailBruto) || emailBruto.length > 120))) {
    return NextResponse.json({ resultado: 'datos_invalidos' }, { status: 400 });
  }
  const datos = { nombre, telefono, email: emailBruto || null, fecha, hora, personas, notas };

  try {
    const r = await crearReserva(slug, datos);
    if (r.resultado !== 'ok') return NextResponse.json({ resultado: r.resultado }, { status: 200 });

    // La reserva ya está guardada: un fallo de correo no la invalida (se ve en el panel).
    await Promise.allSettled([
      r.emailNegocio ? avisarNuevaReservaAlNegocio(r.emailNegocio, r.marca, datos) : Promise.resolve(),
      acusarReservaAlCliente(r.marca, datos),
    ]).then((res) => res.forEach((x) => x.status === 'rejected' && console.error('Correo de reserva no enviado:', (x.reason as Error)?.message)));

    const mensaje = `Hola, soy ${nombre}. Acabo de pedir mesa desde vuestra carta: ${personas} ${personas === 1 ? 'persona' : 'personas'}, ${fechaLarga(fecha)} a las ${hora}.${notas ? ` Nota: ${notas}` : ''} Mi teléfono: ${telefono}.`;
    const whatsappUrl = r.whatsapp ? `https://wa.me/${r.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}` : null;
    return NextResponse.json({ resultado: 'ok', whatsappUrl });
  } catch (error) {
    console.error('Fallo registrando la reserva:', (error as Error).message);
    return NextResponse.json({ resultado: 'error' }, { status: 500 });
  }
}
