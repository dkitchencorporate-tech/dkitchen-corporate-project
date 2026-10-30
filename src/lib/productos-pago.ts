import { AUDITORIA_CANALES, BASE_OPERATIVA, EXPERIENCE, FUNDADOR } from '@/lib/pricing-config';

/**
 * Productos de pago directo (29/09/2026). Cada uno tiene su página en
 * /pagar/<id> que explica qué compras, qué pagas y qué pasa después, y cobra
 * al momento en nuestro checkout (/pago, Stripe). El precio sale SIEMPRE de pricing-config.
 * `metadataPago` es el `producto` que ya entiende el webhook.
 */
export interface ProductoPago {
  id: string;
  metadataPago: string;
  nombre: string;
  titular: string;
  resumen: string;
  precio: number;
  nota: string;
  incluye: string[];
  despues: [string, string][];
  garantias: string[];
  volver: { href: string; t: string };
  /**
   * Mientras el producto se termina de construir (07/10/2026, decisión de
   * karc0): en lugar de cobrar, la página muestra un registro sin pago y
   * explica qué pasa después. Si existe, no se pinta el botón de pago.
   */
  registro?: { despues: [string, string][] };
}

export const PRODUCTOS_PAGO: Record<string, ProductoPago> = {
  auditoria: {
    id: 'auditoria', metadataPago: 'auditoria', nombre: 'Auditoría de canales',
    titular: 'Descubre dónde estás perdiendo clientes.',
    resumen: 'Revisamos uno a uno tu ficha de Google, tus reseñas, tus redes y tu carta, y te decimos qué arreglar primero.',
    precio: AUDITORIA_CANALES.precioOferta, nota: 'Pago único · sin suscripción',
    incluye: ['Tu ficha de Google: datos, horarios y categorías', 'Tus reseñas: cuáles responder y cómo', 'Tus fotos y tu posición en tu zona', 'Rentabilidad de tu carta con escandallo', 'Informe con las mejoras ordenadas por impacto', 'Reunión 1 a 1 para explicártelo'],
    despues: [['Al momento', 'Recibes la confirmación del pago en tu correo.'], ['En 24 horas laborables', 'Te escribimos para fijar la reunión y pedirte lo que necesitemos.'], ['En la reunión', 'Te entregamos el informe y lo repasamos contigo punto por punto.']],
    garantias: ['Pago seguro gestionado por Stripe', 'Factura a nombre de tu negocio', 'Revisado por una persona, no por una IA'],
    volver: { href: '/auditoria', t: 'Volver a Auditoría' },
  },
  signature: {
    id: 'signature', metadataPago: 'nucleo-operativo', nombre: 'DKitchen Signature',
    titular: 'Tu propia app de pedidos, con tu marca.',
    resumen: 'Tus clientes piden y pagan en tu app, sin comisiones por pedido. La montamos sobre una base que ya funciona en negocios reales.',
    precio: BASE_OPERATIVA.pagoUnico, nota: `Pago único · después ${BASE_OPERATIVA.mantenimiento.mensual} €/mes desde el mes ${BASE_OPERATIVA.mantenimiento.empiezaEnMes}`,
    incluye: ['App instalable con tu marca, tus colores y tu carta', 'Pedidos en mesa, para recoger y a domicilio',
      'Cobro con tu propia cuenta: Stripe, SumUp, Revolut Pay o Redsys', 'Club de fidelización con puntos y premios', 'Panel para gestionar pedidos y carta', `${BASE_OPERATIVA.mantenimiento.mesesGratis} meses de mantenimiento incluidos`, 'Sin comisión por pedido'],
    despues: [['Al momento', 'Recibes la confirmación del pago y el contrato en tu correo.'], ['En 24 horas laborables', 'Te llamamos para recoger tu marca, tu carta y tus fotos.'], ['Primera versión', 'Te enseñamos tu app funcionando para que pidas cambios.'], ['Publicación', 'Tu app queda publicada con tu dominio y empiezas a vender.']],
    garantias: ['Pago seguro gestionado por Stripe', 'Contrato y factura', 'La app y los datos de tus clientes son tuyos'],
    volver: { href: '/signature', t: 'Volver a Signature' },
  },
  /** Signature Fundador (0070): solo con el programa abierto (lo comprueba /api/pagar contra la base). */
  'signature-fundador': {
    id: 'signature-fundador', metadataPago: 'nucleo-operativo', nombre: 'DKitchen Signature · Fundador',
    titular: 'Tu propia app de pedidos, a precio de fundador.',
    resumen: `Las mismas condiciones de Signature con el precio de las primeras ${FUNDADOR.plazas} plazas: entrada de ${FUNDADOR.signature.entrada} € en lugar de ${BASE_OPERATIVA.pagoUnico} € y mantenimiento a ${FUNDADOR.signature.mensual} €/mes el primer año.`,
    precio: FUNDADOR.signature.entrada,
    nota: `Pago único · ${BASE_OPERATIVA.mantenimiento.mesesGratis} meses de mantenimiento incluidos · después ${FUNDADOR.signature.mensual} €/mes hasta cumplir el primer año y luego la tarifa de tu tramo (desde ${BASE_OPERATIVA.mantenimiento.mensual} €/mes)`,
    incluye: ['App instalable con tu marca, tus colores y tu carta', 'Pedidos en mesa, para recoger y a domicilio',
      'Cobro con tu propia cuenta: Stripe, SumUp, Revolut Pay o Redsys', 'Club de fidelización con puntos y premios', 'Panel para gestionar pedidos y carta', `${BASE_OPERATIVA.mantenimiento.mesesGratis} meses de mantenimiento incluidos`, 'Sin comisión por pedido', `Plaza de fundador: ${FUNDADOR.plazas} plazas compartidas o ${FUNDADOR.dias} días, lo primero que llegue`],
    despues: [['Al momento', 'Recibes la confirmación del pago y el contrato en tu correo.'], ['En 24 horas laborables', 'Te llamamos para recoger tu marca, tu carta y tus fotos.'], ['Primera versión', 'Te enseñamos tu app funcionando para que pidas cambios.'], ['Publicación', 'Tu app queda publicada con tu dominio y empiezas a vender.']],
    garantias: ['Pago seguro gestionado por Stripe', 'Contrato y factura', 'La app y los datos de tus clientes son tuyos'],
    volver: { href: '/signature', t: 'Volver a Signature' },
  },
  experience: {
    id: 'experience', metadataPago: 'experience', nombre: 'DKitchen Experience',
    titular: 'Tu primer evento, llave en mano.',
    resumen: 'Diseñamos el formato, la web de reservas y la comunicación del evento para llenar ese día que te cuesta.',
    precio: EXPERIENCE.tarifas.primeraVez.precio, nota: 'Pago único por evento · 0 % de comisión sobre la taquilla',
    incluye: ['Uno de nuestros 7 formatos, elegido contigo', 'Web del evento con venta de entradas', 'QR de entrada único por asistente', 'Anuncios gestionados (el presupuesto de anuncios lo pones tú)', 'El 100 % de la taquilla es tuyo'],
    despues: [['Al momento', 'Te creamos tu zona de Experience (te llega el correo para fijar tu contraseña): allí nos cuentas tu evento en 5 minutos.'], ['Cuando tú elijas', 'Agendas la llamada de arranque desde tu zona; en el día 3, el concepto para que lo apruebes.'], ['En unas 3 semanas', 'Tu evento queda listo: web, entradas y anuncios en marcha.']],
    garantias: ['Pago seguro gestionado por Stripe', 'Factura a nombre de tu negocio', 'Sin comisión sobre tus entradas'],
    volver: { href: '/experience', t: 'Volver a Experience' },
  },
};

/** Productos que el webhook trata con el aviso genérico (sin tubería propia). */
export const PRODUCTOS_WEBHOOK_GENERICO = ['experience'];
