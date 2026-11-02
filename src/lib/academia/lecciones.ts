import 'server-only';
import { QR_MENU, FUNDADOR, BASE_OPERATIVA, EXPERIENCE, AUDITORIA_CANALES, SERVICIOS_QR, formatPrecio } from '@/lib/pricing-config';

/**
 * Lecciones de la Academia (0116, 02/11/2026): el aprendizaje antes de los tests. Cada lección es una secuencia
 * de pasos interactivos: teoría con ejemplos («dilo así / no lo digas así»), preguntas que corrige el SERVIDOR
 * (el navegador nunca recibe la respuesta buena), ejercicios de ordenar y calculadoras con números reales.
 * Para completar una lección hay que acertar todas sus preguntas; la base la registra como L1–L8 «leccion».
 * NINGÚN importe a mano: todo sale de pricing-config.
 */
const e = (n: number) => formatPrecio(n);
const Q = QR_MENU.planes;
const S = BASE_OPERATIVA;
const T = S.mantenimiento.tramos;
const X = EXPERIENCE.tarifas;

export type Teoria = { tipo: 'teoria'; titulo: string; parrafos: string[]; clave?: string; bien?: string[]; mal?: string[] };
export type PreguntaL = { tipo: 'pregunta'; texto: string; opciones: string[]; correcta: number; porque: string };
export type Ordenar = { tipo: 'ordenar'; texto: string; orden: string[]; porque: string };
export type Widget = { tipo: 'calc_comisiones' | 'calc_plan' };
export type Paso = Teoria | PreguntaL | Ordenar | Widget;
export type Leccion = { id: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8'; titulo: string; objetivo: string; minutos: number; pasos: Paso[] };

export const LECCIONES: Leccion[] = [
  {
    id: 'L1', titulo: 'DKitchen en 10 minutos', minutos: 10,
    objetivo: 'Qué vendemos, a quién, cómo gana dinero DKitchen y cuál es exactamente tu papel.',
    pasos: [
      { tipo: 'teoria', titulo: 'Qué es DKitchen', parrafos: [
        'DKitchen digitaliza bares y restaurantes con una escalera de productos: empieza por lo pequeño y barato (la Carta QR) y sube hasta lo grande (la app propia Signature y los eventos Experience).',
        'La escalera tiene 4 peldaños: 1) Carta QR por planes (Carta, Local y Sala) y su oferta de lanzamiento Fundador; 2) Experience, eventos con entradas para los días flojos; 3) Auditoría de canales, un diagnóstico pagado de su presencia en Google, reseñas, redes y carta; 4) Signature, su propia app de pedidos con su marca.',
        'El 90 % de tus primeras ventas serán Carta QR. Signature y Experience llegan cuando el dueño ya confía en ti.',
      ], clave: 'Vende el peldaño que le resuelve un problema HOY. El resto llega solo cuando confía en ti.' },
      { tipo: 'teoria', titulo: 'Cómo gana dinero DKitchen (y cómo no)', parrafos: [
        'DKitchen cobra cuotas y precios cerrados y publicados. NUNCA cobra comisión por pedido ni por entrada: ni en la Carta QR, ni en Signature, ni en Experience. Es nuestra mayor diferencia frente a Glovo, Just Eat o las ticketeras.',
        'Todo cobro pasa por el checkout de DKitchen con Stripe. El precio lo pone el servidor, no tú: no hay forma de «hacer un precio» fuera de Central.',
      ], bien: ['«Pagas una cuota fija y lo que vendes es tuyo, sin comisión por pedido.»'], mal: ['«Nos llevamos un pequeño porcentaje»: falso y rompe la regla número uno.', '«Te lo dejo más barato si me pagas a mí»: tú nunca tocas el dinero del cliente.'] },
      { tipo: 'pregunta', texto: 'Un dueño te pregunta qué porcentaje se queda DKitchen de cada pedido que entra por su Carta QR o su app Signature.', opciones: ['Ninguno: DKitchen cobra cuotas y precios cerrados, nunca comisión por pedido', 'Un 5 % para cubrir la pasarela', 'Depende del volumen del local', 'Solo en Signature, a partir de 1.000 pedidos'], correcta: 0, porque: 'DKitchen nunca cobra comisión (regla comercial fija). La pasarela es la del propio local y sus costes son los de Stripe, no de DKitchen.' },
      { tipo: 'teoria', titulo: 'El recorrido de un cliente', parrafos: [
        'Prospecto (lo registras en 3 toques) → demo (le enseñas su carta en su móvil) → enlace de pago (lo crea Central o el alta desde tu móvil) → pago en Stripe → cuenta y contraseña automáticas → activo (Central lo ve en su tablero) → seguimiento.',
        'Tu trabajo termina cuando el cliente paga y le dejas funcionando. Tu comisión es el 20 % de lo cobrado durante sus 12 primeros meses: cuanto mejor encaja el producto, más dura el cliente y más cobras.',
      ], clave: 'No vendas para cobrar una vez: vende para que el cliente se quede 12 meses.' },
      { tipo: 'ordenar', texto: 'Ordena el recorrido de un cliente, del primer contacto a activo.', orden: ['Registrar el prospecto en Prospección', 'Demo con su carta en su móvil', 'Enlace de pago desde Central', 'Pago en Stripe', 'Cuenta creada y primer acceso', 'Cliente activo en su tablero'], porque: 'Sin registro no hay seguimiento; sin demo no hay deseo; sin enlace oficial no hay cobro válido.' },
      { tipo: 'pregunta', texto: 'Un cliente, contento tras la demo, te ofrece pagarte el primer mes en efectivo «para no liarse con la tarjeta».', opciones: ['Lo rechazas: le creas el enlace de pago oficial o le ayudas a pagar desde su móvil', 'Lo aceptas y lo pagas tú con tu tarjeta', 'Lo aceptas solo si te firma un recibo', 'Le dices que se lo dé a dirección en mano'], correcta: 0, porque: 'El agente nunca recibe dinero del cliente (contrato, cláusula 2). El único cobro válido es el del checkout con Stripe.' },
      { tipo: 'pregunta', texto: '¿Sobre qué cobras tu comisión de agente?', opciones: ['20 % de lo que DKitchen cobra de verdad (sin IVA) a tus clientes durante sus 12 primeros meses', '20 % del precio de tarifa aunque el cliente no pague', 'Un fijo por cada visita registrada', '20 % para siempre mientras el cliente siga'], correcta: 0, porque: 'Se comisiona lo efectivamente cobrado, sin IVA, 12 meses desde el alta. Reembolsos y devoluciones se descuentan.' },
    ],
  },
  {
    id: 'L2', titulo: 'Carta QR a fondo', minutos: 15,
    objetivo: 'Dominar los 3 planes por cantidades, el Fundador y elegir el plan correcto en 30 segundos.',
    pasos: [
      { tipo: 'teoria', titulo: 'Los 3 planes se eligen por CANTIDAD, no por funciones', parrafos: [
        `Todos los planes traen un poco de todo (carta, reservas, llamar al camarero, comandero, conexión con el TPV, banners). Lo que cambia es la cantidad: platos, mesas, camareros, reservas, idiomas y comandas.`,
        `Carta · ${e(Q.basico.mensual)}/mes: hasta ${Q.basico.topes.productos} platos, ${Q.basico.topes.mesas} mesas, ${Q.basico.topes.camareros} camarero, ${Q.basico.topes.reservasMes} reservas al mes, ${Q.basico.topes.idiomas} idioma. Sin primer mes simbólico.`,
        `Local · ${e(Q.ampliado.mensual)}/mes: hasta ${Q.ampliado.topes.productos} platos, ${Q.ampliado.topes.mesas} mesas, ${Q.ampliado.topes.camareros} camareros, ${Q.ampliado.topes.reservasMes} reservas, ${Q.ampliado.topes.idiomas} idiomas y pedido desde la mesa. Es el ÚNICO con el primer mes a ${e(QR_MENU.primerMes)}.`,
        `Sala · ${e(Q.sala.mensual)}/mes: hasta ${Q.sala.topes.productos} platos, ${Q.sala.topes.mesas} mesas, ${Q.sala.topes.camareros} camareros, ${Q.sala.topes.reservasMes} reservas, ${Q.sala.topes.idiomas} idiomas.`,
        `Idioma extra: ${e(SERVICIOS_QR.idiomaExtra)}. Puesta a punto (te la montamos nosotros): ${e(SERVICIOS_QR.puestaAPunto)}, o ${e(SERVICIOS_QR.puestaAPuntoBienvenida)} justo después de pagar. Sin permanencia en ningún plan; garantía de 30 días en Local.`,
      ], clave: `Si duda, Local: ${e(QR_MENU.primerMes)} el primer mes, 2 idiomas y pedido desde la mesa. Es la puerta de entrada.` },
      { tipo: 'calc_plan' },
      { tipo: 'pregunta', texto: `Restaurante con 18 mesas, 95 platos, 4 camareros y turistas que piden la carta en inglés y alemán.`, opciones: [`Sala (${e(Q.sala.mensual)}/mes): cubre 30 mesas, 120 platos, 6 camareros y 3 idiomas`, `Local (${e(Q.ampliado.mensual)}/mes) con un idioma extra`, `Carta (${e(Q.basico.mensual)}/mes) con dos idiomas extra`, 'Signature, porque tiene muchos platos'], correcta: 0, porque: `Supera a Local en mesas (15), platos (80), camareros (3) e idiomas (2). Sala lo cubre todo sin extras.` },
      { tipo: 'teoria', titulo: 'Fundador: la oferta de lanzamiento', parrafos: [
        `Fundador = el plan Sala a ${e(FUNDADOR.mensual)}/mes en lugar de ${e(Q.sala.mensual)} (un ${Math.round(FUNDADOR.descuento * 100)} % menos), cobrado por trimestre: ${e(FUNDADOR.trimestre)} cada 3 meses.`,
        `Solo para las primeras ${FUNDADOR.plazas} plazas o ${FUNDADOR.dias} días, lo que llegue antes. Comparte esas plazas con el Fundador de Signature. NUNCA se fracciona en cuotas mensuales: es trimestral.`,
      ], bien: ['«Con su volumen, el Fundador le deja la Sala a precio de fundador mientras siga con nosotros.»'], mal: ['«Le pongo el Fundador pagando mes a mes»: no existe.', '«Fundador gratis el primer mes»: no existe.'] },
      { tipo: 'pregunta', texto: 'Un local grande quiere el Fundador pero pagando mes a mes.', opciones: [`Le explicas que el Fundador se paga por trimestre (${e(FUNDADOR.trimestre)}); si no le cuadra, Sala normal mensual o Local con primer mes a ${e(QR_MENU.primerMes)}`, 'Se lo fraccionas en 3 cuotas tú mismo', 'Pides a dirección que lo haga mensual', 'Le dices que vuelva cuando pueda pagar el trimestre'], correcta: 0, porque: 'El Fundador nunca va en cuotas. Ofreces las alternativas reales sin perder la venta.' },
      { tipo: 'pregunta', texto: `Una cafetería de 5 mesas, 30 productos, 1 camarero y solo español. Pide «lo más barato».`, opciones: [`Carta (${e(Q.basico.mensual)}/mes), que cubre todo lo que tiene`, `Local, porque el primer mes es ${e(QR_MENU.primerMes)}`, 'Sala por si crece', 'Nada: es demasiado pequeña'], correcta: 0, porque: `Cabe de sobra en Carta (40 platos, 6 mesas). Local solo si quiere pedido desde la mesa o 2 idiomas: vender por encima de lo que necesita acaba en baja.` },
      { tipo: 'pregunta', texto: '¿Qué pasa si un local de Carta llega a 44 platos?', opciones: ['La base deja un 10 % de cortesía antes de bloquear; a partir de ahí, toca subir a Local', 'Se le cobra cada plato extra', 'Se le borra la carta', 'Nada: no hay límites reales'], correcta: 0, porque: 'Los topes son reales con un 10 % de cortesía. Es tu oportunidad de subirle de plan con un motivo claro.' },
    ],
  },
  {
    id: 'L3', titulo: 'Signature y la cuenta de comisiones', minutos: 15,
    objetivo: 'Saber a quién vender Signature y demostrarlo con sus propios números.',
    pasos: [
      { tipo: 'teoria', titulo: 'Qué es Signature', parrafos: [
        'Signature es la app propia del restaurante, con su marca, sus colores y su dominio: pedidos en mesa, para recoger y a domicilio, cobro con SU cuenta (Stripe, SumUp, Revolut Pay o Redsys), club de puntos y panel de gestión.',
        'Solo Signature tiene carrito del comensal y asistente con IA. Si deja de pagar el mantenimiento, se lleva su app: es suya.',
        `Precio: ${e(S.pagoUnico)} de entrada (o ${S.fraccionado.cuotas} cuotas de ${e(S.fraccionado.importeCuota)}), ${S.mantenimiento.mesesGratis} meses de mantenimiento incluidos y después ${e(T[0].cuota)}/mes (Arranque). El tramo sube por volumen: ${e(T[1].cuota)} desde ${e(T[0].hastaVentas)} de ventas o ${T[0].hastaPedidos} pedidos al mes, y ${e(T[2].cuota)} desde ${e(T[1].hastaVentas)}.`,
        `Fundador Signature: ${e(FUNDADOR.signature.entrada)} de entrada (nunca en cuotas) y ${e(FUNDADOR.signature.mensual)}/mes el primer año. Comparte las ${FUNDADOR.plazas} plazas con el Fundador de la Carta QR.`,
      ], clave: 'Signature se vende con una cuenta: lo que hoy paga en comisiones frente a lo que pagaría con su app.' },
      { tipo: 'calc_comisiones' },
      { tipo: 'pregunta', texto: 'Una pizzería hace 400 pedidos al mes en Glovo con un ticket medio de 20 € y una comisión del 30 %. ¿Cuánto paga al mes en comisiones?', opciones: ['2.400 €', '1.200 €', '8.000 €', '600 €'], correcta: 0, porque: '400 × 20 € = 8.000 € de ventas; el 30 % son 2.400 € al mes en comisiones.' },
      { tipo: 'pregunta', texto: `Siguiendo con esa pizzería: si llevara solo la cuarta parte de esos pedidos a su app Signature, ¿qué ahorraría al mes en comisiones (antes de la cuota)?`, opciones: ['600 €', '2.400 €', '200 €', '1.800 €'], correcta: 0, porque: '100 pedidos × 20 € × 30 % = 600 € al mes que deja de pagar a la plataforma. Con eso cubre la cuota y amortiza la entrada en pocos meses.' },
      { tipo: 'teoria', titulo: 'A quién NO vender Signature', parrafos: [
        'Un bar de barrio sin reparto ni marca no rentabiliza Signature: no tiene pedidos que recuperar. Su producto es la Carta QR (Local).',
        'Vender lo que no encaja te da una comisión y te quita un cliente a los tres meses. Tu comisión dura 12 meses: el encaje es tu dinero.',
      ], bien: ['«Su app propia tiene sentido cuando ya vende por plataformas. Hoy, lo que le sirve es la carta digital con pedido desde la mesa.»'], mal: ['«Quítese Glovo y gane el doble»: promesa de resultados.', '«Con la app le van a pedir el doble»: promesa de resultados.'] },
      { tipo: 'pregunta', texto: `Le interesa Signature pero no llega a ${e(S.pagoUnico)} de golpe y las plazas de Fundador se han agotado.`, opciones: [`Pago en ${S.fraccionado.cuotas} cuotas de ${e(S.fraccionado.importeCuota)} o por hitos, con OK de dirección`, 'Le haces un 25 % de descuento', 'Le das el precio Fundador igualmente', 'Le dices que ahorre y vuelva'], correcta: 0, porque: 'Las facilidades de pago existen y se piden a dirección desde el móvil. Tu tope de descuento sin permiso es 5 %.' },
      { tipo: 'pregunta', texto: 'Un cliente de Signature deja de pagar el mantenimiento a los 2 años. ¿Qué pasa con su app?', opciones: ['Se la lleva: la app y los datos de sus clientes son suyos', 'Se borra a los 30 días', 'Pasa a ser de DKitchen', 'Sigue funcionando gratis'], correcta: 0, porque: 'Es una promesa del contrato: cesión de la propiedad de su app; el motor común es de DKitchen.' },
    ],
  },
  {
    id: 'L4', titulo: 'Experience y Auditoría', minutos: 10,
    objetivo: 'Llenar los días flojos con eventos y abrir puertas con la Auditoría.',
    pasos: [
      { tipo: 'teoria', titulo: 'Experience: eventos con entradas', parrafos: [
        'Diseñamos el evento (7 formatos: maridaje, mesa del chef, catas…), su web con venta de entradas, QR único por asistente y los anuncios (el presupuesto de anuncios lo pone el local).',
        `Tarifas: primer evento ${e(X.primeraVez.precio)} · siendo cliente de la Carta QR ${e(X.primeraParaClienteQr.precio)} · evento nuevo para un cliente recurrente ${e(X.nuevoEvento.precio)} · repetir el mismo evento ${e(X.reuso.precio)} · con más de 2 eventos hechos ${e(X.reusoFidelizado.precio)}.`,
        'La taquilla es 100 % del local, con su propio Stripe. DKitchen cobra 0 % de comisión. Piloto hasta −50 % solo con OK de dirección, para clientes que ya han dicho no a todo lo demás.',
      ], bien: ['«¿Qué hace los martes con ese salón?»'], mal: ['«Le llenamos el local»: promesa de resultados.'] },
      { tipo: 'pregunta', texto: 'Cliente de la Carta QR activo que quiere su primer evento de maridaje. ¿Qué precio le das?', opciones: [`${e(X.primeraParaClienteQr.precio)}`, `${e(X.primeraVez.precio)}`, `${e(X.reuso.precio)}`, `${e(X.reusoFidelizado.precio)}`], correcta: 0, porque: 'Primera Experience de un cliente QR activo: tarifa especial. Así se sube peldaño en la escalera.' },
      { tipo: 'pregunta', texto: 'Un local vende 40 entradas a 35 € en su evento. ¿Cuánto se queda DKitchen de esa taquilla?', opciones: ['0 €: la taquilla es entera del local', '140 € (10 %)', '70 € (5 %)', 'Depende del formato'], correcta: 0, porque: 'Experience cobra una tarifa fija por el evento; la taquilla (1.400 € aquí) va a la cuenta Stripe del local.' },
      { tipo: 'teoria', titulo: 'Auditoría de canales', parrafos: [
        `Un diagnóstico hecho por una persona: ficha de Google, reseñas, fotos, posición en su zona, redes y rentabilidad de su carta con escandallo, con un informe ordenado por impacto y una reunión 1 a 1. Precio: ${e(AUDITORIA_CANALES.precioOferta)} (antes ${e(AUDITORIA_CANALES.precioAncla)}).`,
        'Sirve para abrir la puerta en locales que no quieren «otra app»: el informe enseña dónde pierden clientes y casi siempre termina en Carta QR, Experience o Signature.',
      ], clave: 'La Auditoría no compite con la Carta QR: la prepara.' },
      { tipo: 'pregunta', texto: 'Un dueño desconfiado dice que no quiere más aplicaciones, pero se queja de que en Google le salen reseñas malas sin contestar.', opciones: [`Le ofreces la Auditoría (${e(AUDITORIA_CANALES.precioOferta)}): un informe de su Google, reseñas y carta con lo que arreglar primero`, 'Le vendes Signature', 'Le prometes subirle a 5 estrellas', 'Te despides: no hay venta'], correcta: 0, porque: 'Encaja con su dolor (reseñas) sin «otra app», y abre la puerta al resto de la escalera.' },
    ],
  },
  {
    id: 'L5', titulo: 'Diagnóstico: leer un local en 3 minutos', minutos: 12,
    objetivo: 'Detectar señales, hacer las preguntas correctas y proponer el producto que encaja.',
    pasos: [
      { tipo: 'teoria', titulo: 'Las señales que se ven desde la puerta', parrafos: [
        'Carta en pizarra o PDF → Carta QR. Turistas, terraza en zona de paso → 2 o 3 idiomas (Local o Sala). Bolsas de Glovo o Just Eat en la barra → Signature. Salón vacío entre semana → Experience. Muchas reseñas sin responder → Auditoría.',
        'Antes de entrar, 3 minutos con el móvil: su ficha de Google (horario, reseñas, fotos), su Instagram y si sale en plataformas de reparto. Lo anotas en el prospecto.',
      ] },
      { tipo: 'teoria', titulo: 'Las 4 preguntas de diagnóstico', parrafos: [
        'Situación: «¿Cómo actualiza ahora la carta cuando cambia un precio?»',
        'Dolor: «¿Cuántas veces al día le preguntan qué hay o si algo lleva gluten?»',
        'Impacto: «¿Cuánto le deja cada mes en comisiones?» / «¿Qué hace el martes con ese salón?»',
        'Siguiente paso: «¿Le enseño cómo quedaría la suya, en su móvil, ahora?»',
      ], clave: 'Quien pregunta, dirige. Quien suelta el catálogo, pierde.', bien: ['Preguntar primero, enseñar después, precio corto al final.'], mal: ['Soltar los 3 planes, Signature y Experience en el primer minuto.'] },
      { tipo: 'ordenar', texto: 'Ordena una visita a pie bien hecha.', orden: ['3 minutos de preparación con el móvil (Google, Instagram, plataformas)', 'Entrar en hora tranquila y presentarte como agente de DKitchen', 'Pregunta de situación y de dolor', 'Demo con su carta en su móvil', 'Precio corto y siguiente paso con fecha', 'Registrar la visita en Prospección (3 toques)'], porque: 'Preparar, preguntar, enseñar, cerrar y registrar: ese orden es el que convierte.' },
      { tipo: 'pregunta', texto: 'Hotel de 4 estrellas con restaurante. Te atiende el jefe de sala, que dice que «le encanta» pero que decide la dirección del hotel.', opciones: ['Pides cita con el decisor (director o propietario) y le preparas la demo con su carta en 3 idiomas', 'Le dejas el enlace de pago al jefe de sala', 'Vuelves cada semana hasta que el jefe de sala decida', 'Lo das por perdido'], correcta: 0, porque: 'Sin decisor no hay venta. Tu objetivo en esa visita es conseguir la cita, no cerrar.' },
      { tipo: 'pregunta', texto: 'Gastrobar con marca fuerte en Instagram, 250 pedidos al mes en Just Eat y carta en PDF. ¿Por dónde entras?', opciones: ['Por el dolor más caro: las comisiones de reparto (Signature), con la Carta QR como entrada si no está listo', 'Por la Carta QR y no mencionas el reparto', 'Por Experience', 'Por la Auditoría'], correcta: 0, porque: 'Su mayor fuga de dinero son las comisiones. Si Signature le parece mucho, Local le deja dentro de la escalera.' },
      { tipo: 'pregunta', texto: 'Chiringuito de playa que abre de mayo a octubre, 20 mesas, extranjeros. ¿Qué le propones?', opciones: ['Sala o Local sin permanencia: se da de baja en invierno y vuelve en primavera', 'Fundador, porque es para siempre', 'Signature con mantenimiento todo el año', 'Nada hasta mayo'], correcta: 0, porque: 'Sin permanencia encaja con la temporada. El Fundador es trimestral y pensado para quien está todo el año.' },
      { tipo: 'pregunta', texto: '¿Cuál es la mejor pregunta para abrir con una cafetería con mucha rotación y la barra llena?', opciones: ['«¿Cuántas veces al día le preguntan qué hay o le piden la carta?»', '«¿Conoce DKitchen?»', '«¿Le interesa una app?»', '«¿Cuánto paga de luz?»'], correcta: 0, porque: 'Pregunta de dolor concreta, que el dueño vive cada día y que la carta con pedido desde la mesa resuelve.' },
    ],
  },
  {
    id: 'L6', titulo: 'Objeciones: el método', minutos: 15,
    objetivo: 'Responder a cualquier objeción sin discutir, con hechos y con un siguiente paso.',
    pasos: [
      { tipo: 'teoria', titulo: 'Método EPRS', parrafos: [
        'Escuchar sin interrumpir. Preguntar qué hay detrás («¿Qué le hace dudar: el precio, el tiempo o si le servirá?»). Responder con un hecho verificable, no con una opinión. Siguiente paso con fecha.',
        'Una objeción no es un no: es una pregunta mal hecha. El no de verdad es cuando no hay dolor, no hay decisor o no responde (regla 2 de 3).',
      ], clave: 'Nunca discutas. Pregunta, demuestra y propón.' },
      { tipo: 'teoria', titulo: 'Las 8 objeciones de cada día', parrafos: [
        '«Ya tengo la carta en PDF» → «El PDF no se actualiza solo ni se traduce. Mírelo en su móvil» (demo).',
        `«Es caro» → «El primer mes es ${e(QR_MENU.primerMes)}, sin permanencia y con garantía de 30 días.»`,
        '«Ya tengo TPV» → «No lo sustituimos: le mandamos las comandas; si su TPV lo permite, lo conectamos.»',
        '«Lo tengo que pensar» → «¿Qué le hace dudar?» y fecha concreta para volver.',
        '«Mis clientes son mayores» → «La carta se abre con la cámara, sin instalar nada, y el camarero sigue atendiendo igual.»',
        '«Vendo por Glovo» → la cuenta de comisiones con sus números y Signature como canal propio complementario.',
        '«Esto es otra estafa» → hechos: demo con su carta, sin permanencia, pago seguro con Stripe, factura y contrato, empresa de la zona.',
        '«No tengo tiempo» → «Se lo montamos nosotros» (puesta a punto) y «son 5 minutos para enseñárselo ahora».',
      ] },
      { tipo: 'pregunta', texto: '«Lo tengo que pensar», después de una buena demo.', opciones: ['«Claro. ¿Qué le hace dudar: el precio, el tiempo o si le servirá?» y cierras una fecha concreta', '«Vale, le llamo un día de estos»', '«Si lo firma hoy le hago un 15 %»', '«Piénselo, pero se acaban las plazas»'], correcta: 0, porque: 'Descubres la objeción real y fijas el siguiente paso. El 15 % pasa de tu tope (5 %) y la presión falsa quema la confianza.' },
      { tipo: 'pregunta', texto: '«Mis clientes son mayores, no van a usar el móvil».', opciones: ['«La carta se abre con la cámara, sin instalar nada; quien quiera, sigue pidiendo al camarero como siempre»', '«Los mayores ya usan todos el móvil»', '«Pues póngale una carta en papel también»', '«Entonces no es para usted»'], correcta: 0, porque: 'Respuesta con hecho (sin instalar, convive con el camarero), sin contradecirle ni rendirte.' },
      { tipo: 'pregunta', texto: '«Esto es otra estafa, ya me engañaron con una web».', opciones: ['Hechos verificables: demo con su carta ahora, sin permanencia, garantía, pago con Stripe, factura y contrato', '«Nosotros somos diferentes, confíe en mí»', '«Le hago el primer mes gratis»', '«Si no confía, no hay nada que hacer»'], correcta: 0, porque: 'La desconfianza se vence con pruebas, no con promesas. «Gratis» no existe y refuerza la sospecha.' },
      { tipo: 'pregunta', texto: '«Ya tengo TPV y no lo voy a cambiar».', opciones: ['«No lo sustituimos: le mandamos las comandas; si su TPV lo permite, lo conectamos»', '«Nuestro TPV es mejor, cámbielo»', '«Se lo integramos mañana sin coste»', '«Entonces no lo necesita»'], correcta: 0, porque: 'Convivimos con su TPV. Prometer integraciones garantizadas rompe la regla de no prometer lo que no controlas.' },
      { tipo: 'ordenar', texto: 'Ordena la respuesta a «Es caro» siguiendo el método.', orden: ['Escuchar sin interrumpir', '«¿Caro comparado con qué?»', `Hecho: ${e(QR_MENU.primerMes)} el primer mes, sin permanencia, garantía de 30 días`, 'Siguiente paso: «¿Lo dejamos activo hoy y lo prueba con sus clientes?»'], porque: 'Escuchar, preguntar, responder con hecho y proponer.' },
    ],
  },
  {
    id: 'L7', titulo: 'Prospección a pie, digital y la ley', minutos: 15,
    objetivo: 'Trabajar una zona con método, escribir bien en digital y no romper nunca la ley.',
    pasos: [
      { tipo: 'teoria', titulo: 'La ruta a pie', parrafos: [
        'Horas buenas: 10:30–12:30 y 16:30–19:00. Nunca a la hora punta de comidas o cenas. Si la barra está llena: «Vuelvo a las 17:00, ¿le viene bien?» y lo anotas.',
        'Cada visita se registra el mismo día en Prospección en 3 toques (resultado, canal, siguiente paso). Sin registro, la visita no existe: ni para tu comisión ni para el embudo.',
      ] },
      { tipo: 'teoria', titulo: 'Digital: Instagram y WhatsApp', parrafos: [
        'Primer mensaje: 3 líneas, un detalle real de su local, una pregunta y sin enlaces. Ejemplo: «Hola, vuestras croquetas tienen las mejores fotos de la zona. ¿Os enseño cómo quedaría vuestra carta en el móvil, con fotos y en inglés?»',
        'Seguimiento a las 48 h con una frase y una pregunta. Máximo 3 toques en 10 días. El cierre nunca es por texto: audio de 2 minutos o llamada.',
      ], bien: ['3 líneas, detalle real, pregunta, sin enlace.'], mal: ['Un enlace con todos los precios en el primer mensaje.', 'Escribir cada día al que no responde.'] },
      { tipo: 'teoria', titulo: 'La ley: LSSI y datos personales', parrafos: [
        'LSSI (art. 21): no se envían comunicaciones comerciales por correo electrónico a quien no lo ha pedido o no tiene relación previa. Correo frío a un email de una web = infracción. Por eso el correo solo va con consentimiento registrado.',
        'RGPD: los datos de prospectos y clientes son de DKitchen. Los tratas solo dentro de Central, sin copiarlos a tu agenda ni a hojas propias, y los dejas al terminar.',
        'Si alguien te bloquea o dice que no, se respeta y se marca como perdido con nota. Escribir desde otro número es acoso.',
      ], clave: 'Ninguna venta vale una denuncia. Si dudas, no envíes.' },
      { tipo: 'pregunta', texto: 'Encuentras en la web de un restaurante su email de contacto. ¿Puedes mandarle la propuesta comercial por correo?', opciones: ['No: sin consentimiento ni relación previa, la LSSI lo prohíbe. Contacto por visita, teléfono o DM', 'Sí, porque el email es público', 'Sí, si pones «baja» al final', 'Solo si es una empresa'], correcta: 0, porque: 'Que un email sea público no da consentimiento para comunicaciones comerciales (LSSI art. 21).' },
      { tipo: 'pregunta', texto: 'Tres mensajes en 10 días sin respuesta a un prospecto digital.', opciones: ['Lo cierras como frío con fecha de reintento y avanzas', 'Le escribes cada día hasta que conteste', 'Le mandas un correo', 'Le escribes desde otra cuenta'], correcta: 0, porque: 'Regla de los 3 toques en 10 días. Tu tiempo vale más; el reintento queda programado.' },
      { tipo: 'pregunta', texto: '¿Cuándo das un caso por perdido?', opciones: ['Cuando se cumplen 2 de 3: sin decisor tras 2 contactos · sin dolor tras la demo · 3 toques sin respuesta en 10 días', 'Al primer «no»', 'Nunca: siempre se puede', 'Cuando dirección lo diga'], correcta: 0, porque: 'La regla 2 de 3 evita perseguir imposibles y quemar zonas.' },
      { tipo: 'ordenar', texto: 'Ordena el trabajo digital con un prospecto de Instagram.', orden: ['Mirar su perfil y anotar un detalle real', 'Primer DM: 3 líneas y una pregunta, sin enlaces', 'Si responde: pedir foto de su carta y preparar la demo', 'Seguimiento a las 48 h si no responde', 'Cierre por audio o llamada con enlace de pago'], porque: 'Personalizar, preguntar, demostrar, seguir y cerrar por voz.' },
    ],
  },
  {
    id: 'L8', titulo: 'Cierre, palancas y lo que nunca se dice', minutos: 12,
    objetivo: 'Cerrar en el momento con las palancas permitidas y sin romper ninguna regla.',
    pasos: [
      { tipo: 'teoria', titulo: 'Palancas', parrafos: [
        `Sin pedir permiso: Local con primer mes a ${e(QR_MENU.primerMes)}, Fundador, las ofertas activas de Central → Ofertas y hasta un 5 % de descuento. Puesta a punto a ${e(SERVICIOS_QR.puestaAPuntoBienvenida)} justo después de pagar.`,
        'Con OK de dirección (se pide desde el móvil y se responde en minutos): descuento del 6 al 10 %, montaje gratis (cupo limitado, nunca se anuncia), Experience piloto hasta −50 %, Signature fraccionado o por hitos.',
      ], clave: 'Primero valor, luego palanca pública, y solo al final la palanca con OK.' },
      { tipo: 'teoria', titulo: 'El cierre en el momento', parrafos: [
        'Cuando dice «venga»: alta desde tu móvil en 4 pasos, el enlace de pago sale en el momento y lo paga ahí, en su móvil, con tarjeta. No «le mando la información»: un sí que se va a casa se enfría.',
        'Después del pago, Central crea su cuenta y le llega el correo con la contraseña. Tú le ayudas a entrar la primera vez y le dejas la carta funcionando.',
      ] },
      { tipo: 'teoria', titulo: 'Lo que nunca se dice', parrafos: [
        'Nunca: «DKitchen cobra comisión», «le garantizo más clientes o más ventas», «gratis», «le quitamos Glovo», «montaje gratis» en público, ofertas que no estén en Central, descuentos por encima de tu tope sin OK, el Fundador en cuotas.',
        'Romper una de estas reglas suspende un escenario aunque lo demás esté perfecto. En la calle, rompe la confianza del cliente y el contrato.',
      ], mal: ['«Se lo dejo gratis el primer mes».', '«Con esto llena el local».', '«Le hago un 20 % si firma hoy».'] },
      { tipo: 'pregunta', texto: 'A punto de firmar Local, el dueño te pide «un 15 % y lo cierro ahora».', opciones: [`Valor primero (puesta a punto a ${e(SERVICIOS_QR.puestaAPuntoBienvenida)}, garantía); si insiste, pides OK a dirección para un máximo del 10 %`, 'Le das el 15 % para no perderlo', 'Le dices que no hay descuentos', 'Le prometes el 15 % «el mes que viene»'], correcta: 0, porque: 'Tu tope es 5 %, con OK hasta 10 %. El 15 % no existe. Defender el valor primero suele bastar.' },
      { tipo: 'pregunta', texto: 'El cliente dice «venga, lo hacemos». ¿Qué haces?', opciones: ['Alta desde el móvil en 4 pasos y enlace de pago en ese momento', '«Le mando la información por correo esta noche»', '«Mañana vuelvo con el contrato»', 'Le pides que entre él en la web cuando pueda'], correcta: 0, porque: 'El cierre se hace en el momento. Cada hora que pasa baja la probabilidad de pago.' },
      { tipo: 'pregunta', texto: '¿Cuál de estas frases puedes decir en un reel o en una visita?', opciones: [`«El primer mes de Local es ${e(QR_MENU.primerMes)}, sin permanencia»`, '«Montaje gratis para los primeros 20»', '«Le garantizamos un 30 % más de ventas»', '«DKitchen solo cobra un 3 % por pedido»'], correcta: 0, porque: 'Es una palanca pública y cierta. Las otras rompen reglas: el montaje gratis no se anuncia, no se prometen resultados y no hay comisión.' },
      { tipo: 'ordenar', texto: 'Ordena el uso de palancas ante un «es caro».', orden: ['Defender el valor con sus números', `Palanca pública: ${e(QR_MENU.primerMes)} el primer mes, sin permanencia`, 'Descuento propio de hasta 5 %', 'Pedir OK a dirección para 6–10 % o montaje gratis'], porque: 'De menos a más coste para DKitchen: así proteges el margen y tu credibilidad.' },
    ],
  },
];

/** Lo que ve el navegador: sin respuestas correctas ni explicaciones. El orden de «ordenar» llega barajado. */
export type PasoVista = Teoria | Widget | { tipo: 'pregunta'; texto: string; opciones: string[] } | { tipo: 'ordenar'; texto: string; items: string[] };
export type LeccionVista = { id: Leccion['id']; titulo: string; objetivo: string; minutos: number; pasos: PasoVista[] };
const barajar = <T,>(a: T[], semilla: number) => { const b = [...a]; let s = semilla; for (let i = b.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export function leccionesVista(): LeccionVista[] {
  return LECCIONES.map((l) => ({
    id: l.id, titulo: l.titulo, objetivo: l.objetivo, minutos: l.minutos,
    pasos: l.pasos.map((p, i): PasoVista => {
      if (p.tipo === 'pregunta') { let op = barajar(p.opciones, i * 17 + l.id.charCodeAt(1)); if (op[0] === p.opciones[p.correcta]) op = [...op.slice(1), op[0]]; return { tipo: 'pregunta', texto: p.texto, opciones: op }; }
      if (p.tipo === 'ordenar') { let it = barajar(p.orden, i * 31 + 7); if (it.every((x, k) => x === p.orden[k])) it = [...it].reverse(); return { tipo: 'ordenar', texto: p.texto, items: it }; }
      return p;
    }),
  }));
}

/** Corrige un paso. Para «pregunta», `r` es el texto de la opción elegida (las opciones no se barajan en el navegador, se compara por texto). */
export function corregirPaso(leccion: string, paso: number, r: unknown): { ok: boolean; porque: string } | null {
  const p = LECCIONES.find((l) => l.id === leccion)?.pasos[paso];
  if (!p) return null;
  if (p.tipo === 'pregunta') return { ok: r === p.opciones[p.correcta], porque: p.porque };
  if (p.tipo === 'ordenar') return { ok: Array.isArray(r) && r.length === p.orden.length && r.every((x, i) => x === p.orden[i]), porque: p.porque };
  return null;
}
export function leccionSuperada(leccion: string, respuestas: Record<string, unknown>): boolean {
  const l = LECCIONES.find((x) => x.id === leccion);
  if (!l) return false;
  return l.pasos.every((p, i) => (p.tipo === 'pregunta' || p.tipo === 'ordenar') ? corregirPaso(leccion, i, respuestas[String(i)])?.ok === true : true);
}

/** Datos para las calculadoras (públicos: precios de catálogo). */
export const DATOS_CALCULADORAS = {
  planes: (['basico', 'ampliado', 'sala'] as const).map((id) => ({ id, nombre: Q[id].nombre, mensual: Q[id].mensual, topes: Q[id].topes })),
  idiomaExtra: SERVICIOS_QR.idiomaExtra,
  signature: { entrada: S.pagoUnico, tramos: T.map((t) => ({ nombre: t.nombre, cuota: t.cuota, hastaVentas: t.hastaVentas, hastaPedidos: t.hastaPedidos })), mesesGratis: S.mantenimiento.mesesGratis },
};
