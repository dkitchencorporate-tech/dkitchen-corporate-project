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

/** Como `escaparHtml` pero sin recortar: para textos largos (respuestas, notas). */
export function escaparTexto(valor: unknown, max = 5000): string {
  return String(valor ?? '')
    .slice(0, max)
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

// ---------------------------------------------------------------------------
// Plantilla común de correo (28/09/2026)
// ---------------------------------------------------------------------------
// Todo correo sale con la misma estructura: cabecera DKitchen, tarjeta de
// contenido y pie. Si el correo nace de la carta de un restaurante (reservas,
// avisos a sus clientes), el pie lo nombra a él primero y firma a DKitchen
// como proveedor de la tecnología: cada correo es también un escaparate.
// HTML de tablas con estilos en línea: es lo único que respetan Gmail,
// Outlook y Apple Mail por igual. Sin imágenes externas (no se bloquean).

export interface OpcionesCorreo {
  /** Título grande dentro de la tarjeta. */
  titulo?: string;
  /** Texto de vista previa que muestran los clientes de correo. */
  preencabezado?: string;
  /** Restaurante en cuyo nombre se envía (pie "Carta digital de X"). */
  restaurante?: string;
  /** Botón principal. */
  boton?: { texto: string; url: string };
}

const C = { fondo: '#F6F5F3', tarjeta: '#FFFFFF', borde: '#E7E3DE', texto: '#1A1714', suave: '#6B6560', acento: '#D9531E' };

export function plantillaCorreo(cuerpoHtml: string, o: OpcionesCorreo = {}): string {
  const titulo = o.titulo ? `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${C.texto};font-weight:700">${escaparHtml(o.titulo)}</h1>` : '';
  const boton = o.boton && /^https:\/\//.test(o.boton.url)
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px"><tr><td style="border-radius:10px;background:${C.acento}">
         <a href="${o.boton.url}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none">${escaparHtml(o.boton.texto)}</a>
       </td></tr></table>`
    : '';
  const pieRestaurante = o.restaurante
    ? `<p style="margin:0 0 6px;font-size:13px;color:${C.texto}">Carta digital de <strong>${escaparHtml(o.restaurante)}</strong></p>
       <p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:${C.suave}">Los datos de esta reserva o consulta se comparten solo con ${escaparHtml(o.restaurante)} para gestionarla, conforme a su política de privacidad.</p>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escaparHtml(o.titulo ?? 'DKitchen')}</title></head>
<body style="margin:0;padding:0;background:${C.fondo};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escaparHtml(o.preencabezado ?? '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 20px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:36px;height:36px;border-radius:9px;background:${C.texto};color:#FFFFFF;font-size:20px;font-weight:800;text-align:center;vertical-align:middle">D</td>
        <td style="padding-left:10px;font-size:18px;font-weight:800;color:${C.texto}">D<span style="color:${C.acento}">Kitchen</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${C.tarjeta};border:1px solid ${C.borde};border-radius:16px;padding:32px 28px;font-size:15px;line-height:1.6;color:${C.texto}">
      ${titulo}${cuerpoHtml}${boton}
    </td></tr>
    <tr><td style="padding:24px 8px 0;text-align:center">
      ${pieRestaurante}
      <p style="margin:0;font-size:12px;line-height:1.5;color:${C.suave}">
        Tecnología de carta digital, reservas y gestión para hostelería por
        <a href="https://dkitchencorporate.es/qr" style="color:${C.acento};text-decoration:none;font-weight:600">DKitchen</a>
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#9A938C">
        <a href="https://dkitchencorporate.es/privacy" style="color:#9A938C">Privacidad</a> ·
        <a href="https://dkitchencorporate.es/terms" style="color:#9A938C">Términos</a>
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** Filas "Etiqueta: valor" para datos estructurados (reserva, pedido…), ya escapadas. */
export function filasCorreo(filas: [string, string | null | undefined][]): string {
  const f = filas
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.borde};font-size:13px;color:${C.suave};width:38%;vertical-align:top">${escaparHtml(k)}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${C.borde};font-size:15px;color:${C.texto};font-weight:600">${escaparTexto(v, 500)}</td></tr>`)
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0">${f}</table>`;
}

/** Versión de texto plano (mejora la entrega y la accesibilidad). */
function textoPlano(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(br|\/p|\/tr|\/h1|\/li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
}

/** Si el HTML ya es un documento completo, no se vuelve a envolver. */
function envolver(html: string, o?: OpcionesCorreo): string {
  return /^\s*<!doctype/i.test(html) ? html : plantillaCorreo(html, o);
}

export async function enviarCorreoInterno(asunto: string, html: string, opciones?: OpcionesCorreo): Promise<void> {
  if (!configurado()) return;
  const cuerpo = envolver(html, { preencabezado: asunto, ...opciones });
  await crearTransporte().sendMail({
    from: REMITENTE(),
    to: BUZON_INTERNO(),
    subject: asunto.replace(/[\r\n]/g, ' ').slice(0, 120),
    html: cuerpo,
    text: textoPlano(cuerpo),
  });
}

/** Igual que `enviarCorreoInterno`, pero a un destinatario externo (un cliente). */
export async function enviarCorreoCliente(destinatario: string, asunto: string, html: string, opciones?: OpcionesCorreo): Promise<void> {
  if (!configurado()) return;
  const cuerpo = envolver(html, { preencabezado: asunto, ...opciones });
  await crearTransporte().sendMail({
    from: REMITENTE(),
    replyTo: process.env.SMTP_EMAIL,
    to: destinatario,
    subject: asunto.replace(/[\r\n]/g, ' ').slice(0, 120),
    html: cuerpo,
    text: textoPlano(cuerpo),
  });
}
