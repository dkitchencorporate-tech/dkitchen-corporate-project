import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HeroPagina, Titulo, Faq, Cierre } from '@/components/dk/Bloques';
import { TarjetaTilt } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import Configurador from '@/components/experience/Configurador';
import BarraReserva from '@/components/experience/BarraReserva';
import { ANTELACION_DIAS, FORMATOS_EXPERIENCE, formatoPorSlug, rutaImagen } from '@/lib/experience-formatos';
import { EXPERIENCE } from '@/lib/pricing-config';

/**
 * Landing de cada formato de Experience (aprobado por karc0 el 06/10/2026).
 * Revisión de diseño del 06/10 (Brand Guardian, UI Designer y UX Architect del
 * repo): configurador justo después de «para quién», barra de reserva en
 * móvil, reglas en lista editorial numerada, foto del formato con la tarjeta
 * Gran Reserva como respaldo y contrastes AA.
 */
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
    description: `Desde ${EXPERIENCE.tarifas.primeraVez.precio} € + IVA. ${f.frase} Concepto, web de entradas y campaña en 3 semanas, sin comisión de DKitchen.`.slice(0, 155),
    alternates: { canonical: url },
    openGraph: { url, title: `${f.nombre} · DKitchen Experience`, description: f.frase, ...(f.imagen ? { images: [{ url: rutaImagen(f.slug, '16x9'), alt: f.imagen.alt }] } : {}) },
  };
}

const CALENDARIO: [string, string][] = [
  ['Día 0', 'Pagas y rellenas el cuestionario del evento: menú, aforo, fecha y tu pasarela de cobro.'],
  ['En 48 h laborables', 'Videollamada de arranque para ajustar el formato a tu cocina.'],
  ['Día 3', 'Te entregamos el concepto del evento para que lo apruebes.'],
  ['Días 7 a 10', 'Web de entradas y campaña listas. Empieza la venta.'],
  ['El día del evento', 'Asistencia en remoto y control de entradas con QR único.'],
  ['A las 72 h', 'Informe final: entradas, ingresos y qué mejorar en el siguiente.'],
];

const SIEMPRE_INCLUIDO = ['Concepto adaptado a tu cocina', 'Web de entradas conectada a tu cobro, con QR único por asistente', 'Campaña de anuncios montada y gestionada', 'Informe final del evento'];

const REGLAS = [
  `Antelación mínima de ${ANTELACION_DIAS} días entre el pago y la fecha del evento.`,
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

  const pieTarjeta = <p className="text-sm text-white/70">0 % de comisión de DKitchen · la taquilla va directa a tu cuenta</p>;

  return (
    <div className="bg-white text-tinta">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <HeroPagina etiqueta={`DKitchen Experience · ${f.etiqueta}`}
        titulo={f.titular}
        sub={f.resumen}
        ctas={[{ href: '#configurar', t: 'Configurar mi evento' }, { href: '#como-funciona', t: 'Cómo funciona', secundario: true }]}
        nota={`${f.dias} · ${f.aforo[0]}–${f.aforo[1]} personas · listo en unas 3 semanas`}
        visual={
          <TarjetaTilt className="relative mx-auto min-h-[320px] w-full max-w-[380px] overflow-hidden rounded-[28px] bg-vino-fondo text-white shadow-[0_40px_90px_-30px_rgba(62,5,21,.7)] md:aspect-[4/5] md:min-h-0">
            {f.imagen ? (
              <figure className="absolute inset-0 m-0">
                <Image src={rutaImagen(f.slug, '4x5')} alt={f.imagen.alt} fill priority sizes="(min-width: 768px) 380px, 100vw" className="object-cover object-[50%_40%]" />
                <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(10,8,12,.9))]" />
                <figcaption className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <p className="font-display text-3xl font-semibold leading-tight md:text-4xl">{f.nombre}</p>
                  <p className="acento-serif mt-2 text-xl text-white/85">{f.frase}</p>
                  <div className="mt-4">{pieTarjeta}</div>
                </figcaption>
              </figure>
            ) : (
              <>
                <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.7),transparent)]" />
                <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(217,178,92,.35),transparent)]" />
                <div className="relative flex h-full min-h-[320px] flex-col justify-between gap-8 p-6 md:min-h-0 md:p-8">
                  <p className="etiqueta-dk text-oro">Formato listo</p>
                  <div>
                    <p className="font-display text-3xl font-semibold leading-tight md:text-4xl">{f.nombre}</p>
                    <p className="acento-serif mt-3 text-xl text-white/85 md:text-2xl">{f.frase}</p>
                  </div>
                  {pieTarjeta}
                </div>
              </>
            )}
          </TarjetaTilt>
        } />

      <section className="bg-crema py-16 md:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:px-8">
          <div>
            <Titulo etiqueta="Para quién" texto="Encaja si tu local es así." />
            <ul className="mt-8 space-y-3">
              {f.paraQuien.map((x) => <li key={x} className="flex gap-3 text-base"><span aria-hidden="true" className="acento-serif text-xl leading-6">✓</span>{x}</li>)}
            </ul>
          </div>
          <div>
            <Titulo etiqueta="Ejemplos" texto="El formato es nuestro. El menú, tuyo." />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {f.ejemplos.map(([cocina, idea], i) => (
                <Aparecer key={cocina} retraso={i * 0.06} className="h-full">
                  <TarjetaTilt className="h-full rounded-[20px] border border-linea-calida bg-white p-5">
                    <p className="etiqueta-dk text-vino">{cocina}</p>
                    <p className="mt-2 text-base text-grafito">{idea}</p>
                  </TarjetaTilt>
                </Aparecer>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="configurar" className="scroll-mt-20 bg-white py-16 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Configura tu evento" texto="Haz números antes de decidir." sub="Elige fecha, aforo y precio de la entrada y mira lo que puede dejarte. Después reservas y lo preparamos contigo." />
          <div className="mt-12">
            <Configurador codigo={f.codigo} nombre={f.nombre} aforo={f.aforo} entrada={f.entrada} precio={primeraVez.precio} precioClienteQr={primeraParaClienteQr.precio} />
          </div>
          <p className="mt-6 text-sm text-pizarra">Siguientes eventos: {nuevoEvento.precio} € con un formato nuevo, {reuso.precio} € repitiendo el mismo y {reusoFidelizado.precio} € a partir del tercero. Todo + IVA. <Link href="/experience#precios" className="underline">Ver todas las tarifas</Link></p>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-20 bg-noche py-16 text-white md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo oscuro etiqueta="Qué incluye y cuándo" texto="Del pago al evento, en unas 3 semanas." />
          <div className="mt-14 grid gap-12 md:grid-cols-[1fr_1.2fr]">
            <div className="space-y-10">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-oro">Lo propio de este formato</h3>
                <ul className="mt-4 space-y-3">
                  {f.claves.map((x) => <li key={x} className="flex gap-3 text-lg"><span aria-hidden="true" className="text-oro">✓</span><span>{x}</span></li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/60">Siempre incluido</h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SIEMPRE_INCLUIDO.map((x) => <li key={x} className="flex gap-3 text-[15px] text-white/75"><span aria-hidden="true" className="text-oro">✓</span><span>{x}</span></li>)}
                </ul>
              </div>
            </div>
            <ol>
              {CALENDARIO.map(([cuando, que], i) => (
                <li key={cuando} className="relative grid grid-cols-[40px_1fr] gap-4 pb-7 last:pb-0">
                  {i < CALENDARIO.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-white/15" />}
                  <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-vino text-sm font-semibold">{i + 1}</span>
                  <div><p className="font-semibold">{cuando}</p><p className="mt-1 text-white/70">{que}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Condiciones claras" texto="Las reglas, antes de pagar." />
          <ol className="mt-10 grid md:grid-cols-2 md:gap-x-14">
            {REGLAS.map((r, i) => (
              <li key={r} className="grid grid-cols-[56px_1fr] gap-4 border-t border-linea-cava py-6">
                <span aria-hidden="true" className="acento-serif text-4xl leading-none">{i + 1}</span>
                <p className="text-base leading-relaxed text-grafito">{r}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Faq fondo="bg-crema" preguntas={[
        ...f.faq,
        ['¿Cómo se cobran las entradas?', 'Con tu propia pasarela de cobro, la que ya uses o la que elijas. La conectamos a la web de entradas y el dinero va directo a tu cuenta.'],
        ['¿Qué pasa después de pagar?', 'Rellenas un cuestionario corto sobre el evento y te contactamos en menos de 48 horas laborables para la videollamada de arranque.'],
      ]} />

      <section className="border-t border-linea-calida bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-vino">Otros formatos</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {otros.map((o) => (
              <li key={o.slug}>
                <Link href={`/experience/${o.slug}`} className="inline-flex min-h-11 flex-col justify-center rounded-2xl border border-linea-calida bg-white px-5 py-2.5 transition hover:border-vino">
                  <span className="text-sm font-semibold">{o.nombre}</span>
                  <span className="text-xs text-pizarra">{o.etiqueta}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Cierre titulo={`Tu ${f.nombre.toLowerCase()}, en marcha en 3 semanas.`} sub="Configúralo en dos minutos, reserva y lo preparamos contigo desde la videollamada de arranque." cta={{ href: '#configurar', t: 'Configurar mi evento' }} secundario={{ href: '/experience', t: 'Ver los 7 formatos' }} />
      <BarraReserva precio={primeraVez.precio} />
    </div>
  );
}
