import { QR_MENU, FUNDADOR, BASE_OPERATIVA, EXPERIENCE, SERVICIOS_QR, formatPrecio } from '@/lib/pricing-config';

/**
 * Banco de la Academia comercial (01/11, contenidos de 01 VENTAS/ACADEMIA_CONTENIDOS_2026-10-31.md).
 * NINGÚN importe escrito a mano: todo sale de pricing-config, así el test nunca queda desfasado.
 * Cada pregunta lleva su dimensión (para las 4 notas de Alex) y la mejora concreta si se falla.
 */
export type Dimension = 'prospector' | 'cerrador' | 'fisico' | 'digital';
export type Nivel = 'N1' | 'N2' | 'N3' | 'N4';
export type Pregunta = { id: string; nivel: Nivel; dim: Dimension; texto: string; opciones: string[]; correcta: number; porque: string; mejora: string };

const e = (n: number) => formatPrecio(n);
const P = {
  carta: e(QR_MENU.planes.basico.mensual), local: e(QR_MENU.planes.ampliado.mensual), sala: e(QR_MENU.planes.sala.mensual),
  primerMes: e(QR_MENU.primerMes), fundMes: e(FUNDADOR.mensual), fundTri: e(FUNDADOR.trimestre),
  sigEntrada: e(BASE_OPERATIVA.pagoUnico), sigFund: e(FUNDADOR.signature.entrada), sigFundMes: e(FUNDADOR.signature.mensual),
  sigCuotas: `${BASE_OPERATIVA.fraccionado.cuotas} cuotas de ${e(BASE_OPERATIVA.fraccionado.importeCuota)}`,
  exp1: e(EXPERIENCE.tarifas.primeraVez.precio), exp1Qr: e(EXPERIENCE.tarifas.primeraParaClienteQr.precio),
  puesta: e(SERVICIOS_QR.puestaAPunto), puestaB: e(SERVICIOS_QR.puestaAPuntoBienvenida), idioma: e(SERVICIOS_QR.idiomaExtra),
};
export const PRECIOS_TEXTO = P;

export const PREGUNTAS: Pregunta[] = [
  // ── N1 Base ──
  { id: 'n1-1', nivel: 'N1', dim: 'cerrador', texto: `¿Qué plan es el único con el primer mes a ${P.primerMes}?`, opciones: ['Local', 'Carta', 'Sala', 'Fundador'], correcta: 0, porque: `Solo Local entra por ${P.primerMes}; después ${P.local}/mes.`, mejora: 'Memoriza la palanca de entrada: Local a 1 € es la frase de los flyers.' },
  { id: 'n1-2', nivel: 'N1', dim: 'prospector', texto: 'Un restaurante quiere la carta en español, inglés y francés. ¿Qué le ofreces?', opciones: ['Sala, o Local + un idioma extra', 'Local tal cual', 'Carta con traductor'], correcta: 0, porque: `Local trae 2 idiomas; Sala 3. El idioma extra cuesta ${P.idioma}.`, mejora: 'Antes de proponer, pregunta cuántos idiomas necesita y cuenta con el plan.' },
  { id: 'n1-3', nivel: 'N1', dim: 'prospector', texto: '¿Qué tiene Signature que NO tiene la Carta QR?', opciones: ['Carrito propio y asistente con IA', 'Pedido desde la mesa', 'Llamar al camarero'], correcta: 0, porque: 'El pedido desde la mesa ya está en Local. Carrito y asistente son exclusivos de Signature.', mejora: 'Repasa M2: lo exclusivo de Signature es carrito propio + asistente.' },
  { id: 'n1-4', nivel: 'N1', dim: 'cerrador', texto: '¿Cuánta comisión cobra DKitchen por cada entrada de Experience?', opciones: ['0 %', '5 %', '10 %'], correcta: 0, porque: 'La taquilla es 100 % del local, con su Stripe. DKitchen cobra una tarifa fija por evento.', mejora: 'El 0 % de comisión es tu mejor argumento: dilo en la primera frase de Experience.' },
  { id: 'n1-5', nivel: 'N1', dim: 'cerrador', texto: 'Si un cliente de Signature deja de pagar el mantenimiento…', opciones: ['Se lleva su app a otro hosting', 'Se borra la app', 'La app pasa a ser de DKitchen'], correcta: 0, porque: 'La app es suya para siempre: si deja de pagar, se la lleva.', mejora: 'Usa «es tuya para siempre» para desmontar la desconfianza.' },
  { id: 'n1-6', nivel: 'N1', dim: 'cerrador', texto: 'El Fundador de la Carta QR se cobra…', opciones: [`${P.fundTri} cada trimestre`, `${P.fundMes} cada mes`, `${P.sala} cada mes`], correcta: 0, porque: `Equivale a ${P.fundMes}/mes, pero se cobra por trimestre.`, mejora: 'No confundas el equivalente mensual con el cobro real.' },
  { id: 'n1-7', nivel: 'N1', dim: 'digital', texto: '¿Se puede anunciar «montaje gratis» en un reel o un post?', opciones: ['No, nunca', 'Sí, en temporada baja', 'Solo en stories'], correcta: 0, porque: 'El montaje gratis solo existe ante una objeción fuerte y con OK de dirección. Nunca se anuncia.', mejora: 'Regla M5: lo que no está en Central → Ofertas no se anuncia.' },
  { id: 'n1-8', nivel: 'N1', dim: 'prospector', texto: 'Cafetería con 4 mesas y una carta de 25 productos. ¿Qué plan?', opciones: ['Carta', 'Sala', 'Signature'], correcta: 0, porque: 'Carta corta y pocas mesas: el plan Carta encaja.', mejora: 'Elige por cantidad: platos, mesas, camareros e idiomas.' },
  { id: 'n1-9', nivel: 'N1', dim: 'fisico', texto: 'Objeción fácil: «Ya tengo la carta en PDF».', opciones: ['«El PDF no se actualiza solo ni se traduce. Mírelo en su móvil» y demo', '«El PDF está anticuado»', '«Vale, si un día cambia me llama»'], correcta: 0, porque: 'Se demuestra con la demo, sin criticar lo suyo.', mejora: 'Ten la demo abierta antes de entrar: la respuesta es enseñar, no discutir.' },
  { id: 'n1-10', nivel: 'N1', dim: 'cerrador', texto: 'Objeción fácil: «Es caro».', opciones: [`«El primer mes es ${P.primerMes} y no hay permanencia»`, '«Le hago un 20 %»', '«Es lo que vale»'], correcta: 0, porque: 'La palanca pública de entrada resuelve el precio sin descontar.', mejora: 'Antes de bajar precio, usa la palanca pública (1 € + sin permanencia).' },
  // ── N2 Calle ──
  { id: 'n2-1', nivel: 'N2', dim: 'fisico', texto: 'Entras y el dueño está atendiendo con la barra llena.', opciones: ['«Vuelvo a las 17:00, ¿le viene bien?» y lo anotas en la ficha', 'Insistes dos minutos', 'Dejas el flyer y no vuelves'], correcta: 0, porque: 'Hora concreta y anotada: el siguiente paso existe.', mejora: 'Nunca te vayas sin hora concreta del siguiente contacto.' },
  { id: 'n2-2', nivel: 'N2', dim: 'cerrador', texto: '«¿Y esto cuánto cuesta?» en el primer minuto.', opciones: ['Precio corto y directo + una pregunta de diagnóstico', 'Esquivar el precio', 'Soltar los 3 planes y Signature'], correcta: 0, porque: 'Responder rápido genera confianza; la pregunta te devuelve el control.', mejora: 'Ensaya tu frase de precio de 5 segundos seguida de «¿cuántas mesas tiene?».' },
  { id: 'n2-3', nivel: 'N2', dim: 'prospector', texto: 'Chiringuito que cierra en invierno.', opciones: ['Local sin permanencia: se da de baja y vuelve', 'Fundador vitalicio', 'Signature con mantenimiento anual'], correcta: 0, porque: 'Sin permanencia resuelve la temporada. Fundador exige Sala y continuidad.', mejora: 'Para negocios de temporada, vende la libertad de entrar y salir.' },
  { id: 'n2-4', nivel: 'N2', dim: 'cerrador', texto: 'Objeción intermedia: «Vendo por Glovo».', opciones: ['Cuenta de comisiones con sus números y Signature como canal propio complementario', '«Quítese Glovo»', '«Entonces no le interesa»'], correcta: 0, porque: 'Signature complementa: sus clientes repetidores le compran sin comisión.', mejora: 'Haz la cuenta con SUS números: pedidos × ticket × comisión.' },
  { id: 'n2-5', nivel: 'N2', dim: 'digital', texto: '¿A quién puedes escribir por email sin conocerle?', opciones: ['A nadie sin consentimiento o relación previa', 'A cualquier email público', 'A los que tengan web'], correcta: 0, porque: 'LSSI: sin correo frío. Usa WhatsApp, redes o visita.', mejora: 'Correo solo con permiso o relación previa. Sin excepciones.' },
  { id: 'n2-6', nivel: 'N2', dim: 'cerrador', texto: 'Objeción intermedia: «Lo tengo que pensar».', opciones: ['«¿Qué le hace dudar: el precio, el tiempo o si le servirá?» y fecha concreta', '«Vale, ya le llamo»', '«Si firma hoy le hago descuento»'], correcta: 0, porque: 'Aislar la duda y fijar fecha. Sin presión inventada.', mejora: 'Toda duda tiene nombre: pregúntalo y resuélvelo antes de irte.' },
  { id: 'n2-7', nivel: 'N2', dim: 'digital', texto: 'Primer mensaje por Instagram a un restaurante.', opciones: ['3 líneas, un detalle real de su local y «¿le enseño cómo quedaría la suya?», sin enlaces', 'Enlace a la web y precios', 'Audio de 2 minutos'], correcta: 0, porque: 'Corto, personal y sin enlaces en el primero.', mejora: 'El primer mensaje solo busca una respuesta, no vender.' },
  { id: 'n2-8', nivel: 'N2', dim: 'fisico', texto: 'Objeción intermedia: «Ya tengo TPV».', opciones: ['«No lo sustituimos: le mandamos las comandas; si tiene conexión, lo conectamos»', '«Nuestro TPV es mejor»', '«Le integro cualquier TPV mañana»'], correcta: 0, porque: 'Convive con su TPV; nunca prometer integraciones inmediatas.', mejora: 'Promete solo lo que el producto hace hoy.' },
  // ── N3 Cierre ──
  { id: 'n3-1', nivel: 'N3', dim: 'cerrador', texto: 'A punto de firmar Local, pide «un 15 % y lo cierro».', opciones: [`Valor (puesta a punto a ${P.puestaB} tras el euro, garantía) o pedir OK a dirección; tú solo hasta 5 %`, 'Darle el 15 %', 'Decirle que no y marcharte'], correcta: 0, porque: 'Tu tope sin permiso es 5 %; lo demás pide OK de dirección.', mejora: 'Ofrece valor antes que descuento. Más del 5 %: pídelo en la app.' },
  { id: 'n3-2', nivel: 'N3', dim: 'cerrador', texto: 'Cliente cerrado a QR y a Signature, con el salón vacío los jueves.', opciones: ['Evento Experience piloto (hasta −50 %, con OK de dirección)', 'Rendirte', 'Prometerle el salón lleno'], correcta: 0, porque: 'Última prueba de entrada: que vea resultados y abra la puerta a QR o Signature.', mejora: 'Busca el dolor (día flojo) antes de proponer el piloto.' },
  { id: 'n3-3', nivel: 'N3', dim: 'cerrador', texto: `Le interesa Signature pero no llega a ${P.sigFund}.`, opciones: [`Precio normal ${P.sigEntrada} con pago fraccionado por hitos o financiación (OK de dirección)`, 'Fundador Signature en cuotas', 'Un descuento del 30 %'], correcta: 0, porque: 'El Fundador Signature nunca va en cuotas. La facilidad de pago es sobre el precio normal.', mejora: 'Facilidad de pago ≠ descuento. Y el Fundador siempre al contado.' },
  { id: 'n3-4', nivel: 'N3', dim: 'prospector', texto: 'Tercera visita, siempre «la semana que viene», sin el decisor.', opciones: ['Pedir cita con el decisor o cerrar como perdido con fecha de reintento', 'Seguir visitando cada semana', 'Ofrecer montaje gratis'], correcta: 0, porque: 'Regla de abandono: sin decisor tras 2 contactos → cita con él o perdido.', mejora: 'Aplica la regla de abandono: tu tiempo vale más que la tercera visita.' },
  { id: 'n3-5', nivel: 'N3', dim: 'fisico', texto: 'Objeción difícil: «Esto es otra estafa».', opciones: ['Hechos verificables: demo con su carta, sin permanencia, garantía, pago seguro con Stripe, empresa de la zona', 'Ofendernos y salir', 'Prometer resultados por escrito'], correcta: 0, porque: 'La desconfianza se vence con hechos comprobables, nunca con promesas.', mejora: 'Lleva preparados 3 hechos verificables para la desconfianza.' },
  { id: 'n3-6', nivel: 'N3', dim: 'digital', texto: 'Seguimiento digital: 3 mensajes en 10 días sin respuesta.', opciones: ['Cerrar como frío con fecha de reintento', 'Seguir escribiendo cada día', 'Mandarle un correo frío'], correcta: 0, porque: 'Máximo 3 toques en 10 días; después, frío con fecha.', mejora: 'Programa el reintento en la ficha y pasa al siguiente.' },
  { id: 'n3-7', nivel: 'N3', dim: 'cerrador', texto: '«No quiero pagar nada mensual» y tiene reparto fuerte.', opciones: ['Signature con facilidad de pago (OK de dirección): la app es suya', 'Local a 1 €', 'Insistir en que lo mensual es barato'], correcta: 0, porque: 'Con reparto, Signature es la inversión propia; la facilidad de pago resuelve la entrada.', mejora: 'Encaja el producto con el dolor antes de discutir la forma de pago.' },
  // ── N4 Dirección (solo Alex) ──
  { id: 'n4-1', nivel: 'N4', dim: 'cerrador', texto: 'Dos locales del mismo dueño: uno con reparto y otro de barrio. ¿Qué vendes primero?', opciones: ['El que más dinero le ahorra o genera (reparto → Signature) y abre la puerta al segundo', 'Los dos a la vez con descuento', 'El de barrio, porque es más barato'], correcta: 0, porque: 'Primero el mayor impacto económico; el segundo llega con la confianza ganada.', mejora: 'Ordena por impacto económico, no por facilidad.' },
  { id: 'n4-2', nivel: 'N4', dim: 'cerrador', texto: 'Solo acepta con montaje gratis y el cupo de 20 va por 19.', opciones: ['Decide dirección según el valor del cliente; si no compensa, no se regala', 'Regalarlo siempre', 'Prometer el montaje y cobrarlo después'], correcta: 0, porque: 'El último montaje del cupo se reserva para el cliente que más valor aporta.', mejora: 'Cada regalo debe pagarse solo: mira el valor a 12 meses.' },
  { id: 'n4-3', nivel: 'N4', dim: 'cerrador', texto: 'Te piden factura a otra sociedad y pago aplazado sin señal.', opciones: ['No se arranca sin cobro validado en el servidor', 'Arrancar y cobrar al final', 'Arrancar con la mitad'], correcta: 0, porque: 'Sin cobro validado no hay alta. Es regla anti-fraude.', mejora: 'Sin pago confirmado no hay trabajo. Nunca.' },
  { id: 'n4-4', nivel: 'N4', dim: 'prospector', texto: 'Tienes 2 horas en Baza: 12 locales posibles. ¿Cómo eliges ruta?', opciones: ['Preparación de 3 min por local, ordenar por señales (turistas, PDF, reparto) y cercanía', 'Por orden alfabético', 'Los que tengan más reseñas'], correcta: 0, porque: 'Ruta por señales de dolor + cercanía maximiza demos por hora.', mejora: 'Prepara la ruta la noche antes con las señales de cada local.' },
  { id: 'n4-5', nivel: 'N4', dim: 'digital', texto: 'Un dueño contesta a tu DM: «mándame precios».', opciones: ['Precio corto + «¿le preparo su carta gratis para que la vea?» y pedir foto de la carta', 'Enviar el PDF con todos los precios', 'Pedirle una llamada de 30 min'], correcta: 0, porque: 'La demo con su carta convierte; la lista de precios no.', mejora: 'En digital, convierte el interés en una demo personalizada.' },
  { id: 'n4-6', nivel: 'N4', dim: 'fisico', texto: 'Cuándo das un caso por perdido y avanzas.', opciones: ['Cuando se cumplen 2 de 3: sin decisor tras 2 contactos, sin dolor tras la demo, 3 toques sin respuesta en 10 días', 'Nunca: todo cliente se cierra', 'A la primera negativa'], correcta: 0, porque: 'La regla de abandono protege tu tasa de cierre.', mejora: 'Aplica la regla 2 de 3 cada viernes a tu cartera.' },
];

export const MIN_PREGUNTAS: Record<Nivel, number> = { N1: 8, N2: 7, N3: 6, N4: 6 };

// ── Escenarios (nodos con 3 opciones: +10 buena, +3 regular, 0 mala, −5 y suspenso si rompe una regla de M5) ──
export type Opcion = { texto: string; puntos: 10 | 3 | 0 | -5; feedback: string; regla?: boolean; dim: Dimension };
export type Nodo = { id: string; situacion: string; opciones: Opcion[] };
export type Escenario = { id: 'E1' | 'E2' | 'E3' | 'E4'; titulo: string; ficha: string; objetivo: string; nodos: { pie: Nodo[]; digital: Nodo[] } };

const comun = (n: Nodo[]) => n;
export const ESCENARIOS: Escenario[] = [
  {
    id: 'E1', titulo: 'La Hamburguesería del Puerto', objetivo: 'Signature (y saber no venderla al vecino)',
    ficha: '300 pedidos al mes en plataformas, ticket medio 22 €, marca fuerte en Instagram.',
    nodos: {
      pie: comun([
        { id: 'e1-1', situacion: 'Entras al mediodía. El dueño te mira con prisa.', opciones: [
          { texto: '«Su marca en Instagram es de las mejores de la zona. ¿Cuánto le deja cada mes en comisiones?»', puntos: 10, feedback: 'Entras por su marca y su dolor: perfecto.', dim: 'prospector' },
          { texto: '«Hacemos cartas QR para restaurantes»', puntos: 0, feedback: 'La Carta QR no es su problema: reparto.', dim: 'prospector' },
          { texto: '«Le quitamos Glovo y gana el doble»', puntos: -5, feedback: 'Promesa de resultados y «quitar Glovo»: rompe M5.', regla: true, dim: 'cerrador' }] },
        { id: 'e1-2', situacion: '«Pues unos 1.500 € al mes, más o menos».', opciones: [
          { texto: 'Haces la cuenta con sus números y le enseñas Signature con carrito propio para sus repetidores', puntos: 10, feedback: 'La cuenta con sus números convence.', dim: 'cerrador' },
          { texto: 'Le dices que con Signature ahorrará 1.500 € seguro', puntos: -5, feedback: 'Prometer ahorro garantizado rompe M5.', regla: true, dim: 'cerrador' },
          { texto: 'Le das la tarjeta para que lo mire', puntos: 3, feedback: 'Sin siguiente paso concreto.', dim: 'cerrador' }] },
        { id: 'e1-3', situacion: `«La entrada de ${P.sigEntrada} es mucho».`, opciones: [
          { texto: `Fundador Signature (${P.sigFund}, si quedan plazas); si no llega, facilidad de pago con OK de dirección`, puntos: 10, feedback: 'Palancas correctas y en orden.', dim: 'cerrador' },
          { texto: 'Fundador Signature en 4 cuotas', puntos: -5, feedback: 'El Fundador nunca va en cuotas.', regla: true, dim: 'cerrador' },
          { texto: 'Un 20 % de descuento tú mismo', puntos: 0, feedback: 'Tu tope es 5 % sin permiso.', dim: 'cerrador' }] },
        { id: 'e1-4', situacion: 'Su vecino, un bar de barrio sin reparto, te pide «la app como la de la hamburguesería».', opciones: [
          { texto: 'Le ofreces Carta QR (Local), que es lo que le sirve', puntos: 10, feedback: 'Vender lo que sirve: eso fideliza.', dim: 'prospector' },
          { texto: 'Le vendes Signature igualmente', puntos: 0, feedback: 'Sin reparto, Signature no le rinde.', dim: 'prospector' },
          { texto: 'Le dices que vuelva cuando tenga reparto', puntos: 3, feedback: 'Pierdes una venta que sí encaja.', dim: 'prospector' }] },
      ]),
      digital: comun([
        { id: 'e1d-1', situacion: 'Le escribes por Instagram. Primer mensaje:', opciones: [
          { texto: '«Hola, vuestras burgers son de las mejores de la zona. ¿Os enseño cómo tener vuestro canal propio sin comisiones?» (sin enlaces)', puntos: 10, feedback: 'Corto, personal, sin enlaces.', dim: 'digital' },
          { texto: 'Enlace a la web con todos los precios', puntos: 0, feedback: 'El primer mensaje no vende: busca respuesta.', dim: 'digital' },
          { texto: 'Correo a su email de la web con la propuesta', puntos: -5, feedback: 'Correo frío: rompe la LSSI.', regla: true, dim: 'digital' }] },
        { id: 'e1d-2', situacion: '«¿Cuánto cuesta?»', opciones: [
          { texto: `Precio corto (${P.sigEntrada} o Fundador ${P.sigFund}) + «¿cuántos pedidos al mes hacéis en plataformas?»`, puntos: 10, feedback: 'Precio claro y diagnóstico.', dim: 'digital' },
          { texto: 'Le mandas un PDF de 10 páginas', puntos: 0, feedback: 'Nadie lee un PDF en un DM.', dim: 'digital' },
          { texto: '«Depende, mejor llámame»', puntos: 3, feedback: 'Esquivar el precio enfría.', dim: 'digital' }] },
        { id: 'e1d-3', situacion: 'Te da sus números. ¿Cómo cierras?', opciones: [
          { texto: 'Audio de 2 minutos con la cuenta de comisiones y fecha de lanzamiento', puntos: 10, feedback: 'El texto no cierra solo: audio o llamada.', dim: 'cerrador' },
          { texto: 'Le mandas el enlace de pago sin más', puntos: 3, feedback: 'Sin conversación de cierre, cae.', dim: 'cerrador' },
          { texto: 'Le dices que lo piense una semana', puntos: 0, feedback: 'Sin siguiente paso concreto.', dim: 'cerrador' }] },
      ]),
    },
  },
  {
    id: 'E2', titulo: 'Mesón Los Arcos', objetivo: 'Carta QR Local, superando las 3 objeciones',
    ficha: '14 mesas, extranjeros en verano, carta en PDF.',
    nodos: {
      pie: comun([
        { id: 'e2-1', situacion: '«Ya tengo la carta en PDF».', opciones: [
          { texto: 'Demo en su móvil: su carta en 2 idiomas y pedido desde la mesa', puntos: 10, feedback: 'Enseñar vence al PDF.', dim: 'fisico' },
          { texto: '«Los PDF están obsoletos»', puntos: 0, feedback: 'Criticar lo suyo cierra la puerta.', dim: 'fisico' },
          { texto: 'Le dejas el flyer', puntos: 3, feedback: 'Sin demo, sin interés.', dim: 'fisico' }] },
        { id: 'e2-2', situacion: '«Ya tengo TPV».', opciones: [
          { texto: '«No lo sustituimos: le mandamos las comandas; si tiene conexión, lo conectamos»', puntos: 10, feedback: 'Convive con su TPV.', dim: 'fisico' },
          { texto: '«Le integramos cualquier TPV mañana»', puntos: -5, feedback: 'Prometer lo que no está garantizado rompe M5.', regla: true, dim: 'cerrador' },
          { texto: '«Entonces no lo necesita»', puntos: 0, feedback: 'Te rindes ante una objeción intermedia.', dim: 'fisico' }] },
        { id: 'e2-3', situacion: '«No quiero mensualidades… ¿y si no funciona?»', opciones: [
          { texto: `«El primer mes es ${P.primerMes}, sin permanencia y con garantía de 30 días»`, puntos: 10, feedback: 'Palancas públicas, sin descuento.', dim: 'cerrador' },
          { texto: 'Le ofreces montaje gratis tú mismo', puntos: -5, feedback: 'El montaje gratis necesita OK de dirección y objeción fuerte.', regla: true, dim: 'cerrador' },
          { texto: 'Un 10 % de descuento', puntos: 0, feedback: 'Más del 5 % necesita OK.', dim: 'cerrador' }] },
        { id: 'e2-4', situacion: '«Bueno… venga».', opciones: [
          { texto: 'Alta desde el móvil en 4 pasos y enlace de pago ahí mismo', puntos: 10, feedback: 'Cierre en el momento.', dim: 'cerrador' },
          { texto: '«Le mando la información por correo»', puntos: 0, feedback: 'Enfrías un sí.', dim: 'cerrador' },
          { texto: '«Mañana vuelvo con el contrato»', puntos: 3, feedback: 'Retrasas un cierre hecho.', dim: 'cerrador' }] },
      ]),
      digital: comun([
        { id: 'e2d-1', situacion: 'Te escribe por Instagram: «¿Qué es esto de la carta digital?»', opciones: [
          { texto: '«Le preparo su carta gratis en 24 h para que la vea. ¿Me pasa una foto de la que tiene?»', puntos: 10, feedback: 'Convertir interés en demo.', dim: 'digital' },
          { texto: 'Le pegas la lista de planes', puntos: 3, feedback: 'Información sin acción.', dim: 'digital' },
          { texto: '«Llámeme cuando pueda»', puntos: 0, feedback: 'Le pasas el trabajo al cliente.', dim: 'digital' }] },
        { id: 'e2d-2', situacion: 'Le envías la demo. Dos días sin respuesta.', opciones: [
          { texto: 'Seguimiento a las 48 h con una frase y una pregunta', puntos: 10, feedback: 'Seguimiento a 48 h: correcto.', dim: 'digital' },
          { texto: 'Mensaje cada día', puntos: 0, feedback: 'Máximo 3 toques en 10 días.', dim: 'digital' },
          { texto: 'Correo a su email', puntos: -5, feedback: 'Correo sin relación previa: LSSI.', regla: true, dim: 'digital' }] },
        { id: 'e2d-3', situacion: '«¿Y si no me funciona?»', opciones: [
          { texto: `Audio: «${P.primerMes} el primer mes, sin permanencia y garantía de 30 días» + enlace de pago`, puntos: 10, feedback: 'Cierre por audio con palancas públicas.', dim: 'cerrador' },
          { texto: '«Seguro que funciona, se lo garantizo»', puntos: -5, feedback: 'Prometer resultados rompe M5.', regla: true, dim: 'cerrador' },
          { texto: '«Pruébelo un mes gratis»', puntos: 0, feedback: 'No existe esa oferta.', dim: 'cerrador' }] },
      ]),
    },
  },
  {
    id: 'E3', titulo: 'Bodega La Parra', objetivo: 'Experience: cerrar el primer evento',
    ficha: 'Salón para 40 personas vacío de lunes a jueves.',
    nodos: {
      pie: comun([
        { id: 'e3-1', situacion: 'Ves el salón vacío un martes.', opciones: [
          { texto: '«¿Qué hace el martes con este salón?»', puntos: 10, feedback: 'Detectas el día flojo.', dim: 'prospector' },
          { texto: 'Hablas de la Carta QR', puntos: 3, feedback: 'No es su dolor principal.', dim: 'prospector' },
          { texto: '«Le llenamos el salón»', puntos: -5, feedback: 'Prometer aforo rompe M5.', regla: true, dim: 'cerrador' }] },
        { id: 'e3-2', situacion: '«¿Y vosotros qué os lleváis de las entradas?»', opciones: [
          { texto: `«Nada: la taquilla es 100 % suya, con su Stripe. Nosotros cobramos el evento: ${P.exp1}»`, puntos: 10, feedback: '0 % de comisión y tarifa clara.', dim: 'cerrador' },
          { texto: '«Un pequeño porcentaje»', puntos: -5, feedback: 'Falso: DKitchen nunca cobra comisión.', regla: true, dim: 'cerrador' },
          { texto: '«Depende del evento»', puntos: 0, feedback: 'Respuesta vaga que genera desconfianza.', dim: 'cerrador' }] },
        { id: 'e3-3', situacion: '«¿Qué tipo de evento haríamos?»', opciones: [
          { texto: 'Le enseñas 2 formatos que encajan con su bodega (maridaje, cata) y fecha concreta', puntos: 10, feedback: 'Formato y fecha: el evento ya existe.', dim: 'cerrador' },
          { texto: 'Le enseñas los 7 formatos', puntos: 3, feedback: 'Demasiadas opciones paralizan.', dim: 'cerrador' },
          { texto: '«Ya lo pensaremos»', puntos: 0, feedback: 'Sin propuesta concreta.', dim: 'cerrador' }] },
      ]),
      digital: comun([
        { id: 'e3d-1', situacion: 'Ves en Instagram que publica «salón disponible para grupos».', opciones: [
          { texto: '«He visto vuestro salón. ¿Habéis probado eventos con entradas para los días flojos?»', puntos: 10, feedback: 'Entrada por su dolor visible.', dim: 'digital' },
          { texto: 'Le mandas el catálogo de Experience', puntos: 3, feedback: 'Sin pregunta, sin conversación.', dim: 'digital' },
          { texto: '«Os llenamos el salón cada semana»', puntos: -5, feedback: 'Promesa de resultados.', regla: true, dim: 'digital' }] },
        { id: 'e3d-2', situacion: '«¿Cuánto cuesta?»', opciones: [
          { texto: `«${P.exp1} el evento (${P.exp1Qr} si ya es cliente de la Carta QR); la taquilla es toda suya»`, puntos: 10, feedback: 'Precio del catálogo y el 0 %.', dim: 'digital' },
          { texto: '«Depende de las entradas que vendáis»', puntos: -5, feedback: 'Insinúa comisión: falso.', regla: true, dim: 'digital' },
          { texto: '«Te lo explico en una llamada de una hora»', puntos: 0, feedback: 'Demasiada fricción.', dim: 'digital' }] },
        { id: 'e3d-3', situacion: '«Me interesa».', opciones: [
          { texto: 'Audio corto, formato elegido y enlace de pago con fecha', puntos: 10, feedback: 'Cierre con fecha.', dim: 'cerrador' },
          { texto: '«Te escribo la semana que viene»', puntos: 0, feedback: 'El interés se enfría.', dim: 'cerrador' },
          { texto: 'Le pides que rellene un formulario largo', puntos: 3, feedback: 'Fricción innecesaria.', dim: 'cerrador' }] },
      ]),
    },
  },
  {
    id: 'E4', titulo: 'Casa Paco', objetivo: 'Experience piloto… o saber abandonar',
    ficha: 'Dueño mayor y desconfiado. Ya ha dicho no a QR y a Signature.',
    nodos: {
      pie: comun([
        { id: 'e4-1', situacion: '«Ya te dije que no quiero tu QR».', opciones: [
          { texto: 'No insistes en lo rechazado: «¿Qué días le cuesta más llenar?»', puntos: 10, feedback: 'Respetas el no y buscas el dolor.', dim: 'prospector' },
          { texto: 'Le repites las ventajas del QR', puntos: 0, feedback: 'Insistir en lo rechazado quema la relación.', dim: 'prospector' },
          { texto: 'Le ofreces el QR gratis', puntos: -5, feedback: 'No existen regalos sin fecha ni sin OK.', regla: true, dim: 'cerrador' }] },
        { id: 'e4-2', situacion: '«Los jueves esto es un desierto».', opciones: [
          { texto: 'Le propones un evento Experience piloto (hasta −50 %) y pides el OK a dirección desde el móvil', puntos: 10, feedback: 'Última prueba de entrada, con OK.', dim: 'cerrador' },
          { texto: 'Le aplicas el −50 % sin pedir OK', puntos: -5, feedback: 'El piloto exige OK de dirección.', regla: true, dim: 'cerrador' },
          { texto: '«Pues anúnciese en redes»', puntos: 0, feedback: 'Desperdicias el dolor encontrado.', dim: 'cerrador' }] },
        { id: 'e4-3', situacion: 'Si no hubiera dolor ni decisor tras dos visitas…', opciones: [
          { texto: 'Lo cierras como perdido con fecha de reintento y pasas al siguiente', puntos: 10, feedback: 'Saber abandonar también puntúa.', dim: 'prospector' },
          { texto: 'Sigues visitando cada semana', puntos: 0, feedback: 'Tu tiempo vale más.', dim: 'prospector' },
          { texto: 'Le mandas correos semanales', puntos: -5, feedback: 'Correo sin consentimiento.', regla: true, dim: 'digital' }] },
      ]),
      digital: comun([
        { id: 'e4d-1', situacion: 'Te bloquea en WhatsApp tras dos mensajes.', opciones: [
          { texto: 'Respetas el bloqueo y lo marcas como perdido con nota', puntos: 10, feedback: 'Correcto: se respeta.', dim: 'digital' },
          { texto: 'Le escribes desde otro número', puntos: -5, feedback: 'Acoso: inaceptable.', regla: true, dim: 'digital' },
          { texto: 'Le escribes por Instagram', puntos: 0, feedback: 'Ya ha dicho que no.', dim: 'digital' }] },
        { id: 'e4d-2', situacion: 'Otro local cerrado a todo te responde: «los jueves no viene nadie».', opciones: [
          { texto: 'Propones el piloto de Experience y pides el OK desde el móvil antes de dar precio', puntos: 10, feedback: 'Piloto con OK.', dim: 'cerrador' },
          { texto: 'Le prometes que se llenará', puntos: -5, feedback: 'Promesa de resultados.', regla: true, dim: 'cerrador' },
          { texto: 'Le mandas los planes de QR otra vez', puntos: 0, feedback: 'Ya los rechazó.', dim: 'cerrador' }] },
      ]),
    },
  },
];

export const APROBADO_ESCENARIO = 70;
export const APROBADO_TEST = 90;
