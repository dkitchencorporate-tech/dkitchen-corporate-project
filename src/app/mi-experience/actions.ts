'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { guardarMiBriefing, agendarMiLlamada, misExperiences, guardarMisFotos } from '@/lib/mi-experience';
import { enviarCorreoInterno, enviarCorreoCliente, filasCorreo, escaparHtml } from '@/lib/email';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS: [string, string, number][] = [
  ['formato', 'Formato', 60], ['cocina', 'Gastronomía', 60], ['fecha', 'Fecha deseada', 10], ['aforo', 'Aforo', 6],
  ['precio', 'Precio de la entrada (€)', 6],
  // 0103: menú por pases (hasta 6); «menu» queda para la idea general
  ...[1, 2, 3, 4, 5, 6].map((n): [string, string, number] => [`pase${n}`, `Pase ${n}`, 200]),
  ['menu', 'Menú o idea', 1500], ['pasarela', 'Pasarela de cobro', 40],
  ['licencias', 'Licencias (alcohol, música, aforo)', 300], ['notas', 'Notas', 1000],
];
const sesion = async () => { const jwt = await obtenerJwtDeSesion().catch(() => null); if (!jwt) redirect('/panel/iniciar-sesion'); return jwt; };

/** Briefing del evento desde la zona del cliente (0088). Avisa a karc0 por correo. */
export async function briefingAction(f: FormData) {
  const jwt = await sesion();
  const id = String(f.get('id') ?? '');
  if (!UUID.test(id)) redirect('/mi-experience?e=datos');
  const b = Object.fromEntries(CAMPOS.map(([k, , max]) => [k, String(f.get(k) ?? '').trim().slice(0, max)]).filter(([, v]) => v));
  if (!b.fecha || !b.formato) redirect('/mi-experience?e=briefing#briefing');
  try { await guardarMiBriefing(jwt, id, b); } catch { redirect('/mi-experience?e=base#briefing'); }
  await enviarCorreoInterno(`BRIEFING EXPERIENCE (zona del cliente) · ${b.formato} · ${b.fecha}`,
    `<h2>Briefing recibido desde /mi-experience</h2>${filasCorreo(CAMPOS.map(([k, t]) => [t, b[k]]))}<p>Proyecto ${escaparHtml(id)} · en Central → Proyectos.</p>`).catch(() => {});
  revalidatePath('/mi-experience');
  redirect('/mi-experience?ok=briefing#llamada');
}

/** Llamada de arranque: el cliente elige un hueco libre (0088). */
export async function llamadaAction(f: FormData) {
  const jwt = await sesion();
  const id = String(f.get('id') ?? ''), cuando = String(f.get('cuando') ?? '');
  const correo = String(f.get('correo') ?? '');
  if (!UUID.test(id) || Number.isNaN(Date.parse(cuando))) redirect('/mi-experience?e=datos#llamada');
  let motivo = '';
  try { await agendarMiLlamada(jwt, id, cuando); } catch (e) { motivo = /ocupado/.test(String((e as Error).message)) ? 'ocupado' : 'hueco'; }
  if (motivo) redirect(`/mi-experience?e=${motivo}#llamada`);
  const cuandoTxt = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(cuando));
  await enviarCorreoInterno(`LLAMADA EXPERIENCE AGENDADA · ${cuandoTxt}`, `<p>Un cliente de Experience ha agendado su llamada de arranque: <strong>${escaparHtml(cuandoTxt)}</strong>.</p><p>Proyecto ${escaparHtml(id)} · en Central → Proyectos (siguiente paso con fecha).</p>`).catch(() => {});
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) {
    await enviarCorreoCliente(correo, 'Tu llamada de arranque está agendada · DKitchen Experience',
      `<p>Hola,</p><p>Tu llamada de arranque es el <strong>${escaparHtml(cuandoTxt)}</strong> (hora de Madrid). Te llamaremos al teléfono que nos diste; si prefieres videollamada, respóndenos a este correo.</p><p>En tu zona de Experience puedes ver el estado de tu evento: https://dkitchencorporate.es/mi-experience</p><p>El equipo de DKitchen</p>`).catch(() => {});
  }
  revalidatePath('/mi-experience');
  redirect('/mi-experience?ok=llamada#llamada');
}

const TIPOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FOTOS = 8;

/** Proyecto del cliente (por el correo de su cuenta) o null: nadie sube a la carpeta de otro. */
async function miProyecto(jwt: string, id: string) {
  if (!UUID.test(id)) return null;
  return (await misExperiences(jwt).catch(() => [])).find((p) => p.id === id) ?? null;
}

/** Foto del briefing (0103), ya comprimida en el navegador: Vercel Blob en experience/<proyecto>/. */
export async function subirFotoAction(f: FormData): Promise<{ ok?: true; error?: string }> {
  const jwt = await sesion();
  const p = await miProyecto(jwt, String(f.get('id') ?? ''));
  if (!p) return { error: 'No encontramos tu evento.' };
  if (p.fotos.length >= MAX_FOTOS) return { error: `Máximo ${MAX_FOTOS} fotos. Quita alguna para subir otra.` };
  const archivo = f.get('archivo');
  if (!(archivo instanceof File)) return { error: 'No se recibió ninguna foto.' };
  if (!TIPOS_FOTO.has(archivo.type)) return { error: 'Formato no admitido (usa JPG, PNG o WebP).' };
  if (archivo.size > 950_000) return { error: 'La foto supera el tamaño máximo.' };
  const ext = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg';
  try {
    const { url } = await put(`experience/${p.id}/${randomUUID()}.${ext}`, archivo, { access: 'public', contentType: archivo.type });
    await guardarMisFotos(jwt, p.id, [...p.fotos, url]);
  } catch {
    return { error: 'No se pudo guardar la foto. Inténtalo de nuevo.' };
  }
  revalidatePath('/mi-experience');
  return { ok: true };
}

export async function quitarFotoAction(f: FormData) {
  const jwt = await sesion();
  const p = await miProyecto(jwt, String(f.get('id') ?? ''));
  if (!p) redirect('/mi-experience?e=datos#fotos');
  const url = String(f.get('url') ?? '');
  try { await guardarMisFotos(jwt, p.id, p.fotos.filter((x) => x !== url)); } catch { redirect('/mi-experience?e=base#fotos'); }
  revalidatePath('/mi-experience');
  redirect('/mi-experience?ok=foto#fotos');
}
