import 'server-only';
import { randomBytes } from 'node:crypto';

/**
 * Llamadas de servidor a Neon Auth (Better Auth, alojado por Neon).
 *
 * `NEON_AUTH_BASE_URL` apunta a la instancia de Better Auth que aloja Neon
 * para este proyecto — confirmado por auditoría directa (2026-09-21):
 * `/.well-known/jwks.json` responde con una clave EdDSA/Ed25519, y los
 * mensajes de error ("MISSING_ORIGIN", "VALIDATION_ERROR") son los propios de
 * Better Auth. No hay ninguna clave de servidor propia en las variables de
 * entorno del proyecto: la API pública de sign-up/reset exige únicamente una
 * cabecera Origin válida, verificada empíricamente contra la instancia real
 * antes de escribir este archivo — nunca contra datos de producción.
 *
 * La ruta real de reseteo es `/request-password-reset`, no `/forget-password`
 * (el nombre "clásico" de Better Auth): se comprobó con una petición vacía
 * antes de asumir el nombre del método.
 */

const BASE = process.env.NEON_AUTH_BASE_URL;
const ORIGEN = 'https://dkitchencorporate.es';

function requerirBase(): string {
  if (!BASE) throw new Error('Falta NEON_AUTH_BASE_URL.');
  return BASE;
}

export class ErrorNeonAuth extends Error {
  constructor(
    message: string,
    public codigo?: string
  ) {
    super(message);
    this.name = 'ErrorNeonAuth';
  }
}

async function llamar(ruta: string, body: unknown) {
  const respuesta = await fetch(`${requerirBase()}${ruta}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGEN,
    },
    body: JSON.stringify(body),
  });

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ErrorNeonAuth(datos?.message ?? `Neon Auth respondió ${respuesta.status}`, datos?.code);
  }

  return datos;
}

/**
 * Crea la cuenta real del cliente en Neon Auth con una contraseña aleatoria
 * que nadie llega a usar — el cliente la fija de verdad con el enlace que
 * envía `enviarEnlaceDeContrasena`. Devuelve el `id` real del usuario, que es
 * el mismo uuid que se usa como `identidades.id` (0002).
 *
 * Si el correo ya tiene cuenta, Better Auth responde con un error de
 * validación ("USER_ALREADY_EXISTS" o similar): se propaga tal cual para que
 * quien llama decida — un reintento del mismo evento de Stripe no debería
 * llegar aquí gracias a la idempotencia de `dk.aprovisionar_cliente_qr`, pero
 * un cliente que ya tenía cuenta por otro peldaño sí puede.
 */
export async function crearCuentaCliente(params: {
  email: string;
  nombre: string;
}): Promise<{ id: string }> {
  // 32 bytes aleatorios en base64: nunca se muestra, nunca se guarda fuera de
  // Better Auth, y cumple de sobra cualquier política de longitud/complejidad.
  const contrasenaDesechable = randomBytes(32).toString('base64');

  const resultado = await llamar('/sign-up/email', {
    name: params.nombre,
    email: params.email,
    password: contrasenaDesechable,
  });

  const id = resultado?.user?.id;
  if (!id) throw new ErrorNeonAuth('Neon Auth no devolvió el id del usuario creado.');

  return { id };
}

/**
 * Dispara el correo de "fija tu contraseña" de Better Auth. El propio
 * servicio decide cómo enviarlo (SMTP ya configurado del lado de Neon Auth,
 * fuera del control de esta aplicación); aquí solo se activa el flujo.
 */
export async function enviarEnlaceDeContrasena(email: string): Promise<void> {
  await llamar('/request-password-reset', {
    email,
    redirectTo: `${ORIGEN}/panel/nueva-contrasena`,
  });
}

/**
 * Fija la contraseña real a partir del token que Better Auth añade al enlace
 * del correo (`/panel/nueva-contrasena?token=...`). Comprobado directamente
 * contra la instancia real: el cuerpo es `{ newPassword, token }`, no
 * `{ token }` en la query — un token inválido responde "Invalid token" solo
 * después de validar la longitud de la contraseña.
 */
export async function fijarContrasena(token: string, nuevaContrasena: string): Promise<void> {
  await llamar('/reset-password', { newPassword: nuevaContrasena, token });
}
