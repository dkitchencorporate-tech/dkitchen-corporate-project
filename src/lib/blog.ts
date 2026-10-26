/**
 * Artículos del blog (SEO de contenido, 29/09/2026). Texto propio, sin cifras
 * inventadas: los datos legales citan la norma y los costes se dan como
 * rangos orientativos, indicados como tales. Precios siempre desde pricing-config.
 * 27/10/2026: 2 artículos nuevos con las palabras clave #215 y las ventajas de la tarea 8
 * (reseñas de toda la mesa, pedido desde la mesa); el más reciente va primero.
 */
import { QR_MENU } from '@/lib/pricing-config';

const { basico: C, ampliado: L, sala: S } = QR_MENU.planes;
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
    slug: 'mas-resenas-google-bar-restaurante',
    titulo: 'Cómo conseguir más reseñas en Google para tu bar o restaurante',
    descripcion: 'Por qué las reseñas te suben en Google Maps, cuándo pedirlas, por qué pedírselas a toda la mesa y qué prohíbe Google. Guía práctica para hostelería.',
    fecha: '2026-10-27',
    lectura: '6 min',
    secciones: [
      { h: 'Por qué las reseñas mueven mesas', p: [
        'Cuando alguien busca «bares cerca» o «restaurante en el centro», Google Maps ordena los resultados por relevancia, distancia y prominencia. Google explica que el número de reseñas y su valoración cuentan para la prominencia: a igualdad de distancia, el local con más reseñas recientes y buenas sale antes.',
        'Además, el cliente las lee. Una ficha con cuatro reseñas de hace dos años transmite poca vida; una con reseñas de esta semana dice que el local está abierto, lleno y cuidado.',
      ] },
      { h: 'El problema: solo opina quien paga, y casi nunca', p: [
        'En una mesa de seis, la cuenta la paga una persona y es la única con la que el camarero habla al final. Las otras cinco se van sin que nadie les pida nada, aunque hayan comido igual de bien.',
        'Y quien paga tampoco suele dejarla: al salir ya está pensando en otra cosa. La reseña se pierde en los cinco minutos que separan la mesa de la calle.',
      ] },
      { h: 'Cuándo y cómo pedirla', p: [
        'En el momento bueno: con el postre o el café, cuando la mesa está contenta y todavía sentada. No por correo días después.',
        'Con el enlace directo a escribir la reseña, no con «búscanos en Google». Cada paso de más es una reseña menos.',
        'A todos los comensales, no solo al que paga. Si cada persona de la mesa tiene el enlace en su móvil, una mesa de seis puede dejar seis reseñas en vez de ninguna.',
      ] },
      { h: 'Lo que Google no permite', p: [
        'Comprar reseñas o escribirlas tú (o tu familia). Google las retira y puede penalizar la ficha.',
        'Dar algo a cambio de la reseña, como un descuento o una bebida gratis. Las políticas de Google prohíben ofrecer incentivos por reseñas.',
        'Pedirla solo a los clientes contentos y desviar a los descontentos a otro sitio. Hay que pedirla a todos por igual; las críticas se responden con educación y suelen pesar menos de lo que parece.',
      ] },
      { h: 'Responde a todas', p: [
        'Agradece las buenas por el nombre del plato que mencionan y responde a las malas con calma, explicando qué has cambiado. Quien lee las reseñas mira también cómo contestas.',
      ] },
      { h: 'Cómo lo resuelve la carta QR', p: [
        `La carta digital está en el móvil de cada comensal, así que es el sitio natural para pedir la reseña. En los planes ${L.nombre} y ${S.nombre} de DKitchen, la carta lleva un botón dedicado que lleva a cada persona de la mesa directamente a escribir su reseña en Google, sin incentivos y sin filtros.`,
        `Si tu local está en Granada, Málaga, Sevilla, Córdoba, Murcia, Almería o Baza, tienes las ventajas explicadas para tu ciudad en nuestras páginas de carta digital por ciudad.`,
      ] },
    ],
  },
  {
    slug: 'pedido-desde-la-mesa-qr-bar',
    titulo: 'Pedido desde la mesa con QR: cómo funciona en un bar y cuándo compensa',
    descripcion: 'El comensal pide desde la carta QR, el camarero confirma y se paga en la barra. Qué cambia en un bar o restaurante, qué pasa con el TPV y cuándo merece la pena.',
    fecha: '2026-10-27',
    lectura: '5 min',
    secciones: [
      { h: 'Qué es el pedido desde la mesa', p: [
        'El cliente escanea el QR de su mesa, abre la carta digital en su móvil, elige los platos y envía el pedido. No instala ninguna app: todo pasa en el navegador.',
        'No es lo mismo que una app de delivery ni que un quiosco de autopedido. Es tu misma carta QR con un botón más: «pedir».',
      ] },
      { h: 'Por qué el camarero confirma cada pedido', p: [
        'Un pedido que entra directo a cocina sin que nadie lo vea es un riesgo: una broma, una mesa equivocada o un plato que se acabó hace diez minutos.',
        'Por eso el pedido llega primero al camarero, que lo ve con su mesa y lo confirma o rechaza con un toque. Al confirmarlo entra en la cuenta de la mesa como una ronda más.',
      ] },
      { h: 'Qué pasa con el cobro y con el TPV', p: [
        'Nada cambia: se paga en la barra o en la mesa, como siempre, con tu datáfono y tu TPV. El pedido desde la mesa no te obliga a cobrar por el móvil ni a cambiar de caja.',
        'Lo que sí cambia es que el camarero ya no tiene que ir a tomar nota a cada mesa: va a llevar, no a preguntar.',
      ] },
      { h: 'Cuándo compensa', p: [
        'Terrazas grandes y mesas lejos de la barra, donde cada viaje cuesta.',
        'Bares de tapas con rondas cortas y seguidas: cada ronda que no espera al camarero es una ronda más.',
        'Horas punta con poco personal, cuando el cuello de botella es tomar nota y no la cocina.',
      ] },
      { h: 'Cuándo no hace falta', p: [
        'En un local pequeño, con pocas mesas y un camarero que llega a todas, basta con una buena carta digital para mirar. Puedes empezar por ahí y sumar el pedido desde la mesa cuando lo necesites, sin cambiar el QR.',
      ] },
      { h: 'Cómo empezar', p: [
        `En DKitchen el pedido desde la mesa va incluido desde el plan ${L.nombre} (${L.mensual} € al mes, primer mes por ${QR_MENU.primerMes} €) y en ${S.nombre} (${S.mensual} €), junto con la llamada al camarero y la cuenta por mesa. Te montamos la carta desde una foto y el QR de cada mesa puede llevar su número. Precios sin IVA y sin permanencia.`,
      ] },
    ],
  },
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
        `En DKitchen la carta QR va de ${C.mensual} € al mes (${C.nombre}) a ${L.mensual} € (${L.nombre}, con pedido desde la mesa y reseñas de toda la mesa) y ${S.mensual} € (${S.nombre}); el primer mes de ${L.nombre} cuesta ${QR_MENU.primerMes} € y no hay permanencia. Precios sin IVA.`,
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
