import 'server-only';
import { crearCuentaCliente, enviarEnlaceDeContrasena } from '@/lib/neon-auth';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';

/**
 * Acceso a la zona de Experience tras pagar (0088, 18/10/2026): crea la cuenta
 * (Neon Auth) y manda el enlace para fijar la contraseña; si el correo ya tenía
 * cuenta (p. ej. cliente de la carta QR), solo le dice que entre con la suya.
 * Nunca lanza: el pago ya está hecho y el proyecto ya existe en Central.
 */
export async function darAccesoExperience(email: string, nombre: string | null | undefined): Promise<'nueva' | 'existente' | 'fallo'> {
  let estado: 'nueva' | 'existente' | 'fallo' = 'nueva';
  try { await crearCuentaCliente({ email, nombre: nombre || email.split('@')[0] }); }
  catch (e) { estado = /exist|already|USER_ALREADY/i.test(String((e as Error).message) + String((e as { codigo?: string }).codigo ?? '')) ? 'existente' : 'fallo'; if (estado === 'fallo') console.error('Experience: cuenta no creada', e); }
  if (estado === 'nueva') await enviarEnlaceDeContrasena(email).catch((e) => console.error('Experience: enlace de contraseña no enviado', e));
  const pasos = estado === 'nueva'
    ? '<p><strong>1.</strong> Abre el correo «fija tu contraseña» que te acabamos de enviar y elige tu contraseña.</p><p><strong>2.</strong> Entra en tu zona de Experience:'
    : '<p>Entra con tu cuenta de DKitchen de siempre (el mismo correo) en tu zona de Experience:';
  await enviarCorreoCliente(email, 'Tu zona de Experience está lista · DKitchen',
    `<p>Hola ${escaparHtml(nombre || '')},</p>
     <p>Ya tienes tu zona de Experience: desde ahí nos cuentas tu evento, eliges el día de la llamada de arranque y sigues cómo avanza.</p>
     ${pasos} <a href="https://dkitchencorporate.es/mi-experience">dkitchencorporate.es/mi-experience</a></p>
     <p>Si algo no funciona, responde a este correo o escríbenos por WhatsApp.</p><p>El equipo de DKitchen</p>`).catch((e) => console.error('Experience: correo de acceso no enviado', e));
  return estado;
}
