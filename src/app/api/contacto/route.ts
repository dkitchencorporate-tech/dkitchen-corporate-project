import { NextResponse } from 'next/server';
import { registrarContacto, eventoQrCampana, CODIGO_CAMPANA, type DatosContacto } from '@/lib/qr-campanas';
import { claveDeLimite, ipDeLaPeticion, limiteSuperado } from '@/lib/limite-frecuencia';
import { enviarCorreoInterno, escaparHtml } from '@/lib/email';
import { wa } from '@/lib/whatsapp';

/**
 * Formulario previo a WhatsApp (0071). Guarda el contacto en la base, avisa a
 * DKitchen por correo y devuelve el enlace de WhatsApp con un mensaje ya
 * ordenado para el asesor. El mensaje lo compone el servidor, no el navegador.
 */
export const runtime = 'nodejs';

const TIPOS = ['Restaurante', 'Bar de tapas', 'Cafetería', 'Pizzería o hamburguesería', 'Kebab o comida rápida', 'Pub o discoteca', 'Otro'];
const INTERES: Record<DatosContacto['interes'], string> = {
  carta: 'Carta digital QR',
  signature: 'App propia (Signature)',
  experience: 'Evento (Experience)',
  no_se: 'Aún no lo sé, quiero que me aconsejéis',
};
const FRANJA: Record<DatosContacto['franja'], string> = { manana: 'por la mañana', tarde: 'por la tarde', noche: 'por la noche', cuando_sea: 'cuando sea' };
const txt = (v: unknown, max: number) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);

export async function POST(request: Request) {
  try {
    if (await limiteSuperado(claveDeLimite('contacto', ipDeLaPeticion(request)), 5, 10 * 60)) {
      return NextResponse.json({ error: 'Demasiados envíos seguidos. Escríbenos directamente al 622 652 659.' }, { status: 429 });
    }
  } catch (e) { console.error('No se pudo comprobar el freno de frecuencia:', e); }

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }); }
  if (txt(b.web, 10)) return NextResponse.json({ url: wa('Hola') }); // trampa para bots

  const origenBruto = txt(b.origen, 40).toLowerCase();
  const d: DatosContacto = {
    origen: CODIGO_CAMPANA.test(origenBruto) ? origenBruto : 'web',
    nombre: txt(b.nombre, 80),
    negocio: txt(b.negocio, 100),
    tipo: txt(b.tipo, 40),
    localidad: txt(b.localidad, 60),
    interes: (Object.keys(INTERES).includes(String(b.interes)) ? b.interes : 'no_se') as DatosContacto['interes'],
    consulta: txt(b.consulta, 600),
    franja: (Object.keys(FRANJA).includes(String(b.franja)) ? b.franja : 'cuando_sea') as DatosContacto['franja'],
  };
  // «Que me llamen» (13/10, página /carta-de-autor): teléfono obligatorio y sin WhatsApp; DKitchen llama.
  const llamar = b.llamar === true;
  const telefono = txt(b.telefono, 20).replace(/[^+0-9 ]/g, '');
  if (llamar) {
    if (!/^\+?[0-9 ]{9,16}$/.test(telefono)) return NextResponse.json({ error: 'Escribe un teléfono válido para que te llamemos.' }, { status: 400 });
    d.consulta = `QUE ME LLAMEN al ${telefono}${d.consulta ? ' · ' + d.consulta : ''}`.slice(0, 600);
  }
  if (d.nombre.length < 2 || !TIPOS.includes(d.tipo) || d.consulta.length < 3) {
    return NextResponse.json({ error: 'Revisa tu nombre, el tipo de negocio y tu consulta.' }, { status: 400 });
  }

  let id: string;
  try {
    id = await registrarContacto(d);
  } catch (e) {
    console.error('Contacto no guardado', e);
    return NextResponse.json({ error: 'No se pudo enviar. Escríbenos directamente al 622 652 659.' }, { status: 500 });
  }
  const ref = id.slice(0, 6).toUpperCase();
  if (llamar) {
    await enviarCorreoInterno(`QUE ME LLAMEN · ${d.nombre} · ${d.negocio || d.tipo} · ${telefono}`,
      `<p><strong>Ref. ${ref}</strong> · origen <strong>${escaparHtml(d.origen)}</strong>. Llámale hoy (mejor ${FRANJA[d.franja]}).</p><p>${escaparHtml(d.nombre)} · ${escaparHtml(d.negocio)} · ${escaparHtml(d.tipo)} · ${escaparHtml(d.localidad)}<br><strong>${escaparHtml(telefono)}</strong></p>`).catch(() => {});
    return NextResponse.json({ ok: true, ref });
  }
  await eventoQrCampana(d.origen, 'whatsapp', d.interes).catch(() => {});

  const mensaje = [
    `Hola, soy ${d.nombre}${d.negocio ? ` de ${d.negocio}` : ''} (${d.tipo}${d.localidad ? `, ${d.localidad}` : ''}).`,
    `Me interesa: ${INTERES[d.interes]}.`,
    `Mi consulta: ${d.consulta}`,
    `Mejor hora para hablar: ${FRANJA[d.franja]}.`,
    `Ref. ${ref}`,
  ].join('\n');

  await enviarCorreoInterno(`CONTACTO NUEVO (${INTERES[d.interes]}) · ${d.nombre} · ${d.tipo}`,
    `<p><strong>Ref. ${ref}</strong> · origen <strong>${escaparHtml(d.origen)}</strong>. Va a escribir por WhatsApp: contéstale en menos de 1 hora.</p><pre style="font:14px/1.5 sans-serif;white-space:pre-wrap">${escaparHtml(mensaje)}</pre>`).catch(() => {});

  return NextResponse.json({ url: wa(mensaje), ref });
}
