import { NextResponse } from 'next/server';
import { crearTransporte, REMITENTE, BUZON_INTERNO, enviarCorreoCliente } from '@/lib/email';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

/**
 * Registros desde el pie de la web (29/09/2026): «Recomiendo a un hostelero»
 * y «Quiero ser partner». Correo interno con los datos y un botón de WhatsApp
 * para contactar en un toque; correo de confirmación a quien se registra.
 * Freno por IP en Neon y todo escapado (misma disciplina que /api/lead).
 */
export const runtime = 'nodejs';

const PERFILES_PARTNER = ['tpv', 'horeca', 'independiente', 'agencia', 'otro'];
const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const esc = (v: unknown) => String(v ?? '').slice(0, 300).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const txt = (v: unknown, max = 120) => String(v ?? '').trim().slice(0, max);

export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('registro', ipDeLaPeticion(request)), 4, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes seguidas. Inténtalo en unos minutos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }); }
  const tipo = b.tipo === 'partner' ? 'partner' : b.tipo === 'recomendacion' ? 'recomendacion' : null;
  const nombre = txt(b.nombre, 80), email = txt(b.email, 254), telefono = txt(b.telefono, 20).replace(/[^0-9+ ]/g, '');
  if (!tipo || !nombre || !CORREO.test(email) || telefono.replace(/\D/g, '').length < 9 || !b.consentimiento) {
    return NextResponse.json({ error: 'Revisa nombre, correo y teléfono.' }, { status: 400 });
  }
  const perfil = txt(b.perfil, 40);
  if (tipo === 'partner' && !PERFILES_PARTNER.includes(perfil)) return NextResponse.json({ error: 'Elige tu perfil.' }, { status: 400 });
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return NextResponse.json({ error: 'No se pudo enviar ahora. Escríbenos por WhatsApp.' }, { status: 500 });

  const filas: [string, string][] = tipo === 'partner'
    ? [['Nombre', nombre], ['Empresa', txt(b.empresa, 80)], ['Perfil', perfil], ['Zona', txt(b.zona, 80)], ['Correo', email], ['Teléfono', telefono], ['Clientes con los que trabaja', txt(b.mensaje, 600)]]
    : [['Quién recomienda', nombre], ['Su negocio', txt(b.empresa, 80)], ['Correo', email], ['Teléfono', telefono], ['Local recomendado', txt(b.localRecomendado, 80)], ['Contacto del local', txt(b.contactoRecomendado, 120)], ['Comentario', txt(b.mensaje, 600)]];
  const wa = `https://wa.me/${telefono.replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1')}`;

  try {
    await crearTransporte().sendMail({
      from: REMITENTE(), to: BUZON_INTERNO(), replyTo: email,
      subject: tipo === 'partner' ? `NUEVO PARTNER: ${nombre.slice(0, 60)} (${perfil})` : `NUEVA RECOMENDACIÓN de ${nombre.slice(0, 60)}`,
      html: `<h2>${tipo === 'partner' ? 'Solicitud de partner' : 'Recomendación de un hostelero'}</h2>
        <table cellpadding="6">${filas.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v) || '—'}</td></tr>`).join('')}</table>
        <p><a href="${wa}" style="display:inline-block;background:#25D366;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Escribirle por WhatsApp</a></p>`,
    });
  } catch (e) {
    console.error('Registro: fallo en el correo interno', e);
    return NextResponse.json({ error: 'No se pudo enviar ahora. Escríbenos por WhatsApp.' }, { status: 500 });
  }

  const servicios = `<ul>
    <li><a href="https://dkitchencorporate.es/qr">Carta digital QR</a>: tu carta al día desde el móvil, desde 9 €/mes.</li>
    <li><a href="https://dkitchencorporate.es/signature">DKitchen Signature</a>: tu propia app de pedidos, con tu marca.</li>
    <li><a href="https://dkitchencorporate.es/experience">Experience</a>: eventos que llenan tus días flojos.</li>
    <li><a href="https://dkitchencorporate.es/dark-kitchen">Dark Kitchen</a>: marcas virtuales para vender a domicilio.</li></ul>`;
  await enviarCorreoCliente(email, tipo === 'partner' ? 'Hemos recibido tu solicitud de partner · DKitchen' : 'Gracias por tu recomendación · DKitchen',
    `<p>Hola ${esc(nombre)},</p>
     <p>${tipo === 'partner' ? 'Gracias por querer trabajar con DKitchen. Hemos recibido tu solicitud y muy pronto nos pondremos en contacto contigo para contarte las condiciones del programa.' : 'Gracias por recomendarnos. Hemos recibido tus datos y muy pronto nos pondremos en contacto contigo.'}</p>
     <p>Mientras tanto, así puedes conocer lo que hacemos:</p>${servicios}
     <p>Un saludo,<br>El equipo de DKitchen</p>`).catch((e) => console.error('Registro: no se pudo enviar la confirmación', e));

  return NextResponse.json({ ok: true });
}
