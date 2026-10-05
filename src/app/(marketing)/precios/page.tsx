import type { Metadata } from 'next';
import Link from 'next/link';
import { FondoVivo, TextoRevelado, BotonMagnetico } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { Titulo } from '@/components/dk/Bloques';
import {
  QR_MENU, QR_FISICOS, SERVICIOS_QR, BASE_OPERATIVA, EXPERIENCE, AUDITORIA_CANALES, DARK_KITCHEN, formatPrecio,
} from '@/lib/pricing-config';

/**
 * Página de precios (SEO bloque 2, 05/10/2026). Todo el catálogo en una sola
 * página, sin un solo importe escrito a mano: sale de pricing-config (y de su
 * espejo SERVICIOS_QR, que copia catalogo_servicios). Todos los precios + IVA.
 * La oferta Fundador NO va aquí hasta que karc0 la cierre (§3.11 del ESTADO).
 */
const URL_PRECIOS = 'https://dkitchencorporate.es/precios';
const eur = (n: number) => formatPrecio(n) as string;

export const metadata: Metadata = {
  title: 'Precios: carta QR y app propia para restaurantes · DKitchen',
  description: `Carta QR desde ${QR_MENU.planes.basico.mensual} €/mes y primer mes a ${QR_MENU.primerMes} €. App propia desde ${BASE_OPERATIVA.pagoUnico} €. Módulos de sala y eventos. Sin comisiones. Precios + IVA.`,
  alternates: { canonical: URL_PRECIOS },
};

type Linea = { nombre: string; detalle: string; precio: string; ancla?: string; mensual?: number };

const QR_PLANES = [
  { id: QR_MENU.planes.basico.id, nombre: QR_MENU.planes.basico.nombre, mensual: QR_MENU.planes.basico.mensual, puntos: [`Hasta ${QR_MENU.planes.basico.topeProductos} platos`, 'Carta con fotos, precios y alérgenos', 'La cambias cuando quieras desde el móvil', 'QR que nunca reimprimes'] },
  { id: QR_MENU.planes.ampliado.id, nombre: QR_MENU.planes.ampliado.nombre, mensual: QR_MENU.planes.ampliado.mensual, destacado: true, puntos: [`Hasta ${QR_MENU.planes.ampliado.topeProductos} platos`, 'Promociones visibles y QR con tu marca', 'Llamada al camarero desde la mesa', 'Reservas, botón de reseñas y Google Business'] },
];

const MODULOS: Linea[] = [
  { nombre: 'Pack Sala Completo', detalle: 'Plano de mesas + app de sala + conexión con tu TPV', precio: `${eur(SERVICIOS_QR.packSala)}/mes`, mensual: SERVICIOS_QR.packSala, ancla: `${eur(SERVICIOS_QR.packSalaAncla)}/mes` },
  { nombre: 'Plano de mesas', detalle: 'Tus mesas en pantalla, con su estado en vivo', precio: `${eur(SERVICIOS_QR.planoMesas)}/mes`, mensual: SERVICIOS_QR.planoMesas },
  { nombre: 'App de sala', detalle: 'Comandero para tus camareros: rondas por mesa a cocina o TPV', precio: `${eur(SERVICIOS_QR.appSala)}/mes`, mensual: SERVICIOS_QR.appSala },
  { nombre: 'Conexión con tu TPV', detalle: 'Las comandas entran solas en el TPV que ya usas', precio: `${eur(SERVICIOS_QR.conexionTpv)}/mes`, mensual: SERVICIOS_QR.conexionTpv },
  { nombre: 'Comandero Pro', detalle: 'Histórico con filtros, Excel y CSV, anulaciones y ranking de camareros', precio: `${eur(SERVICIOS_QR.comanderoPro)}/mes`, mensual: SERVICIOS_QR.comanderoPro },
];
const SERVICIOS: Linea[] = [
  { nombre: 'Puesta a punto', detalle: 'Montamos tu carta por ti', precio: eur(SERVICIOS_QR.puestaAPunto) },
  { nombre: 'Carta de Autor', detalle: 'Diseño de carta a medida, con tu identidad', precio: eur(SERVICIOS_QR.cartaDeAutor) },
  { nombre: 'Idiomas', detalle: 'Hasta 3 idiomas, traducidos por DKitchen', precio: eur(SERVICIOS_QR.idiomas) },
  { nombre: 'Bono de imágenes con IA', detalle: `${SERVICIOS_QR.imagenesBonoIa} fotos de plato (${SERVICIOS_QR.imagenesGratisIa} gratis siempre)`, precio: eur(SERVICIOS_QR.bonoIa) },
  { nombre: 'Etiquetas QR para mesas', detalle: `Desde ${QR_FISICOS.etiquetas.tandas[0].unidades} unidades`, precio: `desde ${eur(QR_FISICOS.etiquetas.tandas[0].precio)}` },
];

const OTROS = [
  { t: 'DKitchen Signature', d: `Tu propia app de pedidos con tu marca. ${BASE_OPERATIVA.mantenimiento.mesesGratis} primeros meses de mantenimiento gratis y pack de arranque incluido.`, p: `${eur(BASE_OPERATIVA.pagoUnico)} + ${eur(BASE_OPERATIVA.mantenimiento.mensual)}/mes`, nota: `Mantenimiento desde el mes ${BASE_OPERATIVA.mantenimiento.empiezaEnMes}`, cta: { href: '/pagar/signature', t: 'Quiero mi app' }, ver: '/signature', destacado: true },
  { t: 'Experience', d: 'Eventos gastronómicos ya diseñados para llenar tus días flojos, con su web de reservas. 0 % de comisión sobre la taquilla.', p: eur(EXPERIENCE.tarifas.primeraVez.precio), nota: `Primer evento · ${eur(EXPERIENCE.tarifas.primeraParaClienteQr.precio)} si ya tienes la carta QR · repetir desde ${eur(EXPERIENCE.tarifas.reusoFidelizado.precio)}`, cta: { href: '/pagar/experience', t: 'Reservar mi evento' }, ver: '/experience' },
  { t: 'Auditoría de canales', d: 'Revisamos dónde te buscan tus clientes y por qué algunos no llegan.', p: eur(AUDITORIA_CANALES.precioOferta), ancla: eur(AUDITORIA_CANALES.precioAncla), nota: 'Pago único', cta: { href: '/pagar/auditoria', t: 'Pedir mi auditoría' }, ver: '/auditoria' },
  { t: 'Dark Kitchen', d: 'Marcas virtuales ya operadas para vender a domicilio con la cocina que ya tienes.', p: `desde ${eur(DARK_KITCHEN.rutaB.desarrolloPorMarca.primera)}`, nota: `Por marca · proyecto completo de ${eur(DARK_KITCHEN.rutaA.rangoMin)} a ${eur(DARK_KITCHEN.rutaA.rangoMax)}`, cta: { href: '/dark-kitchen', t: 'Ver cómo funciona' }, ver: '/dark-kitchen' },
];

const PREGUNTAS: [string, string][] = [
  ['¿Los precios llevan IVA?', 'No. Todos los precios de esta página son sin IVA; el 21 % se suma al pagar.'],
  ['¿Cobráis comisión por pedido o por entrada?', 'No. DKitchen nunca cobra comisión ni toca el dinero de tus ventas: pagas tu cuota y lo que vendes es tuyo.'],
  ['¿Cómo funciona el primer mes a 1 €?', `Eliges tu plan de carta QR, registras la tarjeta y pagas ${eur(QR_MENU.primerMes)} el primer mes. Después pagas la cuota del plan que hayas elegido. El alta (${eur(QR_MENU.setup.precio)}) va incluida.`],
  ['¿Puedo empezar con la carta QR y pasar a Signature más adelante?', 'Sí. Tu carta y tus datos pasan a Signature, y lo que llevas pagado en módulos de sala se descuenta en parte de la entrada durante los primeros meses.'],
];

function Tabla({ titulo, sub, filas }: { titulo: string; sub: string; filas: Linea[] }) {
  return (
    <Aparecer>
      <h3 className="font-display text-2xl font-semibold">{titulo}</h3>
      <p className="mt-1 text-sm text-[#6B7079]">{sub}</p>
      <ul className="mt-6 divide-y divide-[#E4DFD8] border-y border-[#E4DFD8]">
        {filas.map((f) => (
          <li key={f.nombre} className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-4">
            <div><p className="font-semibold">{f.nombre}</p><p className="mt-0.5 text-sm text-[#6B7079]">{f.detalle}</p></div>
            <p className="text-right font-semibold whitespace-nowrap">
              {f.ancla && <span className="mr-2 text-sm font-normal text-[#9A9EA6] line-through">{f.ancla}</span>}
              {f.precio}
            </p>
          </li>
        ))}
      </ul>
    </Aparecer>
  );
}

export default function PaginaPrecios() {
  const mensual = (precio: number) => ({ '@type': 'UnitPriceSpecification', price: precio, priceCurrency: 'EUR', valueAddedTaxIncluded: false, unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } });
  const producto = (nombre: string, url: string, offers: object) => ({ '@type': 'Product', name: nombre, url, brand: { '@type': 'Brand', name: 'DKitchen' }, offers: { '@type': 'Offer', priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url, ...offers } });
  const ld = [
    { '@context': 'https://schema.org', '@type': 'OfferCatalog', name: 'Precios DKitchen', url: URL_PRECIOS, itemListElement: [
      ...QR_PLANES.map((p) => producto(`Carta digital QR · Plan ${p.nombre}`, 'https://dkitchencorporate.es/qr#planes', { price: String(p.mensual), priceSpecification: mensual(p.mensual) })),
      ...MODULOS.map((m) => producto(m.nombre, URL_PRECIOS, { price: String(m.mensual), priceSpecification: mensual(m.mensual as number) })),
      producto('DKitchen Signature', 'https://dkitchencorporate.es/signature', { price: String(BASE_OPERATIVA.pagoUnico), priceSpecification: [
        { '@type': 'UnitPriceSpecification', name: 'Entrada (pago único)', price: BASE_OPERATIVA.pagoUnico, priceCurrency: 'EUR', valueAddedTaxIncluded: false },
        { ...mensual(BASE_OPERATIVA.mantenimiento.mensual), name: `Mantenimiento desde el mes ${BASE_OPERATIVA.mantenimiento.empiezaEnMes}` },
      ] }),
      producto('Experience', 'https://dkitchencorporate.es/experience', { price: String(EXPERIENCE.tarifas.primeraVez.precio) }),
      producto('Auditoría de canales', 'https://dkitchencorporate.es/auditoria', { price: String(AUDITORIA_CANALES.precioOferta) }),
    ] },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://dkitchencorporate.es' },
      { '@type': 'ListItem', position: 2, name: 'Precios', item: URL_PRECIOS },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: PREGUNTAS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];

  return (
    <div className="bg-white text-[#17191E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <section className="relative overflow-hidden bg-[#0A080C] pb-20 pt-36 text-white md:pb-28 md:pt-44">
        <FondoVivo />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <Aparecer><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6E0C2B]" /> Precios · todo + IVA</p></Aparecer>
          <TextoRevelado como="h1" texto="Precios claros. Cero comisiones." className="font-display mt-6 max-w-4xl text-[46px] font-semibold leading-[0.98] sm:text-7xl lg:text-[84px]" />
          <Aparecer retraso={0.3}><p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/70">Lo que cuesta cada cosa, sin letra pequeña. Empieza con la carta QR por {eur(QR_MENU.primerMes)} el primer mes y suma solo lo que tu sala necesite.</p></Aparecer>
          <Aparecer retraso={0.4} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <BotonMagnetico href="/qr#planes" className="inline-flex items-center justify-center rounded-full bg-[#6E0C2B] px-8 py-4 text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)]">Empezar por {eur(QR_MENU.primerMes)} →</BotonMagnetico>
            <BotonMagnetico href="#signature" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-semibold">Ver tu app propia</BotonMagnetico>
          </Aparecer>
        </div>
      </section>

      <section className="bg-[#F6F3EE] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Carta digital QR" texto="Tu carta al día, desde el móvil." sub={`Alta de ${eur(QR_MENU.setup.precio)} incluida. Primer mes ${eur(QR_MENU.primerMes)}, después la cuota de tu plan.`} />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {QR_PLANES.map((p, i) => (
              <Aparecer key={p.id} retraso={i * 0.08}>
                <div className={`relative h-full overflow-hidden rounded-[28px] border p-8 md:p-10 ${p.destacado ? 'border-[#17191E] bg-[#0A080C] text-white' : 'border-[#E4DFD8] bg-white'}`}>
                  {p.destacado && <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.45),transparent)]" />}
                  <p className="relative etiqueta-dk text-[#6E0C2B]">Plan {p.nombre}</p>
                  <p className="relative font-display mt-4 text-6xl font-semibold">{eur(p.mensual)}<span className={`ml-1 font-sans text-base font-normal ${p.destacado ? 'text-white/60' : 'text-[#6B7079]'}`}>/mes + IVA</span></p>
                  <ul className={`relative mt-7 space-y-3 ${p.destacado ? 'text-white/75' : 'text-[#3F434B]'}`}>
                    {p.puntos.map((x) => <li key={x} className="flex gap-3"><span aria-hidden="true" className="text-[#6E0C2B]">✓</span>{x}</li>)}
                  </ul>
                  <Link href="/qr#planes" className={`relative mt-9 inline-flex rounded-full px-7 py-3.5 text-[15px] font-semibold ${p.destacado ? 'bg-[#6E0C2B] text-white' : 'bg-[#17191E] text-white'}`}>Empezar con {p.nombre} por {eur(QR_MENU.primerMes)} →</Link>
                </div>
              </Aparecer>
            ))}
          </div>

          <div className="mt-20 grid gap-14 md:grid-cols-2">
            <Tabla titulo="Módulos de sala" sub={`Mensuales · con el plan ${QR_MENU.planes.ampliado.nombre} · se activan desde tu panel`} filas={MODULOS} />
            <Tabla titulo="Servicios y extras" sub="Pago único · sin suscripción" filas={SERVICIOS} />
          </div>
        </div>
      </section>

      <section id="signature" className="scroll-mt-20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Cuando quieras ir más allá" texto="Tu app, tus eventos, tus marcas." sub="Cada producto tiene su página con el detalle; aquí, lo que cuesta." />
          <div className="mt-14 grid gap-5">
            {OTROS.map((o, i) => (
              <Aparecer key={o.t} retraso={i * 0.06}>
                <div className={`relative grid items-center gap-6 overflow-hidden rounded-[28px] border p-7 md:grid-cols-[1fr_auto] md:p-9 ${o.destacado ? 'border-[#17191E] bg-[#0A080C] text-white' : 'border-[#E4DFD8] bg-white'}`}>
                  <div>
                    <h3 className="font-display text-3xl font-semibold">{o.t}</h3>
                    <p className={`mt-2 max-w-2xl ${o.destacado ? 'text-white/65' : 'text-[#6B7079]'}`}>{o.d}</p>
                    <Link href={o.ver} className={`mt-3 inline-block text-sm font-semibold underline decoration-[#6E0C2B] decoration-2 underline-offset-4 ${o.destacado ? 'text-white' : ''}`}>Ver {o.t}</Link>
                  </div>
                  <div className="md:text-right">
                    <p className="font-display text-3xl font-semibold whitespace-nowrap">
                      {o.ancla && <span className={`mr-2 font-sans text-base font-normal line-through ${o.destacado ? 'text-white/40' : 'text-[#9A9EA6]'}`}>{o.ancla}</span>}
                      {o.p}
                    </p>
                    <p className={`mt-1 text-sm ${o.destacado ? 'text-white/60' : 'text-[#6B7079]'}`}>{o.nota} · + IVA</p>
                    <Link href={o.cta.href} className={`mt-4 inline-flex rounded-full px-6 py-3 text-[15px] font-semibold text-white ${o.destacado ? 'bg-[#6E0C2B]' : 'bg-[#17191E]'}`}>{o.cta.t} →</Link>
                  </div>
                </div>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F6F3EE] py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 md:px-8">
          <Titulo etiqueta="Preguntas sobre precios" texto="Lo que nos preguntan antes de pagar." centrado />
          <div className="mt-12 divide-y divide-[#E4DFD8] border-y border-[#E4DFD8]">
            {PREGUNTAS.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">{q}<span aria-hidden="true" className="text-[#6E0C2B] transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-[#6B7079]">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-[#6B7079]">¿Dudas con tu caso? <Link href="/faq" className="font-semibold underline decoration-[#6E0C2B] decoration-2 underline-offset-4">Más preguntas frecuentes</Link></p>
        </div>
      </section>
    </div>
  );
}
