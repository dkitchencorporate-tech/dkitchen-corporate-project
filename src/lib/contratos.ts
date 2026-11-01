import { BASE_OPERATIVA, FUNDADOR } from '@/lib/pricing-config';
import { titular, CORREO_TITULAR } from '@/lib/titular';

/**
 * Contratos de DKitchen (01/11/2026, tareas 3fc6a2df y 27835609). Cuerpo FIJO y VERSIONADO
 * + Anexo A con los datos variables (formato aprobado el 05/10: A4, «Confidencial», cláusulas
 * numeradas, Anexo A en tabla, firmas). Los importes salen SIEMPRE de pricing-config.
 * Lo que va entre [[dobles corchetes]] es un hueco: lo decide Alex o llega de la base al
 * generar el contrato de un cliente concreto. Mientras haya huecos, el contrato es BORRADOR.
 */
export type Clausula = { n: string; titulo: string; texto: string[] };
export type Contrato = {
  id: 'comercial' | 'signature' | 'encargado';
  tipo: string;
  titulo: string;
  version: string;
  fecha: string;
  estado: 'borrador' | 'vigente';
  resumen: string;
  partes: [string, string];
  clausulas: Clausula[];
  anexo: { campo: string; valor: string }[];
  firmas: [string, string];
};

const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
const M = BASE_OPERATIVA.mantenimiento;
const [T1, T2, T3] = M.tramos;
/** Licencia perpetua del motor (Alex, 01/11): ver pricing-config. */
const LICENCIA_PERPETUA = BASE_OPERATIVA.licenciaPerpetua;

/** Titular: Elisabet (autónoma) hasta que exista la empresa de Alex. Sus datos llegan con la tarea 279b7668. */
const T = titular();
const TITULAR = `${T ? T.nombre : '[[Elisabet · nombre completo]]'}, con NIF ${T ? T.nif : '[[NIF]]'} y domicilio fiscal en ${T ? T.domicilio : '[[dirección fiscal]]'}, que actúa con el nombre comercial DKitchen (dkitchencorporate.es) y el correo ${CORREO_TITULAR} (en adelante, «DKitchen»)`;

export const CONTRATOS: Contrato[] = [
  {
    id: 'comercial',
    tipo: 'Contrato de agencia comercial',
    titulo: 'Contrato de agente comercial independiente',
    version: 'v0.2',
    fecha: '01/11/2026',
    estado: 'borrador',
    resumen: 'Para los comerciales externos de Alex. Promueven y presentan clientes, pero no cierran altas ni cobran: el alta y el pago siempre pasan por Central y Stripe. Comisión sobre lo cobrado, con el % en blanco.',
    partes: [
      TITULAR,
      'D./Dña. [[nombre del agente]], con NIF [[NIF]] y domicilio en [[dirección]], dado de alta como trabajador autónomo en el epígrafe que corresponde a su actividad (en adelante, «el Agente»)',
    ],
    clausulas: [
      { n: '1', titulo: 'Objeto', texto: [
        'El Agente se compromete, de forma continuada y a cambio de comisión, a promover los servicios de DKitchen (Carta QR, Fundador, Signature, Experience, Auditoría y extras del catálogo) entre negocios de hostelería y a presentar a DKitchen a los interesados.',
        'El contrato se rige por la Ley 12/1992, de 27 de mayo, sobre Contrato de Agencia.',
      ] },
      { n: '2', titulo: 'Sin poder para contratar ni cobrar', texto: [
        'El Agente NO puede cerrar contratos en nombre de DKitchen, aceptar pedidos, firmar ni comprometer a DKitchen frente a terceros. Toda alta la confirma DKitchen desde su sistema (Central) y se paga solo por la pasarela de DKitchen (Stripe).',
        'El Agente nunca recibe dinero de los clientes, ni en efectivo ni por transferencia, bizum u otro medio. Si un cliente intentara pagarle, debe remitirle al enlace de pago oficial.',
      ] },
      { n: '3', titulo: 'Independencia', texto: [
        'El Agente es un profesional independiente: organiza su tiempo, su ruta y sus medios (vehículo, teléfono, desplazamientos) y asume sus gastos, salvo pacto escrito. No existe relación laboral ni horario.',
        'El Agente está dado de alta como autónomo y al corriente de sus obligaciones fiscales y de Seguridad Social, y lo acreditará cuando DKitchen lo pida.',
      ] },
      { n: '4', titulo: 'Zona y exclusividad', texto: [
        'Zona: [[zona]]. El contrato NO es exclusivo para ninguna de las partes: DKitchen puede vender directamente o con otros agentes en la misma zona, y el Agente puede trabajar para otras empresas siempre que no comercialice software competidor para hostelería mientras dure el contrato.',
      ] },
      { n: '5', titulo: 'Forma de trabajar', texto: [
        'El Agente usa solo los precios, ofertas y materiales vigentes publicados por DKitchen (Central → Ofertas y Academia). No puede prometer descuentos, plazos o funciones que no figuren en ellos.',
        'Registra cada visita y cada contacto en la herramienta de prospección de DKitchen el mismo día, con su resultado, y comunica cualquier información relevante del mercado o de la competencia.',
        'Supera la formación básica de la Academia antes de visitar en nombre de DKitchen y se presenta siempre como agente independiente de DKitchen.',
      ] },
      { n: '6', titulo: 'Comisión', texto: [
        'El Agente cobra la comisión fijada en el Anexo A sobre los importes efectivamente cobrados por DKitchen (sin IVA) a los clientes que el Agente haya presentado y que consten asignados a su cartera en Central.',
        'Se comisionan: el primer pago del cliente y sus cuotas recurrentes de los 12 meses siguientes al alta (con el % de cuotas del Anexo A). No generan comisión los impuestos, los reembolsos, los cargos devueltos ni las campañas de publicidad que paga el propio cliente.',
        'Si un cobro comisionado se devuelve o se reembolsa, su comisión se descuenta de la siguiente liquidación.',
      ] },
      { n: '7', titulo: 'Liquidación y pago', texto: [
        'DKitchen pone a disposición del Agente, en Central → Comerciales, el detalle de sus clientes, cobros y comisiones. La liquidación es mensual: el Agente emite su factura con el IVA y la retención de IRPF que correspondan, y DKitchen la paga por transferencia en los 15 días siguientes.',
        'El Agente puede pedir comprobar los datos de cobro de sus clientes en los términos del artículo 15 de la Ley 12/1992.',
      ] },
      { n: '8', titulo: 'Datos personales', texto: [
        'Los datos de los prospectos y clientes son de DKitchen, que es responsable del tratamiento. El Agente los trata solo como encargado (artículo 28 del RGPD): para la finalidad del contrato, dentro de la herramienta de DKitchen, sin copiarlos ni usarlos para otros fines, con confidencialidad y devolviéndolos o borrándolos al terminar.',
        'Solo envía comunicaciones comerciales por correo o mensajería con consentimiento previo del destinatario o relación anterior, tal como lo registra la herramienta (LSSI, artículo 21).',
      ] },
      { n: '9', titulo: 'Confidencialidad y propiedad', texto: [
        'El Agente guarda secreto sobre precios internos, márgenes, clientes, métodos y cualquier información no pública de DKitchen, durante el contrato y 3 años después.',
        'La marca DKitchen, los materiales comerciales, la Academia y el software son de DKitchen. El Agente solo los usa para este contrato y los devuelve o destruye al terminar.',
      ] },
      { n: '10', titulo: 'Duración y fin', texto: [
        'El contrato es indefinido. Cualquiera de las partes puede terminarlo por escrito con el preaviso del artículo 25 de la Ley 12/1992 (un mes por cada año de vigencia, con un máximo de seis). Se puede terminar sin preaviso por incumplimiento grave, en especial si el Agente cobra a clientes, promete condiciones no autorizadas o hace mal uso de los datos.',
        'Las comisiones de cobros hechos antes del fin se pagan con normalidad. La indemnización por clientela, cuando proceda, se rige por el artículo 28 de la Ley 12/1992.',
      ] },
      { n: '11', titulo: 'Ley y tribunales', texto: [
        'Se aplica la ley española. Para cualquier controversia son competentes los juzgados del domicilio del Agente, tal como establece la Ley 12/1992.',
      ] },
      { n: '12', titulo: 'Firma', texto: [
        'Las partes firman de forma electrónica. DKitchen guarda la versión firmada con la fecha, la IP y la versión del texto.',
      ] },
    ],
    anexo: [
      { campo: 'Agente (nombre, NIF y domicilio)', valor: '[[desde Central → Comerciales]]' },
      { campo: 'Zona', valor: '[[zona]]' },
      { campo: 'Comisión sobre el primer pago', valor: '[[ % ]] (lo decide Alex)' },
      { campo: 'Comisión sobre las cuotas de los 12 primeros meses', valor: '[[ % ]] (lo decide Alex)' },
      { campo: 'Fecha de inicio', valor: '[[fecha de firma]]' },
      { campo: 'Formación Academia', valor: 'Superada el [[fecha]] (Central → Comerciales)' },
      { campo: 'Versión del texto', valor: 'v0.2 · 01/11/2026' },
    ],
    firmas: ['Por DKitchen', 'El Agente'],
  },
  {
    id: 'signature',
    tipo: 'Contrato de servicio',
    titulo: 'Contrato DKitchen Signature',
    version: 'v0.2',
    fecha: '01/11/2026',
    estado: 'borrador',
    resumen: `App propia con la marca del local sobre el motor de DKitchen. Entrada ${eur(BASE_OPERATIVA.pagoUnico)} + IVA, ${M.mesesGratis} meses gratis y cuota por tramos desde ${eur(T1.cuota)}/mes. La app es del cliente; el motor sigue siendo de DKitchen.`,
    partes: [
      TITULAR,
      '[[razón social o nombre del titular del local]], con NIF/CIF [[NIF]] y domicilio en [[dirección]], titular del local [[nombre comercial]] (en adelante, «el Cliente»)',
    ],
    clausulas: [
      { n: '1', titulo: 'Objeto', texto: [
        'DKitchen crea y mantiene para el Cliente una aplicación de pedidos con su marca («la App»): carta, pedidos y pago en línea, pantalla de cocina, comandero (versión Pro incluida), fidelización y panel de gestión, publicada en el dominio o subdominio del Anexo A.',
        'La App funciona sobre el software común de DKitchen («el Motor»), que DKitchen desarrolla y actualiza para todos sus clientes.',
      ] },
      { n: '2', titulo: 'Puesta en marcha y entrega', texto: [
        `La entrada (${eur(BASE_OPERATIVA.pagoUnico)} + IVA, o ${BASE_OPERATIVA.fraccionado.cuotas} pagos de ${eur(BASE_OPERATIVA.fraccionado.importeCuota)} + IVA con ${BASE_OPERATIVA.fraccionado.diasEntreCuotas} días entre ellos) incluye la puesta en marcha y el pack de arranque (valor declarado ${eur(BASE_OPERATIVA.packArranque.valorDeclarado)}).`,
        'DKitchen entrega la App en 15 días hábiles desde que el Cliente aporta su marca, su carta y sus fotos. Al entregarla firma con el Cliente un acta de entrega. Si en 10 días hábiles el Cliente no comunica fallos concretos, la App se entiende aceptada.',
      ] },
      { n: '3', titulo: 'Cuota de mantenimiento por tramos', texto: [
        `Los ${M.mesesGratis} primeros meses son gratis. Desde el mes ${M.empiezaEnMes}, el Cliente paga una cuota mensual según su volumen, medido por ventas cobradas por la App (sin IVA) o por pedidos al mes, lo que se alcance antes:`,
        `${T1.nombre}: hasta ${eur(T1.hastaVentas)} o ${T1.hastaPedidos} pedidos → ${eur(T1.cuota)}/mes (${T1.usuarios} usuarios, ${T1.productos} productos) · ${T2.nombre}: hasta ${eur(T2.hastaVentas)} o ${T2.hastaPedidos.toLocaleString('es-ES')} pedidos → ${eur(T2.cuota)}/mes (${T2.usuarios} usuarios, ${T2.productos} productos) · ${T3.nombre}: hasta ${eur(T3.hastaVentas)} o ${T3.hastaPedidos.toLocaleString('es-ES')} pedidos → ${eur(T3.cuota)}/mes (${T3.usuarios} usuarios, ${T3.productos.toLocaleString('es-ES')} productos) · A medida: más de ${eur(T3.hastaVentas)}, más de ${T3.hastaPedidos.toLocaleString('es-ES')} pedidos o 2 o más locales → desde ${eur(M.aMedida.desde)} + ${eur(M.aMedida.porLocalAdicional)} por local adicional. Todos los importes, más IVA.`,
        'Medición: con los datos del propio sistema, visibles para el Cliente en su panel en tiempo real.',
        'Subida: solo si supera su tramo 2 meses naturales seguidos; DKitchen avisa por escrito y la nueva cuota se aplica 30 días después, como máximo un tramo por trimestre. Bajada: si queda por debajo 3 meses naturales seguidos, baja de tramo sola desde el siguiente cobro.',
        'A medida: al cumplir cualquiera de sus condiciones, DKitchen propone condiciones particulares con 60 días de aviso. Si el Cliente no las acepta, puede comprar la licencia perpetua del Motor (cláusula 7, aunque no haya cumplido el mes 12) o terminar el contrato con la exportación completa de sus datos.',
        'Los límites de usuarios y productos no cortan el servicio: superarlos solo abre la revisión de tramo.',
      ] },
      { n: '4', titulo: 'Sin comisión e IPC', texto: [
        'DKitchen no cobra comisión por pedido ni porcentaje sobre las ventas del Cliente, nunca.',
        'La cuota se actualiza una vez al año, en la fecha de aniversario, según la variación del IPC general publicada por el INE.',
      ] },
      { n: '5', titulo: 'Pagos e impago', texto: [
        'Los pagos se cargan por Stripe a la tarjeta o cuenta del Cliente al inicio de cada mes de servicio. DKitchen emite factura de cada cobro.',
        'Si un cobro falla, DKitchen avisa y reintenta. Pasados 15 días sin pago, puede suspender el panel de gestión hasta que se regularice; la App sigue mostrando la carta a los comensales durante otros 15 días. Con 60 días de impago, DKitchen puede resolver el contrato.',
      ] },
      { n: '6', titulo: 'Propiedad de la App', texto: [
        'Son del Cliente desde el pago de la entrada: su marca, su dominio, su diseño, sus textos, fotos y carta, y la capa de la App hecha para él (pantallas y personalizaciones). DKitchen le cede por escrito los derechos de explotación de esa capa.',
        'DKitchen entrega al Cliente el repositorio de su App y la copia de su base de datos cuando termine el contrato o, si lo pide, al cumplir el primer año.',
      ] },
      { n: '7', titulo: 'Licencia del Motor', texto: [
        'El Motor (lógica de pedidos, pagos, cocina, comandero, fidelización, funciones de la base de datos y conexiones fiscales) es de DKitchen. Mientras el contrato esté vigente, el Cliente tiene una licencia de uso no exclusiva e intransferible, solo para sus locales.',
        'El Cliente no puede copiar, revender, sublicenciar ni aplicar ingeniería inversa al Motor, ni usarlo para terceros.',
        `Al terminar el contrato, y siempre que hayan pasado al menos ${LICENCIA_PERPETUA.desdeMes} meses desde el alta, el Cliente puede seguir usando su App comprando una licencia perpetua del Motor por ${LICENCIA_PERPETUA.cuotas} cuotas de su tramo vigente (${M.tramos.map((t) => `${t.nombre} ${eur(t.cuota * LICENCIA_PERPETUA.cuotas)}`).join(" · ")}, más IVA). La licencia no incluye actualizaciones ni soporte y el alojamiento corre de su cuenta; puede contratar los parches de seguridad por ${eur(LICENCIA_PERPETUA.parchesMes)}/mes + IVA. También puede migrar su App a otro sistema con sus datos.`,
      ] },
      { n: '8', titulo: 'Datos de los comensales', texto: [
        'El Cliente es el responsable de los datos de sus comensales; DKitchen los trata como encargado (artículo 28 del RGPD) según el contrato de encargado del tratamiento que se firma junto a este. Los datos se alojan en la Unión Europea y el Cliente puede exportarlos siempre.',
      ] },
      { n: '9', titulo: 'Cobros de los pedidos', texto: [
        'Los pagos de los comensales van directamente a la pasarela del Cliente (su propia cuenta de Stripe u otra compatible). DKitchen nunca recibe ni retiene el dinero de los pedidos.',
      ] },
      { n: '10', titulo: 'Obligaciones fiscales del local (VeriFactu)', texto: [
        'La emisión de facturas o tiques a los comensales y el cumplimiento de VeriFactu corresponden al Cliente, a través de su TPV o del proveedor homologado que elija. La App puede conectarse a ese sistema; DKitchen no emite facturas en nombre del Cliente.',
      ] },
      { n: '11', titulo: 'Servicio y soporte', texto: [
        'DKitchen mantiene la App en funcionamiento, aplica las actualizaciones del Motor y da soporte desde el panel y por correo. Objetivo de disponibilidad: 99,5 % mensual. Respuesta a incidencias que impidan vender: 4 horas laborables; resto: 2 días laborables.',
      ] },
      { n: '12', titulo: 'Responsabilidad', texto: [
        'DKitchen responde de prestar el servicio con diligencia profesional. Salvo dolo o culpa grave, su responsabilidad total se limita a lo pagado por el Cliente en los 12 meses anteriores al hecho. Ninguna parte responde del lucro cesante ni de fallos de terceros ajenos a su control (proveedores de internet, pasarelas o fuerza mayor).',
      ] },
      { n: '13', titulo: 'Confidencialidad', texto: [
        'Las partes guardan secreto sobre la información no pública que conozcan por este contrato (precios particulares, datos de negocio, código del Motor) durante el contrato y 3 años después.',
      ] },
      { n: '14', titulo: 'Duración y baja', texto: [
        'El contrato es indefinido y sin permanencia. El Cliente puede darse de baja con 30 días de aviso desde su panel o por correo. La entrada no se reembolsa una vez empezada la puesta en marcha. Al darse de baja se aplican las cláusulas 6 y 7.',
        'Al ser un contrato entre empresas, no aplica el derecho de desistimiento de los consumidores.',
      ] },
      { n: '15', titulo: 'Ley, tribunales y firma', texto: [
        'Se aplica la ley española. Para cualquier controversia, las partes se someten a los juzgados de [[ciudad]]. Las partes firman de forma electrónica; DKitchen guarda la aceptación con la fecha, la IP y la versión del texto.',
      ] },
    ],
    anexo: [
      { campo: 'Cliente (razón social, NIF, domicilio)', valor: '[[desde la ficha del cliente]]' },
      { campo: 'Local y nombre comercial', valor: '[[desde la ficha]]' },
      { campo: 'Dominio o subdominio de la App', valor: '[[slug]].dkitchencorporate.es o el dominio propio del Cliente' },
      { campo: 'Entrada', valor: `${eur(BASE_OPERATIVA.pagoUnico)} + IVA (pago único) o ${BASE_OPERATIVA.fraccionado.cuotas} × ${eur(BASE_OPERATIVA.fraccionado.importeCuota)} + IVA` },
      { campo: 'Fundador (si aplica)', valor: `Entrada ${eur(FUNDADOR.signature.entrada)} + IVA en pago único y ${eur(FUNDADOR.signature.mensual)}/mes durante ${FUNDADOR.signature.meses} meses; después, la cuota de su tramo` },
      { campo: 'Meses gratis', valor: `${M.mesesGratis} (la cuota empieza en el mes ${M.empiezaEnMes})` },
      { campo: 'Tramo inicial', valor: `${T1.nombre} · ${eur(T1.cuota)}/mes + IVA` },
      { campo: 'Plazo de entrega', valor: '15 días hábiles desde recibir marca, carta y fotos' },
      { campo: 'Fecha de pago y de firma', valor: '[[desde Stripe y el registro de aceptación]]' },
      { campo: 'Versión del texto', valor: 'v0.2 · 01/11/2026' },
    ],
    firmas: ['Por DKitchen', 'El Cliente'],
  },
  {
    id: 'encargado',
    tipo: 'Contrato de encargado del tratamiento (art. 28 RGPD)',
    titulo: 'Contrato de encargado del tratamiento',
    version: 'v0.1',
    fecha: '01/11/2026',
    estado: 'borrador',
    resumen: 'Lo firma cada local que contrata Carta QR, Signature o Experience: el local es responsable de los datos de sus comensales y DKitchen solo los trata por su cuenta, con las garantías del RGPD. Se acepta junto con el servicio.',
    partes: [
      'El local [[razón social o nombre del titular]], con NIF/CIF [[NIF]] y domicilio en [[dirección]] (en adelante, «el Responsable»)',
      TITULAR.replace('(en adelante, «DKitchen»)', '(en adelante, «el Encargado» o «DKitchen»)'),
    ],
    clausulas: [
      { n: '1', titulo: 'Objeto', texto: [
        'DKitchen trata, por cuenta del Responsable, los datos personales necesarios para prestar los servicios contratados (Carta QR, Signature y/o Experience), solo para esa finalidad y siguiendo las instrucciones documentadas del Responsable, que son este contrato y la configuración que el Responsable hace en su panel.',
      ] },
      { n: '2', titulo: 'Datos y personas afectadas', texto: [
        'Personas: comensales y clientes del local (reservas, pedidos, entradas, fidelización y mensajes) y personal del local con acceso al panel.',
        'Datos: identificativos y de contacto (nombre, teléfono, correo), detalle de reservas, pedidos y entradas, puntos de fidelización y las notas que escriba el propio comensal. DKitchen no trata datos de tarjetas: el cobro lo hace la pasarela del Responsable.',
        'Operaciones: recogida, registro, conservación, consulta, comunicación al Responsable y supresión.',
      ] },
      { n: '3', titulo: 'Duración', texto: [
        'Mientras el Responsable tenga contratado algún servicio. Al terminar, DKitchen pone los datos a disposición del Responsable durante 60 días para que los exporte y después los suprime, salvo que una ley obligue a conservarlos (en ese caso, bloqueados).',
      ] },
      { n: '4', titulo: 'Obligaciones de DKitchen', texto: [
        'Tratar los datos solo según las instrucciones del Responsable y avisarle si alguna instrucción le parece contraria a la ley.',
        'Garantizar que las personas autorizadas a tratar los datos se han comprometido a la confidencialidad.',
        'Aplicar medidas de seguridad adecuadas (artículo 32 del RGPD): cifrado en tránsito, acceso con contraseña y segundo factor para el personal interno, permisos en la base de datos por local, copias de seguridad y registro de accesos.',
        'Ayudar al Responsable a atender los derechos de los interesados (acceso, rectificación, supresión, oposición, limitación y portabilidad) y en las evaluaciones de impacto o consultas a la autoridad, cuando proceda.',
        'Notificar al Responsable cualquier violación de seguridad que afecte a sus datos sin dilación indebida y, en todo caso, en un máximo de 48 horas desde que la conozca, con la información disponible para que pueda notificarla a la autoridad si corresponde.',
        'Poner a disposición del Responsable la información necesaria para demostrar el cumplimiento y permitir auditorías razonables, avisadas con 30 días.',
      ] },
      { n: '5', titulo: 'Subencargados', texto: [
        'El Responsable autoriza a DKitchen a usar estos subencargados: Vercel Inc. (alojamiento), Neon (base de datos en Fráncfort, Alemania) y Arsys Internet S.L.U. (correo, España). Las transferencias fuera del Espacio Económico Europeo se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en cláusulas contractuales tipo.',
        'DKitchen avisará con 30 días de antelación de cualquier cambio de subencargado; el Responsable puede oponerse y, si no hay acuerdo, terminar el servicio sin penalización. Cada subencargado queda obligado a las mismas garantías que este contrato.',
      ] },
      { n: '6', titulo: 'Obligaciones del Responsable', texto: [
        'Informar a sus comensales del tratamiento (su propio aviso de privacidad), contar con base legal para los datos que recoge y para las comunicaciones comerciales que envíe, y usar el servicio conforme a la ley.',
      ] },
      { n: '7', titulo: 'Responsabilidad', texto: [
        'Cada parte responde de sus propios incumplimientos del RGPD. Si DKitchen trata los datos para fines propios, pasa a ser considerado responsable de ese tratamiento.',
      ] },
      { n: '8', titulo: 'Ley y aceptación', texto: [
        'Se aplica el Reglamento (UE) 2016/679, la Ley Orgánica 3/2018 y la ley española. Este contrato forma parte de las condiciones del servicio y se acepta electrónicamente al contratar; DKitchen guarda la fecha, la IP y la versión aceptada.',
      ] },
    ],
    anexo: [
      { campo: 'Responsable (local, NIF, domicilio)', valor: '[[desde la ficha del cliente]]' },
      { campo: 'Servicios contratados', valor: '[[Carta QR / Signature / Experience, desde la ficha]]' },
      { campo: 'Subencargados vigentes', valor: 'Vercel · Neon (Fráncfort) · Arsys' },
      { campo: 'Contacto de privacidad de DKitchen', valor: 'dkitchen@dkitchencorporate.es' },
      { campo: 'Fecha de aceptación', valor: '[[desde el registro de aceptación al pagar]]' },
      { campo: 'Versión del texto', valor: 'v0.1 · 01/11/2026' },
    ],
    firmas: ['El Responsable (local)', 'Por DKitchen (Encargado)'],
  },
];

export const contratoDe = (id: string) => CONTRATOS.find((c) => c.id === id) ?? CONTRATOS[0];

/** Huecos que quedan por decidir o rellenar (lo que hay entre [[ ]]). */
export function huecos(c: Contrato): string[] {
  const todo = [...c.partes, ...c.clausulas.flatMap((x) => x.texto), ...c.anexo.map((a) => a.valor)].join(' ');
  return [...new Set([...todo.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].trim()))];
}
