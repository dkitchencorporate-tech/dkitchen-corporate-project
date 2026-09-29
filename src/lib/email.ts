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
  /**
   * Marca del restaurante: si se indica, la cabecera es SUYA (logo, nombre,
   * color) y DKitchen solo firma al pie como proveedor de la tecnología.
   * Obligatorio en todo correo que sale en nombre de un local.
   */
  marca?: { nombre: string; logoUrl?: string | null; color?: string | null };
}

const C = { fondo: '#F6F5F3', tarjeta: '#FFFFFF', borde: '#E7E3DE', texto: '#1A1714', suave: '#6B6560', acento: '#6E0C2B' };

/**
 * Modo claro y oscuro: base clara con estilos en línea (lo que respeta todo
 * cliente) + reglas para `prefers-color-scheme: dark` (Apple Mail, Outlook
 * app, Gmail web con tema oscuro). Gmail en móvil invierte los colores por su
 * cuenta; la paleta está elegida para que el resultado siga siendo legible.
 */
const ESTILOS_TEMA = `<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .dk-fondo { background: #121110 !important; }
    .dk-tarjeta { background: #1D1B19 !important; border-color: #34302C !important; }
    .dk-texto { color: #F2EFEC !important; }
    .dk-suave { color: #B3ACA5 !important; }
    .dk-borde { border-color: #34302C !important; }
    .dk-logo-fondo { background: #F2EFEC !important; color: #1A1714 !important; }
  }
</style>`;

function colorSeguro(c: string | null | undefined): string {
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c : C.acento;
}

function cabecera(o: OpcionesCorreo): string {
  if (o.marca) {
    const color = colorSeguro(o.marca.color);
    const logo = o.marca.logoUrl && /^https:\/\//.test(o.marca.logoUrl)
      ? `<img src="${escaparHtml(o.marca.logoUrl)}" width="48" height="48" alt="${escaparHtml(o.marca.nombre)}" style="display:block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid ${C.borde}">`
      : `<div style="width:48px;height:48px;border-radius:50%;background:${color};color:#FFFFFF;font-size:22px;font-weight:800;line-height:48px;text-align:center">${escaparHtml(o.marca.nombre.trim().charAt(0).toUpperCase())}</div>`;
    return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle">${logo}</td>
        <td class="dk-texto" style="padding-left:12px;font-size:19px;font-weight:800;color:${C.texto};vertical-align:middle">${escaparHtml(o.marca.nombre)}</td>
      </tr></table>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td class="dk-logo-fondo" style="width:36px;height:36px;border-radius:9px;background:${C.texto};color:#FFFFFF;font-size:20px;font-weight:800;text-align:center;vertical-align:middle">D</td>
      <td class="dk-texto" style="padding-left:10px;font-size:18px;font-weight:800;color:${C.texto}">D<span style="color:${C.acento}">Kitchen</span></td>
    </tr></table>`;
}

export function plantillaCorreo(cuerpoHtml: string, o: OpcionesCorreo = {}): string {
  const acento = colorSeguro(o.marca?.color);
  const restaurante = o.restaurante ?? o.marca?.nombre;
  const titulo = o.titulo ? `<h1 class="dk-texto" style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${C.texto};font-weight:700">${escaparHtml(o.titulo)}</h1>` : '';
  const boton = o.boton && /^https:\/\//.test(o.boton.url)
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px"><tr><td style="border-radius:10px;background:${acento}">
         <a href="${escaparHtml(o.boton.url)}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none">${escaparHtml(o.boton.texto)}</a>
       </td></tr></table>`
    : '';
  const pieRestaurante = restaurante
    ? `<p class="dk-texto" style="margin:0 0 6px;font-size:13px;color:${C.texto}">Carta digital de <strong>${escaparHtml(restaurante)}</strong></p>
       <p class="dk-suave" style="margin:0 0 14px;font-size:12px;line-height:1.5;color:${C.suave}">Los datos de esta reserva o consulta se comparten solo con ${escaparHtml(restaurante)} para gestionarla, conforme a su política de privacidad.</p>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${escaparHtml(o.titulo ?? restaurante ?? 'DKitchen')}</title>${ESTILOS_TEMA}</head>
<body class="dk-fondo" style="margin:0;padding:0;background:${C.fondo};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escaparHtml(o.preencabezado ?? '')}</span>
<table class="dk-fondo" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 20px">${cabecera(o)}</td></tr>
    <tr><td class="dk-tarjeta dk-texto" style="background:${C.tarjeta};border:1px solid ${C.borde};border-radius:16px;padding:32px 28px;font-size:15px;line-height:1.6;color:${C.texto}">
      ${titulo}${cuerpoHtml}${boton}
    </td></tr>
    <tr><td style="padding:24px 8px 0;text-align:center">
      ${pieRestaurante}
      <p class="dk-suave" style="margin:0;font-size:12px;line-height:1.5;color:${C.suave}">
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
    .map(([k, v]) => `<tr><td class="dk-suave dk-borde" style="padding:10px 0;border-bottom:1px solid ${C.borde};font-size:13px;color:${C.suave};width:38%;vertical-align:top">${escaparHtml(k)}</td>
      <td class="dk-texto dk-borde" style="padding:10px 0;border-bottom:1px solid ${C.borde};font-size:15px;color:${C.texto};font-weight:600">${escaparTexto(v, 500)}</td></tr>`)
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
