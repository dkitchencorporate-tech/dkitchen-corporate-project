import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';
import { NextResponse } from 'next/server';
import { enviarCorreoCliente, escaparHtml } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Webhook de Neon Auth (H30, 08/10/2026). Al suscribir `send.magic_link` y
 * `send.otp`, Neon Auth deja de mandar su correo por defecto (en inglés,
 * «Reset your password») y nos entrega el enlace o el código: aquí se envía
 * en español, con nuestra plantilla y por el SMTP de Arsys.
 *
 * Seguridad: firma EdDSA (Ed25519) en JWS separado, verificada contra el JWKS
 * de la propia instancia (`NEON_AUTH_BASE_URL`), y marca de tiempo de menos
 * de 5 minutos (evita reenvíos). Sin firma válida → 401 y no se envía nada.
 * Neon reintenta con el mismo X-Neon-Event-Id; un correo repetido es el
 * mal menor frente a dejar al cliente sin enlace.
 */

type ClaveJwk = JsonWebKey & { kid?: string };
let jwksCache: { claves: ClaveJwk[]; hasta: number } | null = null;

async function clavePublica(kid: string): Promise<ClaveJwk | undefined> {
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) throw new Error('Falta NEON_AUTH_BASE_URL.');
  if (!jwksCache || jwksCache.hasta < Date.now() || !jwksCache.claves.some((k) => k.kid === kid)) {
    const r = await fetch(`${base}/.well-known/jwks.json`, { cache: 'no-store' });
    const datos = (await r.json()) as { keys?: ClaveJwk[] };
    jwksCache = { claves: datos.keys ?? [], hasta: Date.now() + 60 * 60 * 1000 };
  }
  return jwksCache.claves.find((k) => k.kid === kid);
}

async function firmaValida(cuerpo: string, cabeceras: Headers): Promise<boolean> {
  const firma = cabeceras.get('x-neon-signature');
  const kid = cabeceras.get('x-neon-signature-kid');
  const marca = cabeceras.get('x-neon-timestamp');
  if (!firma || !kid || !marca) return false;
  const edad = Date.now() - Number.parseInt(marca, 10);
  if (!Number.isFinite(edad) || Math.abs(edad) > 5 * 60 * 1000) return false;
  const jwk = await clavePublica(kid);
  if (!jwk) return false;
  const [cabeceraB64, vacio, firmaB64] = firma.split('.');
  if (vacio !== '' || !cabeceraB64 || !firmaB64) return false;
  const cargaB64 = Buffer.from(cuerpo, 'utf8').toString('base64url');
  const entrada = `${cabeceraB64}.${Buffer.from(`${marca}.${cargaB64}`, 'utf8').toString('base64url')}`;
  try {
    return verify(null, Buffer.from(entrada), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(firmaB64, 'base64url'));
  } catch {
    return false;
  }
}

const TEXTOS_ENLACE: Record<string, { asunto: string; titulo: string; texto: string; boton: string }> = {
  'forget-password': {
    asunto: 'Crea tu contraseña de DKitchen',
    titulo: 'Elige tu contraseña',
    texto: 'Pulsa el botón para elegir la contraseña con la que entrarás en tu panel de DKitchen. Si ya tenías una, esta la sustituye.',
    boton: 'Elegir mi contraseña',
  },
  'email-verification': {
    asunto: 'Confirma tu correo en DKitchen',
    titulo: 'Confirma tu correo',
    texto: 'Pulsa el botón para confirmar que este correo es tuyo.',
    boton: 'Confirmar mi correo',
  },
  'sign-in': {
    asunto: 'Tu enlace para entrar en DKitchen',
    titulo: 'Entra en tu panel',
    texto: 'Pulsa el botón para entrar en tu panel de DKitchen sin contraseña.',
    boton: 'Entrar en mi panel',
  },
};

const TEXTOS_CODIGO: Record<string, string> = {
  'forget-password': 'tu código para cambiar la contraseña',
  'email-verification': 'tu código para confirmar el correo',
  'sign-in': 'tu código para entrar',
};

function caduca(iso: unknown): string {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return '';
  const minutos = Math.round((t - Date.now()) / 60000);
  if (minutos <= 0) return '';
  return minutos >= 120 ? ` El enlace caduca en ${Math.round(minutos / 60)} horas.` : ` Caduca en ${minutos} minutos.`;
}

const PIE = '<p style="margin:16px 0 0;font-size:13px;color:#6B6560">Si no lo has pedido tú, ignora este correo: tu cuenta sigue igual. ¿Dudas? Responde a este correo.</p>';

export async function POST(request: Request) {
  const cuerpo = await request.text();
  if (!(await firmaValida(cuerpo, request.headers).catch(() => false))) {
    return NextResponse.json({ error: 'Firma no válida.' }, { status: 401 });
  }

  let evento: {
    event_type?: string;
    user?: { email?: string; name?: string | null };
    event_data?: Record<string, unknown>;
  };
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const email = evento.user?.email;
  const datos = evento.event_data ?? {};
  if (!email) return NextResponse.json({ ok: true });
  const saludo = `<p style="margin:0 0 12px">Hola${evento.user?.name ? ` ${escaparHtml(evento.user.name)}` : ''},</p>`;

  try {
    if (evento.event_type === 'send.magic_link') {
      const url = String(datos.link_url ?? '');
      if (!/^https:\/\//.test(url)) return NextResponse.json({ error: 'Enlace no válido.' }, { status: 400 });
      const t = TEXTOS_ENLACE[String(datos.link_type)] ?? TEXTOS_ENLACE['sign-in'];
      await enviarCorreoCliente(
        email,
        t.asunto,
        `${saludo}<p style="margin:0">${t.texto}${caduca(datos.expires_at)}</p>${PIE}`,
        { titulo: t.titulo, boton: { texto: t.boton, url } }
      );
    } else if (evento.event_type === 'send.otp') {
      const codigo = String(datos.otp_code ?? '').replace(/\D/g, '').slice(0, 10);
      if (!codigo) return NextResponse.json({ error: 'Código no válido.' }, { status: 400 });
      const para = TEXTOS_CODIGO[String(datos.otp_type)] ?? 'tu código';
      await enviarCorreoCliente(
        email,
        `${codigo} es ${para} de DKitchen`,
        `${saludo}<p style="margin:0 0 16px">Este es ${para}:</p>
         <p style="margin:0;font-size:30px;font-weight:800;letter-spacing:6px">${codigo}</p>
         <p style="margin:16px 0 0">${caduca(datos.expires_at).trim()}</p>${PIE}`,
        { titulo: 'Tu código de DKitchen' }
      );
    }
    // Otros eventos (no suscritos): se aceptan sin hacer nada.
    return NextResponse.json({ ok: true });
  } catch (error) {
    // 500 → Neon reintenta dentro de su ventana de 15 s.
    console.error('Webhook Neon Auth: no se pudo enviar el correo', error);
    return NextResponse.json({ error: 'No se pudo enviar el correo.' }, { status: 500 });
  }
}
