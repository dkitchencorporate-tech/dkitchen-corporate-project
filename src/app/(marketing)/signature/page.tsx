import type { Metadata } from 'next';
import Link from 'next/link';
import { FondoVivo, Marquesina, TextoRevelado, BotonMagnetico, TarjetaTilt } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { MovilApp, CalculadoraComisiones, CapitulosSignature } from '@/components/signature/PiezasSignature';
import { ModelosReales } from '@/components/dk/Modelos';
import { Titulo } from '@/components/dk/Bloques';
import ComparativaQr from '@/components/qr-landing/ComparativaQr';
import { BASE_OPERATIVA } from '@/lib/pricing-config';

/**
 * DKitchen Signature (antes «Núcleo Operativo») — rediseño 29/09/2026.
 * Palabra clave: app propia de pedidos para restaurantes sin comisiones.
 */
const URL_SIGNATURE = 'https://dkitchencorporate.es/signature';

export const metadata: Metadata = {
  title: 'App propia de pedidos sin comisiones · DKitchen Signature',
  description: 'Tu app con tu marca: pedidos en mesa, recogida y domicilio, comandas a cocina, fidelización y conexión con tu TPV. Entrada 700 €, desde 99 €/mes.',
  alternates: { canonical: 'https://dkitchencorporate.es/signature' },
};

const FUNCIONES = [
  ['Tu marca, tu dominio', 'Una app instalable con tu logo, tus colores y tus fotos. No una ficha más dentro de otra app.'],
  ['Pedidos en mesa, recogida y domicilio', 'Tus clientes piden y pagan desde el móvil, sin esperar al camarero.'],
  ['Pantalla de cocina', 'Cada comanda llega ordenada a cocina y se marca cuando está lista.'],
  ['Freno de emergencia', 'Si la cocina no da abasto en un pico, pausas la entrada de pedidos con un botón.'],
  ['Fidelización propia', 'Puntos, niveles y avisos al móvil para que cada cliente repita.'],
  ['Cierre fiscal conectado', 'El cierre del día pasa al sistema que ya usas (Verifactu), con tu TPV y tu gestoría.'],
];
const PACK = [
  ['Auditoría de tu ficha de Google Maps', 'Revisamos los factores que hacen que te encuentren (o no) en tu zona.'],
  ['Ingeniería de carta', 'Ordenamos tu carta para destacar los platos que más margen te dejan.'],
  ['Estrategia para tus días flojos', 'Un plan concreto para llenar mesas el día más flojo de tu semana.'],
  ['Kit de lanzamiento en redes', 'Publicaciones profesionales para anunciar tu app a tus clientes.'],
];
const PREGUNTAS: [string, string][] = [
  ['¿La app es mía?', 'Sí. Pagas una entrada única y un mantenimiento mensual; la app, tu marca y los datos de tus clientes son tuyos.'],
  ['¿Tengo que dejar las plataformas de delivery?', 'No. Lo habitual es combinar: la plataforma para captar clientes nuevos y tu app para que los que repiten pidan sin comisión de plataforma.'],
  ['¿Funciona con mi TPV?', 'Se conecta con tu TPV y con tu gestoría para que el cierre del día llegue al sistema fiscal que ya usas.'],
  ['¿Qué pasa con la carta QR si ya la tengo?', 'Tu carta y tus datos pasan a Signature, y lo que llevas pagado en módulos de sala se descuenta en parte de la entrada durante los primeros meses.'],
];

export default function PaginaSignature() {
  const ld = [
    // Precios leídos de pricing-config (SEO bloque 2, 05/10): entrada única + mantenimiento mensual, ambos + IVA.
    { '@context': 'https://schema.org', '@type': 'Product', name: 'DKitchen Signature', description: 'App propia de pedidos para restaurantes, con tu marca y sin comisiones de plataforma.', brand: { '@type': 'Brand', name: 'DKitchen' },
      url: URL_SIGNATURE, image: `${URL_SIGNATURE}/opengraph-image`,
      offers: {
        '@type': 'Offer', url: `${URL_SIGNATURE}#precio`, priceCurrency: 'EUR', price: String(BASE_OPERATIVA.pagoUnico), availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'DKitchen', url: 'https://dkitchencorporate.es' },
        priceSpecification: [
          { '@type': 'UnitPriceSpecification', name: 'Entrada (pago único)', price: BASE_OPERATIVA.pagoUnico, priceCurrency: 'EUR', valueAddedTaxIncluded: false },
          { '@type': 'UnitPriceSpecification', name: `Mantenimiento mensual desde el mes ${BASE_OPERATIVA.mantenimiento.empiezaEnMes}`, price: BASE_OPERATIVA.mantenimiento.mensual, priceCurrency: 'EUR', valueAddedTaxIncluded: false, unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } },
        ],
      } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://dkitchencorporate.es' },
      { '@type': 'ListItem', position: 2, name: 'DKitchen Signature', item: URL_SIGNATURE },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: PREGUNTAS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return (
    <div className="bg-white text-[#17191E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <section className="relative overflow-hidden bg-[#0A080C] pb-24 pt-36 text-white md:pb-32 md:pt-44">
        <FondoVivo />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-[1.15fr_1fr] md:px-8">
          <div>
            <Aparecer><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6E0C2B]" /> DKitchen Signature</p></Aparecer>
            <TextoRevelado como="h1" texto="Tu propia app. Tus clientes. Cero comisiones." className="font-display mt-6 text-[48px] font-semibold leading-[0.98] sm:text-7xl lg:text-[84px]" />
            <Aparecer retraso={0.3}><p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">Deja de pagar un trozo de cada pedido. Tu app con tu marca: tus clientes piden y pagan, tu cocina recibe las comandas y los datos se quedan en tu casa.</p></Aparecer>
            <Aparecer retraso={0.4} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <BotonMagnetico href="#precio" className="inline-flex items-center justify-center rounded-full bg-[#6E0C2B] px-8 py-4 text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)]">Quiero mi app →</BotonMagnetico>
              <BotonMagnetico href="#calculadora" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-semibold">¿Cuánto pierdo hoy?</BotonMagnetico>
            </Aparecer>
          </div>
          <MovilApp />
        </div>
      </section>

      <Marquesina oscura items={['Sin comisión de plataforma', 'Tu marca', 'Tus clientes', 'Pedidos en mesa y domicilio', 'Cocina conectada', 'Cierre fiscal']} />

      <section id="calculadora" className="relative scroll-mt-20 overflow-hidden bg-[#0A080C] py-24 text-white md:py-32">
        <FondoVivo className="opacity-50" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-[#6E0C2B]">Haz la cuenta</p>
          <TextoRevelado texto="¿Cuánto te llevan las plataformas cada mes?" className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl" />
          <Aparecer retraso={0.2} className="mt-12"><CalculadoraComisiones /></Aparecer>
        </div>
      </section>

      <CapitulosSignature />
      <ComparativaQr variante="signature" />

      <section className="relative overflow-hidden bg-[#0A080C] py-24 text-white md:py-32">
        <FondoVivo className="opacity-50" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <Titulo oscuro etiqueta="Modelos en marcha" texto="No te lo contamos. Tócalo." sub="Dos apps reales hechas con DKitchen Signature. Desliza dentro del móvil, ábrelas en grande o visita la web real." />
          <ModelosReales />
        </div>
      </section>

      <section className="bg-[#F7F5F2] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-[#6E0C2B]">Qué incluye</p>
          <TextoRevelado texto="Todo lo que tu restaurante necesita para vender solo." className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl" />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONES.map(([t, d], i) => (
              <Aparecer key={t} retraso={(i % 3) * 0.08}>
                <TarjetaTilt className="h-full rounded-[28px] border border-[#E6E6E2] bg-white p-7">
                  <span className="font-display text-sm font-semibold text-[#6E0C2B]">0{i + 1}</span>
                  <p className="mt-3 text-xl font-semibold">{t}</p>
                  <p className="mt-2 text-[#6B7079]">{d}</p>
                </TarjetaTilt>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-[#6E0C2B]">Incluido en tu activación</p>
          <TextoRevelado texto="Y te damos el pack de arranque." className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl" />
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {PACK.map(([t, d], i) => (
              <Aparecer key={t} retraso={i * 0.06} className="flex gap-5 rounded-[24px] border border-[#E6E6E2] p-6">
                <span className="font-display text-3xl font-semibold text-[#6E0C2B]">+</span>
                <div><p className="text-lg font-semibold">{t}</p><p className="mt-1 text-[#6B7079]">{d}</p></div>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section id="precio" className="relative scroll-mt-20 overflow-hidden bg-[#0A080C] py-24 text-white md:py-32">
        <FondoVivo />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:px-8">
          <div>
            <p className="etiqueta-dk text-[#6E0C2B]">Precio</p>
            <TextoRevelado texto="Entrada única. El código de tu app es tuyo." className="font-display mt-4 text-5xl font-semibold leading-[1.0] md:text-7xl" />
            <p className="mt-5 max-w-md text-lg text-white/60">Entrada única y un mantenimiento mensual que cuesta menos que las comisiones de unos pocos pedidos.</p>
          </div>
          <Aparecer className="rounded-[32px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur md:p-10">
            <p className="text-sm text-white/60">Entrada</p>
            <p className="font-display text-7xl font-semibold">700 €</p>
            <p className="mt-2 text-white/70">o 2 cuotas de 375 € · después desde 99 €/mes según ventas · precios + IVA</p>
            <p className="mt-1 text-sm text-[#7FD1AE]">Los 2 primeros meses de mantenimiento, incluidos</p>
            <ul className="mt-6 space-y-2 text-sm text-white/75">
              {['App con tu marca y dominio', 'Pedidos, cocina, fidelización y cierre fiscal', 'Pack de arranque incluido', 'Soporte en español'].map((x) => <li key={x} className="flex gap-2"><span className="text-[#6E0C2B]">✓</span>{x}</li>)}
            </ul>
            <div className="mt-8 space-y-3">
              <Link href="/pagar/signature" className="block text-center w-full rounded-full bg-[#6E0C2B] py-4 text-[15px] font-semibold text-white shadow-[0_10px_40px_rgba(163,24,74,.45)]">Contratar Signature · 700 € + IVA</Link>
              <a href="#solicitud-signature" className="block rounded-full border border-white/20 py-4 text-center text-[15px] font-semibold">Prefiero hablar antes</a>
            </div>
          </Aparecer>
        </div>
      </section>

      <section className="bg-white py-24 md:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-[1fr_1.4fr] md:px-8">
          <TextoRevelado texto="Preguntas frecuentes." className="font-display text-4xl font-semibold md:text-5xl" />
          <div className="divide-y divide-[#E6E6E2] border-y border-[#E6E6E2]">
            {PREGUNTAS.map(([p, r]) => (
              <details key={p} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-semibold">{p}<span aria-hidden="true" className="text-2xl font-light text-[#9A9EA6] transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-[#6B7079]">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F5F2] py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center md:px-8">
          <div><p className="font-display text-3xl font-semibold md:text-4xl">¿Aún no estás listo para tu app?</p><p className="mt-2 text-[#6B7079]">Empieza con la carta digital QR por 1 € y da el salto cuando tu negocio lo pida.</p></div>
          <Link href="/qr" className="rounded-full bg-[#17191E] px-7 py-4 text-[15px] font-semibold text-white">Ver la carta QR →</Link>
        </div>
      </section>
    </div>
  );
}
