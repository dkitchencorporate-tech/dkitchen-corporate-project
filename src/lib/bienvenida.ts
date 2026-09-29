import 'server-only';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';

/**
 * Bienvenida en español al alta de un cliente QR (29/09/2026), por pago o
 * desde Central. El enlace para crear la contraseña lo manda Neon Auth en un
 * correo aparte y en inglés («Reset your password»): aquí se le avisa para
 * que lo reconozca y no lo tome por spam.
 */
export async function enviarBienvenidaQr(email: string, nombre: string, local: string, plan: string): Promise<void> {
  await enviarCorreoCliente(
    email,
    `Bienvenido a DKitchen · ${local}`,
    `<p style="margin:0 0 12px">Hola ${escaparHtml(nombre)},</p>
     <p style="margin:0 0 12px">Ya está creada la carta digital de <strong>${escaparHtml(local)}</strong> (plan ${plan === 'ampliado' ? 'Ampliado' : 'Básico'}). Solo te falta un paso para entrar en tu panel:</p>
     <ol style="margin:0 0 12px;padding-left:20px">
       <li style="margin-bottom:6px"><strong>Crea tu contraseña.</strong> En unos minutos recibirás otro correo nuestro, en inglés, con el asunto <em>«Reset your password»</em>. Pulsa su botón y elige tu contraseña. Si no lo ves, revisa la carpeta de spam.</li>
       <li style="margin-bottom:6px"><strong>Entra en tu panel</strong> con tu correo y esa contraseña.</li>
       <li><strong>Completa los primeros pasos</strong> que verás en la portada: logo, fotos, horario y tu QR impreso.</li>
     </ol>
     <p style="margin:0">Si tienes cualquier duda, responde a este correo o escríbenos desde Soporte en tu panel.</p>`,
    { titulo: 'Tu carta ya está en marcha', boton: { texto: 'Entrar en mi panel', url: 'https://dkitchencorporate.es/panel/iniciar-sesion' } }
  );
}
