import { QR_MENU, FUNDADOR, EXPERIENCE, SERVICIOS_QR, formatPrecio } from '@/lib/pricing-config';
import type { Opcion, Escenario } from './banco';

/**
 * Escenarios RAMIFICADOS (0116, 02/11/2026): la conversación cambia según lo que respondes. Una mala respuesta
 * lleva a un nodo de «dueño enfriado» del que hay que recuperarse (y puntúa menos); una regla rota suspende.
 * Cada opción dice a qué nodo va (`sig`); un nodo con `fin` termina el escenario.
 */
const e = (n: number) => formatPrecio(n);
export type OpcionR = Opcion & { sig?: string };
export type NodoR = { id: string; situacion: string; opciones: OpcionR[]; fin?: boolean };
export type EscenarioR = Omit<Escenario, 'id' | 'nodos'> & { id: 'E5' | 'E6'; ramificado: true; nodos: { pie: NodoR[]; digital: NodoR[] } };

export const ESCENARIOS_EXTRA: EscenarioR[] = [
  {
    id: 'E5', ramificado: true, titulo: 'Cafetería La Plaza', objetivo: 'Carta QR con la madre que decide y la hija que lleva las redes',
    ficha: 'Cafetería de 9 mesas en la plaza del pueblo, 45 productos, turistas en verano. La madre es la dueña; la hija lleva Instagram.',
    nodos: {
      pie: [
        { id: 'p1', situacion: 'Te atiende la hija, simpática: «Mi madre decide, pero yo llevo las redes. ¿Qué es esto?»', opciones: [
          { texto: 'Le enseñas en su móvil cómo quedaría su carta con fotos y en inglés, y le preguntas cuándo está su madre', puntos: 10, feedback: 'Ganas a la influyente y buscas a la decisora.', dim: 'prospector', sig: 'p2' },
          { texto: 'Le das los precios y le pides que se los pase a su madre', puntos: 3, feedback: 'Sin demo y sin cita: dependes de un mensajero.', dim: 'prospector', sig: 'p2f' },
          { texto: 'Le pides el email de su madre para mandarle la propuesta', puntos: -5, feedback: 'Correo sin consentimiento de la destinataria: LSSI.', regla: true, dim: 'digital', sig: 'p2f' }] },
        { id: 'p2f', situacion: 'Vuelves dos días después. La madre, seca: «Mi hija me dijo algo de unos precios. No me interesa».', opciones: [
          { texto: '«Lo entiendo. ¿Me deja enseñarle en un minuto su propia carta en el móvil? Si no le sirve, me voy»', puntos: 3, feedback: 'Recuperas con una demo corta y respetuosa.', dim: 'fisico', sig: 'p3' },
          { texto: '«Su hija estaba muy interesada, debería escucharla»', puntos: 0, feedback: 'Enfrentar a madre e hija cierra la puerta.', dim: 'fisico', sig: 'fin-mal' },
          { texto: 'Le dejas el flyer y te vas', puntos: 0, feedback: 'Abandonas sin demo: era recuperable.', dim: 'prospector', sig: 'fin-mal' }] },
        { id: 'p2', situacion: 'Vuelves a la hora que te dijo. La madre: «Mi hija dice que está bien, pero yo no entiendo de móviles».', opciones: [
          { texto: '«No tiene que entender nada: se la montamos nosotros y cambiar un precio es esto» (lo haces delante de ella en 10 segundos)', puntos: 10, feedback: 'Demuestras que es fácil: vences el miedo.', dim: 'fisico', sig: 'p3' },
          { texto: '«Es muy fácil, se lo prometo»', puntos: 3, feedback: 'Afirmar no convence; demostrar sí.', dim: 'fisico', sig: 'p3' },
          { texto: '«Pues que lo lleve su hija»', puntos: 0, feedback: 'Desprecias a la decisora.', dim: 'fisico', sig: 'p2f' }] },
        { id: 'p3', situacion: '«¿Y cuánto es? Somos una cafetería pequeña».', opciones: [
          { texto: `«Con 9 mesas y 45 productos le corresponde Local: ${e(QR_MENU.primerMes)} el primer mes, sin permanencia, con inglés y pedido desde la mesa. ¿Lo dejamos hoy?»`, puntos: 10, feedback: 'Plan correcto por cantidades (9 mesas > 6 de Carta) y cierre.', dim: 'cerrador', sig: 'p4' },
          { texto: `«Carta a ${e(QR_MENU.planes.basico.mensual)}/mes, que es lo más barato»`, puntos: 0, feedback: 'No cabe: Carta admite 6 mesas y 40 productos.', dim: 'prospector', sig: 'p4' },
          { texto: '«El primer mes gratis y luego ya vemos»', puntos: -5, feedback: '«Gratis» no existe.', regla: true, dim: 'cerrador', sig: 'p4' }] },
        { id: 'p4', situacion: 'La madre mira a la hija y dice: «Venga, probamos».', fin: true, opciones: [
          { texto: `Alta desde tu móvil en 4 pasos, enlace de pago en el momento y les ofreces la puesta a punto a ${e(SERVICIOS_QR.puestaAPuntoBienvenida)}`, puntos: 10, feedback: 'Cierre en el momento con valor añadido.', dim: 'cerrador' },
          { texto: '«Les mando todo por correo esta noche»', puntos: 0, feedback: 'Un sí que se va a casa se enfría.', dim: 'cerrador' },
          { texto: '«Págueme a mí y yo lo activo»', puntos: -5, feedback: 'Nunca tocas el dinero del cliente.', regla: true, dim: 'cerrador' }] },
        { id: 'fin-mal', situacion: 'La madre da la conversación por terminada. ¿Qué haces ahora?', fin: true, opciones: [
          { texto: 'Lo registras como perdido con nota y reintento en primavera (antes de la temporada de turistas)', puntos: 10, feedback: 'Cerrar bien también es trabajo: el reintento queda con motivo.', dim: 'prospector' },
          { texto: 'Le escribes a la hija por Instagram para que convenza a su madre', puntos: 0, feedback: 'Rodear a la decisora quema el local.', dim: 'digital' },
          { texto: 'Vuelves mañana', puntos: 0, feedback: 'Ya ha dicho que no: respétalo.', dim: 'prospector' }] },
      ],
      digital: [
        { id: 'd1', situacion: 'La hija responde a tu DM: «¡Qué chulo! Pero decide mi madre y no usa el móvil».', opciones: [
          { texto: '«Te preparo la carta de vuestra cafetería para que se la enseñes en tu móvil. ¿Me pasas una foto de la carta actual?»', puntos: 10, feedback: 'Le das a la influyente algo que enseñar.', dim: 'digital', sig: 'd2' },
          { texto: '«Pásame el WhatsApp de tu madre»', puntos: 3, feedback: 'Pedir el contacto de un tercero sin su permiso incomoda.', dim: 'digital', sig: 'd2f' },
          { texto: '«Pues dile que es gratis el primer mes»', puntos: -5, feedback: '«Gratis» no existe.', regla: true, dim: 'digital', sig: 'd2f' }] },
        { id: 'd2f', situacion: 'La hija deja de contestar 4 días.', opciones: [
          { texto: 'Un único seguimiento con valor: «Te dejo cómo quedaría vuestra carta en inglés para los turistas» (sin enlace de pago)', puntos: 3, feedback: 'Recuperas aportando algo.', dim: 'digital', sig: 'd3' },
          { texto: 'Le escribes cada día', puntos: 0, feedback: 'Máximo 3 toques en 10 días.', dim: 'digital', sig: 'd-fin' },
          { texto: 'Buscas el email de la cafetería y escribes', puntos: -5, feedback: 'Correo frío: LSSI.', regla: true, dim: 'digital', sig: 'd-fin' }] },
        { id: 'd2', situacion: 'Te manda la foto. Le preparas la demo y te dice: «A mi madre le ha gustado. ¿Cuánto es?»', opciones: [
          { texto: `«Local: ${e(QR_MENU.primerMes)} el primer mes, sin permanencia. ¿Os llamo 5 minutos a las dos y lo dejamos activo?»`, puntos: 10, feedback: 'Precio corto y cierre por voz con la decisora.', dim: 'cerrador', sig: 'd3' },
          { texto: 'Le pegas el enlace de pago sin más', puntos: 3, feedback: 'Sin conversación con la decisora, el pago se queda pendiente.', dim: 'cerrador', sig: 'd3' },
          { texto: '«Depende, mejor lo hablamos otro día»', puntos: 0, feedback: 'Esquivar el precio enfría.', dim: 'cerrador', sig: 'd2f' }] },
        { id: 'd3', situacion: 'En la llamada, la madre: «¿Y si no la sé usar?»', fin: true, opciones: [
          { texto: `«Se la dejamos montada (puesta a punto a ${e(SERVICIOS_QR.puestaAPuntoBienvenida)}) y le enseño a cambiar un precio. Y sin permanencia»`, puntos: 10, feedback: 'Quitas el miedo con un servicio real.', dim: 'cerrador' },
          { texto: '«Su hija se la lleva»', puntos: 3, feedback: 'Delegar en la hija no responde a su miedo.', dim: 'cerrador' },
          { texto: '«Se la usamos nosotros todo el año gratis»', puntos: -5, feedback: 'No existe: promesa falsa.', regla: true, dim: 'cerrador' }] },
        { id: 'd-fin', situacion: 'No hay respuesta tras 10 días.', fin: true, opciones: [
          { texto: 'Frío con reintento en primavera y nota del contexto', puntos: 10, feedback: 'Correcto.', dim: 'digital' },
          { texto: 'Le escribes desde otra cuenta', puntos: -5, feedback: 'Acoso.', regla: true, dim: 'digital' },
          { texto: 'Lo borras sin nota', puntos: 0, feedback: 'Pierdes el contexto para el reintento.', dim: 'digital' }] },
      ],
    },
  },
  {
    id: 'E6', ramificado: true, titulo: 'Hotel Alcazaba', objetivo: 'Llegar al decisor y combinar Sala con Experience',
    ficha: 'Hotel de 4 estrellas con restaurante de 28 mesas, carta de 100 platos, clientes de 5 países y terraza vacía entre semana. Decide la directora, que casi nunca está.',
    nodos: {
      pie: [
        { id: 'h1', situacion: 'El jefe de sala te escucha con interés: «Me encanta, pero esto lo decide la directora».', opciones: [
          { texto: 'Le haces la demo en 3 idiomas, le pides que te ayude a conseguir 15 minutos con la directora y fijas día', puntos: 10, feedback: 'Aliado ganado y cita conseguida.', dim: 'prospector', sig: 'h2' },
          { texto: 'Le dejas el enlace de pago para que lo pase', puntos: 0, feedback: 'Un enlace sin decisor no se paga.', dim: 'cerrador', sig: 'h1f' },
          { texto: 'Le prometes una comisión si convence a la directora', puntos: -5, feedback: 'Sobornar a un empleado: inaceptable.', regla: true, dim: 'cerrador', sig: 'h1f' }] },
        { id: 'h1f', situacion: 'Pasan dos semanas sin noticias. Llamas y el jefe de sala dice que «no lo ha podido ver».', opciones: [
          { texto: 'Pides directamente una cita con la directora, con día y hora, mencionando lo que vio el jefe de sala', puntos: 3, feedback: 'Recuperas pidiendo lo que faltó desde el principio.', dim: 'prospector', sig: 'h2' },
          { texto: 'Sigues esperando', puntos: 0, feedback: 'Sin decisor, sin venta.', dim: 'prospector', sig: 'h-fin' },
          { texto: 'Escribes al email de reservas del hotel con la propuesta', puntos: -5, feedback: 'Correo comercial sin consentimiento.', regla: true, dim: 'digital', sig: 'h-fin' }] },
        { id: 'h2', situacion: 'La directora: «Tenemos 28 mesas, 100 platos y clientes de 5 países. ¿Qué nos sirve?»', opciones: [
          { texto: `Sala (${e(QR_MENU.planes.sala.mensual)}/mes: 30 mesas, 120 platos, 3 idiomas) + 2 idiomas extra a ${e(SERVICIOS_QR.idiomaExtra)}, o Fundador si quedan plazas (${e(FUNDADOR.mensual)}/mes por trimestre)`, puntos: 10, feedback: 'Plan exacto por cantidades y los idiomas que faltan.', dim: 'prospector', sig: 'h3' },
          { texto: 'Local con 3 idiomas extra', puntos: 0, feedback: 'Local no llega: 15 mesas y 80 platos.', dim: 'prospector', sig: 'h3' },
          { texto: 'Signature, porque es un hotel', puntos: 3, feedback: 'No hay reparto: su necesidad es la carta multilingüe.', dim: 'prospector', sig: 'h3' }] },
        { id: 'h3', situacion: '«¿Y la terraza? Entre semana no la usa nadie».', opciones: [
          { texto: `Experience: un evento (maridaje en la terraza) con entradas; siendo cliente de la Carta QR, ${e(EXPERIENCE.tarifas.primeraParaClienteQr.precio)} y la taquilla 100 % suya`, puntos: 10, feedback: 'Subes peldaño con la tarifa correcta.', dim: 'cerrador', sig: 'h4' },
          { texto: '«Le llenamos la terraza todos los jueves»', puntos: -5, feedback: 'Promesa de resultados.', regla: true, dim: 'cerrador', sig: 'h4' },
          { texto: '«Eso ya lo vemos otro día»', puntos: 3, feedback: 'Dejas pasar un dolor que ella misma te dio.', dim: 'cerrador', sig: 'h4' }] },
        { id: 'h4', situacion: '«Necesito que me lo mandes para enseñárselo a la propiedad».', fin: true, opciones: [
          { texto: 'Le dejas el enlace de su demo y una propuesta clara, y fijas fecha para cerrar con la propiedad presente', puntos: 10, feedback: 'Material para el último decisor y siguiente paso con fecha.', dim: 'cerrador' },
          { texto: '«Si no lo firma hoy, pierde el precio»', puntos: 0, feedback: 'Presión falsa ante un proceso legítimo.', dim: 'cerrador' },
          { texto: 'Le aplicas un 15 % para que lo apruebe la propiedad', puntos: -5, feedback: 'Fuera de tu tope y sin OK.', regla: true, dim: 'cerrador' }] },
        { id: 'h-fin', situacion: 'Un mes sin avances y sin acceso a la directora.', fin: true, opciones: [
          { texto: 'Perdido por falta de decisor (2 de 3), con reintento antes de la temporada alta y nota', puntos: 10, feedback: 'Correcto.', dim: 'prospector' },
          { texto: 'Te presentas en recepción cada semana', puntos: 0, feedback: 'Tu tiempo vale más.', dim: 'prospector' },
          { texto: 'Le escribes a la directora por LinkedIn cada día', puntos: 0, feedback: 'Insistir no es seguimiento.', dim: 'digital' }] },
      ],
      digital: [
        { id: 'hd1', situacion: 'La directora acepta tu solicitud de LinkedIn y te escribe: «¿Qué ofrecéis para hoteles?»', opciones: [
          { texto: '«Carta en el móvil en todos los idiomas de vuestros clientes y eventos para la terraza entre semana. ¿Le preparo la de su restaurante para que la vea?»', puntos: 10, feedback: 'Respuesta a su medida y demo.', dim: 'digital', sig: 'hd2' },
          { texto: 'Le mandas el catálogo completo en PDF', puntos: 3, feedback: 'Información sin conversación.', dim: 'digital', sig: 'hd2' },
          { texto: '«Os subimos la ocupación del restaurante un 30 %»', puntos: -5, feedback: 'Promesa de resultados.', regla: true, dim: 'digital', sig: 'hd-fin' }] },
        { id: 'hd2', situacion: 'Le gusta la demo: «¿Precio para 28 mesas y 5 idiomas?»', opciones: [
          { texto: `Sala ${e(QR_MENU.planes.sala.mensual)}/mes con 3 idiomas + 2 idiomas extra a ${e(SERVICIOS_QR.idiomaExtra)}; o Fundador si quedan plazas. «¿Le llamo 10 minutos y lo dejamos claro?»`, puntos: 10, feedback: 'Precio exacto y cierre por voz.', dim: 'cerrador', sig: 'hd3' },
          { texto: '«Le hago un precio especial por ser hotel»', puntos: 0, feedback: 'No hay precios especiales que tú puedas dar.', dim: 'cerrador', sig: 'hd3' },
          { texto: '«Depende de muchas cosas»', puntos: 3, feedback: 'Vago: genera desconfianza.', dim: 'cerrador', sig: 'hd3' }] },
        { id: 'hd3', situacion: '«Lo tiene que aprobar la propiedad la semana que viene».', fin: true, opciones: [
          { texto: 'Le preparas un resumen de una página con la demo y fijas la llamada justo después de esa reunión', puntos: 10, feedback: 'Siguiente paso con fecha y material para el decisor final.', dim: 'cerrador' },
          { texto: 'Le escribes a diario hasta la reunión', puntos: 0, feedback: 'Presión inútil.', dim: 'digital' },
          { texto: 'Le pides el email de la propiedad', puntos: 3, feedback: 'Mejor que ella lo presente: es su decisión.', dim: 'digital' }] },
        { id: 'hd-fin', situacion: 'La directora deja de responder.', fin: true, opciones: [
          { texto: 'Un único seguimiento aportando valor y, si no hay respuesta, frío con reintento', puntos: 10, feedback: 'Correcto.', dim: 'digital' },
          { texto: 'Le escribes a otros cargos del hotel', puntos: 0, feedback: 'Rodear al decisor quema el contacto.', dim: 'digital' },
          { texto: 'Le mandas un correo masivo al hotel', puntos: -5, feedback: 'LSSI.', regla: true, dim: 'digital' }] },
      ],
    },
  },
];
