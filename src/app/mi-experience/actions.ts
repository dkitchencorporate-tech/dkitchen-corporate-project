'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { obtenerJwtDeSesion } from '@/lib/sesion';
import { guardarMiBriefing, agendarMiLlamada } from '@/lib/mi-experience';
import { enviarCorreoInterno, enviarCorreoCliente, filasCorreo, escaparHtml } from '@/lib/email';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS: [string, string, number][] = [
  ['formato', 'Formato', 60], ['cocina', 'Tipo de cocina', 60], ['fecha', 'Fecha deseada', 10], ['aforo', 'Aforo', 6],
  ['precio', 'Precio de la entrada (€)', 6], ['menu', 'Menú o idea', 1500], ['pasarela', 'Pasarela de cobro', 40],
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
