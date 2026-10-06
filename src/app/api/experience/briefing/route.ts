import { NextResponse } from 'next/server';
import { crearTransporte, REMITENTE, BUZON_INTERNO, enviarCorreoCliente } from '@/lib/email';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

/**
 * Briefing de Experience tras el pago (06/10/2026): llega al buzón interno con
 * todo lo necesario para la videollamada de arranque (menos de 48 h
 * laborables) y confirma al cliente los pasos. Mismo freno y escapado que
 * /api/solicitud.
 */
export const runtime = 'nodejs';

const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const esc = (v: unknown) => String(v ?? '').slice(0, 1500).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const txt = (v: unknown, max = 120) => String(v ?? '').trim().slice(0, max);

export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('briefing-experience', ipDeLaPeticion(request)), 3, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiados envíos seguidos. Inténtalo en unos minutos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Envío no válido.' }, { status: 400 }); }
  const nombre = txt(b.nombre, 80), email = txt(b.email, 254), telefono = txt(b.telefono, 20).replace(/[^0-9+ ]/g, '');
  const fecha = txt(b.fecha, 10);
  const registro = b.origen === 'registro';
  if (!nombre || !CORREO.test(email) || telefono.replace(/\D/g, '').length < 9 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !b.consentimiento) {
    return NextResponse.json({ error: 'Revisa nombre, correo, teléfono y fecha.' }, { status: 400 });
  }
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return NextResponse.json({ error: 'No se pudo enviar ahora. Inténtalo en unos minutos.' }, { status: 500 });

  const filas: [string, string][] = [
    ['Formato', txt(b.formato, 60)], ['Negocio', txt(b.negocio, 100)], ['Tipo de cocina', txt(b.cocina, 60)],
    ['Fecha deseada', fecha], ['Aforo', txt(b.plazas, 6)], ['Precio de la entrada (€)', txt(b.precioEntrada, 6)],
    ['Menú o idea', txt(b.menu, 1500)], ['Pasarela de cobro', txt(b.pasarela, 40)],
    ['Licencias (alcohol, música, aforo)', txt(b.licencias, 300)], ['Notas', txt(b.notas, 1000)],
    ['Nombre', nombre], ['Correo', email], ['Teléfono', telefono],
  ];
  const wa = `https://wa.me/${telefono.replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1')}`;

  try {
    await crearTransporte().sendMail({
      from: REMITENTE(), to: BUZON_INTERNO(), replyTo: email,
      subject: `${registro ? 'SOLICITUD EXPERIENCE (sin pago)' : 'BRIEFING EXPERIENCE'} · ${txt(b.formato, 40)} · ${nombre.slice(0, 50)} · ${fecha}`,
      html: `<h2>${registro ? 'Solicitud de Experience SIN PAGO: llamar en menos de 48 h laborables, cerrar formato y fecha y mandar el enlace de pago' : 'Briefing de Experience (llamar en menos de 48 h laborables)'}</h2>
        <table cellpadding="6">${filas.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v).replace(/\n/g, '<br>') || '—'}</td></tr>`).join('')}</table>
        <p><a href="${wa}" style="display:inline-block;background:#25D366;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Escribirle por WhatsApp</a></p>`,
    });
  } catch (e) {
    console.error('Briefing de Experience: fallo en el correo interno', e);
    return NextResponse.json({ error: 'No se pudo enviar ahora. Inténtalo en unos minutos.' }, { status: 500 });
  }

  // El correo interno ya salió: si falla la copia al cliente no se devuelve
  // error (antes daba 500 y el cliente reenviaba el formulario, H20).
  await enviarCorreoCliente(email, registro ? 'Hemos recibido tu solicitud de evento · DKitchen Experience' : 'Hemos recibido el briefing de tu evento · DKitchen Experience',
    `<p>Hola ${esc(nombre)},</p>
     <p>Tenemos ${registro ? 'tu solicitud' : 'el briefing'} de tu <strong>${esc(txt(b.formato, 60))}</strong> para el <strong>${esc(fecha)}</strong>.</p>
     ${registro
       ? '<p>Te llamaremos en menos de 48 horas laborables para cerrar contigo el formato, la fecha y el aforo. No has pagado nada: cuando esté todo confirmado te enviaremos el enlace de pago y arrancamos.</p>'
       : '<p>Te contactaremos en menos de 48 horas laborables para la videollamada de arranque. En el día 3 te enviaremos el concepto del evento para que lo apruebes.</p>'}
     <p>Si quieres añadir algo (fotos de platos, tu carta o ideas), responde a este correo.</p>
     <p>El equipo de DKitchen</p>`).catch((e) => console.error('Briefing de Experience: copia al cliente no enviada', e));

  return NextResponse.json({ ok: true });
}
