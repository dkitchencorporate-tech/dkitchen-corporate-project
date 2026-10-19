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
