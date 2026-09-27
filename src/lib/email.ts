import 'server-only';
import nodemailer from 'nodemailer';

/** Convierte texto en texto seguro para HTML — sin esto, un nombre puede ser HTML. */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? '')
    .slice(0, 200)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Transporte único de correo (27/09/2026): buzón corporativo
 * dkitchen@dkitchencorporate.es en el SMTP de Arsys (SSL, 465). Antes era
 * Gmail (`service: 'gmail'`). Host y puerto se pueden sobrescribir con
 * SMTP_HOST / SMTP_PORT sin tocar código.
 */
export function crearTransporte() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.serviciodecorreo.es',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export const REMITENTE = () => `DKitchen <${process.env.SMTP_EMAIL}>`;
/** Buzón que recibe los avisos internos (leads, pagos, soporte). Por defecto, el mismo. */
export const BUZON_INTERNO = () => process.env.SMTP_BUZON_INTERNO || process.env.SMTP_EMAIL;

function configurado(): boolean {
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) return true;
  console.error('Correo no configurado (falta SMTP_EMAIL/SMTP_PASSWORD).');
  return false;
}

export async function enviarCorreoInterno(asunto: string, html: string): Promise<void> {
  if (!configurado()) return;
  await crearTransporte().sendMail({
    from: REMITENTE(),
    to: BUZON_INTERNO(),
    subject: asunto.replace(/[
]/g, ' ').slice(0, 120),
    html,
  });
}

/** Igual que `enviarCorreoInterno`, pero a un destinatario externo (un cliente). */
export async function enviarCorreoCliente(destinatario: string, asunto: string, html: string): Promise<void> {
  if (!configurado()) return;
  await crearTransporte().sendMail({
    from: REMITENTE(),
    replyTo: process.env.SMTP_EMAIL,
    to: destinatario,
    subject: asunto.replace(/[
]/g, ' ').slice(0, 120),
    html,
  });
}
