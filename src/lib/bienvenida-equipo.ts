import 'server-only';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';

/**
 * Bienvenida al equipo (02/11/2026, petición de Alex): el correo «Crea tu contraseña» no explicaba para qué era.
 * Este correo, que sale junto al de la contraseña, cuenta qué cuenta es, para qué sirve la contraseña y qué viene
 * después, paso a paso, para que ningún comercial se quede perdido.
 */
const SITIO = 'https://dkitchencorporate.es';
const paso = (n: number, t: string, d: string) =>
  `<tr><td style="vertical-align:top;padding:8px 12px 8px 0"><span style="display:inline-block;width:26px;height:26px;border-radius:13px;background:#6E0C2B;color:#fff;font-weight:800;text-align:center;line-height:26px;font-size:13px">${n}</span></td><td style="padding:8px 0"><strong>${t}</strong><br><span style="color:#4A4541">${d}</span></td></tr>`;

export async function enviarBienvenidaEquipo(email: string, nombre: string, rol: 'comercial' | 'direccion') {
  const n = escaparHtml(nombre.split(' ')[0] || nombre);
  const correo = `<strong style="font-family:monospace">${escaparHtml(email)}</strong>`;
  if (rol === 'direccion') {
    return enviarCorreoCliente(email, 'Bienvenida a Central de DKitchen: cómo entrar',
      `<p>Hola, ${n}:</p><p>Te han dado acceso de <strong>dirección</strong> a Central, el centro de mando de DKitchen (clientes, ventas, tareas y equipo).</p>
       <table role="presentation" style="border-collapse:collapse;margin:8px 0">${paso(1, 'Crea tu contraseña', 'Te llega aparte el correo «Crea tu contraseña de DKitchen» (mira también Promociones o Spam).')}${paso(2, 'Inicia sesión', `En ${SITIO}/panel/iniciar-sesion con ${correo}.`)}${paso(3, 'Segundo factor', 'Instala Google Authenticator o Microsoft Authenticator, escanea el QR que verás y escribe el código de 6 cifras.')}</table>
       <p>¿Dudas? Responde a este correo.</p>`,
      { titulo: 'Tu acceso a Central', preencabezado: 'Qué es esta cuenta y cómo entrar', boton: { texto: 'Iniciar sesión', url: `${SITIO}/panel/iniciar-sesion` } });
  }
  return enviarCorreoCliente(email, 'Bienvenida al equipo comercial de DKitchen: tus primeros pasos',
    `<p>Hola, ${n}:</p>
     <p>Te hemos dado de alta como <strong>agente comercial de DKitchen</strong>. Esta cuenta es tu acceso a la <strong>Academia</strong>, donde te formas, y, cuando dirección te habilite, a <strong>Central</strong>: tu cartera, la prospección, las altas de clientes desde el móvil y tus comisiones.</p>
     <p style="background:#F6F2EC;border-radius:12px;padding:12px 14px"><strong>¿Para qué es la contraseña?</strong> Es la de esta cuenta de agente, con el correo ${correo}. No es la de ningún local ni la de tu correo personal.</p>
     <p style="margin:18px 0 4px"><strong>Lo que viene, paso a paso:</strong></p>
     <table role="presentation" style="border-collapse:collapse">
       ${paso(1, 'Crea tu contraseña', 'Te llega aparte el correo «Crea tu contraseña de DKitchen» (mira también Promociones o Spam). El enlace caduca: si te caduca, en la pantalla de entrada pulsa «¿Olvidaste tu contraseña?».')}
       ${paso(2, 'Inicia sesión', `En ${SITIO}/panel/iniciar-sesion con ${correo}, tal cual, y tu contraseña nueva.`)}
       ${paso(3, 'Activa el segundo factor', 'Instala en el móvil Google Authenticator o Microsoft Authenticator, pulsa «+», escanea el QR de la pantalla y escribe el código de 6 cifras. Te lo pedirá al entrar: protege los datos de los clientes.')}
       ${paso(4, 'Firma tu contrato de agente', 'Es lo primero que verás. Rellenas tu NIF y domicilio, lo lees y lo firmas marcando una casilla. Comisión: 20 % de lo cobrado durante los 12 primeros meses de cada cliente que traigas. Te llega en PDF.')}
       ${paso(5, 'Fórmate en la Academia', '8 lecciones interactivas (unas 2 horas, a tu ritmo), 3 tests que se aprueban con un 90 % y 8 escenarios de conversación con dueños de bares, a pie y por redes.')}
       ${paso(6, 'Habilitación y a vender', 'Cuando lo tengas todo, dirección revisa tu ficha y te habilita. Desde ese momento entras en Central para prospectar, dar de alta clientes y ver tus comisiones.')}
     </table>
     <p style="margin-top:16px">Dos reglas desde el primer día: <strong>nunca cobras a un cliente</strong> (todo pago va por el enlace oficial) y <strong>nunca prometes resultados</strong>.</p>
     <p>¿Dudas en cualquier paso? Responde a este correo y te ayudamos.</p>`,
    { titulo: 'Bienvenida al equipo', preencabezado: 'Qué es tu cuenta, para qué es la contraseña y qué viene después', boton: { texto: 'Iniciar sesión', url: `${SITIO}/panel/iniciar-sesion` } });
}
