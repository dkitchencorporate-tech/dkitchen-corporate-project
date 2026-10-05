import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HeroPagina, Titulo, Faq, Cierre } from '@/components/dk/Bloques';
import Aparecer from '@/components/qr-landing/Aparecer';
import Configurador from '@/components/experience/Configurador';
import { FORMATOS_EXPERIENCE, formatoPorSlug } from '@/lib/experience-formatos';
import { EXPERIENCE } from '@/lib/pricing-config';

/** Landing de cada formato de Experience (aprobado por karc0 el 06/10/2026). */
export const dynamicParams = false;
export function generateStaticParams() {
  return FORMATOS_EXPERIENCE.map((f) => ({ formato: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ formato: string }> }): Promise<Metadata> {
  const f = formatoPorSlug((await params).formato);
  if (!f) return {};
  const url = `https://dkitchencorporate.es/experience/${f.slug}`;
  return {
    title: `${f.nombre} para restaurantes · DKitchen`,
    description: `${f.frase} Concepto, web de entradas y campaña listos en 3 semanas, sin comisión sobre la taquilla. Desde ${EXPERIENCE.tarifas.primeraVez.precio} € + IVA.`.slice(0, 155),
    alternates: { canonical: url },
    openGraph: { url, title: `${f.nombre} · DKitchen Experience`, description: f.frase },
  };
}

const CALENDARIO: [string, string][] = [
  ['Día 0', 'Pagas y rellenas el briefing: menú, aforo, fecha y tu pasarela de cobro.'],
  ['En 48 h laborables', 'Videollamada de arranque para ajustar el formato a tu cocina.'],
  ['Día 3', 'Te entregamos el concepto del evento para que lo apruebes.'],
  ['Días 7 a 10', 'Web de entradas y campaña listas. Empieza la venta.'],
  ['El día del evento', 'Asistencia en remoto y control de entradas con QR único.'],
  ['A las 72 h', 'Informe final: entradas, ingresos y qué mejorar en el siguiente.'],
];

const REGLAS = [
  `Antelación mínima de 21 días entre el pago y la fecha del evento.`,
  'Un cambio de fecha gratis avisando con 7 días.',
  'Una vez entregado el concepto (día 3), el montaje no se devuelve.',
  'Las entradas se cobran con tu propia pasarela: DKitchen no toca ese dinero ni cobra comisión.',
  'Los anuncios los pagas tú directamente a Meta o Google.',
  'Las licencias, los alérgenos, el alcohol y el aforo legal son responsabilidad del local.',
  'Las piezas creadas para el evento son para el uso de tu local.',
];

export default async function LandingFormato({ params }: { params: Promise<{ formato: string }> }) {
  const f = formatoPorSlug((await params).formato);
  if (!f) notFound();
  const otros = FORMATOS_EXPERIENCE.filter((x) => x.slug !== f.slug);
  const { primeraVez, primeraParaClienteQr, nuevoEvento, reuso, reusoFidelizado } = EXPERIENCE.tarifas;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service', name: `${f.nombre} · DKitchen Experience`, description: f.resumen, serviceType: 'Organización de eventos para restaurantes',
        provider: { '@type': 'Organization', name: 'DKitchen', url: 'https://dkitchencorporate.es' }, areaServed: 'ES',
        offers: { '@type': 'Offer', price: primeraVez.precio, priceCurrency: 'EUR', url: `https://dkitchencorporate.es/experience/${f.slug}` },
      },
      {
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Experience', item: 'https://dkitchencorporate.es/experience' },
          { '@type': 'ListItem', position: 2, name: f.nombre, item: `https://dkitchencorporate.es/experience/${f.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="bg-white text-[#17191E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <HeroPagina etiqueta={`DKitchen Experience · ${f.etiqueta}`}
        titulo={f.titular}
        sub={f.resumen}
        ctas={[{ href: '#configurar', t: 'Configurar mi evento' }, { href: '#como-funciona', t: 'Cómo funciona', secundario: true }]}
        nota={`${f.dias} · ${f.aforo[0]}–${f.aforo[1]} personas · listo en unas 3 semanas`}
        visual={
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[380px] overflow-hidden rounded-[32px] bg-[#3E0515] p-8 text-white shadow-[0_40px_90px_-30px_rgba(62,5,21,.7)]">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.7),transparent)]" />
            <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(217,178,92,.35),transparent)]" />
            <div className="relative flex h-full flex-col justify-between">
              <p className="etiqueta-dk text-[#D9B25C]">Formato listo</p>
              <div>
                <p className="font-display text-4xl font-semibold leading-tight">{f.nombre}</p>
                <p className="acento-serif mt-3 text-2xl text-white/85">{f.frase}</p>
              </div>
              <p className="text-sm text-white/60">0 % de comisión · 100 % de la taquilla para ti</p>
            </div>
          </div>
        } />

      <section className="bg-[#F7F5F2] py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:px-8">
          <div>
            <Titulo etiqueta="Para quién" texto="Encaja si tu local es así." />
            <ul className="mt-8 space-y-3">
              {f.paraQuien.map((x) => <li key={x} className="flex gap-3 text-[17px]"><span className="acento-serif text-xl leading-6">✓</span>{x}</li>)}
            </ul>
          </div>
          <div>
            <Titulo etiqueta="Ejemplos" texto="El formato es nuestro. El menú, tuyo." />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {f.ejemplos.map(([cocina, idea], i) => (
                <Aparecer key={cocina} retraso={i * 0.06} className="rounded-[22px] border border-[#E6E6E2] bg-white p-5">
                  <p className="etiqueta-dk text-[#6E0C2B]">{cocina}</p>
                  <p className="mt-2 text-[15px] text-[#3F434B]">{idea}</p>
                </Aparecer>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-20 bg-[#0A080C] py-24 text-white md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo oscuro etiqueta="Qué incluye y cuándo" texto="Del pago al evento, en unas 3 semanas." />
          <div className="mt-14 grid gap-10 md:grid-cols-[1fr_1.2fr]">
            <ul className="space-y-3">
              {[...f.claves, 'Concepto adaptado a tu cocina', 'Web de entradas conectada a tu cobro, con QR único por asistente', 'Campaña de anuncios montada y gestionada', 'Informe final del evento'].map((x) => (
                <li key={x} className="flex gap-3 text-[15px]"><span className="text-[#D9B25C]">✓</span><span className="text-white/80">{x}</span></li>
              ))}
            </ul>
            <ol>
              {CALENDARIO.map(([cuando, que], i) => (
                <li key={cuando} className="relative grid grid-cols-[40px_1fr] gap-4 pb-7 last:pb-0">
                  {i < CALENDARIO.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-white/15" />}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6E0C2B] text-sm font-semibold">{i + 1}</span>
                  <div><p className="font-semibold">{cuando}</p><p className="mt-1 text-white/60">{que}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="configurar" className="scroll-mt-20 bg-[#F7F5F2] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Configura tu evento" texto="Haz números antes de decidir." sub="Elige fecha, aforo y precio de la entrada y mira lo que puede dejarte. Después reservas y lo preparamos contigo." />
          <div className="mt-12">
            <Configurador codigo={f.codigo} nombre={f.nombre} aforo={f.aforo} entrada={f.entrada} precio={primeraVez.precio} precioClienteQr={primeraParaClienteQr.precio} />
          </div>
          <p className="mt-6 text-sm text-[#6B7079]">Siguientes eventos: {nuevoEvento.precio} € con un formato nuevo, {reuso.precio} € repitiendo el mismo y {reusoFidelizado.precio} € a partir del tercero. Todo + IVA. <Link href="/experience#precios" className="underline">Ver todas las tarifas</Link></p>
        </div>
      </section>

      <section className="py-24 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Condiciones claras" texto="Las reglas, antes de pagar." />
          <ul className="mt-10 grid gap-3 md:grid-cols-2">
            {REGLAS.map((r) => <li key={r} className="rounded-[18px] border border-[#E6E6E2] p-5 text-[15px] text-[#3F434B]">{r}</li>)}
          </ul>
        </div>
      </section>

      <Faq preguntas={[
        ...f.faq,
        ['¿Cómo se cobran las entradas?', 'Con tu propia pasarela de cobro, la que ya uses o la que elijas. La conectamos a la web de entradas y el dinero va directo a tu cuenta.'],
        ['¿Qué pasa después de pagar?', 'Rellenas un briefing corto y te contactamos en menos de 48 horas laborables para la videollamada de arranque.'],
      ]} />

      <section className="bg-[#F7F5F2] py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-[#6E0C2B]">Otros formatos</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {otros.map((o) => <Link key={o.slug} href={`/experience/${o.slug}`} className="rounded-full border border-[#E4E1DC] bg-white px-4 py-2 text-sm font-semibold hover:border-[#6E0C2B]">{o.nombre}</Link>)}
          </div>
        </div>
      </section>

      <Cierre titulo="Ese día flojo tiene arreglo." sub={`Reserva tu ${f.nombre.toLowerCase()} y en unas 3 semanas está en marcha.`} cta={{ href: '#configurar', t: 'Configurar mi evento' }} secundario={{ href: '/experience', t: 'Ver los 7 formatos' }} />
    </div>
  );
}
