import 'server-only';
import { comoCliente } from '@/lib/db';

/**
 * CRM de prospección por zona y ruta (punto 9c, 0058). Lo usan karc0 desde
 * Central (todas las carteras) y cada socio desde /socio (solo la suya); la
 * base decide quién ve qué (dk.prosp_rol). Método y decisiones:
 * PROSPECCION_200_LEADS_2026-10-07.md.
 */

export const ESTADOS = {
  por_revisar: 'Por revisar',
  por_visitar: 'Por visitar',
  muestra: 'Muestra hecha',
  visitado: 'Visitado',
  demo: 'Demo hecha',
  interesado: 'Interesado',
  cliente: 'Cliente',
  descartado: 'Descartado',
} as const;
export type Estado = keyof typeof ESTADOS;
export const esEstado = (e: unknown): e is Estado => typeof e === 'string' && e in ESTADOS;

export const TIPOS = {
  pizzeria: 'Pizzería', asador: 'Asador', restaurante: 'Restaurante', hamburgueseria: 'Hamburguesería', kebab: 'Kebab',
  bar: 'Bar de tapas', cafeteria: 'Cafetería', heladeria: 'Heladería', panaderia: 'Panadería', otro: 'Otro',
} as const;
export const FUENTES = { visita: 'Visita', digital: 'Digital (redes)', red_socio: 'Red del socio', referido: 'Referido', script: 'Lote (Claude)' } as const;
export const MOTIVOS = { precio: 'Precio', ya_tiene: 'Ya tiene sistema', no_interesa: 'No le interesa', cerrado: 'Cerrado', otro: 'Otro' } as const;
export const OFERTAS = { qr_1: 'Carta QR · 1 € el primer mes', fundador: 'Fundador (si está abierto)', signature: 'Signature', experience: 'Experience', dark_kitchen: 'Dark Kitchen' } as const;
export const CONTACTOS = { visita: 'Visita', llamada: 'Llamada', whatsapp: 'WhatsApp', dm: 'DM (Instagram)', correo: 'Correo', nota: 'Nota' } as const;

export const RUTAS_CRM = ['/admin-dkitchen/prospeccion', '/socio/prospeccion'] as const;
export type BaseCrm = (typeof RUTAS_CRM)[number];
export const esBaseCrm = (b: unknown): b is BaseCrm => typeof b === 'string' && (RUTAS_CRM as readonly string[]).includes(b);

export type Prospecto = {
  id: string; nombre: string; tipo: keyof typeof TIPOS; zona: string; barrio: string | null; direccion: string | null;
  telefono: string | null; estado: Estado; motivo_descarte: string | null; puntuacion: number | null;
  siguiente_accion: string | null; siguiente_fecha: string | null; apertura_prevista: string | null;
  fuente: keyof typeof FUENTES; muestra: boolean; propuesta_vistas: number; no_contactar: boolean;
  ruta_fecha: string | null; ruta_orden: number | null; comercial_id: string; mio: boolean; comercial: string;
  nota_guia: boolean; actualizado_en: string;
};

export type Ficha = Omit<Prospecto, 'muestra' | 'nota_guia'> & {
  instagram: string | null; web: string | null; contacto: string | null; plataformas: string | null;
  ticket_medio: number | null; mesas: number | null; competidores: string | null; notas: string | null;
  referido_por: string | null; place_id: string | null; muestra_url: string | null; oferta: keyof typeof OFERTAS;
  propuesta_texto: string | null; propuesta_token: string | null; propuesta_vista_en: string | null;
  nota_guia: string | null; rol: 'admin' | 'socio'; cliente_slug: string | null;
  eventos: { tipo: string; texto: string | null; creado_en: string; quien: string }[];
  duplicados: { id: string | null; nombre: string; zona: string; estado: Estado; comercial: string }[];
};

/** Hoy en Madrid (AAAA-MM-DD): la ruta y «toca hoy» van por el día de aquí, no por UTC. */
export const hoyMadrid = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());

export const listaProspectos = (jwt: string, zona: string | null, comercial: string | null) =>
  comoCliente(jwt, async (c) => (await c.query<{ l: Prospecto[] }>('SELECT dk.prosp_lista($1, $2) AS l', [zona, comercial])).rows[0].l);

export const fichaProspecto = (jwt: string, id: string) =>
  comoCliente(jwt, async (c) => (await c.query<{ f: Ficha }>('SELECT dk.prosp_ficha($1) AS f', [id])).rows[0].f);

export const miContacto = (jwt: string) =>
  comoCliente(jwt, async (c) => (await c.query<{ m: { nombre_publico: string; telefono: string | null } | null }>('SELECT dk.prosp_mi_contacto() AS m')).rows[0].m);

export const comercialesCentral = (jwt: string) =>
  comoCliente(jwt, async (c) => (await c.query<{ l: { id: string; nombre: string }[] }>('SELECT dk.admin_prosp_comerciales() AS l')).rows[0].l);

export type Metrica = { comercial: string; total: number; contactados: number; demos: number; clientes: number; descartados: number; motivos: Record<string, number> };
export const metricasCentral = (jwt: string) =>
  comoCliente(jwt, async (c) => (await c.query<{ m: Metrica[] }>('SELECT dk.admin_prosp_metricas() AS m')).rows[0].m);

/**
 * Enlaces de Google Maps con varias paradas (formato /dir/, que abre la app en
 * el móvil). Origen vacío = «tu ubicación». Tramos de 9 paradas.
 */
export function enlacesRuta(paradas: { nombre: string; direccion: string | null; zona: string }[]): string[] {
  const destinos = paradas.map((p) => encodeURIComponent(`${p.direccion || p.nombre}, ${p.zona}`));
  const tramos: string[] = [];
  for (let i = 0; i < destinos.length; i += 9) tramos.push(`https://www.google.com/maps/dir//${destinos.slice(i, i + 9).join('/')}`);
  return tramos;
}

export const soloDigitos = (t: string | null) => (t || '').replace(/\D/g, '');
/** wa.me necesita prefijo de país: un móvil español de 9 cifras lleva 34 delante. */
export const enlaceWhatsapp = (t: string | null) => {
  const d = soloDigitos(t);
  if (!d) return null;
  return `https://wa.me/${d.length === 9 ? '34' + d : d}`;
};
export const fechaCorta = (s: string | null) => (s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }) : '');
