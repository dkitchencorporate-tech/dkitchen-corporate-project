import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Condiciones del servicio · DKitchen',
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
  ['Quién presta el servicio', <>DKitchen (marca comercial; los datos del titular, nombre y NIF, se publicarán aquí al completar su alta), con domicilio en Alcobendas (Madrid). Nuestros servicios están dirigidos a profesionales y empresas de hostelería que los contratan para su actividad. Los datos identificativos completos del titular (NIF/CIF y domicilio fiscal) se facilitan <strong>a petición expresa</strong> para asuntos legales, fiscales o de consumo: escríbenos a <strong>dkitchen@dkitchencorporate.es</strong> indicando el motivo y te responderemos a la mayor brevedad.</>],
  ['Precios e impuestos', <>Todos los precios publicados en esta web son <strong>sin IVA</strong>. Al pagar se añade el IVA vigente (21 %) y la pasarela te muestra el total antes de confirmar. Cualquier servicio extra que contrates desde tu panel muestra su precio antes de pagarlo: nunca cobramos nada por sorpresa.</>],
  ['Carta digital QR: cobro y renovación', <>El primer mes cuesta 1 € + IVA. Después se cobra automáticamente la cuota de tu plan (Básico o Ampliado) cada 30 días con la tarjeta que registraste. Puedes cambiar de plan desde tu panel.</>],
  ['Sin permanencia', <>No hay permanencia. Cancelas cuando quieras desde tu panel o escribiéndonos, y no se vuelve a cobrar. El servicio sigue activo hasta el final del periodo ya pagado. <strong>Los periodos ya pagados no se devuelven.</strong></>],
  ['Si un cobro falla', <>Te avisamos y reintentamos el cobro. Durante los primeros días mantienes el acceso completo; si el pago sigue sin entrar, el panel pasa a modo de solo lectura y, a los 30 días del primer fallo, el servicio se suspende. En cuanto el pago entra, todo vuelve a la normalidad.</>],
  ['Servicios de pago único', <>La Auditoría de canales, DKitchen Signature y DKitchen Experience se pagan al contratarlos. Qué incluye cada uno, qué pasa después del pago y sus plazos se explican en su página de contratación y, en el caso de Signature, en su contrato.</>],
  ['Tus datos y tu contenido son tuyos', <>Tu carta, tus fotos y los datos de tu negocio son tuyos. Puedes pedirnos una copia en cualquier momento. En DKitchen Signature, la app, el dominio y los datos de tus clientes quedan a nombre de tu negocio.</>],
  ['Qué pasa tras la baja', <>Tu QR no muestra nunca un error: lleva a una página informativa. Conservamos tu carta y tus datos <strong>60 días</strong> por si quieres volver o pedirnos una copia; pasado ese plazo, los eliminamos.</>],
  ['Contenido de la carta y alérgenos', <>El contenido de la carta (platos, precios, alérgenos y disponibilidad) lo decide y lo mantiene el establecimiento, que es responsable de que sea correcto. Te damos las herramientas para informar de los 14 alérgenos que exige la normativa europea.</>],
  ['Soporte', <>Respondemos en menos de <strong>24 horas laborables</strong> desde la sección Soporte de tu panel o por correo.</>],
  ['Pagos', <>Los pagos se procesan a través de Whop, nuestra pasarela de pago. No guardamos los datos de tu tarjeta.</>],
  ['Cambios en estas condiciones', <>Si cambiamos estas condiciones, te avisaremos por correo al menos 30 días antes de que se apliquen a tu servicio.</>],
  ['Ley aplicable', <>Estas condiciones se rigen por la legislación española.</>],
];

export default function Condiciones() {
  return (
    <div className="bg-[#F7F5F2] px-6 pb-24 pt-36 text-[#17191E] md:pt-44">
      <article className="mx-auto max-w-3xl">
        <p className="etiqueta-dk text-[#6E0C2B]">Condiciones del servicio</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight md:text-6xl">Claras, cortas y sin letra pequeña.</h1>
        <p className="mt-4 text-sm text-[#6B7079]">Última actualización: 29 de septiembre de 2026</p>
        <ol className="mt-12 divide-y divide-[#E4E1DC] border-y border-[#E4E1DC]">
          {SECCIONES.map(([t, texto], i) => (
            <li key={t} className="grid gap-3 py-7 md:grid-cols-[56px_1fr]">
              <span className="acento-serif text-3xl leading-none">{i + 1}</span>
              <div>
                <h2 className="text-lg font-semibold">{t}</h2>
                <p className="mt-2 leading-relaxed text-[#3F434B]">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-sm text-[#6B7079]">¿Dudas sobre estas condiciones? <a href="#solicitud-dudas" className="underline">Escríbenos</a>.</p>
      </article>
    </div>
  );
}
