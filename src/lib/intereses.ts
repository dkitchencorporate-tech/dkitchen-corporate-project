/**
 * Motivos de solicitud de la web (29/09/2026). Cada botón sin pago directo
 * enlaza a `#solicitud-<clave>` (opcionalmente `~detalle`) y abre el formulario.
 */
export const INTERESES: Record<string, { nombre: string; titulo: string; sub: string; siguiente: string; boton: string }> = {
  auditoria: { nombre: 'Auditoría de canales', titulo: 'Reserva tu auditoría', sub: 'Déjanos tus datos y te escribimos para fijar la revisión y enviarte el pago de 47 €.', siguiente: 'Te enviaremos el enlace de pago y la fecha de entrega de tu informe.', boton: 'Reservar mi auditoría' },
  signature: { nombre: 'DKitchen Signature', titulo: 'Tu app, con tu marca', sub: 'Cuéntanos cómo vendes hoy y te preparamos una propuesta para tu local.', siguiente: 'Revisaremos tu negocio y te enviaremos una propuesta concreta.', boton: 'Quiero mi propuesta' },
  modelo: { nombre: 'Modelo de app', titulo: 'Quiero un modelo como este', sub: 'Dinos tu negocio y te contamos cómo quedaría con tu marca.', siguiente: 'Te enseñaremos cómo quedaría el modelo con tu marca y tu carta.', boton: 'Enviar solicitud' },
  'diseno-autor': { nombre: 'Diseño de autor a medida', titulo: 'Tu carta, desde cero', sub: 'Cuéntanos cómo imaginas tu carta: colores, ambiente, estilo. La diseñamos a medida.', siguiente: 'Prepararemos una primera propuesta de diseño para tu carta.', boton: 'Pedir mi diseño' },
  experience: { nombre: 'DKitchen Experience', titulo: 'Montemos tu primer evento', sub: 'Dinos qué día te cuesta llenar y te proponemos el formato que mejor encaja.', siguiente: 'Te propondremos un formato de evento y sus números.', boton: 'Quiero mi evento' },
  'dark-kitchen': { nombre: 'Entrevista Dark Kitchen', titulo: 'Solicita tu entrevista de admisión', sub: 'Revisamos tu cocina y tus números. Si no es rentable para ti, te lo decimos antes.', siguiente: 'Te propondremos día y hora para la entrevista de admisión.', boton: 'Solicitar entrevista' },
  marcas: { nombre: 'Marcas virtuales', titulo: 'Suma una marca a tu cocina', sub: 'Dinos qué cocina tienes y te decimos qué marca encaja mejor.', siguiente: 'Analizaremos tu cocina y te diremos qué marca encaja mejor.', boton: 'Enviar solicitud' },
  casos: { nombre: 'Quiero un caso como estos', titulo: 'Hablemos de tu negocio', sub: 'Cuéntanos cómo vendes hoy y te decimos qué tendría sentido para ti.', siguiente: 'Revisaremos tu caso y te diremos por dónde empezar.', boton: 'Enviar solicitud' },
  dudas: { nombre: 'Consulta', titulo: 'Pregúntanos lo que quieras', sub: 'Escríbenos tu duda y te respondemos personalmente.', siguiente: 'Te responderemos personalmente a tu consulta.', boton: 'Enviar consulta' },
  partner: { nombre: 'Partner', titulo: 'Quiero ser partner', sub: 'Cuéntanos a qué te dedicas y con qué clientes trabajas.', siguiente: 'Te enviaremos las condiciones del programa de partners.', boton: 'Enviar solicitud' },
  propuesta: { nombre: 'Propuesta para mi local', titulo: 'Antes de irte: una propuesta gratis', sub: 'Déjanos tus datos y te enviamos qué mejoraríamos en tu local para vender más. Sin compromiso.', siguiente: 'Revisaremos tu local y te enviaremos una propuesta sin compromiso.', boton: 'Quiero mi propuesta' },
  contacto: { nombre: 'Contacto', titulo: 'Escríbenos', sub: 'Déjanos tus datos y te contactamos.', siguiente: 'Te contactaremos lo antes posible.', boton: 'Enviar' },
};
