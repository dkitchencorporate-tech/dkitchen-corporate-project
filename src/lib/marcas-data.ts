/**
 * Las seis marcas virtuales propias de DKitchen — ya operaron 2020-2022 en una
 * dark kitchen real en Madrid. Esto es inventario probado y entregable, no
 * conceptos para desarrollar si el cliente paga por ello (ver
 * DKITCHEN_MIGRACION_COMPLETA.md, Sección 7). Los precios y platos son reales,
 * tomados de los dossiers de marca — no placeholders.
 */

export interface ItemMenu {
  nombre: string;
  precio: string;
}

export interface Marca {
  slug: string;
  nombre: string;
  concepto: string;
  emoji: string;
  descripcion: string;
  menu: ItemMenu[];
  formatoEvento: string;
}

export const MARCAS: Marca[] = [
  {
    slug: 'santa-brazza',
    nombre: 'Santa Brazza',
    concepto: 'Grill / asado',
    emoji: '🔥',
    descripcion: 'Cocina de brasa y parrilla, porciones generosas pensadas para compartir.',
    menu: [
      { nombre: 'Entrecort', precio: '19,90€' },
      { nombre: 'Churrasco', precio: '16,99€' },
      { nombre: 'Asado de tira', precio: '16,99€' },
      { nombre: 'Parrilla Mixta', precio: '49,99€' },
      { nombre: 'Costillas BBQ', precio: '16,99€' },
      { nombre: 'Brochetas', precio: '14,80€' },
      { nombre: 'Asado de pollo', precio: '13,50€' },
    ],
    formatoEvento: 'Noche de Asado / Parrillada en vivo',
  },
  {
    slug: 'my-latin-bowl',
    nombre: 'My Latin Bowl',
    concepto: 'Rice bowl',
    emoji: '🥗',
    descripcion: 'Bases, toppings, proteína y salsas al estilo bowl latino — configurable y fotogénico.',
    menu: [
      { nombre: 'Bowl Salmón', precio: '9,99€' },
      { nombre: 'Bowl Atún', precio: '9,99€' },
      { nombre: 'Bowl Pabellón Criollo Vegano', precio: '9,99€' },
      { nombre: 'Bowl Camarones', precio: '9,99€' },
      { nombre: 'Bowl Pollo Teriyaki / Ajillo', precio: '9,99€' },
      { nombre: 'Salsas extra', precio: '0,75€' },
    ],
    formatoEvento: 'Bowl Night',
  },
  {
    slug: 'seven-food-fries',
    nombre: 'Seven Food Fries',
    concepto: 'Loaded fries',
    emoji: '🍟',
    descripcion: 'Patatas cargadas con salsas y proteínas de autor — el formato con PWA de pedido ya construida y replicable.',
    menu: [
      { nombre: 'Chiken-3K', precio: '7,77€' },
      { nombre: 'Pulled Pork', precio: '7,77€' },
      { nombre: 'Pulled Beef', precio: '7,77€' },
      { nombre: 'Texa-Mex', precio: '7,77€' },
      { nombre: 'Ragú Chipotle', precio: '7,77€' },
      { nombre: 'Rebellious Sea', precio: '7,77€' },
    ],
    formatoEvento: 'Fry Fest / Noche de fritos',
  },
  {
    slug: 'natureza-brunch',
    nombre: 'Natureza Brunch',
    concepto: 'Brunch saludable',
    emoji: '🥐',
    descripcion: 'Paninos, bagels y bircher muesli — el formato pensado para activar el domingo, el día flojo habitual.',
    menu: [
      { nombre: 'Panino Veggie con Huevo', precio: '6-8€' },
      { nombre: 'Bagels de Salmón', precio: '6-8€' },
      { nombre: 'Bagels de Bacon', precio: '6-8€' },
      { nombre: 'Panino de Jamón Serrano', precio: '6-8€' },
      { nombre: 'Panino Italiano', precio: '6-8€' },
      { nombre: 'Bircher Muesli Suizo / Tropical', precio: '6-8€' },
      { nombre: 'Postres', precio: '1,50-3€' },
    ],
    formatoEvento: 'Brunch Pop-Up de domingo',
  },
  {
    slug: 'bokadipan',
    nombre: 'Bokadipan',
    concepto: 'Bocadillos gourmet',
    emoji: '🥖',
    descripcion: 'Bocadillos de autor, formato casual, buen encaje con sobremesa y tapeo nocturno.',
    menu: [
      { nombre: 'Bokadi Serrano', precio: '8,90€' },
      { nombre: 'Boka-Mar', precio: '10,50€' },
      { nombre: 'Boka-Atún', precio: '10,50€' },
      { nombre: 'Bokadi Bacon', precio: '9,80€' },
      { nombre: 'Bokadi Lomo', precio: '9,99€' },
      { nombre: 'Bokadi Pollo', precio: '10,50€' },
      { nombre: 'Bokadi Burger', precio: '10,50€' },
    ],
    formatoEvento: 'Noche de Bocadillos Gourmet',
  },
  {
    slug: 'wing-boss',
    nombre: 'Wing Boss',
    concepto: 'Alitas',
    emoji: '🍗',
    descripcion: 'Alitas por packs, con inversión mínima documentada (~400€, food cost <26%) y modelo de negocio ya probado.',
    menu: [
      { nombre: 'Rookie Pack (7 alitas)', precio: '12,90€' },
      { nombre: 'Pro Pack (15 alitas)', precio: '22,90€' },
      { nombre: 'Boss Family Pack (24 alitas)', precio: '36,90€' },
      { nombre: 'Epic Event Box (40 alitas)', precio: '54,90€' },
      { nombre: 'A la carta', precio: '8,90-10,99€/ud' },
    ],
    formatoEvento: 'Wings Battle / Reto de alitas',
  },
];
