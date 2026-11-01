/**
 * 0114 · Catálogos de la prospección física + canales (spec B / P7 7.1), sin dependencias de servidor:
 * los usan el registro en 3 toques (cliente) y el servidor. Etiquetas, nunca precios (los precios: pricing-config).
 */
export const MOTIVOS = { precio: 'Precio', ya_tiene: 'Ya tiene sistema', no_interesa: 'No le interesa', cerrado: 'Cerrado', otro: 'Otro' } as const;
export const CANALES = {
  fisico: 'A pie', telefono: 'Teléfono', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', whatsapp: 'WhatsApp', email: 'Email',
} as const;
export type Canal = keyof typeof CANALES;
export const esCanal = (c: unknown): c is Canal => typeof c === 'string' && c in CANALES;
export const RESULTADOS = {
  no_estaba: 'No estaba', hablo_encargado: 'Habló con el encargado', demo: 'Demo enseñada', propuesta: 'Propuesta enviada',
  cerrado: 'Cerrado', descartado: 'Descartado', perdido: 'Perdido (reintentar)',
} as const;
export type Resultado = keyof typeof RESULTADOS;
export const esResultado = (r: unknown): r is Resultado => typeof r === 'string' && r in RESULTADOS;
export const NIVELES = { facil: 'Fácil', intermedio: 'Intermedia', dificil: 'Difícil' } as const;
export type Nivel = keyof typeof NIVELES;
export const PRODUCTOS = {
  carta: 'Carta QR · Carta', local: 'Carta QR · Local', sala: 'Carta QR · Sala', fundador: 'Fundador', signature: 'Signature', experience: 'Experience', auditoria: 'Auditoría',
} as const;
export type Producto = keyof typeof PRODUCTOS;
export const PALANCAS = {
  ninguna: 'Ninguna', publica: 'Oferta pública', descuento_5: 'Hasta 5 % (libre)', descuento_6_10: '6–10 % (con OK)',
  montaje_gratis: 'Montaje gratis (con OK)', piloto_experience: 'Experience piloto (con OK)', signature_fraccionado: 'Signature por hitos (con OK)',
} as const;
export type Palanca = keyof typeof PALANCAS;
export const MATERIALES = { flyer: 'Flyer', tarjeta: 'Tarjeta', demo: 'Demo preparada' } as const;
export type Material = keyof typeof MATERIALES;
/** Códigos de los flyers impresos (qr_campanas, flyer v6 en la calle). */
export const FLYERS = { 'f-carta': 'Flyer Carta QR', 'f-sig': 'Flyer Signature' } as const;
export const PLANTILLAS = ['Propuesta personalizada', 'Mensaje de la demo', 'Seguimiento 48 h', 'Respuesta a su publicación', 'Otra'] as const;
export const esDigital = (c: Canal | null) => !!c && c !== 'fisico';
/** Objeciones típicas (Academia) para tocar en vez de escribir. */
export const OBJECIONES = ['Es caro', 'Ya tengo carta', 'No tengo tiempo', 'Mis clientes no usan el móvil', 'Lo tengo que hablar', 'Ya me lo ofrecieron otros'] as const;

/** Centro de Baza: la ruta empieza aquí (Baza y comarca primero). */
export const BAZA = { lat: 37.4898, lng: -2.7724 };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) * 111.2;
export const esBaza = (z: string) => /baza|caniles|benamaurel|z[uú]jar|c[uú]llar|freila|cort[eé]s/i.test(z);
/**
 * Propuesta de ruta del día: los pendientes con posición, Baza y comarca primero, ordenados por el
 * vecino más cercano desde el centro de Baza (máximo `max` paradas). Las coordenadas llegan como texto (numeric).
 */
export function proponerRuta<T extends { lat: number | string | null; lng: number | string | null; zona: string }>(pendientes: T[], max = 8): T[] {
  const con = pendientes.filter((p) => p.lat != null && p.lng != null);
  const baza = con.filter((p) => esBaza(p.zona));
  const pool = [...(baza.length ? baza : con)];
  const ruta: T[] = [];
  let aqui = BAZA;
  const pos = (p: T) => ({ lat: Number(p.lat), lng: Number(p.lng) });
  while (ruta.length < max && pool.length) {
    pool.sort((a, b) => km(aqui, pos(a)) - km(aqui, pos(b)));
    const s = pool.shift()!;
    ruta.push(s); aqui = pos(s);
  }
  return ruta;
}

