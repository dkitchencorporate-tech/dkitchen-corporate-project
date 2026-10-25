import { NextResponse } from 'next/server';
import { crearTransporte, REMITENTE, BUZON_INTERNO } from '@/lib/email';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';

/**
 * Formulario de contacto del popup de salida.
 *
 * Es la única escritura viva del despliegue, y está abierta al mundo por
 * definición: quien la usa todavía no es cliente. Eso obliga a tratar todo lo
 * que entra como hostil hasta demostrar lo contrario.
 *
 * Tres cosas que esta ruta hacía mal y aquí se corrigen:
 *
 *  1. Interpolaba el nombre y el teléfono directamente en el HTML del correo.
 *     Un nombre con etiquetas se convertía en HTML dentro del buzón de quien lo
 *     recibe: enlaces falsos, imágenes que delatan la apertura, texto que
 *     suplanta al propio aviso. Ahora todo pasa por `escapar()`.
 *  2. No tenía freno, y el primero que se le puso tampoco servía: vivía en
 *     memoria del proceso, y las funciones de Vercel no comparten memoria
 *     entre invocaciones. Contra el despliegue real, un bucle lo atravesaba
 *     entero. El freno de verdad vive en Neon (`src/lib/limite-frecuencia.ts`).
 *  3. Devolvía el mensaje de error del servidor de correo al cliente, que
 *     describe la infraestructura a quien está probando.
 */

export const runtime = 'nodejs';

const LIMITE_POR_IP = 5;         // envíos
const VENTANA_SEGUNDOS = 10 * 60; // por cada diez minutos

/** Convierte texto en texto. Sin esto, un nombre puede ser HTML. */
function escapar(valor: unknown): string {
  return String(valor ?? '')
    .slice(0, 200)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(request: Request) {
  try {
    const clave = claveDeLimite('lead', ipDeLaPeticion(request));
    if (await limiteSuperado(clave, LIMITE_POR_IP, VENTANA_SEGUNDOS)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes seguidas. Inténtalo en unos minutos.' },
        { status: 429 }
      );
    }
  } catch (error) {
    // Igual que en /r/{codigo}: si el freno no responde, se dispara el
    // objetivo real de la ruta antes que negar el servicio por su culpa.
    console.error('No se pudo comprobar el freno de frecuencia:', error);
  }

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.error('El formulario de leads no tiene configurado el correo de salida.');
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const phone = String(body?.phone ?? '').trim();
    const email = String(body?.email ?? '').trim();

    if (!name || !phone || !email || !body?.consent) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!CORREO_VALIDO.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'El correo no es válido' }, { status: 400 });
    }

    // Para el enlace de WhatsApp solo sobreviven los dígitos, así que no hay
    // nada que escapar: no puede contener nada que no sea un número.
    const telefonoDigitos = phone.replace(/[^0-9]/g, '').slice(0, 15);
    if (telefonoDigitos.length < 9) {
      return NextResponse.json({ error: 'El teléfono no es válido' }, { status: 400 });
    }

    const nombreSeguro = escapar(name);
    const correoSeguro = escapar(email);
    const telefonoSeguro = escapar(phone);

    const transporter = crearTransporte();

    await transporter.sendMail({
      from: REMITENTE(),
      to: BUZON_INTERNO(),
      // El asunto lleva el nombre: se limpian los saltos de línea para que no
      // pueda inyectar cabeceras adicionales en el mensaje.
      subject: `NUEVO LEAD HOSTELERIA: ${name.replace(/[\r\n]/g, ' ').slice(0, 120)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
          <h2 style="color: #6E0C2B; text-align: center;">Nuevo lead captado</h2>
          <p style="text-align: center; color: #6b7280;">Alguien acaba de solicitar la consultoría y los bonos desde el popup de salida.</p>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <p><strong>Nombre:</strong> ${nombreSeguro}</p>
            <p><strong>WhatsApp:</strong> <a href="https://wa.me/${telefonoDigitos}">${telefonoSeguro}</a></p>
            <p><strong>Correo:</strong> <a href="mailto:${correoSeguro}">${correoSeguro}</a></p>
            <p><strong>Consentimiento:</strong> aceptado</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="https://wa.me/${telefonoDigitos}?text=${encodeURIComponent(
              `Hola ${name}, soy de DKitchen. He visto que has solicitado nuestros bonos de digitalización...`
            )}" style="background-color: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">
              Abrir chat de WhatsApp
            </a>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // El motivo se queda en el registro del servidor. Al cliente se le devuelve
    // siempre lo mismo: describir el fallo le describe la infraestructura.
    console.error('Error enviando correo:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}
