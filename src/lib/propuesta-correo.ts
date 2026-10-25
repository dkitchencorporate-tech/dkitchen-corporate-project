import 'server-only';
import { escaparHtml } from '@/lib/email';
import { QR_MENU, FUNDADOR } from '@/lib/pricing-config';
import { TIPOS, enlaceWhatsapp } from '@/lib/prospeccion';

/**
 * Versión para correo de la propuesta (25/10, tarea de propuestas). HTML de tablas con estilos en línea
 * (lo único que respetan Gmail y Outlook), imágenes alojadas en nuestro dominio (Gmail bloquea las data:)
 * y sin scripts. Mismo contenido que /propuesta/[token]: carta, qué cambia, cómo empezamos y la oferta.
 */
const SITIO = process.env.NEXT_PUBLIC_SITE_URL || 'https://dkitchencorporate.es';
const VINO = '#6E0C2B';
const TINTA = '#1A1416';
const NIEBLA = '#6B6266';
const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }) + ' €';

export const CAMBIOS = [
  { t: 'Fotos que abren el apetito', d: 'Mejoramos tus fotos con IA (o las hacemos desde tu carta) para que cada plato se vea como en la mesa.' },
  { t: 'Alérgenos siempre al día', d: 'Los 14 alérgenos en cada plato, como pide la normativa, y los cambias tú desde el móvil en un minuto.' },
  { t: 'Tu carta en otros idiomas', d: 'El turista la lee en su idioma sin que tengas que traducir nada.' },
  { t: 'La mesa avisa al camarero', d: 'Llamar al camarero, pedir la cuenta y, desde el plan Local, pedir desde la mesa: el camarero lo confirma con un toque.' },
];
export const PASOS = [
  { n: '1', t: 'Nos mandas una foto de tu carta', d: 'Por WhatsApp o por correo. Nada más.' },
  { n: '2', t: 'Te la montamos', d: 'Con tus platos, tus precios y tus colores. La revisas en tu móvil antes de ponerla.' },
  { n: '3', t: 'QR en las mesas', d: 'Te damos los QR listos para imprimir y la cambias tú cuando quieras.' },
];

export interface DatosCorreo {
  token: string; nombre: string; tipo: keyof typeof TIPOS; zona: string; texto: string | null; muestra_url: string | null;
  oferta: string; comercial: string; telefono: string | null; codigo: string | null; demo_slug?: string | null; pago_url?: string | null;
}

export function propuestaCorreo(p: DatosCorreo, o: { fundadorQuedan: number | null; portada: string | null }) {
  const utm = 'utm_source=propuesta&utm_medium=email&utm_campaign=crm';
  const conFundador = p.oferta === 'fundador' && o.fundadorQuedan !== null;
  const alta = p.pago_url || `${SITIO}/${conFundador ? 'fundador' : 'qr'}?${p.codigo ? `v=${encodeURIComponent(p.codigo)}&` : ''}${utm}`;
  const muestra = p.muestra_url || (p.demo_slug ? `${SITIO}/m/${p.demo_slug}` : null);
  const web = `${SITIO}/propuesta/${p.token}`;
  const qr = `${SITIO}/api/qr?u=${encodeURIComponent(muestra || alta)}`;
  const { ampliado, sala } = QR_MENU.planes;
  const wa = enlaceWhatsapp(p.telefono);
  const e = escaparHtml;
  const tipo = (TIPOS[p.tipo] ?? 'local').toLowerCase();

  const oferta = p.oferta === 'signature' || p.oferta === 'experience' || p.oferta === 'dark_kitchen'
    ? `Para un local como el vuestro encaja una solución a medida: os la explicamos en una llamada de 15 minutos y os damos el precio cerrado. Mientras tanto, podéis empezar con la carta QR.`
    : conFundador
      ? `<strong>Plan Fundador:</strong> todo el plan ${sala.nombre} con un ${Math.round(FUNDADOR.descuento * 100)} % de descuento de por vida: ${eur(FUNDADOR.mensual)} al mes + IVA, pagado por trimestre (${eur(FUNDADOR.trimestre)} + IVA). Quedan ${o.fundadorQuedan} de ${FUNDADOR.plazas} plazas.`
      : `<strong>Plan ${ampliado.nombre}: el primer mes por ${eur(QR_MENU.primerMes)} + IVA.</strong> Después, ${eur(ampliado.mensual)} al mes + IVA, sin permanencia. Si en 30 días no os convence, os devolvemos ese euro y os quedáis la carta en PDF.`;
  const textoBoton = p.pago_url ? 'Activar mi carta' : conFundador ? 'Quiero ser Fundador' : `Activar por ${eur(QR_MENU.primerMes)}`;

  const boton = (href: string, texto: string, fondo = VINO) =>
    `<a href="${e(href)}" style="display:inline-block;background:${fondo};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px">${e(texto)}</a>`;

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1EA;padding:24px 0;font-family:Helvetica,Arial,sans-serif;color:${TINTA}">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden">
  <tr><td style="padding:28px 32px 8px">
    <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${VINO};font-weight:700">Propuesta para tu ${e(tipo)} · ${e(p.zona)}</p>
    <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-size:32px;line-height:1.15;font-weight:600">Hola, ${e(p.nombre)}</h1>
  </td></tr>
  ${p.texto ? `<tr><td style="padding:12px 32px 0;font-size:15px;line-height:1.6;color:#3a3134">${e(p.texto).replace(/\n/g, '<br>')}</td></tr>` : ''}
  <tr><td style="padding:22px 32px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F0;border-radius:16px">
      ${o.portada && muestra ? `<tr><td colspan="2" style="padding:0"><a href="${e(muestra)}"><img src="${e(o.portada)}" alt="Vista de tu carta" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:16px 16px 0 0"></a></td></tr>` : ''}
      <tr>
        <td style="padding:18px 20px;vertical-align:middle">
          <p style="margin:0;font-weight:700;font-size:16px">${muestra ? 'Tu carta, ya montada' : 'Tu carta digital con QR'}</p>
          <p style="margin:6px 0 14px;font-size:14px;line-height:1.5;color:${NIEBLA}">${muestra ? 'Así la verán tus clientes en el móvil, con tus platos y tus colores.' : 'La montamos contigo y la cambias desde el móvil cuando quieras.'}</p>
          ${muestra ? boton(muestra, 'Ver mi carta', TINTA) : ''}
        </td>
        <td width="120" style="padding:18px 20px 18px 0;vertical-align:middle" align="right"><img src="${e(qr)}" alt="Código QR de tu carta" width="110" height="110" style="display:block;width:110px;height:110px"></td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:26px 32px 0"><p style="margin:0 0 8px;font-weight:700;font-size:16px">Qué cambia en tu local</p>
    ${CAMBIOS.map((c) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.5"><strong>${e(c.t)}.</strong> <span style="color:${NIEBLA}">${e(c.d)}</span></p>`).join('')}
  </td></tr>
  <tr><td style="padding:16px 32px 0"><p style="margin:0 0 8px;font-weight:700;font-size:16px">Cómo empezamos</p>
    ${PASOS.map((x) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.5"><strong style="color:${VINO}">${x.n}.</strong> <strong>${e(x.t)}.</strong> <span style="color:${NIEBLA}">${e(x.d)}</span></p>`).join('')}
  </td></tr>
  <tr><td style="padding:18px 32px 0"><p style="margin:0 0 8px;font-weight:700;font-size:16px">La oferta</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55">${oferta}</p>
    ${boton(alta, textoBoton)}
    ${p.codigo ? `<p style="margin:12px 0 0;font-size:12px;color:${NIEBLA}">Código de tu asesor: <strong>${e(p.codigo)}</strong></p>` : ''}
  </td></tr>
  <tr><td style="padding:26px 32px 28px">
    <p style="margin:0;padding-top:18px;border-top:1px solid #EAE2D8;font-size:14px">Te atiende <strong>${e(p.comercial)}</strong>${p.telefono ? ` · ${e(p.telefono)}` : ''}${wa ? ` · <a href="${e(`${wa}?text=${encodeURIComponent(`Hola, soy de ${p.nombre}. He visto la propuesta de DKitchen.`)}`)}" style="color:${VINO}">Escribir por WhatsApp</a>` : ''}</p>
    <p style="margin:10px 0 0;font-size:12px;color:${NIEBLA}">¿No se ve bien? <a href="${e(web)}" style="color:${VINO}">Abre la propuesta en la web</a>. Precios sin IVA (21 %). Condiciones en dkitchencorporate.es/terms</p>
  </td></tr>
</table>
</td></tr></table>`;

  const asunto = muestra ? `${p.nombre}: tu carta digital ya está montada` : `${p.nombre}: tu carta digital con QR`;
  const texto = [`Hola, ${p.nombre}`, p.texto ?? '', muestra ? `Tu carta, ya montada: ${muestra}` : '', `La oferta: ${oferta.replace(/<[^>]+>/g, '')}`, `${textoBoton}: ${alta}`, `Te atiende ${p.comercial}${p.telefono ? ` · ${p.telefono}` : ''}`].filter(Boolean).join('\n\n');
  return { asunto, html, texto };
}
