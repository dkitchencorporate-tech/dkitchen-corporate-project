/**
 * Artículos del blog (SEO de contenido, 29/09/2026). Texto propio, sin cifras
 * inventadas: los datos legales citan la norma y los costes se dan como
 * rangos orientativos, indicados como tales.
 */
export interface Articulo {
  slug: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  lectura: string;
  secciones: { h: string; p: string[] }[];
}

export const ARTICULOS: Articulo[] = [
  {
    slug: 'carta-digital-qr-restaurante',
    titulo: 'Carta digital QR para restaurantes: qué es, qué debe tener y cuánto cuesta',
    descripcion: 'Guía práctica para bares y restaurantes: cómo funciona una carta digital con QR, qué debe incluir para cumplir la ley y cómo elegir una sin atarte a permanencias.',
    fecha: '2026-09-29',
    lectura: '6 min',
    secciones: [
      { h: 'Qué es una carta digital QR', p: [
        'Es tu carta publicada en una dirección web a la que tus clientes llegan escaneando un código QR con la cámara del móvil. No hay que instalar nada: se abre en el navegador.',
        'La diferencia importante está en el QR. Si apunta a un PDF, cada vez que cambias un precio tienes que generar otro PDF y, a menudo, otro QR. Si apunta a una carta viva, cambias el precio desde el móvil y el mismo QR de las mesas enseña la versión nueva al momento.',
      ] },
      { h: 'Qué debe tener una buena carta digital', p: [
        'Alérgenos visibles por plato. En España es obligatorio informar de los 14 alérgenos de declaración obligatoria, también en la carta digital (lo explicamos en detalle en nuestro artículo sobre alérgenos).',
        'Que cargue rápido con mala cobertura. Una terraza con poca señal no puede esperar diez segundos a que aparezca una imagen enorme.',
        'Que se lea bien: letra grande, buen contraste y precios fáciles de encontrar. Una carta bonita que no se lee vende menos.',
        'Que la cambies tú, sin depender de un diseñador cada vez que sube el aceite.',
        'Idiomas si recibes turistas, y datos del local (horario, dirección, reseñas) al final de la carta.',
      ] },
      { h: 'Carta para mirar o carta para pedir', p: [
        'Hay dos tipos de producto que a menudo se confunden. Una carta digital para mirar sustituye a la carta de papel: el cliente la consulta y pide al camarero, y tu TPV sigue cobrando como siempre.',
        'Un sistema de pedidos permite que el cliente pida y pague desde el móvil, y conecta con cocina. Es un paso más grande, con su propio coste, y no todos los locales lo necesitan desde el primer día.',
        'Nuestro consejo: empieza por la carta digital, mide cuántos clientes la usan y da el salto a un sistema propio de pedidos cuando tu volumen lo justifique.',
      ] },
      { h: 'Cuánto cuesta', p: [
        'Los precios del mercado van desde herramientas gratuitas con publicidad hasta suscripciones mensuales. Lo importante no es solo el precio: fíjate en si hay permanencia, si el QR sigue siendo tuyo si te vas y si puedes cancelar sin llamar a nadie.',
        'En DKitchen la carta QR cuesta 9 € al mes (25 € con reservas, llamada al camarero y banners), el primer mes es de 1 € y no hay permanencia.',
      ] },
    ],
  },
  {
    slug: 'alergenos-carta-restaurante-obligatorio',
    titulo: 'Alérgenos en la carta del restaurante: qué obliga la ley en España',
    descripcion: 'Los 14 alérgenos de declaración obligatoria, qué dice el Reglamento (UE) 1169/2011 y el Real Decreto 126/2015, y cómo mostrarlos en una carta digital.',
    fecha: '2026-09-29',
    lectura: '5 min',
    secciones: [
      { h: 'Qué dice la norma', p: [
        'El Reglamento (UE) 1169/2011, sobre la información alimentaria facilitada al consumidor, obliga a informar de las sustancias que causan alergias o intolerancias. En España, el Real Decreto 126/2015 aplica esta obligación también a los alimentos que se sirven sin envasar, como los de bares y restaurantes.',
        'En la práctica: el cliente tiene que poder conocer qué alérgenos contiene cada plato antes de pedirlo. La información debe estar disponible por escrito o en un soporte al que el cliente pueda acceder fácilmente.',
      ] },
      { h: 'Los 14 alérgenos de declaración obligatoria', p: [
        'Cereales con gluten, crustáceos, huevos, pescado, cacahuetes, soja, leche (incluida la lactosa), frutos de cáscara, apio, mostaza, granos de sésamo, dióxido de azufre y sulfitos, altramuces y moluscos.',
        'La lista es cerrada: no se añaden ni se quitan alérgenos por decisión del local.',
      ] },
      { h: 'Cómo mostrarlos bien', p: [
        'Por plato, no en un cartel genérico. El cliente con alergia necesita saber qué puede pedir, no que «puede haber de todo».',
        'Con nombres claros. Los códigos o iconos ayudan, pero conviene que el nombre del alérgeno aparezca escrito.',
        'Con un aviso de trazas. Aunque un plato no lleve un ingrediente, en una cocina compartida puede haber contaminación cruzada: indícalo y ofrece consultar al personal.',
      ] },
      { h: 'La ventaja de la carta digital', p: [
        'En papel, cada cambio de receta obliga a revisar y reimprimir. En una carta digital marcas los alérgenos de cada plato al crearlo y se actualizan en todas las mesas al momento.',
        'La carta QR de DKitchen incluye los 14 alérgenos por plato, un resumen de los que hay en la carta y el aviso legal, en todos los estilos de carta.',
        'Este artículo es informativo y no sustituye el asesoramiento de tu gestoría o de las autoridades sanitarias de tu comunidad.',
      ] },
    ],
  },
  {
    slug: 'app-propia-restaurante-vs-plataformas-delivery',
    titulo: 'App propia o plataformas de delivery: qué le conviene a tu restaurante',
    descripcion: 'Comisiones, datos de clientes y dependencia: cuándo tiene sentido que un restaurante tenga su propia app de pedidos y cómo dar el paso sin riesgo.',
    fecha: '2026-09-29',
    lectura: '6 min',
    secciones: [
      { h: 'El coste que no se ve en la factura', p: [
        'Las grandes plataformas de pedidos a domicilio cobran una comisión por cada pedido que, según el tipo de acuerdo, suele moverse en porcentajes de dos cifras sobre el ticket. En un negocio con márgenes ajustados, esa comisión puede ser la diferencia entre ganar dinero y trabajar para la plataforma.',
        'Revisa tu contrato: cuánto pagas por pedido, si hay cuotas fijas y qué coste tiene la visibilidad dentro de la aplicación.',
      ] },
      { h: 'De quién es el cliente', p: [
        'Cuando un cliente te pide por una plataforma, sus datos se quedan en la plataforma. No puedes avisarle de una promoción, invitarle a volver ni saber cuántas veces te ha pedido.',
        'Con una app propia, el cliente es tuyo: puedes premiar su fidelidad con puntos, avisarle de novedades y conocer sus hábitos.',
      ] },
      { h: 'Cuándo tiene sentido una app propia', p: [
        'Cuando ya tienes clientes que repiten. La app propia no sustituye la visibilidad de una plataforma el primer día; convierte a los clientes que ya tienes en pedidos sin comisión.',
        'Cuando quieres controlar la experiencia: tu carta, tus fotos, tus tiempos y tus promociones.',
        'Lo más habitual es combinar ambas: la plataforma para captar clientes nuevos y la app propia para que los que repiten pidan sin comisión.',
      ] },
      { h: 'Cómo dar el paso sin riesgo', p: [
        'Empieza por la carta digital QR: te permite medir cuántos clientes la usan y tener la carta preparada.',
        'Cuando el volumen lo justifique, DKitchen Signature es tu propia app con tu marca: tus clientes piden y pagan, la cocina recibe las comandas y el sistema es tuyo, con una entrada única y un mantenimiento mensual.',
      ] },
    ],
  },
];

export const articulo = (slug: string) => ARTICULOS.find((a) => a.slug === slug);
