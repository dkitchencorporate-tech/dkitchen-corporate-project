/**
 * Los 7 formatos de DKitchen Experience (aprobados por karc0 el 05/10/2026,
 * landings aprobadas el 06/10). Genéricos: sirven para cualquier cocina y no
 * van ligados a ninguna marca. Una sola fuente para /experience, las landings
 * /experience/[formato], el configurador y el sitemap.
 *
 * `imagen`: null hasta que Antigravity entregue las fotos sin marcas. Para
 * activarlas basta con subir `public/images/experience/experience-<slug>-4x5.webp`
 * y `-16x9.webp` y poner aquí `imagen: { alt: '…' }`; mientras tanto la
 * landing usa la tarjeta Gran Reserva (revisión de diseño del 06/10).
 */

/** Días mínimos entre el pago y la fecha del evento (configurador, reglas y briefing). */
export const ANTELACION_DIAS = 21;

/** Ruta pública de la foto de un formato en cada proporción. */
export const rutaImagen = (slug: string, proporcion: '4x5' | '16x9') => `/images/experience/experience-${slug}-${proporcion}.webp`;
export type FormatoExperience = {
  slug: string;
  /** Código corto que viaja al pago (máx. ~12 caracteres, solo letras). */
  codigo: string;
  nombre: string;
  etiqueta: string;
  frase: string;
  titular: string;
  resumen: string;
  paraQuien: string[];
  ejemplos: [string, string][];
  dias: string;
  aforo: [number, number];
  entrada: [number, number];
  claves: string[];
  faq: [string, string][];
  /** Texto alternativo de la foto; null mientras no haya foto. */
  imagen: { alt: string } | null;
};

export const FORMATOS_EXPERIENCE: FormatoExperience[] = [
  {
    slug: 'noche-de-maridaje', codigo: 'maridaje', nombre: 'Noche de maridaje',
    etiqueta: 'Vino, cerveza, cócteles o sin alcohol',
    frase: 'Un menú cerrado con su bebida: ticket alto en tu día flojo.',
    titular: 'Una noche de maridaje que llena tu día más flojo.',
    resumen: 'Menú cerrado de 4 a 6 pases, cada uno con su bebida, presentado en sala. Entrada anticipada, aforo cerrado y un ticket medio muy por encima del de un día normal.',
    paraQuien: ['Restaurantes con bodega o carta de vinos', 'Gastrobares con cerveza artesana o coctelería', 'Locales que quieren subir su ticket medio sin bajar precios'],
    ejemplos: [['Cocina mediterránea', 'Vinos de la tierra con arroces y pescados'], ['Hamburguesería', 'Cervezas artesanas con 4 hamburguesas de autor'], ['Cocina asiática', 'Sake y cócteles con nigiris y baos'], ['Sin alcohol', 'Kombuchas, zumos de temporada y cócteles sin alcohol']],
    dias: 'Martes a jueves por la noche', aforo: [20, 60], entrada: [35, 70],
    claves: ['Guion de presentación de cada pase', 'Ficha de cada bebida para tu equipo', 'Cartelería y piezas para redes', 'Web de entradas con aforo cerrado'],
    faq: [['¿Necesito un sumiller?', 'No. Te damos el guion de cada pase para que lo presente tu equipo o el propio proveedor de bebidas, que a menudo colabora gratis.'], ['¿Y si no sirvo alcohol?', 'El formato funciona igual con bebidas sin alcohol: kombuchas, zumos de temporada o cócteles sin alcohol.']],
    imagen: null,
  },
  {
    slug: 'mesa-del-chef', codigo: 'chef', nombre: 'Mesa del chef',
    etiqueta: 'Menú degustación · 10 a 20 plazas',
    frase: 'Exclusividad, cercanía con la cocina y reseñas que se notan.',
    titular: 'Mesa del chef: pocas plazas, mucha historia que contar.',
    resumen: 'Un menú degustación para un grupo pequeño, servido y explicado por quien cocina. Plazas limitadas que se agotan rápido y clientes que vuelven y te recomiendan.',
    paraQuien: ['Cocina de autor o de producto', 'Chefs que quieren darse a conocer', 'Locales con barra o mesa cerca de la cocina'],
    ejemplos: [['Cocina de mercado', 'Menú de 7 pases según lo que llegue esa semana'], ['Cocina italiana', 'Pasta fresca hecha delante del cliente'], ['Parrilla', 'Cortes y maduraciones explicados al corte'], ['Cocina vegetal', 'Degustación de temporada de la huerta']],
    dias: 'Cualquier día, mejor en servicio tranquilo', aforo: [10, 20], entrada: [55, 120],
    claves: ['Guion del menú y de la presentación del chef', 'Piezas para redes con cuenta atrás de plazas', 'Web de entradas con lista de espera', 'Petición de reseña al día siguiente'],
    faq: [['¿Y si no tengo mesa junto a la cocina?', 'Basta con una mesa grande en sala: el chef sale a presentar cada pase.'], ['¿Cuántas veces se puede repetir?', 'Funciona muy bien una vez al mes con un menú distinto; a partir de la segunda edición pagas la tarifa de reuso, más baja que la primera.']],
    imagen: null,
  },
  {
    slug: 'brunch-de-domingo', codigo: 'brunch', nombre: 'Brunch de domingo',
    etiqueta: 'Cafeterías, bares y restaurantes',
    frase: 'Llena la mañana que hoy tienes vacía.',
    titular: 'Un brunch de domingo que llena tu mañana vacía.',
    resumen: 'Menú de brunch cerrado con bebida incluida y turnos de reserva. Llenas una franja que hoy no produce y captas a un público que luego vuelve entre semana.',
    paraQuien: ['Cafeterías y panaderías', 'Bares de barrio', 'Restaurantes cerrados o vacíos los domingos por la mañana'],
    ejemplos: [['Cafetería', 'Tostadas, huevos y bollería con café de especialidad'], ['Cocina latina', 'Arepas, huevos rancheros y zumos naturales'], ['Restaurante clásico', 'Brunch castizo con churros y chocolate'], ['Saludable', 'Bowls, pan de masa madre y zumos verdes']],
    dias: 'Sábados y domingos de 10 a 14 h', aforo: [20, 80], entrada: [18, 35],
    claves: ['Menú cerrado con precio por persona', 'Turnos de reserva para no saturar la cocina', 'Piezas para redes y para tu ficha de Google', 'Web de entradas con pago anticipado por turnos'],
    faq: [['¿Turnos o reserva libre?', 'Recomendamos dos turnos (por ejemplo, 10:30 y 12:30): así la cocina trabaja a ritmo y doblas el aforo.'], ['¿Sirve para familias?', 'Sí. Se puede añadir un menú infantil a la entrada.']],
    imagen: null,
  },
  {
    slug: 'viaje-gastronomico', codigo: 'viaje', nombre: 'Viaje gastronómico',
    etiqueta: 'Tu especialidad, tu temporada o tu origen',
    frase: 'Una noche temática que se puede repetir cada mes.',
    titular: 'Un viaje gastronómico que tus clientes esperan cada mes.',
    resumen: 'Una noche dedicada a un país, una región o un producto de temporada, con menú, ambientación y música. Se repite cada mes con un destino nuevo y crea costumbre.',
    paraQuien: ['Restaurantes con cocina de origen', 'Locales que quieren novedad sin cambiar la carta', 'Equipos con ganas de proponer'],
    ejemplos: [['Cocina española', 'Una noche por región: Galicia, Asturias, Andalucía…'], ['Cocina mexicana', 'Día de Muertos o noche de mezcal'], ['Cocina japonesa', 'Noche de ramen o izakaya'], ['Temporada', 'Noche de la trufa, de la seta o del tomate']],
    dias: 'Un jueves o viernes al mes', aforo: [30, 100], entrada: [30, 60],
    claves: ['Calendario de destinos para 3 meses', 'Ambientación y lista de música', 'Piezas para redes reutilizables cada mes', 'Web de entradas con aviso a la lista de interesados'],
    faq: [['¿Tengo que cambiar mi carta?', 'No. Es un menú aparte para esa noche; tu carta sigue igual el resto de días.'], ['¿Sale más barato repetirlo?', 'Sí. El mismo formato con un destino nuevo paga la tarifa de reuso, más baja que la primera.']],
    imagen: null,
  },
  {
    slug: 'taller-en-vivo', codigo: 'taller', nombre: 'Taller en vivo',
    etiqueta: 'Cocina, cócteles, pasta, sushi o pan',
    frase: 'Una clase práctica que trae público nuevo y grupos.',
    titular: 'Un taller en vivo que trae público nuevo a tu local.',
    resumen: 'Una clase práctica de 2 horas en la que los asistentes cocinan contigo y después comen lo que han hecho. Atrae a grupos, empresas y regalos de cumpleaños.',
    paraQuien: ['Locales con una especialidad que se puede enseñar', 'Cocinas o barras con espacio para un grupo', 'Quien quiera vender a empresas (eventos de empresa)'],
    ejemplos: [['Pizzería', 'Masa madre y pizza napolitana'], ['Coctelería', 'Tres cócteles clásicos y uno de la casa'], ['Cocina japonesa', 'Sushi para principiantes'], ['Panadería', 'Pan de masa madre para hacer en casa']],
    dias: 'Tardes de entre semana o sábados por la mañana', aforo: [8, 24], entrada: [40, 85],
    claves: ['Guion de la clase paso a paso', 'Lista de material y de compra por asistente', 'Versión para empresas y para regalo', 'Web de entradas con bono regalo'],
    faq: [['¿Necesito una cocina grande?', 'No. Con una mesa de trabajo para 8–12 personas basta; el horno o los fogones los usas tú.'], ['¿Se puede regalar?', 'Sí. La web de entradas permite comprar la plaza como regalo.']],
    imagen: null,
  },
  {
    slug: 'afterwork-con-musica', codigo: 'afterwork', nombre: 'Afterwork con música',
    etiqueta: 'Bares y gastrobares',
    frase: 'Tapeo y música en directo para llenar entre semana.',
    titular: 'Un afterwork con música que llena tus tardes entre semana.',
    resumen: 'Tapeo, bebida y música en directo de 19 a 22 h. Una entrada que incluye consumición y un ambiente que convierte un miércoles cualquiera en plan fijo.',
    paraQuien: ['Bares y gastrobares', 'Locales cerca de oficinas', 'Terrazas con espacio para música acústica'],
    ejemplos: [['Bar de tapas', 'Tapeo con guitarra flamenca'], ['Gastrobar', 'Vermut y DJ de vinilos'], ['Cervecería', 'Cerveza artesana con banda acústica'], ['Cocina latina', 'Ceviches y música en vivo']],
    dias: 'Miércoles o jueves de 19 a 22 h', aforo: [30, 120], entrada: [12, 25],
    claves: ['Formato de entrada con consumición incluida', 'Contacto y condiciones para el músico', 'Piezas para redes y para empresas cercanas', 'Web de entradas con lista de espera'],
    faq: [['¿Necesito licencia para música?', 'Depende de tu licencia y de tu ayuntamiento. Te decimos qué comprobar; la licencia y el aforo legal son responsabilidad del local.'], ['¿Quién paga al músico?', 'Tú, directamente. Te ayudamos a calcular el precio de la entrada para que salga a cuenta.']],
    imagen: null,
  },
  {
    slug: 'reto-o-batalla', codigo: 'reto', nombre: 'Reto o batalla',
    etiqueta: 'Picante, cata a ciegas o concurso',
    frase: 'Un formato competitivo pensado para moverse en redes.',
    titular: 'Un reto que se mueve solo en redes.',
    resumen: 'Un concurso con reglas, clasificación y premio: el reto del picante, una cata a ciegas o una batalla de platos. Se graba, se comparte y trae al público que busca planes distintos.',
    paraQuien: ['Hamburgueserías, alitas y comida rápida de calidad', 'Bares de vinos o de cerveza (cata a ciegas)', 'Locales con público joven y activo en redes'],
    ejemplos: [['Alitas', 'Reto de 10 salsas de picante creciente'], ['Hamburguesas', 'La hamburguesa gigante en tiempo récord'], ['Vinos', 'Cata a ciegas por equipos'], ['Tapas', 'Batalla de tapas votada por el público']],
    dias: 'Viernes o sábado', aforo: [20, 80], entrada: [15, 40],
    claves: ['Reglas, clasificación y premio', 'Plan de grabación para redes durante el evento', 'Aviso de responsabilidad para los participantes', 'Web de entradas con plazas por ronda'],
    faq: [['¿Es seguro el reto del picante?', 'Se hace con aviso de responsabilidad firmado, agua y lácteos a mano, y sin presionar a nadie. Te damos el protocolo.'], ['¿Cómo se mueve en redes?', 'Te damos un plan de grabación: qué momentos captar y cómo publicarlos esa misma noche.']],
    imagen: null,
  },
];

export const formatoPorSlug = (slug: string) => FORMATOS_EXPERIENCE.find((f) => f.slug === slug);
