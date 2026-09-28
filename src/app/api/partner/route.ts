import { NextResponse } from 'next/server';
import { crearTransporte, REMITENTE, BUZON_INTERNO } from '@/lib/email';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

/**
 * Solicitudes del programa de partners (29/09/2026). Misma disciplina que
 * /api/lead: freno por IP en Neon, todo escapado, sin filtrar errores internos.
 */
export const runtime = 'nodejs';

const TIPOS = ['tpv', 'horeca', 'independiente', 'agencia', 'otro'];
const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const escapar = (v: unknown) => String(v ?? '').slice(0, 300).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('partner', ipDeLaPeticion(request)), 4, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes seguidas. Inténtalo en unos minutos.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }); }
  const nombre = String(b.nombre ?? '').trim(), email = String(b.email ?? '').trim(), telefono = String(b.telefono ?? '').replace(/[^0-9+ ]/g, '').trim();
  const tipo = String(b.tipo ?? ''), empresa = String(b.empresa ?? '').trim(), zona = String(b.zona ?? '').trim(), mensaje = String(b.mensaje ?? '').trim();
  if (!nombre || nombre.length > 80 || !CORREO.test(email) || email.length > 254 || telefono.replace(/\D/g, '').length < 9 || !TIPOS.includes(tipo) || !b.consentimiento) {
    return NextResponse.json({ error: 'Revisa los datos: nombre, correo, teléfono y tipo de perfil son obligatorios.' }, { status: 400 });
  }
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return NextResponse.json({ error: 'No se pudo enviar ahora. Escríbenos por WhatsApp.' }, { status: 500 });

  try {
    await crearTransporte().sendMail({
      from: REMITENTE(), to: BUZON_INTERNO(), replyTo: email,
      subject: `NUEVO PARTNER: ${nombre.slice(0, 60)} (${tipo})`,
      html: `<h2>Solicitud de partner</h2>
        <p><strong>Nombre:</strong> ${escapar(nombre)}<br><strong>Empresa:</strong> ${escapar(empresa) || '—'}<br>
        <strong>Perfil:</strong> ${escapar(tipo)}<br><strong>Zona:</strong> ${escapar(zona) || '—'}<br>
        <strong>Correo:</strong> ${escapar(email)}<br><strong>Teléfono:</strong> ${escapar(telefono)}</p>
        <p><strong>Mensaje:</strong><br>${escapar(mensaje).replace(/\n/g, '<br>') || '—'}</p>`,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Partner: fallo enviando el correo', e);
    return NextResponse.json({ error: 'No se pudo enviar ahora. Escríbenos por WhatsApp.' }, { status: 500 });
  }
}
