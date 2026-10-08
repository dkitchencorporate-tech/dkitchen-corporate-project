import { QR_MENU, SERVICIOS_QR } from '@/lib/pricing-config';

/**
 * Preguntas que frenan a un bar a cambiar de sistema (08/10, karc0): TPV, impresoras
 * térmicas, fotos con IA y soporte. Se usan en /qr, /precios y /faq. Textos honestos
 * (decisión de karc0): la carta funciona al lado del TPV; el envío de comandas es la
 * Conexión TPV y solo con TPV que acepten pedidos externos.
 */
const local = QR_MENU.planes.ampliado;
export const PREGUNTAS_SIN_CAMBIAR: [string, string][] = [
  ['¿Tengo que cambiar mi TPV o mi caja?', `No. La carta funciona al lado de tu TPV o POS de siempre y tu equipo sigue cobrando igual. Si tu TPV acepta pedidos externos, lo conectamos para que lo que anota el camarero llegue solo, sin teclear dos veces (Conexión TPV: incluida en ${QR_MENU.planes.sala.nombre}, ${SERVICIOS_QR.conexionTpv} € + IVA al mes en ${local.nombre}, y los ${SERVICIOS_QR.mesesTpvConPuesta} primeros meses gratis con la puesta a punto).`],
  ['¿Y mis impresoras térmicas de tickets?', 'Siguen sirviendo. Con la Conexión TPV, las comandas salen por las impresoras que ya usa tu TPV. Lo revisamos y lo configuramos en remoto: sin visitas ni técnicos en tu local.'],
  ['¿Y si no tengo fotos de los platos?', `Las creamos con IA a partir del nombre y la descripción de cada plato. Empiezas con imágenes gratis y, si quieres más, hay bonos de pago único (${SERVICIOS_QR.bonoIa} € + IVA por ${SERVICIOS_QR.imagenesBonoIa}) que no caducan.`],
  ['¿Y si tengo un problema un sábado por la noche?', 'El asistente con IA de tu panel responde a cualquier hora, los 7 días, con los datos de tu local. Si hace falta una persona, te contestamos por WhatsApp o desde Soporte en menos de 24 horas laborables, y el día del arranque, el mismo día.'],
];

/** Respuesta común a «¿qué pasa después del primer mes a 1 €?» (el 1 € es solo del plan Local). */
export const DESPUES_PRIMER_MES = `Se cobra tu plan ${local.nombre} (${local.mensual} € + IVA al mes) a la misma tarjeta. Si no quieres seguir, lo cancelas antes desde tu panel, sin permanencia.`;
