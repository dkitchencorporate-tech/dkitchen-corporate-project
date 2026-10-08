import type { Metadata } from 'next';
import { QR_MENU, FUNDADOR } from '@/lib/pricing-config';

const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }) + ' €';
const { basico: C, ampliado: L, sala: S } = QR_MENU.planes;

export const metadata: Metadata = {
  title: 'Condiciones del servicio · DKitchen Corporate',
  description: 'Cómo contratas, pagas, cancelas y qué pasa con tu carta y tus datos en DKitchen: sin permanencia, precios claros y tus datos siempre tuyos.',
  alternates: { canonical: 'https://dkitchencorporate.es/terms' },
};

/**
 * Condiciones del servicio (29/09/2026, decisiones de karc0): sin permanencia,
 * sin devolución de periodos pagados, precios sin IVA, 60 días de
 * conservación tras la baja y respuesta de soporte en 24 h laborables.
 * El calendario de impago es el de la migración 0012.
 */
const SECCIONES: [string, React.ReactNode][] = [
  ['Quién presta el servicio', <>DKitchen (marca comercial; los datos del titular, nombre y NIF, se publicarán aquí al completar su alta), con actividad en toda España. Nuestros servicios están dirigidos a profesionales y empresas de hostelería que los contratan para su actividad. Los datos identificativos completos del titular (NIF/CIF y domicilio fiscal) se facilitan <strong>a petición expresa</strong> para asuntos legales, fiscales o de consumo: escríbenos a <strong>dkitchen@dkitchencorporate.es</strong> indicando el motivo y te responderemos a la mayor brevedad.</>],
  ['Precios e impuestos', <>Todos los precios publicados en esta web son <strong>sin IVA</strong>. Al pagar se añade el IVA vigente (21 %) y la pasarela te muestra el total antes de confirmar. Cualquier servicio extra que contrates desde tu panel muestra su precio antes de pagarlo: nunca cobramos nada por sorpresa.</>],
  ['Carta digital QR: planes, cobro y renovación', <>Hay tres planes mensuales: {C.nombre} ({eur(C.mensual)}), {L.nombre} ({eur(L.mensual)}) y {S.nombre} ({eur(S.mensual)}), todos + IVA. En el plan {L.nombre} el primer mes cuesta {eur(QR_MENU.primerMes)} + IVA; en {C.nombre} y {S.nombre} se paga la cuota desde el primer día. Después se cobra automáticamente la cuota de tu plan cada mes con la tarjeta que registraste. Puedes subir de plan desde tu panel; para bajar, escríbenos desde Soporte.</>],
  ['Límites de cada plan', <>Cada plan incluye unas cantidades (productos, mesas, personas del equipo, reservas al mes y banners) que se publican en la página de precios. Te dejamos un 10 % de margen sobre esas cantidades; al llegar al límite, el panel te lo indica y puedes subir de plan. La llamada al camarero desde la mesa no se corta nunca por límite. Si se llega al límite de reservas del mes, la carta invita a tus clientes a llamarte directamente.</>],
  ['Sin permanencia', <>No hay permanencia. Cancelas cuando quieras desde tu panel o escribiéndonos, y no se vuelve a cobrar. El servicio sigue activo hasta el final del periodo ya pagado. <strong>Los periodos ya pagados no se devuelven.</strong></>],
  ['Si un cobro falla', <>Te avisamos y reintentamos el cobro. Durante los primeros días mantienes el acceso completo; si el pago sigue sin entrar, el panel pasa a modo de solo lectura y, a los 30 días del primer fallo, el servicio se suspende. En cuanto el pago entra, todo vuelve a la normalidad.</>],
  ['Oferta Fundador', <>Plan {S.nombre} con un 40 % de descuento: {eur(FUNDADOR.mensual)} al mes, cobrados por trimestre y por adelantado ({eur(FUNDADOR.trimestre)} + IVA cada 3 meses). Hay {FUNDADOR.plazas} plazas y la oferta se cierra al ocuparse todas o a los {FUNDADOR.dias} días de abrirse, lo que ocurra primero. Una plaza se ocupa con el primer pago y no se libera con las bajas. El precio Fundador es de por vida mientras tu suscripción siga activa en el plan {S.nombre} y sin impagos, no se actualiza por IPC, y los módulos que añadamos al plan {S.nombre} te llegan con el mismo descuento. Se pierde si te das de baja, si bajas a un plan inferior o si un cobro no se regulariza dentro del periodo de gracia; si vuelves, se aplica el precio vigente. Es personal del local que la contrata y no se puede transferir. Sin permanencia: si te vas, el trimestre en curso no se renueva y lo ya pagado no se devuelve.</>],
  ['Servicios de pago único', <>La Auditoría de canales, DKitchen Signature y DKitchen Experience se pagan al contratarlos. Qué incluye cada uno, qué pasa después del pago y sus plazos se explican en su página de contratación y, en el caso de Signature, en su contrato.</>],
  ['Tus datos y tu contenido son tuyos', <>Tu carta, tus fotos y los datos de tu negocio son tuyos. Puedes pedirnos una copia en cualquier momento. En DKitchen Signature, la app, el dominio y los datos de tus clientes quedan a nombre de tu negocio.</>],
  ['Qué pasa tras la baja', <>Tu QR no muestra nunca un error: lleva a una página informativa. Conservamos tu carta y tus datos <strong>60 días</strong> por si quieres volver o pedirnos una copia; pasado ese plazo, los eliminamos.</>],
  ['Contenido de la carta y alérgenos', <>El contenido de la carta (platos, precios, alérgenos y disponibilidad) lo decide y lo mantiene el establecimiento, que es responsable de que sea correcto. Te damos las herramientas para informar de los 14 alérgenos que exige la normativa europea.</>],
  ['Soporte', <>Respondemos en menos de <strong>24 horas laborables</strong> desde la sección Soporte de tu panel o por correo.</>],
  ['Pagos', <>Los pagos se procesan a través de Stripe Payments Europe, Ltd., nuestra pasarela de pago, en nuestra propia página de pago. No vemos ni guardamos los datos de tu tarjeta. Cada cobro lleva su factura con el IVA desglosado.</>],
  ['Cambios en estas condiciones', <>Si cambiamos estas condiciones, te avisaremos por correo al menos 30 días antes de que se apliquen a tu servicio.</>],
  ['Ley aplicable', <>Estas condiciones se rigen por la legislación española.</>],
];

export default function Condiciones() {
  return (
    <div className="bg-crema px-6 pb-24 pt-36 text-tinta md:pt-44">
      <article className="mx-auto max-w-3xl">
        <p className="etiqueta-dk text-vino">Condiciones del servicio</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-6xl">Claras, cortas y sin letra pequeña.</h1>
        <p className="mt-4 text-sm text-niebla">Última actualización: 7 de octubre de 2026</p>
        <ol className="mt-12 divide-y divide-linea border-y border-linea">
          {SECCIONES.map(([t, texto], i) => (
            <li key={t} id={t === 'Oferta Fundador' ? 'fundador' : undefined} className="grid scroll-mt-28 gap-3 py-7 md:grid-cols-[56px_1fr]">
              <span className="acento-serif text-3xl leading-none">{i + 1}</span>
              <div>
                <h2 className="text-lg font-semibold">{t}</h2>
                <p className="mt-2 leading-relaxed text-grafito">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-sm text-niebla">¿Dudas sobre estas condiciones? <a href="#solicitud-dudas" className="underline">Escríbenos</a>.</p>
      </article>
    </div>
  );
}
