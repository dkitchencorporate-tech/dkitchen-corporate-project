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

/**
 * 0117 · Plantillas de propuesta comercial automatizada según el perfil del cliente y lo hablado.
 * Rellenan automáticamente nombre, zona y el enlace directo a la demo creada (/m/[slug] + panel).
 */
export type PlantillaPropuesta = {
  id: string;
  titulo: string;
  perfil: string;
  oferta: 'qr_1' | 'fundador' | 'signature' | 'experience' | 'dark_kitchen';
  cuerpo: string;
};

export const PLANTILLAS_PROPUESTA: readonly PlantillaPropuesta[] = [
  {
    id: 'qr_papel_redes',
    titulo: '1. Carta en papel / Instagram → Carta QR de Autor (1 € el 1.er mes)',
    perfil: 'Locales con carta física desactualizada, PDF incómodo o solo fotos sueltas en redes',
    oferta: 'qr_1',
    cuerpo:
      'Hola equipo de {nombre}, hemos preparado una muestra real de cómo se ve vuestra Carta Digital Interactiva en {zona}.\n\n' +
      '• Vuestros clientes abren la carta al instante desde la mesa o desde vuestro Instagram sin descargar nada ni hacer zoom en un PDF.\n' +
      '• Podéis cambiar precios, marcar platos agotados o destacar sugerencias del día desde el móvil en 10 segundos.\n' +
      '• Nosotros os dejamos toda la carta montada con vuestras fotos e imagen para que empecéis por solo 1 € el primer mes, sin permanencia.{demo}',
  },
  {
    id: 'qr_sala_terraza',
    titulo: '2. Terraza y Sala ágil → Carta QR + Comandero de Mesas en vivo',
    perfil: 'Bares de tapas, terrazas y restaurantes con picos de trabajo que quieren agilizar comandas',
    oferta: 'qr_1',
    cuerpo:
      'Hola equipo de {nombre}, tal y como comentamos, os hemos montado vuestra demo operativa para {zona} con Carta QR y Comandero de Sala.\n\n' +
      '• El cliente ve los platos con foto desde su mesa y puede pedir o avisar al camarero sin esperas en horas punta.\n' +
      '• Vuestro equipo recibe las comandas por mesa en tiempo real con aviso sonoro y control de estado.\n' +
      '• Aumenta la rotación de mesas y las rondas de bebida/postre desde el primer fin de semana.{demo}',
  },
  {
    id: 'qr_autor_gastro',
    titulo: '3. Restaurante / Carta de Autor → Diseño editorial a medida',
    perfil: 'Restaurantes, asadores y hoteles que cuidan la estética y quieren subir el ticket medio',
    oferta: 'qr_1',
    cuerpo:
      'Hola equipo de {nombre}, hemos diseñado una propuesta de Carta de Autor a la altura de vuestra cocina en {zona}.\n\n' +
      '• Diseño editorial con la identidad visual de {nombre}, fotografías apetecibles al plato y sugerencias del chef.\n' +
      '• Destacados visuales para entrantes para compartir, vinos y postres caseros que elevan el ticket medio por comensal.\n' +
      '• Panel de control privado para actualizar carta, precios y destacados al momento.{demo}',
  },
  {
    id: 'qr_turistas_idiomas',
    titulo: '4. Turistas y Alérgenos → Carta multilingüe + filtros claros',
    perfil: 'Locales con visitantes de fuera, hoteles o clientes que preguntan por alérgenos',
    oferta: 'qr_1',
    cuerpo:
      'Hola equipo de {nombre}, os compartimos la propuesta preparada para {nombre} en {zona} enfocada en atención ágil a todo tipo de comensal.\n\n' +
      '• Carta clara con fotografía por plato e información directa de alérgenos (normativa UE) para evitar dudas en sala.\n' +
      '• Lectura cómoda desde cualquier móvil para visitantes y clientes habituales.\n' +
      '• Os entregamos los soportes QR listos para mesa y barra.{demo}',
  },
  {
    id: 'signature_delivery',
    titulo: '5. Delivery y Recogida sin comisiones → Marca Signature',
    perfil: 'Pizzerías, hamburgueserías, sushi o restaurantes con pedidos a domicilio o para llevar',
    oferta: 'signature',
    cuerpo:
      'Hola equipo de {nombre}, hemos preparado esta propuesta para que {nombre} tenga su propio canal de pedidos directos en {zona} sin pagar comisiones por pedido.\n\n' +
      '• Web y carta propia de pedidos directos (recogida en local y envío) conectada con vuestra cocina.\n' +
      '• El cliente os pide directamente desde WhatsApp, Instagram o Google y el margen íntegro se queda en casa.\n' +
      '• Incluye vuestra demo interactiva para que veáis cómo luce vuestra carta digital desde hoy.{demo}',
  },
  {
    id: 'experience_evento',
    titulo: '6. Llenar un día flojo → Evento DKitchen Experience',
    perfil: 'Locales con buena cocina que quieren llenar entre semana o dar a conocer su carta',
    oferta: 'experience',
    cuerpo:
      'Hola equipo de {nombre}, os proponemos organizar una experiencia gastronómica en {nombre} ({zona}) junto a DKitchen Experience.\n\n' +
      '• Diseñamos un menú especial o noche temática con reserva previa para llenar sala en vuestro día más tranquilo.\n' +
      '• Además, dejamos activada vuestra Carta Digital Interactiva para que todos los asistentes os guarden y repitan.{demo}',
  },
] as const;

export function plantillaSegunTipo(tipo?: string | null): PlantillaPropuesta {
  const t = (tipo ?? '').toLowerCase();
  if (['hamburgueseria', 'pizzeria'].includes(t)) {
    return PLANTILLAS_PROPUESTA.find((x) => x.id === 'signature_delivery') ?? PLANTILLAS_PROPUESTA[0];
  }
  if (['restaurante', 'asador', 'marisqueria'].includes(t)) {
    return PLANTILLAS_PROPUESTA.find((x) => x.id === 'qr_autor_gastro') ?? PLANTILLAS_PROPUESTA[0];
  }
  if (['bar'].includes(t)) {
    return PLANTILLAS_PROPUESTA.find((x) => x.id === 'qr_sala_terraza') ?? PLANTILLAS_PROPUESTA[0];
  }
  return PLANTILLAS_PROPUESTA[0];
}

export function construirTextoPropuesta(
  plantillaId: string,
  datos: { nombre: string; zona: string; demoUrl?: string | null; panelUrl?: string | null },
): { texto: string; oferta: PlantillaPropuesta['oferta'] } {
  const p = PLANTILLAS_PROPUESTA.find((x) => x.id === plantillaId) ?? PLANTILLAS_PROPUESTA[0];
  const bloqueDemo = datos.demoUrl
    ? `\n\n👉 Podéis ver y tocar vuestra demo en vivo aquí: ${datos.demoUrl}` +
      (datos.panelUrl ? `\n👉 Y probar vuestro panel y comandero aquí: ${datos.panelUrl}` : '')
    : '';
  const texto = p.cuerpo
    .replace(/\{nombre\}/g, datos.nombre || 'vuestro local')
    .replace(/\{zona\}/g, datos.zona || 'vuestra zona')
    .replace(/\{demo\}/g, bloqueDemo);
  return { texto, oferta: p.oferta };
}

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

