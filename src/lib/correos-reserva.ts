import 'server-only';
import { enviarCorreoCliente, escaparHtml, filasCorreo } from '@/lib/email';
import type { DatosReserva, MarcaLocal } from '@/lib/reservas';

/**
 * Todos los mensajes de una reserva en un solo sitio. Regla (28/09, karc0):
 * cualquier correo que recibe el cliente del restaurante lleva la MARCA DEL
 * RESTAURANTE (logo, nombre y color); DKitchen solo firma al pie como
 * proveedor de la tecnología.
 */

export const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

const personas = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`;

function filas(d: DatosReserva) {
  return filasCorreo([
    ['Nombre', d.nombre],
    ['Teléfono', d.telefono],
    ['Correo', d.email],
    ['Día', fechaLarga(d.fecha)],
    ['Hora', d.hora],
    ['Personas', String(d.personas)],
    ['Notas', d.notas],
  ]);
}

/** Aviso al DUEÑO: nueva reserva desde su carta. */
export async function avisarNuevaReservaAlNegocio(email: string, marca: MarcaLocal, d: DatosReserva) {
  await enviarCorreoCliente(
    email,
    `Nueva reserva: ${d.nombre} · ${personas(d.personas)} · ${fechaLarga(d.fecha)} ${d.hora}`,
    `<p style="margin:0 0 8px">Has recibido una reserva desde tu carta digital.</p>${filas(d)}
     <p class="dk-suave" style="margin:20px 0 0;font-size:14px;color:#6B6560">Ábrela en tu panel para confirmarla o cancelarla: el cliente recibirá el aviso automáticamente.</p>`,
    {
      titulo: 'Nueva reserva',
      preencabezado: `${d.nombre} · ${personas(d.personas)} · ${fechaLarga(d.fecha)} a las ${d.hora}`,
      marca,
      boton: { texto: 'Gestionar en mi panel', url: 'https://dkitchencorporate.es/panel' },
    }
  );
}

/** Acuse al CLIENTE: solicitud recibida (pendiente de confirmar). */
export async function acusarReservaAlCliente(marca: MarcaLocal, d: DatosReserva) {
  if (!d.email) return;
  await enviarCorreoCliente(
    d.email,
    `Hemos recibido tu solicitud de reserva en ${marca.nombre}`,
    `<p style="margin:0 0 8px">Hola ${escaparHtml(d.nombre.split(' ')[0])}, hemos recibido tu solicitud. <strong>${escaparHtml(marca.nombre)}</strong> te la confirmará en breve.</p>${filas({ ...d, email: null })}`,
    { titulo: 'Solicitud recibida', preencabezado: `${fechaLarga(d.fecha)} a las ${d.hora} · ${personas(d.personas)}`, marca }
  );
}

/** Aviso al CLIENTE: reserva confirmada o cancelada por el local. */
export async function avisarEstadoAlCliente(marca: MarcaLocal, d: DatosReserva, estado: 'confirmada' | 'cancelada', contacto: { telefono?: string | null; direccion?: string | null }) {
  if (!d.email) return;
  const confirmada = estado === 'confirmada';
  const extra = [
    contacto.direccion ? `📍 ${escaparHtml(contacto.direccion)}` : '',
    contacto.telefono ? `📞 ${escaparHtml(contacto.telefono)}` : '',
  ].filter(Boolean).join('<br>');
  await enviarCorreoCliente(
    d.email,
    confirmada ? `Reserva confirmada en ${marca.nombre}` : `Reserva cancelada en ${marca.nombre}`,
    `<p style="margin:0 0 8px">Hola ${escaparHtml(d.nombre.split(' ')[0])}, ${
      confirmada
        ? `<strong>tu reserva está confirmada</strong>. ¡Te esperamos!`
        : `lamentablemente <strong>no podemos atender tu reserva</strong> en esa fecha. Si quieres, llámanos y buscamos otra opción.`
    }</p>${filas({ ...d, email: null })}${extra ? `<p class="dk-suave" style="margin:18px 0 0;font-size:14px;color:#6B6560">${extra}</p>` : ''}`,
    { titulo: confirmada ? '¡Reserva confirmada!' : 'Reserva no disponible', preencabezado: `${fechaLarga(d.fecha)} a las ${d.hora}`, marca }
  );
}

/** Mensaje de WhatsApp para el CLIENTE (lo envía el dueño con un toque). */
export function whatsappParaCliente(marca: MarcaLocal, d: DatosReserva, estado: 'confirmada' | 'cancelada'): string | null {
  const numero = d.telefono.replace(/\D/g, '');
  if (numero.length < 9) return null;
  const internacional = numero.length === 9 ? `34${numero}` : numero;
  const texto = estado === 'confirmada'
    ? `Hola ${d.nombre.split(' ')[0]}, te confirmamos tu reserva en ${marca.nombre}: ${fechaLarga(d.fecha)} a las ${d.hora}, ${personas(d.personas)}. ¡Te esperamos!`
    : `Hola ${d.nombre.split(' ')[0]}, lo sentimos: no podemos atender tu reserva en ${marca.nombre} el ${fechaLarga(d.fecha)} a las ${d.hora}. Llámanos y buscamos otra opción.`;
  return `https://wa.me/${internacional}?text=${encodeURIComponent(texto)}`;
}
