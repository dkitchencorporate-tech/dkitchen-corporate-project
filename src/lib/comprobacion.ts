import 'server-only';
import { list, put, del } from '@vercel/blob';
import { QR_MENU, FUNDADOR, BASE_OPERATIVA, EXPERIENCE, AUDITORIA_CANALES, QR_FISICOS } from '@/lib/pricing-config';

/**
 * Central → Comprobación (remapeo final 81f7ea99, 02/11/2026): checklist tachable por servicio con
 * escenarios reales desde cero. Cada punto: OK · Falla · Pendiente · No iniciado, con nota y evidencia.
 * Se guarda en Blob (sin migración). La ruta lleva sufijo aleatorio (no adivinable) porque las notas son
 * internas: se busca por prefijo y se borra la copia anterior al guardar.
 */
export type EstadoC = 'ok' | 'falla' | 'pendiente' | 'no_iniciado';
export const ESTADOS_C: { id: EstadoC; nombre: string }[] = [
  { id: 'ok', nombre: 'OK' }, { id: 'falla', nombre: 'Falla' }, { id: 'pendiente', nombre: 'Pendiente' }, { id: 'no_iniciado', nombre: 'No iniciado' },
];
export type Grupo = 'A' | 'B' | 'C' | 'D';
export const GRUPOS: Record<Grupo, string> = {
  A: 'Entrada externa (landing → pago → cuenta → panel)',
  B: 'Desde Central (alta → enlace → pago → tablero → baja)',
  C: 'Venta (ofertas, objeciones, captación y cierre)',
  D: 'Checklist robusto',
};
export type PuntoC = { id: string; grupo: Grupo; texto: string; estado: EstadoC; nota: string; evidencia: string; por: string; fecha: string };
export type ServicioC = { id: string; nombre: string; precio: string; puntos: PuntoC[] };
export type Comprobacion = { actualizado: string; servicios: ServicioC[] };

const PREFIJO = 'central/comprobacion-';

const SERVICIOS: [string, string, string][] = [
  ['qr-carta', 'Carta QR · Carta', `${QR_MENU.planes.basico.mensual} €/mes`],
  ['qr-local', 'Carta QR · Local', `${QR_MENU.planes.ampliado.mensual} €/mes (entra por ${QR_MENU.primerMes} €)`],
  ['qr-sala', 'Carta QR · Sala', `${QR_MENU.planes.sala.mensual} €/mes`],
  ['fundador', 'Fundador', `${FUNDADOR.mensual} €/mes (${FUNDADOR.trimestre} €/trimestre)`],
  ['signature', 'Signature (con el motor)', `${BASE_OPERATIVA.pagoUnico} € o ${BASE_OPERATIVA.fraccionado.cuotas}×${BASE_OPERATIVA.fraccionado.importeCuota} € + ${BASE_OPERATIVA.mantenimiento.mensual} €/mes`],
  ['experience', 'Experience (evento + entradas)', `${EXPERIENCE.tarifas.primeraVez.precio} € el primer evento`],
  ['auditoria', 'Auditoría de canales', `${AUDITORIA_CANALES.precioOferta} € (ancla ${AUDITORIA_CANALES.precioAncla} €)`],
  ['extras', 'Puesta a punto y extras del catálogo', 'catálogo'],
  ['qr-fisicos', 'QR físicos', `etiquetas desde ${QR_FISICOS.etiquetas.tandas[0].precio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`],
  ['comerciales', 'Comerciales y Academia (servicio interno)', 'comisión'],
];

/** Puntos de cada servicio (método del reporte 02/11 §3). */
const BASE: [Grupo, string, string][] = [
  ['A', 'a-landing', 'Landing: se entiende qué compro, cuánto cuesta y qué pasa después'],
  ['A', 'a-formulario', 'Formulario o registro (web, QR/UTM de campaña, «Mándanos una foto de tu carta», salida de intención)'],
  ['A', 'a-correo', 'Correo recibido tras el formulario (remitente, textos, enlaces)'],
  ['A', 'a-pago', 'Enlace de pago de Stripe → /pago con el importe correcto'],
  ['A', 'a-documentos', 'Pago → factura (simplificada o completa) → contrato rellenado → correo «Tu factura y tu contrato» → Mis documentos'],
  ['A', 'a-cuenta', 'Webhook → cuenta creada → correo para fijar la contraseña → primer acceso'],
  ['A', 'a-panel', 'Qué ve en su panel (Hoy, Mis servicios, zonas contratadas) y qué le falta'],
  ['A', 'a-central', 'Qué aparece en Central (ficha, tablero, Hoy, embudo, avisos) y qué debe hacer dirección'],
  ['B', 'b-alta', 'Alta en 4 pasos desde «+ Nuevo» del tablero'],
  ['B', 'b-propuesta', 'Propuesta, enlace o demo enviada → correo y vista del cliente'],
  ['B', 'b-activacion', 'Pago → activación → tarjeta en su tablero y fase con botón'],
  ['B', 'b-avisos', 'Avisos al cliente en cada cambio de fase'],
  ['B', 'b-baja', 'Archivado, baja, reembolso e impago'],
  ['C', 'c-ofertas', 'Ofertas y palancas aplicables (6–10 %, montaje gratis, piloto Experience ≤ −50 %, Signature en N pagos, Fundador nunca en cuotas)'],
  ['C', 'c-objeciones', 'Objeciones típicas y su respuesta en Academia'],
  ['C', 'c-captacion', 'Nivel real de captación y cierre (puntuación 1–10 con motivo)'],
  ['C', 'c-competencia', 'Diferenciales fuertes frente a la competencia y lo que nos falta'],
  ['D', 'd-precio', 'Precio coherente en landing, checkout, correo, factura, contrato y Central (fuente: pricing-config)'],
  ['D', 'd-movil', 'Móvil y tableta (360 · 390 · 768 · 1.024) sin desbordes'],
  ['D', 'd-velocidad', 'Velocidad (HTML < 3 s en móvil)'],
  ['D', 'd-seguridad', 'Seguridad: precio en servidor, permisos, freno de altas'],
  ['D', 'd-legales', 'Legales y RGPD (aviso legal con titular, privacidad, términos, encargado)'],
  ['D', 'd-falta', 'Lo que no existe todavía'],
];

const vacia = (): Comprobacion => ({
  actualizado: '',
  servicios: SERVICIOS.map(([id, nombre, precio]) => ({
    id, nombre, precio,
    puntos: BASE.map(([grupo, pid, texto]) => ({ id: pid, grupo, texto, estado: 'no_iniciado' as EstadoC, nota: '', evidencia: '', por: '', fecha: '' })),
  })),
});

/** Une lo guardado con la plantilla (si mañana se añade un punto o un servicio, aparece sin perder nada). */
function unir(g: Partial<Comprobacion> | null): Comprobacion {
  const base = vacia();
  if (!g?.servicios) return base;
  for (const s of base.servicios) {
    const gs = g.servicios.find((x) => x.id === s.id);
    if (!gs) continue;
    s.puntos = s.puntos.map((p) => ({ ...p, ...(gs.puntos.find((x) => x.id === p.id) ?? {}), texto: p.texto, grupo: p.grupo }));
    const extra = gs.puntos.filter((x) => !s.puntos.some((p) => p.id === x.id));
    s.puntos.push(...extra);
  }
  base.actualizado = g.actualizado ?? '';
  return base;
}

async function ultimo() {
  const { blobs } = await list({ prefix: PREFIJO, limit: 20 });
  return blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

export async function leerComprobacion(): Promise<{ datos: Comprobacion; ok: boolean }> {
  try {
    const [b] = await ultimo();
    if (!b) return { datos: vacia(), ok: true };
    const j = await (await fetch(`${b.url}?v=${b.uploadedAt.getTime()}`, { cache: 'no-store' })).json();
    return { datos: unir(j), ok: true };
  } catch (e) {
    console.error('Comprobación: no se pudo leer', e);
    return { datos: vacia(), ok: false };
  }
}

async function guardar(c: Comprobacion) {
  const antes = await ultimo();
  c.actualizado = new Date().toISOString();
  await put(`${PREFIJO}${Date.now()}.json`, JSON.stringify(c), { access: 'public', contentType: 'application/json', addRandomSuffix: true });
  if (antes.length) await del(antes.map((b) => b.url)).catch(() => {});
}

const ES_ESTADO = (e: unknown): e is EstadoC => ESTADOS_C.some((x) => x.id === e);

export async function guardarPunto(servicio: string, punto: string, cambios: { estado: string; nota: string; evidencia: string }, por: string) {
  if (!ES_ESTADO(cambios.estado)) throw new Error('estado');
  const { datos, ok } = await leerComprobacion();
  if (!ok) throw new Error('lectura');
  const p = datos.servicios.find((s) => s.id === servicio)?.puntos.find((x) => x.id === punto);
  if (!p) throw new Error('punto');
  Object.assign(p, { estado: cambios.estado, nota: cambios.nota.slice(0, 2000), evidencia: cambios.evidencia.slice(0, 500), por: por.slice(0, 40), fecha: new Date().toISOString() });
  await guardar(datos);
}

/** Volcado de Claude (resultados de dkitchen-pruebas): solo pisa los puntos que trae. */
export async function volcarPuntos(filas: { servicio: string; punto: string; estado: string; nota: string; evidencia?: string }[], por: string) {
  const { datos, ok } = await leerComprobacion();
  if (!ok) throw new Error('lectura');
  let n = 0;
  for (const f of filas) {
    const p = datos.servicios.find((s) => s.id === f.servicio)?.puntos.find((x) => x.id === f.punto);
    if (!p || !ES_ESTADO(f.estado)) continue;
    Object.assign(p, { estado: f.estado, nota: String(f.nota ?? '').slice(0, 2000), evidencia: String(f.evidencia ?? '').slice(0, 500), por, fecha: new Date().toISOString() });
    n++;
  }
  await guardar(datos);
  return n;
}
