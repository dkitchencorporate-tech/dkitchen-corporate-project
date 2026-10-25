import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifrado de secretos de terceros (credenciales de TPV) con AES-256-GCM.
 * La clave vive SOLO en la variable de entorno DK_CIFRADO_CLAVE (32 bytes en
 * base64) de Vercel: la base guarda el texto cifrado y nunca ve la clave, y el
 * código nunca ve la credencial en claro salvo en el instante de usarla.
 * Formato: v1.<iv base64url>.<tag base64url>.<cifrado base64url>
 */

function clave(): Buffer {
  const b64 = process.env.DK_CIFRADO_CLAVE;
  if (!b64) throw new Error('Falta DK_CIFRADO_CLAVE.');
  const k = Buffer.from(b64, 'base64');
  if (k.length !== 32) throw new Error('DK_CIFRADO_CLAVE debe tener 32 bytes.');
  return k;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', clave(), iv);
  const cifrado = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), cifrado.toString('base64url')].join('.');
}

export function descifrar(valor: string): string {
  const [v, iv, tag, datos] = valor.split('.');
  if (v !== 'v1' || !iv || !tag || !datos) throw new Error('Formato de cifrado no reconocido.');
  const d = createDecipheriv('aes-256-gcm', clave(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(datos, 'base64url')), d.final()]).toString('utf8');
}
