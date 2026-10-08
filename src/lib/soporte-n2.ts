import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * Soporte nivel 2 (punto 7 de karc0, 07/10; 0055; PROTOCOLO_SOPORTE_N2.md).
 * HOY es manual: karc0 y Claude Code atienden cada ticket desde Central con
 * este diagnóstico POR REGLAS (sin IA), cuatro acciones seguras y un borrador
 * por plantilla. Cada cierre guarda categoría, nivel, acciones y si el
 * diagnóstico acertó: con 50 tickets así se valorará pasar el diagnóstico y el
 * borrador a un modelo Claude (AI Gateway), con estas mismas reglas como guía.
 */

export const CATEGORIAS = {
  acceso: 'Acceso al panel', carta: 'Carta y diseño', qr: 'QR', equipo_sala: 'Equipo y app de sala', tpv: 'TPV',
  reservas: 'Reservas', pagos: 'Pagos y facturas', plan: 'Plan', baja: 'Baja', error: 'Error de la web', sugerencia: 'Sugerencia', otro: 'Otro',
} as const;
export type Categoria = keyof typeof CATEGORIAS;
/** Nunca N2: siempre una persona con poder (karc0). */
export const SOLO_HUMANO: Categoria[] = ['pagos', 'plan', 'baja'];

export type Diagnostico = {
  local: { nombre: string; slug: string; plan: string; activo: boolean; estado_acceso: string; prueba_hasta: string | null; fundador: boolean; paga_por_stripe: boolean; creado_en: string };
  acceso: { email: string; verificado: boolean; alta: string; bloqueado: boolean; sesiones: number; ultima_sesion: string | null } | null;
  carta: { secciones: number; platos: number; sin_foto: number; sin_precio: number; ocultos: number };
  ficha: { logo: boolean; direccion: boolean; horario: boolean; telefono: boolean; whatsapp: boolean; idiomas: string[] };
  qr: { activo: boolean | null; codigos: number };
  equipo: { id: string; nombre: string; rol: string; activo: boolean; ultimo_acceso: string | null }[];
  tpv: { proveedor: string; activa: boolean; ultimo_envio: string | null; ultimo_error: string | null; fallidos_7d: { id: string; mesa: string; creado_en: string; detalle: string | null }[] } | null;
  servicios: string[];
  tickets: { abiertos: number; ultimos_30d: number };
  socio: { nombre: string; codigo: string; puede_editar: boolean } | null;
  generado_en: string;
};

export type Accion = 'reenviar_acceso' | 'reenviar_bienvenida' | 'regenerar_enlace' | 'reintentar_tpv';
export type Hallazgo = { gravedad: 'alta' | 'media' | 'info'; texto: string; accion?: Accion };
export type Sugerencia = { categoria: Categoria; nivel: 1 | 2 | 3; hallazgos: Hallazgo[] };

export async function diagnosticar(jwt: string, restauranteId: string): Promise<Diagnostico | null> {
  return comoCliente(jwt, async (c) => (await c.query<{ d: Diagnostico }>('SELECT dk.admin_diagnostico($1) AS d', [restauranteId])).rows[0]?.d ?? null).catch(() => null);
}

const PALABRAS: [Categoria, RegExp][] = [
  ['baja', /\b(baja|darme de baja|cancelar|anular (la )?suscripci)/i],
  ['pagos', /(cobr|factura|pago|tarjeta|reembolso|devoluci|cargo|recibo)/i],
  ['plan', /\b(plan|subir de|bajar de|cambiar de plan|fundador)/i],
  ['acceso', /(contraseña|contrasena|no puedo entrar|no entro|acceso|login|iniciar sesi|correo de)/i],
  ['tpv', /\btpv\b|caja registradora/i],
  ['equipo_sala', /(camarer|enlace|encargad|equipo|app de sala|comandero)/i],
  ['reservas', /reserva/i],
  ['qr', /\bqr\b|pegatina|metacrilato/i],
  ['error', /(error|falla|no funciona|no carga|pantalla en blanco|se queda)/i],
  ['carta', /(plato|carta|foto|precio|al[eé]rgeno|secci[oó]n|dise[nñ]o|logo|banner|idioma)/i],
];

/** Reglas de diagnóstico: el texto del ticket + el estado real del local. */
export function sugerir(asunto: string, mensaje: string, d: Diagnostico | null): Sugerencia {
  const h: Hallazgo[] = [];
  const texto = `${asunto} ${mensaje}`;
  let categoria: Categoria = PALABRAS.find(([, re]) => re.test(texto))?.[0] ?? 'otro';
  if (d) {
    if (!d.local.activo) h.push({ gravedad: 'alta', texto: 'El local está dado de baja o desactivado.' });
    if (d.local.estado_acceso !== 'activo') h.push({ gravedad: 'alta', texto: `Estado de acceso «${d.local.estado_acceso}» (impago o suspensión): lo decide una persona.` });
    if (d.acceso?.bloqueado) h.push({ gravedad: 'alta', texto: 'La cuenta del dueño está bloqueada en Neon Auth.' });
    if (d.acceso && d.acceso.sesiones === 0) h.push({ gravedad: 'media', texto: 'El dueño no ha entrado nunca al panel.', accion: 'reenviar_bienvenida' });
    else if (d.acceso && /contrase|entrar|acceso|login/i.test(texto)) h.push({ gravedad: 'media', texto: `Último inicio de sesión: ${d.acceso.ultima_sesion ? new Date(d.acceso.ultima_sesion).toLocaleString('es-ES') : 'nunca'}.`, accion: 'reenviar_acceso' });
    const sinEntrar = d.equipo.filter((e) => e.activo && !e.ultimo_acceso);
    if (sinEntrar.length) h.push({ gravedad: 'media', texto: `${sinEntrar.length} miembro(s) del equipo no han entrado nunca: ${sinEntrar.map((e) => e.nombre).join(', ')}.`, accion: 'regenerar_enlace' });
    if (d.tpv?.fallidos_7d.length) h.push({ gravedad: 'alta', texto: `${d.tpv.fallidos_7d.length} ronda(s) no llegaron al TPV en 7 días. Último error: ${d.tpv.ultimo_error ?? '—'}.`, accion: 'reintentar_tpv' });
    if (d.tpv && !d.tpv.activa) h.push({ gravedad: 'media', texto: 'La conexión con el TPV está desactivada.' });
    if (d.qr.activo === false || d.qr.codigos === 0) h.push({ gravedad: 'alta', texto: 'El local no tiene un QR activo.' });
    if (d.carta.platos === 0) h.push({ gravedad: 'media', texto: 'La carta está vacía.' });
    if (d.carta.sin_precio) h.push({ gravedad: 'info', texto: `${d.carta.sin_precio} plato(s) sin precio.` });
    if (d.carta.ocultos) h.push({ gravedad: 'info', texto: `${d.carta.ocultos} plato(s) ocultos como agotados.` });
    const falta = [!d.ficha.horario && 'horario', !d.ficha.direccion && 'dirección', !d.ficha.logo && 'logo'].filter(Boolean);
    if (falta.length) h.push({ gravedad: 'info', texto: `Ficha incompleta: falta ${falta.join(', ')}.` });
    if (d.tickets.ultimos_30d >= 3) h.push({ gravedad: 'media', texto: `${d.tickets.ultimos_30d} tickets en 30 días: valorar llamada o puesta a punto.` });
    if (d.socio) h.push({ gravedad: 'info', texto: `Tiene socio: ${d.socio.nombre} (${d.socio.codigo})${d.socio.puede_editar ? ', puede hacer la puesta a punto.' : ', sin permiso de edición.'}` });
    if (categoria === 'otro') categoria = h.find((x) => x.accion === 'reintentar_tpv') ? 'tpv' : h.find((x) => x.accion === 'regenerar_enlace') ? 'equipo_sala' : h.find((x) => x.accion?.startsWith('reenviar')) ? 'acceso' : 'otro';
  }
  const nivel: 1 | 2 | 3 = SOLO_HUMANO.includes(categoria) || h.some((x) => x.gravedad === 'alta' && !x.accion) ? 3 : h.some((x) => x.accion) ? 2 : 1;
  return { categoria, nivel, hallazgos: h };
}

type AccionHecha = { accion: string; detalle?: Record<string, unknown>; en: string };

/** Borrador para el cliente (lo revisa y envía karc0). Tuteo, español de España, sin tecnicismos. */
export function borrador(categoria: Categoria, acciones: AccionHecha[], d: Diagnostico | null): string {
  const hechas = new Set(acciones.map((a) => a.accion));
  const l: string[] = ['Hola:'];
  if (hechas.has('reenviar_bienvenida') || hechas.has('reenviar_acceso'))
    l.push(`Te acabamos de enviar ${hechas.has('reenviar_bienvenida') ? 'de nuevo el correo de bienvenida y ' : ''}un correo para crear tu contraseña. Llega con el asunto «Crea tu contraseña de DKitchen»; si no lo ves en unos minutos, mira en spam. Después entras en dkitchencorporate.es/panel con tu correo${d?.acceso?.email ? ` (${d.acceso.email})` : ''} y esa contraseña.`);
  if (hechas.has('regenerar_enlace')) {
    const nombres = acciones.filter((a) => a.accion === 'regenerar_enlace').map((a) => String(a.detalle?.nombre ?? '')).filter(Boolean);
    l.push(`Hemos creado un enlace nuevo para ${nombres.join(' y ') || 'tu equipo'} y te lo hemos enviado por correo. Ábrelo en su móvil y guárdalo en la pantalla de inicio. El enlace anterior ya no funciona.`);
  }
  if (hechas.has('reintentar_tpv')) {
    const ok = acciones.filter((a) => a.accion === 'reintentar_tpv' && a.detalle?.enviado === true).length;
    const mal = acciones.filter((a) => a.accion === 'reintentar_tpv' && a.detalle?.enviado !== true).length;
    l.push(ok ? `Hemos reenviado al TPV ${ok} ronda(s) que no habían llegado y ya están dentro.` : '');
    if (mal) l.push(`${mal} ronda(s) siguen sin llegar al TPV: estamos revisando la conexión con tu proveedor y te decimos algo hoy.`);
  }
  if (!hechas.size) {
    l.push(SOLO_HUMANO.includes(categoria)
      ? 'Lo está revisando una persona del equipo y te contestamos hoy mismo con la solución.'
      : categoria === 'carta' ? 'Te explico cómo hacerlo desde tu panel: [pasos]. Si prefieres que te lo dejemos hecho, dímelo y lo preparamos.'
      : '[Respuesta]');
  }
  l.push('Si algo no queda bien, responde a este mensaje y lo vemos.', 'Un saludo,\nEl equipo de DKitchen');
  return l.filter(Boolean).join('\n\n');
}

export async function datosTickets(jwt: string, ids: string[]) {
  if (!ids.length) return new Map<string, { acciones: AccionHecha[]; categoria: string | null; nivel: number | null; acertado: boolean | null; resolucion: string | null }>();
  const rows = await comoCliente(jwt, async (c) => (await c.query<{ id: string; acciones: AccionHecha[]; categoria: string | null; nivel: number | null; diagnostico_acertado: boolean | null; resolucion: string | null }>(
    'SELECT id, acciones, categoria, nivel, diagnostico_acertado, resolucion FROM tickets_soporte WHERE id = ANY($1::uuid[])', [ids])).rows);
  return new Map(rows.map((r) => [r.id, { acciones: r.acciones ?? [], categoria: r.categoria, nivel: r.nivel, acertado: r.diagnostico_acertado, resolucion: r.resolucion }]));
}

export async function metricasSoporte(jwt: string) {
  return comoCliente(jwt, async (c) => (await c.query<{ m: { recibidos: number; resueltos: number; con_diagnostico_valorado: number; acierto: number | null; horas_medias_resolucion: number | null } }>('SELECT dk.admin_soporte_metricas() AS m')).rows[0]?.m ?? null).catch(() => null);
}
