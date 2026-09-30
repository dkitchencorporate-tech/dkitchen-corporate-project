/**
 * Chat de ayuda (30/09/2026). Sin IA: respuestas escritas por DKitchen en
 * árbol (cada tema propone los siguientes) y búsqueda por palabras con
 * sinónimos. Lo usan el panel (dudas de uso) y la web pública (dudas de venta).
 * Para ampliar: añade un tema con sus `claves` y enlázalo desde `siguientes`.
 */

import { QR_MENU, SERVICIOS_QR, AUDITORIA_CANALES, BASE_OPERATIVA, EXPERIENCE } from '@/lib/pricing-config';

const BASICO = QR_MENU.planes.basico.mensual;
const AMPLIADO = QR_MENU.planes.ampliado.mensual;
const PRIMER_MES = QR_MENU.primerMes;

export type AccionAyuda =
  | { tipo: 'ir'; pestana: string; texto: string }
  | { tipo: 'enlace'; href: string; texto: string }
  | { tipo: 'solicitud'; interes: string; texto: string };

export interface TemaAyuda {
  id: string;
  /** La duda tal como la diría el cliente. */
  pregunta: string;
  /** Párrafos o pasos de la respuesta. */
  respuesta: string[];
  /** Palabras que llevan a este tema al escribir (sin tildes, en minúsculas). */
  claves: string[];
  /** Secciones del panel donde se ofrece primero. */
  secciones?: string[];
  acciones?: AccionAyuda[];
  siguientes?: string[];
  /** Tema en el que tiene sentido ofrecer la Puesta a punto. */
  ofrecerPuesta?: boolean;
}

// ---------------------------------------------------------------------------
// Panel del cliente
// ---------------------------------------------------------------------------

export const TEMAS_PANEL: TemaAyuda[] = [
  {
    id: 'plato-nuevo', pregunta: 'Cómo añado un plato', secciones: ['carta', 'inicio'],
    claves: ['plato', 'anadir', 'crear', 'nuevo', 'producto', 'subir carta', 'meter'],
    respuesta: [
      'Ve a Carta → Platos.',
      'Si aún no tienes secciones, crea una primero (por ejemplo «Entrantes»).',
      'Dentro de la sección escribe el nombre y el precio del plato y guarda. Después puedes abrirlo para añadir descripción, foto y alérgenos.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'carta', texto: 'Ir a Platos' }],
    siguientes: ['foto', 'alergenos', 'precio'], ofrecerPuesta: true,
  },
  {
    id: 'foto', pregunta: 'No sé subir fotos a los platos', secciones: ['carta', 'inicio'],
    claves: ['foto', 'imagen', 'subir foto', 'camara', 'galeria'],
    respuesta: [
      'En Carta → Platos, toca el recuadro «+ foto» del plato (o ábrelo para editarlo).',
      'Elige una imagen JPG, PNG o WebP del móvil o del ordenador. La comprimimos nosotros, no tienes que hacer nada más.',
      'Consejo: foto horizontal, con luz natural y el plato ocupando casi todo el encuadre.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'carta', texto: 'Ir a Platos' }],
    siguientes: ['foto-error', 'plato-nuevo'], ofrecerPuesta: true,
  },
  {
    id: 'foto-error', pregunta: 'La foto no se sube o da error', secciones: ['carta'],
    claves: ['foto error', 'no sube', 'tamano', 'pesa', 'formato', 'heic'],
    respuesta: [
      'Los formatos admitidos son JPG, PNG y WebP. Las fotos HEIC del iPhone a veces fallan: haz una captura de pantalla de la foto y sube la captura.',
      'Si la conexión es lenta, espera a que termine antes de guardar el plato.',
      'Si sigue fallando, pásalo a una persona y lo miramos con tu foto.',
    ],
    siguientes: ['foto'],
  },
  {
    id: 'precio', pregunta: 'Cómo cambio un precio o un plato', secciones: ['carta', 'inicio'],
    claves: ['precio', 'cambiar', 'editar', 'modificar', 'coste', 'euros', 'borrar', 'quitar', 'eliminar'],
    respuesta: [
      'En Carta → Platos, toca el plato para editarlo. Cambia el precio, el nombre o la descripción y guarda.',
      'El cambio se ve al momento en tu carta. El QR sigue siendo el mismo: no tienes que reimprimir nada.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'carta', texto: 'Ir a Platos' }],
    siguientes: ['plato-nuevo', 'agotado'],
  },
  {
    id: 'agotado', pregunta: 'Quiero ocultar un plato que se ha acabado', secciones: ['carta'],
    claves: ['agotado', 'ocultar', 'esconder', 'no hay', 'acabado', 'desactivar', 'disponible'],
    respuesta: [
      'En Carta → Platos, abre el plato y desmárcalo como disponible (o bórralo si ya no lo vas a servir).',
      'Mientras esté oculto, tus clientes no lo verán en la carta.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'carta', texto: 'Ir a Platos' }],
    siguientes: ['precio'],
  },
  {
    id: 'alergenos', pregunta: 'Cómo marco los alérgenos', secciones: ['carta'],
    claves: ['alergeno', 'alergia', 'gluten', 'lactosa', 'intolerancia', 'celiaco'],
    respuesta: [
      'Al editar un plato verás los 14 alérgenos del Reglamento UE 1169/2011. Marca los que contenga.',
      'Tus clientes los ven con iconos junto al plato. Es obligatorio informar de ellos, así que merece la pena revisarlos todos.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'carta', texto: 'Ir a Platos' }],
    siguientes: ['plato-nuevo'], ofrecerPuesta: true,
  },
  {
    id: 'secciones', pregunta: 'Cómo organizo las secciones de la carta', secciones: ['carta'],
    claves: ['seccion', 'categoria', 'orden', 'ordenar', 'mover', 'entrantes'],
    respuesta: [
      'En Carta → Estudio → Categorías creas, renombras y eliminas las secciones de tu carta.', 'Después, en Carta → Platos, añade los platos dentro de cada una. Si necesitas cambiar el orden de las secciones, pídeselo a una persona y lo dejamos como quieras.',
      'Recomendamos pocas secciones y claras: entrantes, principales, postres, bebidas.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'estudio', texto: 'Ir al Estudio' }],
    siguientes: ['plato-nuevo', 'estudio'], ofrecerPuesta: true,
  },
  {
    id: 'estudio', pregunta: 'Qué es el Estudio de carta', secciones: ['estudio', 'carta'],
    claves: ['estudio', 'organizar', 'construir carta', 'crear carta'],
    respuesta: [
      'Es donde construyes tu carta: categorías, especiales y promociones, combos y tus páginas legales.',
      'Los cambios rápidos del día (precio, agotado, foto) siguen en Carta → Platos.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'estudio', texto: 'Ir al Estudio' }],
    siguientes: ['combo', 'promo', 'legales'],
  },
  {
    id: 'combo', pregunta: 'Cómo creo un combo o menú', secciones: ['estudio', 'carta'],
    claves: ['combo', 'menu cerrado', 'pack', 'oferta conjunta', 'hamburguesa patatas bebida', 'menu infantil'],
    respuesta: [
      'En Carta → Estudio → Combos pulsa «+ Nuevo combo».',
      'Ponle nombre, elige al menos 2 platos (con − y + cambias cantidades) y escribe el precio del combo.',
      'Verás al momento cuánto costaría por separado y cuánto ahorra tu cliente; la carta lo muestra así. Los alérgenos se calculan solos.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'estudio', texto: 'Crear un combo' }],
    siguientes: ['promo', 'estudio'], ofrecerPuesta: true,
  },
  {
    id: 'promo', pregunta: 'Cómo pongo un plato en promoción o como especial', secciones: ['estudio', 'carta', 'promociones'],
    claves: ['promocion', 'oferta', 'descuento', 'rebaja', 'especial', 'nuevo', 'recomendado', 'etiqueta', 'tachado'],
    respuesta: [
      'En Carta → Estudio → Especiales y promociones eliges la etiqueta (Especial, Nuevo o Recomendado) de cada plato.',
      'Para una promoción, escribe el precio rebajado y, si quieres, las fechas. Tus clientes verán el precio normal tachado.',
      'Al pasar la fecha de fin, el plato vuelve solo a su precio normal.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'estudio', texto: 'Ir al Estudio' }],
    siguientes: ['combo', 'banners'],
  },
  {
    id: 'legales', pregunta: 'Cómo pongo el aviso legal y la privacidad de mi negocio', secciones: ['estudio', 'local'],
    claves: ['legal', 'aviso legal', 'privacidad', 'cookies', 'rgpd', 'lopd', 'nif', 'cif', 'proteccion de datos'],
    respuesta: [
      'En Carta → Estudio → Páginas legales escribe el titular del negocio y un correo de contacto (el NIF/CIF es opcional).',
      'Marca «Publicar mis páginas legales» y guarda: generamos el aviso legal, la privacidad y las cookies de tu carta y las enlazamos en su pie.',
      'Nada se publica hasta que tú lo activas.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'estudio', texto: 'Ir a Páginas legales' }],
  },
  {
    id: 'diseno', pregunta: 'Quiero cambiar el diseño de mi carta', secciones: ['diseno', 'carta', 'local'],
    claves: ['diseno', 'color', 'colores', 'letra', 'fuente', 'estilo', 'plantilla', 'fondo', 'bonita', 'aspecto', 'logo'],
    respuesta: [
      'En Carta → Diseño eliges plantilla, colores y tipo de letra, y ves el resultado al momento.',
      'Si tienes la Carta de Autor o Signature, el diseño lo lleva DKitchen: pide el cambio a una persona y lo hacemos contigo.',
      'Si quieres una carta diseñada a medida, desde cero, eso es la Carta de Autor.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'diseno', texto: 'Ir a Diseño' }],
    siguientes: ['carta-autor'], ofrecerPuesta: true,
  },
  {
    id: 'carta-autor', pregunta: 'Qué es la Carta de Autor', secciones: ['diseno'],
    claves: ['carta de autor', 'autor', 'a medida', 'disenador', 'personalizada', 'experto'],
    respuesta: [
      `Es un diseño único para tu local, hecho por DKitchen desde cero: identidad, fotos y estructura. Pago único de ${SERVICIOS_QR.cartaDeAutor} € + IVA.`,
      'No entra en la prueba gratuita. Lo tienes en Carta → Diseño.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'diseno', texto: 'Ver la Carta de Autor' }],
    siguientes: ['diseno'],
  },
  {
    id: 'qr-no-funciona', pregunta: 'Mi QR no funciona', secciones: ['qr', 'inicio'],
    claves: ['qr', 'codigo', 'no funciona', 'no abre', 'no lee', 'escanear', 'movil no'],
    respuesta: [
      'Primero comprueba que la carta abre: en el panel pulsa «Ver mi carta».',
      'Si la carta abre pero el QR no, suele ser la impresión: demasiado pequeño (menos de 3 cm), borroso, con reflejos o poco contraste. Descarga de nuevo el PNG en alta resolución desde Carta → Mi QR.',
      'Si la carta no abre, puede que tu cuenta esté en solo lectura por un pago pendiente: revisa Negocio → Mi plan.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'qr', texto: 'Ir a Mi QR' }],
    siguientes: ['qr-imprimir', 'plan-pago'],
  },
  {
    id: 'qr-imprimir', pregunta: 'Cómo imprimo el QR o pido uno físico', secciones: ['qr'],
    claves: ['imprimir', 'descargar', 'pegatina', 'metacrilato', 'placa', 'fisico', 'png'],
    respuesta: [
      'En Carta → Mi QR pulsa «Descargar PNG en alta resolución» y llévalo a cualquier imprenta (mínimo 3 cm de lado).',
      'Si prefieres que te lo mandemos hecho, en la misma pantalla puedes pedir el QR físico profesional con tu dirección de envío.',
      'El QR no cambia nunca: aunque cambies la carta, el código impreso sigue valiendo.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'qr', texto: 'Ir a Mi QR' }],
    siguientes: ['qr-no-funciona'],
  },
  {
    id: 'google', pregunta: 'Cómo pongo mi carta en Google Maps', secciones: ['local', 'inicio'],
    claves: ['google', 'maps', 'ficha', 'buscador', 'resenas', 'resena', 'opiniones'],
    respuesta: [
      'En Negocio → Mi local tienes la guía «Pon tu carta en Google Maps (2 minutos)» con la dirección que debes pegar.',
      'En tu ficha de Google Business ve a Editar perfil → Menú (o «Enlace al menú») y pega esa dirección.',
      'En la misma pantalla puedes añadir tu enlace de reseñas de Google para que aparezca en la carta.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'local', texto: 'Ir a Mi local' }],
    siguientes: ['datos-local'], ofrecerPuesta: true,
  },
  {
    id: 'datos-local', pregunta: 'Cómo cambio el horario, teléfono o dirección', secciones: ['local'],
    claves: ['horario', 'telefono', 'direccion', 'instagram', 'nombre del local', 'contacto', 'abierto', 'cerrado'],
    respuesta: [
      'Todo está en Negocio → Mi local: nombre, dirección, teléfono, horario, Instagram y WhatsApp para reservas.',
      'Lo que guardes aparece en la cabecera de tu carta al momento.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'local', texto: 'Ir a Mi local' }],
    siguientes: ['google'],
  },
  {
    id: 'reservas', pregunta: 'Cómo funcionan las reservas', secciones: ['reservas', 'inicio'],
    claves: ['reserva', 'reservar', 'mesa libre', 'comensales', 'confirmar', 'cancelar reserva'],
    respuesta: [
      'Las reservas están en el plan Ampliado. Tus clientes reservan desde la carta y a ti te llega el aviso al momento.',
      'En Servicio → Reservas las confirmas o rechazas; el cliente recibe la respuesta por correo y tienes un botón para escribirle por WhatsApp.',
      'Pon tu número en Negocio → Mi local («WhatsApp para recibir reservas») para recibirlas también ahí.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'reservas', texto: 'Ir a Reservas' }],
    siguientes: ['plan-ampliado', 'datos-local'],
  },
  {
    id: 'camarero', pregunta: 'Cómo funciona la llamada al camarero', secciones: ['camarero', 'sala'],
    claves: ['camarero', 'llamada', 'llamar', 'cuenta', 'avisar', 'barra', 'alarma', 'campana'],
    respuesta: [
      'Desde la carta, el cliente pulsa «Llamar al camarero» o «Pedir la cuenta» y la mesa aparece en Servicio → Llamadas.',
      'Deja esa pantalla abierta en una tablet o móvil en la barra: se actualiza sola cada pocos segundos y suena la alarma.',
      'Para saber qué mesa llama, usa los QR por mesa que tienes en esa misma pantalla.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'camarero', texto: 'Ir a Llamadas' }],
    siguientes: ['plan-ampliado'],
  },
  {
    id: 'sala', pregunta: 'Cómo dibujo el plano de mi sala', secciones: ['sala'],
    claves: ['sala', 'plano', 'mesas', 'terraza', 'zoom', 'tpv', 'comandero', 'app de sala'],
    respuesta: [
      'En Servicio → Sala colocas las mesas y elementos arrastrándolos. En el móvil puedes hacer zoom y cambiar el tamaño de cada mesa con − y +.',
      'El botón «?» del editor muestra la ayuda paso a paso.',
      'El plano, la app de sala y la conexión con el TPV forman el Pack Sala (plan Ampliado).',
    ],
    acciones: [{ tipo: 'ir', pestana: 'sala', texto: 'Ir a Sala' }],
    siguientes: ['modulos'], ofrecerPuesta: true,
  },
  {
    id: 'banners', pregunta: 'Cómo pongo una promoción o banner', secciones: ['promociones'],
    claves: ['banner', 'promocion', 'oferta', 'menu del dia', 'anuncio', 'destacar'],
    respuesta: [
      'En Carta → Banners creas un aviso con imagen o texto y un botón que lleva a una sección de tu carta.',
      'El plan Básico incluye 1 banner activo. Con Ampliado puedes tener varios y programarlos por días y horas (por ejemplo, el menú del día de lunes a viernes de 12 a 16 h).',
      'En «Botón del banner» eliges qué pasa al tocarlo: nada (sin botón), bajar a una sección, abrir un plato concreto o abrir la reserva (plan Ampliado).',
    ],
    acciones: [{ tipo: 'ir', pestana: 'promociones', texto: 'Ir a Banners' }],
    siguientes: ['plan-ampliado'],
  },
  {
    id: 'idiomas', pregunta: 'Cómo pongo mi carta en otros idiomas', secciones: ['idiomas', 'modulos'],
    claves: ['idioma', 'ingles', 'frances', 'aleman', 'traducir', 'traduccion', 'turistas', 'extranjeros'],
    respuesta: [
      'Con el módulo de Idiomas eliges hasta 3 idiomas y nosotros traducimos tu carta. Tus clientes ven un selector de idioma.',
      'Es un pago único, sin cuota. Si ya lo tienes, lo gestionas en Carta → Idiomas; si no, está en Negocio → Mejoras.',
      'Cuando cambies o añadas platos, avísanos y traducimos lo nuevo.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'modulos', texto: 'Ver Mejoras' }],
    siguientes: ['modulos'],
  },
  {
    id: 'escaneos', pregunta: 'Qué significan los escaneos', secciones: ['escaneos', 'inicio'],
    claves: ['escaneo', 'estadistica', 'visitas', 'datos', 'cuantos', 'grafica'],
    respuesta: [
      'Cada escaneo es una vez que alguien abre tu carta desde el QR o el enlace. En Negocio → Escaneos ves los del mes y los de los últimos 30 días.',
      'Sirve para saber qué días tienes más movimiento y si tu carta en Google atrae visitas.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'escaneos', texto: 'Ir a Escaneos' }],
  },
  {
    id: 'plan-pago', pregunta: 'Cuánto pago y cuándo me cobráis', secciones: ['plan', 'inicio'],
    claves: ['pago', 'pagar', 'cobro', 'factura', 'tarjeta', 'cuanto', 'precio plan', 'prueba', 'cobrar', 'dia 12', 'iva'],
    respuesta: [
      'En Negocio → Mi plan tienes «Tu cobro»: lo que pagas, el próximo cobro y el desglose por módulo.',
      'Los cobros son el día 12 de cada mes. Si estás en la prueba, no se cobra nada hasta el primer día 12 después de que termine.',
      'Los precios se muestran sin IVA; al pagar se suma el 21 %.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'plan', texto: 'Ir a Mi plan' }],
    siguientes: ['prueba', 'baja'],
  },
  {
    id: 'prueba', pregunta: 'Qué pasa cuando termina la prueba', secciones: ['plan', 'inicio'],
    claves: ['prueba', 'gratis', 'termina', 'caduca', 'todo incluido', 'quedarme', 'dias'],
    respuesta: [
      'Durante la prueba tienes todo incluido: plan Ampliado, idiomas y Pack Sala. Arriba de cada pantalla ves los días que quedan.',
      'Si pulsas «Quedarme con todo», sigues con lo mismo y el primer cobro es el día 12 después del fin de la prueba.',
      'Si no haces nada, al terminar tu panel pasa a solo lectura, pero tu carta pública sigue visible. Te avisamos por correo 3 días y 1 día antes.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'plan', texto: 'Ir a Mi plan' }],
    siguientes: ['plan-pago', 'plan-ampliado'],
  },
  {
    id: 'plan-ampliado', pregunta: 'Qué diferencia hay entre Básico y Ampliado', secciones: ['plan', 'modulos'],
    claves: ['ampliado', 'basico', 'diferencia', 'subir de plan', 'mejorar plan', 'cambiar plan'],
    respuesta: [
      `Básico (${BASICO} € + IVA al mes): carta digital con fotos y alérgenos, diseño, QR y estadísticas.`,
      `Ampliado (${AMPLIADO} € + IVA al mes): todo lo anterior más reservas, llamada al camarero, varios banners programables, reseñas de Google, QR por mesa y acceso a los módulos de sala.`,
      'Puedes subir de plan desde Negocio → Mi plan.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'plan', texto: 'Ir a Mi plan' }],
    siguientes: ['modulos'],
  },
  {
    id: 'modulos', pregunta: 'Qué módulos puedo añadir', secciones: ['modulos', 'sala'],
    claves: ['modulo', 'mejora', 'pack sala', 'tpv', 'app sala', 'extra', 'anadir servicio'],
    respuesta: [
      'En Negocio → Mejoras tienes: Idiomas (pago único), y con el plan Ampliado el Plano de mesas, la App de sala y la Conexión con tu TPV, o todo junto en el Pack Sala.',
      'Cada módulo muestra su precio antes de pagar y se activa al momento.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'modulos', texto: 'Ver Mejoras' }],
    siguientes: ['idiomas', 'sala'],
  },
  {
    id: 'signature', pregunta: 'Qué gano pasando a Signature (mi propia app)', secciones: ['plan', 'modulos', 'inicio'],
    claves: ['signature', 'app propia', 'mi app', 'pedidos', 'domicilio', 'delivery', 'glovo', 'comisiones', 'fidelizacion', 'puntos', 'kiosko', 'pago online'],
    respuesta: [
      'La carta QR es tu carta digital. Signature es tu propio negocio digital: tu app, tus pedidos, tus clientes y tus datos, sin comisiones.',
      'Con Signature tienes una app instalable con tu marca, pedidos a domicilio y para recoger, y pago online (Stripe, SumUp o Revolut Pay), con datáfono o en efectivo.',
      'Además: seguimiento del pedido con avisos, club de puntos, campañas por correo, kiosko de autoservicio y comandas impresas en cocina.',
    ],
    acciones: [{ tipo: 'enlace', href: '/base-operativa', texto: 'Ver Signature y sus apps reales' }, { tipo: 'ir', pestana: 'soporte', texto: 'Pedir una propuesta' }],
    siguientes: ['plan-ampliado'],
  },
  {
    id: 'baja', pregunta: 'Quiero darme de baja', secciones: ['plan'],
    claves: ['baja', 'cancelar', 'darme de baja', 'dejar', 'cerrar cuenta', 'permanencia', 'borrar cuenta'],
    respuesta: [
      'No hay permanencia. En Negocio → Mi plan, al final, tienes «Darme de baja».',
      'Si algo no te está funcionando, cuéntanoslo antes: muchas veces se arregla en un día.',
    ],
    acciones: [{ tipo: 'ir', pestana: 'plan', texto: 'Ir a Mi plan' }],
  },
  {
    id: 'acceso', pregunta: 'No puedo entrar o he olvidado la contraseña', secciones: ['inicio'],
    claves: ['contrasena', 'password', 'entrar', 'acceso', 'login', 'sesion', 'olvidado', 'correo'],
    respuesta: [
      'En la pantalla de entrada pulsa «¿Olvidaste tu contraseña?» y te llegará un correo para crear una nueva (revisa también el correo no deseado).',
      'Si otra persona de tu equipo necesita entrar, pásalo a una persona y te lo preparamos.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Web pública (dudas de venta; siempre termina en el formulario)
// ---------------------------------------------------------------------------

export const TEMAS_WEB: TemaAyuda[] = [
  {
    id: 'que-es', pregunta: 'Qué hace DKitchen',
    claves: ['que es', 'que haceis', 'dkitchen', 'servicio', 'quienes'],
    respuesta: [
      'Ayudamos a restaurantes a vender más con su propia tecnología: carta digital QR, app con tu marca (Signature), eventos (Experience) y marcas virtuales para tu cocina.',
      `Lo más rápido para empezar es la carta digital QR: primer mes por ${PRIMER_MES} € + IVA.`,
    ],
    acciones: [{ tipo: 'enlace', href: '/qr', texto: 'Ver la carta QR' }],
    siguientes: ['precio-qr', 'signature'],
  },
  {
    id: 'precio-qr', pregunta: 'Cuánto cuesta la carta QR',
    claves: ['precio', 'cuesta', 'cuanto', 'tarifa', 'coste', 'mes', 'mensual', 'barato', 'qr', 'carta'],
    respuesta: [
      `Plan Básico: ${BASICO} € + IVA al mes. Plan Ampliado: ${AMPLIADO} € + IVA al mes (reservas, llamada al camarero, promociones programadas y módulos de sala).`,
      `El primer mes cuesta ${PRIMER_MES} € + IVA en cualquiera de los dos. Sin permanencia: cancelas desde tu panel.`,
    ],
    acciones: [{ tipo: 'enlace', href: '/qr#planes', texto: 'Ver planes' }],
    siguientes: ['prueba-web', 'incluye', 'puesta-web'],
  },
  {
    id: 'prueba-web', pregunta: 'Hay prueba o permanencia',
    claves: ['prueba', 'gratis', 'permanencia', 'contrato', 'cancelar', 'compromiso', '1 euro'],
    respuesta: [
      `El primer mes cuesta ${PRIMER_MES} € + IVA. Después se cobra tu plan cada mes y puedes cancelar cuando quieras desde el panel.`,
      'No hay permanencia ni letra pequeña.',
    ],
    acciones: [{ tipo: 'enlace', href: '/qr#planes', texto: `Empezar por ${PRIMER_MES} €` }],
    siguientes: ['precio-qr'],
  },
  {
    id: 'incluye', pregunta: 'Qué incluye la carta digital',
    claves: ['incluye', 'funciones', 'que tiene', 'alergenos', 'fotos', 'reservas', 'camarero', 'idiomas'],
    respuesta: [
      'Carta con fotos, precios y alérgenos según el Reglamento UE, que cambias desde el móvil al momento; cuatro estilos de diseño; un QR que nunca reimprimes y estadísticas de visitas.',
      'Con Ampliado, además: reservas con aviso, llamada al camarero, banners programados, reseñas de Google y QR por mesa. Hay módulos de idiomas y de sala.',
    ],
    acciones: [{ tipo: 'enlace', href: '/qr', texto: 'Ver cómo funciona' }],
    siguientes: ['precio-qr', 'puesta-web'],
  },
  {
    id: 'puesta-web', pregunta: 'No tengo tiempo de montarla yo',
    claves: ['no tengo tiempo', 'no se', 'montar', 'configurar', 'ayuda', 'hacerlo por mi', 'puesta a punto', 'setup'],
    respuesta: [
      `Te la dejamos lista nosotros con la Puesta a punto: ${SERVICIOS_QR.puestaAPunto} € + IVA, pago único. Un experto de DKitchen sube tu carta, textos, alérgenos, fotos, horarios y tu ficha de Google.`,
      `Si quieres un diseño único hecho desde cero para tu local, está la Carta de Autor (${SERVICIOS_QR.cartaDeAutor} € + IVA).`,
    ],
    acciones: [{ tipo: 'solicitud', interes: 'dudas', texto: 'Quiero que me la montéis' }],
    siguientes: ['precio-qr'],
  },
  {
    id: 'signature', pregunta: 'Quiero una app con mi marca',
    claves: ['app', 'aplicacion', 'marca', 'signature', 'pedidos', 'delivery', 'glovo', 'comisiones', 'propia'],
    respuesta: [
      'La carta QR es tu carta digital. DKitchen Signature es tu propio negocio digital: tu app, tus pedidos, tus clientes y tus datos, sin comisiones por pedido.',
      'Incluye app instalable con tu marca, pedidos a domicilio y para recoger, pago online (Stripe, SumUp o Revolut Pay), club de puntos, campañas por correo, kiosko y comandas en cocina.',
      `Pago de entrada de ${BASE_OPERATIVA.pagoUnico} € + IVA y mantenimiento mensual. Te preparamos una propuesta para tu local sin compromiso.`,
    ],
    acciones: [{ tipo: 'enlace', href: '/base-operativa', texto: 'Ver Signature' }, { tipo: 'solicitud', interes: 'signature', texto: 'Quiero mi propuesta' }],
  },
  {
    id: 'diferencia', pregunta: 'Qué diferencia hay entre la carta QR y Signature',
    claves: ['diferencia', 'comparar', 'carta o app', 'que me conviene', 'signature o qr', 'cual elijo'],
    respuesta: [
      'La carta QR es tu carta digital: la cambias al momento, con alérgenos, reservas y llamada al camarero.',
      'Signature es tu propio negocio digital: app con tu marca, pedidos y pago online sin comisiones, tus clientes y tus datos. Aunque contrates la carta QR con todo, Signature está en otra liga.',
    ],
    acciones: [{ tipo: 'enlace', href: '/qr#planes', texto: 'Ver la carta QR' }, { tipo: 'enlace', href: '/base-operativa', texto: 'Ver Signature' }],
    siguientes: ['signature', 'precio-qr'],
  },
  {
    id: 'auditoria', pregunta: `Qué es la auditoría de ${AUDITORIA_CANALES.precioOferta} €`,
    claves: ['auditoria', 'revision', 'analisis', 'informe', '47'],
    respuesta: [
      `Revisamos tus canales de venta (Google, redes, delivery, carta) y te entregamos un informe con qué mejorar primero. ${AUDITORIA_CANALES.precioOferta} € + IVA.`,
    ],
    acciones: [{ tipo: 'enlace', href: '/pagar/auditoria', texto: 'Reservar mi auditoría' }],
  },
  {
    id: 'eventos', pregunta: 'Organizáis eventos',
    claves: ['evento', 'experience', 'llenar', 'dias flojos', 'cena', 'catas'],
    respuesta: [
      `Con DKitchen Experience montamos eventos para llenar los días flojos: formato, entradas y difusión. Desde ${EXPERIENCE.tarifas.primeraVez.precio} € + IVA.`,
    ],
    acciones: [{ tipo: 'enlace', href: '/experience', texto: 'Ver Experience' }, { tipo: 'solicitud', interes: 'experience', texto: 'Quiero mi evento' }],
  },
  {
    id: 'marcas', pregunta: 'Qué son las marcas virtuales',
    claves: ['marca virtual', 'dark kitchen', 'cocina fantasma', 'marcas', 'mas ventas'],
    respuesta: [
      'Son marcas de comida a domicilio que cocinas en tu propia cocina para vender más sin abrir otro local. Te decimos cuál encaja con tu cocina.',
    ],
    acciones: [{ tipo: 'enlace', href: '/marcas', texto: 'Ver marcas' }, { tipo: 'solicitud', interes: 'marcas', texto: 'Hablar con DKitchen' }],
  },
  {
    id: 'cliente', pregunta: 'Ya soy cliente y tengo un problema',
    claves: ['ya soy cliente', 'panel', 'mi cuenta', 'no funciona', 'problema', 'error', 'soporte'],
    respuesta: [
      'Entra en tu panel y pulsa el botón de ayuda «?»: ahí resolvemos las dudas de uso y, si hace falta, te atiende una persona con todo el contexto.',
    ],
    acciones: [{ tipo: 'enlace', href: '/panel', texto: 'Ir a mi panel' }],
  },
];

// ---------------------------------------------------------------------------
// Búsqueda por palabras con sinónimos
// ---------------------------------------------------------------------------

/** Cada grupo se trata como la misma palabra. */
const SINONIMOS: string[][] = [
  ['foto', 'fotos', 'imagen', 'imagenes', 'fotografia', 'fotografias', 'img', 'picture'],
  ['plato', 'platos', 'producto', 'productos', 'articulo', 'comida', 'bebida', 'bebidas'],
  ['precio', 'precios', 'coste', 'cuesta', 'cuestan', 'vale', 'importe', 'tarifa'],
  ['qr', 'codigo', 'codigos', 'qrs'],
  ['carta', 'menu', 'cartas', 'menus'],
  ['diseno', 'disenos', 'estilo', 'plantilla', 'aspecto', 'look', 'color', 'colores'],
  ['reserva', 'reservas', 'reservar', 'booking'],
  ['camarero', 'camareros', 'llamada', 'llamadas', 'llamar', 'avisar'],
  ['baja', 'cancelar', 'darme', 'anular', 'desuscribir'],
  ['pago', 'pagar', 'cobro', 'cobrar', 'cobran', 'cobrais', 'factura', 'recibo', 'tarjeta'],
  ['alergeno', 'alergenos', 'alergia', 'alergias', 'intolerancia'],
  ['idioma', 'idiomas', 'ingles', 'traducir', 'traduccion', 'lenguas'],
  ['google', 'maps', 'buscador', 'ficha'],
  ['banner', 'banners', 'promocion', 'promociones', 'oferta', 'ofertas'],
  ['contrasena', 'password', 'clave', 'acceso', 'entrar', 'login'],
  ['anadir', 'agregar', 'crear', 'meter', 'poner', 'subir', 'nuevo', 'nueva'],
  ['cambiar', 'editar', 'modificar', 'corregir', 'actualizar'],
  ['borrar', 'quitar', 'eliminar', 'ocultar', 'esconder'],
  ['app', 'aplicacion', 'apps'],
  ['prueba', 'gratis', 'gratuito', 'trial'],
];

const PALABRAS_VACIAS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'y', 'o', 'a', 'mi', 'mis', 'me', 'que', 'como', 'no', 'se', 'lo', 'es', 'por', 'para', 'con', 'al', 'hay', 'yo', 'tu', 'su', 'quiero', 'puedo']);

export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Verbos y nombres muy generales: ayudan a desempatar, pero no deciden solos. */
const GENERICAS = new Set(['anadir', 'cambiar', 'carta', 'plato']);

const RAIZ = new Map<string, string>();
SINONIMOS.forEach((g) => g.forEach((p) => RAIZ.set(p, g[0])));
const raiz = (p: string) => RAIZ.get(p) ?? RAIZ.get(p.replace(/(es|s)$/, '')) ?? p.replace(/(es|s)$/, '');

function tokens(texto: string): string[] {
  return normalizar(texto).split(' ').filter((p) => p.length > 1 && !PALABRAS_VACIAS.has(p)).map(raiz);
}

/** Devuelve los temas que mejor encajan con lo escrito (máximo `max`). */
export function buscarTemas(temas: TemaAyuda[], consulta: string, max = 3): TemaAyuda[] {
  const q = normalizar(consulta);
  const qTokens = new Set(tokens(consulta));
  if (qTokens.size === 0) return [];
  return temas
    .map((t) => {
      let puntos = 0;
      let generica = false;
      for (const c of t.claves) {
        const cn = normalizar(c);
        if (cn.includes(' ') ? q.includes(cn) : false) puntos += 3;
        else {
          const comunes = tokens(c).filter((x) => qTokens.has(x));
          if (comunes.some((x) => !GENERICAS.has(x))) puntos += 2;
          else if (comunes.length && !generica) { puntos += 1; generica = true; }
        }
      }
      for (const x of tokens(t.pregunta)) if (qTokens.has(x) && !GENERICAS.has(x)) puntos += 1;
      return { t, puntos };
    })
    .filter((r) => r.puntos >= 2)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, max)
    .map((r) => r.t);
}

/** Temas de una sección primero; si no hay, los más frecuentes. */
export function temasDeSeccion(temas: TemaAyuda[], seccion: string | null, max = 4): TemaAyuda[] {
  const propios = seccion ? temas.filter((t) => t.secciones?.includes(seccion)) : [];
  const base = propios.length ? propios : temas.filter((t) => t.secciones?.includes('inicio'));
  return (base.length ? base : temas).slice(0, max);
}

/** Contexto que viaja con el ticket (y que Central muestra ordenado). */
export interface ContextoAyuda {
  seccion: string | null;
  camino: string[];
  busquedas: string[];
  pagina?: string;
}
