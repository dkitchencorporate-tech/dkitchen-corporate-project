import { NextResponse } from 'next/server';
import { crearTransporte, REMITENTE, BUZON_INTERNO, enviarCorreoCliente } from '@/lib/email';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';
import { INTERESES } from '@/lib/intereses';
import { crearProyecto, PRODUCTO_DE_INTERES } from '@/lib/proyectos';

/**
 * Solicitudes desde cualquier botón de la web sin pago directo (29/09/2026).
 * Sustituye a los enlaces de WhatsApp: correo interno con los datos (y un
 * botón para contactar al cliente), confirmación al cliente con los pasos
 * siguientes. Freno por IP y todo escapado, como /api/registro.
 */
export const runtime = 'nodejs';

const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const esc = (v: unknown) => String(v ?? '').slice(0, 800).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const txt = (v: unknown, max = 120) => String(v ?? '').trim().slice(0, max);

export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('solicitud', ipDeLaPeticion(request)), 5, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes seguidas. Inténtalo en unos minutos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }); }
  const interes = txt(b.interes, 40);
  const info = INTERESES[interes];
  const nombre = txt(b.nombre, 80), email = txt(b.email, 254), telefono = txt(b.telefono, 20).replace(/[^0-9+ ]/g, '');
  if (!info || !nombre || !CORREO.test(email) || telefono.replace(/\D/g, '').length < 9 || !b.consentimiento) {
    return NextResponse.json({ error: 'Revisa nombre, correo y teléfono.' }, { status: 400 });
  }
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return NextResponse.json({ error: 'No se pudo enviar ahora. Inténtalo en unos minutos.' }, { status: 500 });

  const detalle = txt(b.detalle, 60).replace(/[^a-z0-9 -]/gi, '');
  const filas: [string, string][] = [
    ['Interés', info.nombre + (detalle ? ` · ${detalle}` : '')], ['Nombre', nombre], ['Negocio', txt(b.negocio, 100)],
    ['Correo', email], ['Teléfono', telefono], ['Mensaje', txt(b.mensaje, 1000)], ['Página', txt(b.pagina, 120)],
  ];
  const wa = `https://wa.me/${telefono.replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1')}`;

  try {
    await crearTransporte().sendMail({
      from: REMITENTE(), to: BUZON_INTERNO(), replyTo: email,
      subject: `NUEVA SOLICITUD · ${info.nombre}: ${nombre.slice(0, 60)}`,
      html: `<h2>Solicitud: ${esc(info.nombre)}</h2>
        <table cellpadding="6">${filas.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v) || '—'}</td></tr>`).join('')}</table>
        <p><a href="${wa}" style="display:inline-block;background:#25D366;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Escribirle por WhatsApp</a></p>`,
    });
  } catch (e) {
    console.error('Solicitud: fallo en el correo interno', e);
    return NextResponse.json({ error: 'No se pudo enviar ahora. Inténtalo en unos minutos.' }, { status: 500 });
  }

  // Signature, Experience, Auditoría y Dark Kitchen abren (o anotan) un proyecto en Central (0060).
  const producto = PRODUCTO_DE_INTERES[interes];
  if (producto) {
    await crearProyecto(producto, 'solicitud', {
      email, nombre, telefono, negocio: txt(b.negocio, 100) || null,
      datos: { interes, detalle: detalle || undefined, mensaje: txt(b.mensaje, 1000) || undefined, pagina: txt(b.pagina, 120) || undefined },
      texto: `Solicitud web: ${info.nombre}${detalle ? ` · ${detalle}` : ''}${txt(b.mensaje, 300) ? ` · «${txt(b.mensaje, 300)}»` : ''}`,
    });
  }

  await enviarCorreoCliente(email, `Hemos recibido tu solicitud · ${info.nombre}`,
    `<p>Hola ${esc(nombre)},</p>
     <p>Gracias por escribirnos. Hemos recibido tu solicitud sobre <strong>${esc(info.nombre)}</strong> y te contactaremos muy pronto, normalmente en menos de 24 horas laborables.</p>
     <p>${esc(info.siguiente)}</p>
     <p>Mientras tanto, puedes ver lo que hacemos:</p>
     <ul>
       <li><a href="https://dkitchencorporate.es/qr">Carta digital QR</a>: tu carta al día desde el móvil, primer mes por 1 €.</li>
       <li><a href="https://dkitchencorporate.es/signature">DKitchen Signature</a>: tu propia app de pedidos, con tu marca.</li>
       <li><a href="https://dkitchencorporate.es/casos-de-exito">Casos de éxito</a>: apps reales que ya venden.</li>
     </ul>
     <p>Un saludo,<br>El equipo de DKitchen</p>`).catch((e) => console.error('Solicitud: no se pudo enviar la confirmación', e));

  return NextResponse.json({ ok: true });
}
