/**
 * Páginas por ciudad (tarea 8 + «7 páginas por ciudad», decisión de karc0 del 17/10/2026):
 * Granada capital, Baza, Almería, Murcia, Málaga, Sevilla y Córdoba (no comarcas).
 * Cada ciudad lleva texto propio (escena, orden de ventajas, preguntas) y su color y
 * motivo para que ninguna página sea una copia de otra. Sin cifras inventadas ni
 * promesas de visita: el montaje se hace a distancia desde una foto de la carta.
 * Nunca se presenta Baza (ni otra ciudad) como sede. Precios siempre desde pricing-config.
 */
import { QR_MENU, SERVICIOS_QR } from '@/lib/pricing-config';

const { basico: C, ampliado: L, sala: S } = QR_MENU.planes;
export type VentajaId = 'foto' | 'ia' | 'mesa' | 'resenas' | 'idiomas';

export interface Ciudad {
  slug: string;
  nombre: string;
  /** «de Granada», «de Málaga»… para titulares. */
  provincia: string;
  coords: string;
  /** Color propio de la ciudad (acento del hero, números y sello). */
  color: string;
  motivo: string;
  zonas: string[];
  titulo: string;
  descripcion: string;
  entradilla: string;
  escena: [string, string][];
  /** Ventajas en el orden que más pesa en esta ciudad, con su porqué local. */
  ventajas: [VentajaId, string][];
  banda: { foto: string; frase: string };
  preguntas: [string, string][];
}

export const VENTAJAS: Record<VentajaId, { t: string; d: string }> = {
  foto: { t: 'Te la montamos desde una foto', d: 'Nos mandas una foto de tu carta o el PDF y la pasamos a digital con tus platos, tus precios y tu estilo. No tecleas nada.' },
  ia: { t: 'Fotos de tus platos, perfeccionadas con IA', d: 'Partimos de tus fotos y las dejamos de carta, idénticas o muy cercanas a tu plato real y siempre como imagen orientativa.' },
  mesa: { t: 'Tu cliente pide desde la mesa', d: 'Desde el plan Local, el comensal pide desde su móvil; tu camarero lo confirma con un toque y entra en la cuenta de la mesa. Se paga en la barra, como siempre.' },
  resenas: { t: 'Reseñas de toda la mesa', d: 'Un botón en la carta invita a cada comensal, no solo al que paga, a dejar su reseña en Google. Más reseñas, mejor posición en Google Maps.' },
  idiomas: { t: 'Tu carta en otros idiomas', d: 'Local incluye español e inglés y Sala, tres idiomas. El turista entiende lo que pide sin preguntar plato por plato.' },
};

export const CIUDADES: Ciudad[] = [
  {
    slug: 'granada',
    nombre: 'Granada',
    provincia: 'de Granada',
    coords: '37.1773° N · 3.5986° O',
    color: '#8E1B2E',
    motivo: 'La tapa viene con la caña',
    zonas: ['Realejo', 'Albaicín', 'Calle Navas', 'Elvira', 'Plaza Nueva', 'Zaidín', 'Pedro Antonio'],
    titulo: 'Carta digital QR en Granada para bares y restaurantes',
    descripcion: `Carta QR para bares y restaurantes de Granada: montada desde una foto, pedido desde la mesa, reseñas de toda la mesa y carta en inglés. Primer mes por ${QR_MENU.primerMes} €.`,
    entradilla: 'En Granada la tapa llega con la bebida y la barra no para. Una carta que se lee en el móvil, que pide sola desde la mesa y que habla inglés para el que viene a ver la Alhambra.',
    escena: [
      ['Rondas cortas, barra llena', 'Con la tapa incluida en cada bebida, las mesas piden muchas veces y poco cada vez. Cada ronda que no espera al camarero es una ronda más.'],
      ['Estudiantes y turistas en la misma calle', 'Del público universitario de Pedro Antonio al visitante del Albaicín: la misma carta tiene que entenderse en dos idiomas y en dos segundos.'],
      ['La competencia está a dos puertas', 'En calle Navas o en Elvira el cliente elige mirando Google Maps. El local con más reseñas recientes se lleva la mesa.'],
    ],
    ventajas: [
      ['mesa', 'Con rondas de tapa tan seguidas, que la mesa pida sola libera al camarero en las horas fuertes.'],
      ['resenas', 'En las calles de tapeo, la posición en Google Maps decide a qué bar entra el grupo.'],
      ['idiomas', 'El visitante de la Alhambra pide mejor cuando lee la carta en inglés.'],
      ['foto', 'Tu carta de siempre, sin teclear: la foto basta.'],
    ],
    banda: { foto: '/images/carta-de-autor/mesa-movil.png', frase: 'En Granada la tapa es tuya. La carta también debería serlo.' },
    preguntas: [
      ['¿Sirve para un bar de tapas de Granada con la tapa incluida?', 'Sí. Puedes enseñar las tapas que salen con la bebida, las raciones y las medias aparte, y cambiarlas cada día desde el móvil sin reimprimir nada.'],
      ['¿Mis clientes extranjeros verán la carta en inglés?', 'Con el plan Local la carta va en español e inglés; con Sala, en tres idiomas. El cliente elige el idioma desde el móvil.'],
    ],
  },
  {
    slug: 'baza',
    nombre: 'Baza',
    provincia: 'de Baza',
    coords: '37.4903° N · 2.7726° O',
    color: '#9A4A2A',
    motivo: 'Cocina de temporada en el altiplano',
    zonas: ['Plaza Mayor', 'Centro histórico', 'Barrio de Santiago', 'Avenida Cascamorras', 'Altiplano'],
    titulo: 'Carta digital QR en Baza para bares y restaurantes',
    descripcion: `Carta QR para bares y restaurantes de Baza: la montamos desde una foto de tu carta, la cambias desde el móvil y sumas reseñas en Google. Primer mes por ${QR_MENU.primerMes} €.`,
    entradilla: 'En Baza la carta cambia con el frío y con las fiestas: cuchara en invierno, terraza en verano y la casa llena en septiembre. Una carta que se cambia desde el móvil y que sale en Google.',
    escena: [
      ['La carta sigue a la temporada', 'Platos de cuchara cuando aprieta el frío del altiplano y carta de terraza en verano. Reimprimir cada cambio cuesta dinero y tiempo.'],
      ['Fiestas que llenan el local', 'En las fiestas de septiembre llega gente de toda la comarca. Ese día no hay tiempo para explicar la carta mesa por mesa.'],
      ['Sin tiempo para el ordenador', 'En un bar familiar nadie quiere pasarse la tarde tecleando platos. Por eso la montamos nosotros desde una foto.'],
    ],
    ventajas: [
      ['foto', 'Mandas la foto de la carta que ya tienes y te la devolvemos digital, con tus platos y tus precios.'],
      ['resenas', 'Quien busca dónde comer en Baza mira Google Maps: las reseñas de toda la mesa te suben en el mapa.'],
      ['mesa', 'En los días de fiesta, que la mesa pida desde el móvil quita colas a la barra.'],
      ['ia', 'Fotos de plato dignas de carta sin contratar a un fotógrafo.'],
    ],
    banda: { foto: '/images/demo/ia/bar-sebas-71f94dd5.webp', frase: 'La cocina de siempre, con una carta que cambia contigo.' },
    preguntas: [
      ['¿Tengo que saber de informática para tener la carta QR en Baza?', 'No. Nos mandas una foto de tu carta y te la dejamos montada. Después, cambiar un precio es tocar el plato en el móvil y escribir el nuevo.'],
      ['¿Puedo cambiar la carta para las fiestas o por temporada?', 'Sí, cuando quieras y las veces que quieras. El QR de las mesas es siempre el mismo: lo que cambia es lo que enseña.'],
    ],
  },
  {
    slug: 'almeria',
    nombre: 'Almería',
    provincia: 'de Almería',
    coords: '36.8340° N · 2.4637° O',
    color: '#A67812',
    motivo: 'Terraza todo el año',
    zonas: ['Centro', 'Paseo de Almería', 'Zapillo', 'Plaza Vieja', 'Cabo de Gata', 'Roquetas'],
    titulo: 'Carta digital QR en Almería para bares y restaurantes',
    descripcion: `Carta QR para bares y restaurantes de Almería: terrazas que piden desde la mesa, carta en inglés para el verano y reseñas de toda la mesa. Primer mes por ${QR_MENU.primerMes} €.`,
    entradilla: 'Almería vive en la terraza casi todo el año y la tapa también viene con la bebida. Una carta que aguanta el sol, que pide sola desde la mesa y que en verano habla inglés.',
    escena: [
      ['La terraza es media casa', 'Con buen tiempo casi todo el año, la terraza pesa tanto como el salón. Cada viaje del camarero a la mesa del fondo cuenta.'],
      ['El verano cambia el local', 'De la costa al centro, en verano llega otro público y otra carta: pescado, frescos y horario largo.'],
      ['Tapa con la bebida, aquí también', 'Como en Granada, la tapa acompaña a la caña: rondas seguidas que conviene servir sin esperas.'],
    ],
    ventajas: [
      ['mesa', 'En una terraza grande, que la mesa pida desde el móvil ahorra viajes y acelera las rondas.'],
      ['idiomas', 'En temporada, el visitante extranjero lee la carta en inglés sin preguntar.'],
      ['resenas', 'Quien llega de vacaciones elige por las reseñas de Google: que las deje toda la mesa.'],
      ['foto', 'Carta de verano y de invierno sin teclear: mandas la foto y la montamos.'],
    ],
    banda: { foto: '/images/experience/experience-brunch-de-domingo-16x9.webp', frase: 'Terraza llena, camarero libre. Así se trabaja en Almería.' },
    preguntas: [
      ['¿Puedo tener una carta de verano y otra de invierno?', 'Sí. Activas o escondes platos y secciones desde el móvil cuando cambia la temporada, sin tocar el QR de las mesas.'],
      ['¿Funciona en la terraza con el sol de Almería?', 'La carta se lee en el móvil del cliente, con buen contraste y letra grande, y carga rápido aunque la cobertura sea floja.'],
    ],
  },
  {
    slug: 'murcia',
    nombre: 'Murcia',
    provincia: 'de Murcia',
    coords: '37.9922° N · 1.1307° O',
    color: '#4E7A38',
    motivo: 'Producto de la huerta',
    zonas: ['Plaza de las Flores', 'Santo Domingo', 'Catedral', 'Alfonso X', 'El Carmen', 'La Huerta'],
    titulo: 'Carta digital QR en Murcia para bares y restaurantes',
    descripcion: `Carta QR para bares y restaurantes de Murcia: pedido desde la mesa en terrazas grandes, fotos de plato con IA y reseñas de toda la mesa. Primer mes por ${QR_MENU.primerMes} €.`,
    entradilla: 'En Murcia se tapea de pie y en plazas enormes: marineras, zarangollo, pastel de carne. Una carta que pide sola desde la mesa y enseña el producto de la huerta como se merece.',
    escena: [
      ['Plazas con decenas de mesas', 'En la plaza de las Flores o en Santo Domingo las terrazas son enormes. El cuello de botella es el camarero, no la cocina.'],
      ['La carta sigue a la huerta', 'Producto de temporada que entra y sale de la carta. Con papel, cada cambio es una reimpresión.'],
      ['Tapas que entran por los ojos', 'Una marinera bien fotografiada vende sola. Sin foto, el cliente pide lo de siempre.'],
    ],
    ventajas: [
      ['mesa', 'En terrazas de muchas mesas, que el comensal pida desde el móvil quita esperas en las horas punta.'],
      ['ia', 'Tus tapas con fotos de carta: el producto de la huerta entra por los ojos.'],
      ['resenas', 'Con tantos bares en cada plaza, las reseñas de toda la mesa te suben en Google Maps.'],
      ['foto', 'La carta que ya tienes, digital desde una foto.'],
    ],
    banda: { foto: '/images/demo/ia/cuevas-al-jatib-69a96634.webp', frase: 'De la huerta a la mesa, y de la mesa a la cocina sin esperar.' },
    preguntas: [
      ['¿Sirve para una terraza grande en una plaza de Murcia?', 'Sí. Con el plan Sala tienes el plano de mesas, los camareros y la llamada desde la mesa; desde Local, el pedido desde la mesa que confirma tu camarero.'],
      ['¿Puedo poner fotos de mis tapas si no tengo fotógrafo?', `Sí. Partimos de tus fotos del móvil y las dejamos de carta con IA, siempre como imagen orientativa. Tienes ${SERVICIOS_QR.imagenesGratisIa} gratis.`],
    ],
  },
  {
    slug: 'malaga',
    nombre: 'Málaga',
    provincia: 'de Málaga',
    coords: '36.7213° N · 4.4214° O',
    color: '#1F5E8A',
    motivo: 'Mesa con vistas al mundo',
    zonas: ['Centro histórico', 'Soho', 'Pedregalejo', 'El Palo', 'La Malagueta', 'Teatinos'],
    titulo: 'Carta digital QR en Málaga para bares y restaurantes',
    descripcion: `Carta QR para bares y restaurantes de Málaga: carta en varios idiomas, reseñas de toda la mesa y fotos de plato con IA. Primer mes por ${QR_MENU.primerMes} €, sin permanencia.`,
    entradilla: 'En Málaga la mesa de al lado habla inglés, alemán o francés. Una carta que el visitante entiende en su idioma, con fotos que abren el apetito y un botón para que toda la mesa deje su reseña.',
    escena: [
      ['El visitante elige por el móvil', 'Del centro histórico a los espetos de Pedregalejo, el turista decide con Google Maps en la mano. Las reseñas son tu escaparate.'],
      ['Mesas de muchos idiomas', 'Explicar cada plato en otro idioma retrasa la mesa. Con la carta traducida, piden antes y mejor.'],
      ['Mucha oferta, poca atención', 'En una calle con veinte restaurantes, la foto del plato es lo que para al cliente.'],
    ],
    ventajas: [
      ['idiomas', 'Con Sala la carta va en tres idiomas: el visitante pide sin barreras.'],
      ['resenas', 'Cada mesa de turistas es un puñado de reseñas posibles: que las deje toda la mesa, no solo el que paga.'],
      ['ia', 'Fotos de plato de carta que se entienden en cualquier idioma.'],
      ['mesa', 'El comensal pide desde su móvil y tu camarero lo confirma con un toque.'],
    ],
    banda: { foto: '/images/demo/ia/bar-sebas-92a6af88.webp', frase: 'Tu cocina se entiende en cualquier idioma. Tu carta también.' },
    preguntas: [
      ['¿En cuántos idiomas puedo tener la carta en Málaga?', `${C.nombre} incluye español, ${L.nombre} suma inglés y ${S.nombre} llega a tres idiomas. Cada idioma más es un pago único de ${SERVICIOS_QR.idiomaExtra} € + IVA.`],
      ['¿Cómo consigo más reseñas en Google de los turistas?', 'La carta lleva un botón dedicado que invita a cada comensal a dejar su reseña, en los planes Local y Sala. Más reseñas recientes, mejor posición en Google Maps.'],
    ],
  },
  {
    slug: 'sevilla',
    nombre: 'Sevilla',
    provincia: 'de Sevilla',
    coords: '37.3891° N · 5.9845° O',
    color: '#B4651E',
    motivo: 'Tapeo de barra y de calle',
    zonas: ['Triana', 'Santa Cruz', 'Alameda', 'Arenal', 'Nervión', 'Los Remedios'],
    titulo: 'Carta digital QR en Sevilla para bares y restaurantes',
    descripcion: `Carta QR para bares y restaurantes de Sevilla: cambia la carta en Semana Santa y Feria desde el móvil, pedido desde la mesa y reseñas de toda la mesa. Primer mes por ${QR_MENU.primerMes} €.`,
    entradilla: 'En Sevilla se tapea en la barra y en la calle, y dos semanas al año la ciudad se vuelve otra. Una carta que cambias desde el móvil en Semana Santa y en Feria, y que pide sola desde la mesa.',
    escena: [
      ['Dos picos que lo cambian todo', 'En Semana Santa y en la Feria de Abril cambian los horarios, el público y lo que se pide. La carta tiene que cambiar igual de rápido.'],
      ['Tapeo de barra y de veladores', 'De Triana a la Alameda, la mitad del servicio está en la calle. El camarero no puede estar en todas las mesas.'],
      ['Visitantes todo el año', 'Santa Cruz y el Arenal reciben turistas cada día: carta en inglés y reseñas que se acumulan.'],
    ],
    ventajas: [
      ['mesa', 'En los veladores, que la mesa pida desde el móvil acorta la espera en las horas fuertes.'],
      ['foto', 'Tu carta de tapas, digital desde una foto, y lista para cambiar en cada fiesta.'],
      ['resenas', 'En los barrios de tapeo, quien tiene más reseñas recientes se lleva al grupo.'],
      ['idiomas', 'Para el visitante de Santa Cruz, la carta en inglés desde el plan Local.'],
    ],
    banda: { foto: '/images/experience/experience-afterwork-con-musica-16x9.webp', frase: 'Semana Santa, Feria y cada día del año: una carta que cambia a tu ritmo.' },
    preguntas: [
      ['¿Puedo cambiar la carta en Semana Santa o en Feria?', 'Sí. Escondes y activas platos, cambias precios y horarios desde el móvil en segundos. El QR de las mesas no cambia.'],
      ['¿Vale para un bar de tapas con barra y veladores?', 'Sí. La carta funciona igual en la barra y en la calle; desde Local, la mesa puede pedir y tu camarero lo confirma.'],
    ],
  },
  {
    slug: 'cordoba',
    nombre: 'Córdoba',
    provincia: 'de Córdoba',
    coords: '37.8882° N · 4.7794° O',
    color: '#2D6A5C',
    motivo: 'Patios, mezquita y salmorejo',
    zonas: ['Judería', 'Mezquita', 'San Basilio', 'Ribera', 'Ciudad Jardín', 'Centro'],
    titulo: 'Carta digital QR en Córdoba para bares y restaurantes',
    descripcion: `Carta QR para bares y restaurantes de Córdoba: carta en inglés para el visitante de la Mezquita, fotos de plato con IA y reseñas de toda la mesa. Primer mes por ${QR_MENU.primerMes} €.`,
    entradilla: 'En Córdoba el visitante viene a la Mezquita y se queda por el salmorejo y el flamenquín. Una carta que se entiende en su idioma, con fotos que hacen justicia al plato y reseñas de toda la mesa.',
    escena: [
      ['Mayo llena la ciudad', 'Con los Patios y las Cruces de mayo, la Judería y San Basilio reciben más visitantes que nunca. Es cuando más pesa servir rápido.'],
      ['Platos con nombre propio', 'Salmorejo, flamenquín, rabo de toro: el visitante quiere saber qué es antes de pedirlo. Una foto y una línea en su idioma lo resuelven.'],
      ['Veranos de horario largo', 'Con el calor, el servicio se desplaza a la noche. Horarios y carta de verano que cambias desde el móvil.'],
    ],
    ventajas: [
      ['idiomas', 'El visitante de la Mezquita entiende el salmorejo y el flamenquín en su idioma.'],
      ['ia', 'Fotos de plato de carta: lo que no se conoce, se pide por los ojos.'],
      ['resenas', 'En la Judería, las reseñas de Google deciden dónde se sienta el visitante.'],
      ['foto', 'Tu carta de siempre, digital desde una foto, sin teclear.'],
    ],
    banda: { foto: '/images/demo/ia/cuevas-al-jatib-f6e860bb.webp', frase: 'El salmorejo no necesita traducción. Tu carta, sí.' },
    preguntas: [
      ['¿Cómo explico los platos cordobeses al visitante extranjero?', 'Con la carta en inglés (desde Local) y una foto por plato: el cliente ve qué es el flamenquín antes de pedirlo, sin preguntar al camarero.'],
      ['¿Puedo poner un horario de verano distinto?', 'Sí. Horario, platos y secciones se cambian desde el móvil cuando quieras; el QR de las mesas es siempre el mismo.'],
    ],
  },
];

/** Preguntas comunes a todas las ciudades (se añaden tras las propias). */
export const PREGUNTAS_COMUNES: [string, string][] = [
  ['¿Cuánto cuesta la carta digital QR?', `${C.nombre}, ${C.mensual} € al mes; ${L.nombre}, ${L.mensual} € (pedido desde la mesa, reseñas de toda la mesa, reservas y dos idiomas); ${S.nombre}, ${S.mensual} € (plano de mesas, camareros y tres idiomas). El primer mes de ${L.nombre} cuesta ${QR_MENU.primerMes} €. Precios sin IVA.`],
  ['¿Hay permanencia?', 'No. Pagas mes a mes y cancelas cuando quieras desde tu panel, sin llamar a nadie.'],
  ['¿Hace falta que vengáis al local?', 'No. Nos mandas una foto de tu carta y te la dejamos montada a distancia; tú solo pones el QR en las mesas.'],
];

export const ciudad = (slug: string) => CIUDADES.find((c) => c.slug === slug);
