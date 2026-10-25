/**
 * Cartas de autor (R3, 0096): composiciones y firma. Módulo sin 'use client'
 * para que lo lean igual la carta pública (servidor), el panel y Central.
 */
export type Composicion = 'gastro' | 'taberna' | 'urbano';
export const COMPOSICIONES: Composicion[] = ['gastro', 'taberna', 'urbano'];
export const esComposicion = (v: unknown): v is Composicion => typeof v === 'string' && (COMPOSICIONES as string[]).includes(v);

/** Todas las plantillas que acepta la base (restaurantes_plantilla_check). */
export const PLANTILLAS = ['premium', 'clasica', 'editorial', 'visual', 'express', 'gastro', 'taberna', 'urbano'] as const;

export const ADORNOS = [
  { id: 'rombo', nombre: 'Rombo' }, { id: 'estrella', nombre: 'Estrella' }, { id: 'ola', nombre: 'Ola' },
  { id: 'sello', nombre: 'Sello' }, { id: 'ninguno', nombre: 'Sin adorno' },
] as const;

/** Composiciones de autor tal y como se presentan al cliente (panel) y a DKitchen (Central). */
export const FICHAS_COMPOSICION: { id: Composicion; nombre: string; para: string; muestra: string[] }[] = [
  { id: 'gastro', nombre: 'De autor · Alta cocina', para: 'Negro editorial con letra fina: cada plato en una fila con su foto grande, «Selección del chef» y la nota del chef firmada. Con fondo Papel, versión clara.', muestra: ['Portada en penumbra', 'Platos en filas alternas', 'Nota del chef firmada'] },
  { id: 'taberna', nombre: 'De autor · Taberna', para: 'Cabecera de pizarra, la recomendación del día en una cinta de tu color y las secciones en fichas de papel con el precio en pastilla. Bar de tapas, raciones y vinos.', muestra: ['Cabecera de pizarra', 'Recomendación del día', 'Fichas con foto y precio'] },
  { id: 'urbano', nombre: 'De autor · Urbana', para: 'Tarjetón con el degradado de tu marca, letra de cartel y rejilla de tarjetas con el precio sobre la foto. Hamburguesería, street food, pizza.', muestra: ['Tarjetón de marca', '«Los que más piden»', 'Precio sobre la foto'] },
];

export type Firma = { lema?: string; destacados?: string; nota?: string; autor?: string; adorno?: 'rombo' | 'estrella' | 'ola' | 'sello' | 'ninguno' };

/** Limpia la firma que llega de un formulario (mismos topes que restaurantes_firma_check). */
export function limpiarFirma(f: unknown): Firma {
  const o = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
  const txt = (k: string, max: number) => String(o[k] ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const r: Firma = {};
  const lema = txt('lema', 120); if (lema) r.lema = lema;
  const destacados = txt('destacados', 40); if (destacados) r.destacados = destacados;
  const nota = String(o.nota ?? '').trim().slice(0, 400); if (nota) r.nota = nota;
  const autor = txt('autor', 60); if (autor) r.autor = autor;
  if (ADORNOS.some((a) => a.id === o.adorno)) r.adorno = o.adorno as Firma['adorno'];
  return r;
}

/**
 * DISEÑO DE AUTOR AUTOMÁTICO (26/10, karc0): «que cada cliente nuevo tenga el diseño del más alto nivel
 * sin que intercedamos a mano». Toda carta sin composición elegida (plantilla por defecto 'clasica' y las
 * antiguas visual/express/editorial) sale con la composición que corresponde a su tipo de local, deducida
 * de su nombre, descripción, secciones y platos. Central y el panel siguen pudiendo fijar cualquiera.
 */
const PISTAS: Record<Composicion, string[]> = {
  urbano: ['burger', 'hamburgues', 'smash', 'pizza', 'fries', 'patatas fritas', 'papas', 'kebab', 'street', 'hot dog', 'perrito', 'taco', 'wings', 'alitas', 'pollo frito', 'crispy', 'sandwich', 'bocata', 'food truck', 'dark kitchen', 'nachos', 'loaded', 'bowl', 'shake', 'batido', 'pulled'],
  taberna: ['tapa', 'taberna', 'meson', 'bar ', 'bar-', 'bodega', 'vino', 'racion', 'cervecer', 'asador', 'tasca', 'guiso', 'montadito', 'chiringuito', 'marisquer', 'jamon', 'croqueta', 'pescaito', 'puchero', 'olla', 'casa de comidas', 'venta ', 'cortijo', 'brasa', 'cuchara', 'migas'],
  gastro: ['sushi', 'poke', 'japon', 'nigiri', 'alta cocina', 'degustacion', 'chef', 'gastro', 'bistro', 'autor', 'fusion', 'temporada', 'maridaje', 'omakase', 'brunch', 'vegano', 'healthy', 'tartar', 'ceviche', 'steak', 'trattoria', 'risotto'],
};
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type CartaMin = { nombre: string; slug?: string; descripcion?: string | null; secciones?: { nombre: string; platos: { nombre: string }[] }[] };

export function composicionAuto(c: CartaMin): Composicion {
  // El nombre y la descripción pesan el triple que las secciones y los platos.
  const fuerte = ` ${sinTildes(`${c.nombre} ${c.descripcion ?? ''} ${c.slug ?? ''}`)} `;
  const resto = ` ${sinTildes((c.secciones ?? []).map((s) => `${s.nombre} ${s.platos.slice(0, 12).map((p) => p.nombre).join(' ')}`).join(' '))} `;
  const puntos = (k: Composicion) => PISTAS[k].reduce((n, w) => n + (fuerte.includes(w) ? 3 : 0) + (resto.includes(w) ? 1 : 0), 0);
  const orden: Composicion[] = ['urbano', 'taberna', 'gastro'];
  const [mejor] = orden.map((k) => [k, puntos(k)] as const).sort((a, b) => b[1] - a[1]);
  return mejor[1] > 0 ? mejor[0] : 'gastro';
}

/** La composición que se pinta: la elegida a mano si es de autor; si no, la automática. */
export function composicionDe(c: CartaMin & { plantilla?: string }): Composicion {
  return esComposicion(c.plantilla) ? c.plantilla : composicionAuto(c);
}

const LEMAS: Record<Composicion, string[]> = {
  gastro: ['Cocina de temporada', 'Menú de autor', 'Producto, técnica y paciencia'],
  taberna: ['Tapas, raciones y vino', 'Cocina de siempre', 'De la barra a la mesa'],
  urbano: ['Recién hecho', 'Hecho al momento', 'Sin filtros, con hambre'],
};
const DESTACADOS: Record<Composicion, string> = { gastro: 'Selección del chef', taberna: 'Hoy recomendamos', urbano: 'Los que más piden' };
const ADORNO_AUTO: NonNullable<Firma['adorno']>[] = ['rombo', 'estrella', 'ola', 'sello'];

/** Completa lo que falte de la firma para que dos locales con la misma composición no salgan iguales. */
export function firmaCompleta(c: CartaMin & { firma?: Firma | null }, comp: Composicion): Firma {
  const f = c.firma ?? {};
  const semilla = [...(c.slug || c.nombre)].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return {
    ...f,
    lema: f.lema || LEMAS[comp][semilla % LEMAS[comp].length],
    destacados: f.destacados || DESTACADOS[comp],
    adorno: f.adorno || ADORNO_AUTO[semilla % ADORNO_AUTO.length],
  };
}
