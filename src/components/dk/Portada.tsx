import Image from 'next/image';
import Link from 'next/link';
import DispositivoVivo from '@/components/dk/DispositivoVivo';
import { FondoVivo, Marquesina, Contador, TextoRevelado, BotonMagnetico, TarjetaTilt } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import SeccionQrPortada from '@/components/dk/SeccionQrPortada';
import { BandaFoto } from '@/components/dk/Bloques';
import ComparativaQr from '@/components/qr-landing/ComparativaQr';
import { QR_MENU, BASE_OPERATIVA, EXPERIENCE } from '@/lib/pricing-config';
import { WHATSAPP_DEMO } from '@/lib/whatsapp';

/**
 * Portada (componente desde el 27/10/2026: `cabecera` sustituye el hero de marca por la
 * cabecera de la carta QR cuando la visita llega con utm de flyer, propuesta o anuncio).
 * Portada v3 (12/10/2026): Signature y Experience delante (marca propia y
 * eventos), la carta QR como puerta de entrada por 1 € y demos en vivo en
 * lugar del caso antiguo. Precios leídos de pricing-config.
 * Portada v2 (29/09/2026): fondo vivo, dispositivo con la carta real, cinta de
 * mensajes, dolores reconocibles, escalera con precios reales, caso real,
 * invitación entre hosteleros y llamada a partners comerciales.
 */

const DEMOS = [
  { n: 'Seven Food Fries', t: 'Patatas y comida rápida', href: 'https://sevenfood.dkitchencorporate.es/' },
  { n: 'Wing Boss', t: 'Alitas y delivery', href: 'https://wingboss.dkitchencorporate.es/' },
  { n: 'Bokadipan', t: 'Bocadillería', href: 'https://bokadipan.dkitchencorporate.es/' },
];
const DOLORES = [
  ['Reimprimes la carta cada vez que sube algo.', 'Y aun así hay precios tachados en las mesas.'],
  ['Las plataformas se quedan un buen trozo de cada pedido.', 'Y los datos de tus clientes, también.'],
  ['Tus camareros van y vienen sin saber qué mesa llama.', 'Las mesas esperan y la cuenta llega tarde.'],
  ['Tu carta no dice nada de alérgenos.', 'Y la ley obliga a informar de los 14.'],
];
const ESCALERA = [
  { n: '01', t: 'DKitchen Signature', d: 'Tu propia app con tu marca, diseñada para tu local: tus clientes piden y pagan, cocina y TPV integrados. Sin comisiones por pedido y el código es tuyo.', p: `Entrada ${BASE_OPERATIVA.pagoUnico} € · desde ${BASE_OPERATIVA.mantenimiento.mensual} €/mes · + IVA`, href: '/signature', destacado: true, sello: 'Tu marca' },
  { n: '02', t: 'Experience', d: 'Eventos gastronómicos ya diseñados para llenar tus días flojos, con su propia web de reservas y entradas.', p: `Desde ${EXPERIENCE.tarifas.primeraVez.precio} € + IVA por evento`, href: '/experience' },
  { n: '03', t: 'Dark Kitchen', d: 'Marcas virtuales ya operadas para vender a domicilio con la cocina que ya tienes.', p: 'A medida', href: '/dark-kitchen' },
];

export default function Portada({ cabecera }: { cabecera?: React.ReactNode }) {
  return (
    <div className="bg-white text-tinta">
      {cabecera ?? (
      <section className="relative overflow-hidden bg-noche pb-24 pt-36 text-white md:pb-32 md:pt-44">
        <FondoVivo />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-[1.15fr_1fr] md:px-8">
          <div>
            <Aparecer><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-exito" /> Marca propia para hostelería · sin comisiones</p></Aparecer>
            <TextoRevelado como="h1" texto="Tu restaurante, con marca propia." className="font-display mt-6 text-[50px] font-semibold leading-[0.98] sm:text-7xl lg:text-[88px]" />
            <Aparecer retraso={0.3}><p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">Tu app con tu marca para vender sin comisiones y eventos que llenan los días flojos. Una caja registradora la tiene cualquiera: nosotros te damos una marca que vende.</p></Aparecer>
            <Aparecer retraso={0.4} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <BotonMagnetico href="/signature" className="inline-flex items-center justify-center gap-2 rounded-full bg-vino px-8 py-4 text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)] hover:bg-vino-hondo">Quiero mi propia app →</BotonMagnetico>
              <BotonMagnetico href="/experience" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-semibold backdrop-blur hover:border-white/50">Llenar mis días flojos</BotonMagnetico>
            </Aparecer>
            <Aparecer retraso={0.5}><p className="mt-6 text-sm text-white/60">¿Solo quieres la carta digital? <Link href="/qr" className="font-semibold text-white underline decoration-vino decoration-2 underline-offset-4">Empieza por {QR_MENU.primerMes} €</Link> · <a href={WHATSAPP_DEMO} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline decoration-[#25D366] decoration-2 underline-offset-4">Pedir demo por WhatsApp</a></p></Aparecer>
          </div>
          <DispositivoVivo ancho={280} />
        </div>
      </section>
      )}

      <Marquesina oscura items={['Tu marca, tus clientes', 'Sin comisiones por pedido', 'Eventos para los días flojos', 'Se conecta con tu TPV', 'Alérgenos según la UE', 'Carta QR: primer mes por 1 €']} />

      <BandaFoto src="/images/demo/s17.png" frase="La cocina ya es tuya. El cliente también debería serlo." firma="Sin intermediarios entre tu mesa y tu cliente" />

      <section className="bg-crema py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-vino">¿Te suena?</p>
          <TextoRevelado texto="Lo que le está costando dinero a tu local cada semana." className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl" />
          <div className="mt-14 grid md:grid-cols-2 md:gap-x-14">
            {DOLORES.map(([a, b], i) => (
              <Aparecer key={a} retraso={(i % 2) * 0.08} className="grid grid-cols-[56px_1fr] gap-4 border-t border-linea-fuerte py-8">
                <span className="acento-serif text-4xl leading-none text-vino">{i + 1}</span>
                <div><p className="text-xl font-semibold leading-snug">{a}</p><p className="mt-2 text-niebla">{b}</p></div>
              </Aparecer>
            ))}
          </div>
          <Aparecer className="mt-10 flex flex-col gap-3 sm:flex-row"><BotonMagnetico href="/signature" className="inline-flex justify-center rounded-full bg-tinta px-7 py-4 text-[15px] font-semibold text-white">Arreglarlo con tu propia app →</BotonMagnetico><a href={WHATSAPP_DEMO} target="_blank" rel="noopener noreferrer" className="inline-flex justify-center rounded-full border border-tinta px-7 py-4 text-[15px] font-semibold">Contarlo por WhatsApp</a></Aparecer>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-vino">Qué hacemos</p>
          <TextoRevelado texto="Marca, eventos y cocina. Todo hecho para tu local." className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl" />
          <div className="mt-14 space-y-4">
            {ESCALERA.map((e, i) => (
              <Aparecer key={e.n} retraso={i * 0.06}>
                <Link href={e.href} className={`group relative grid items-center gap-6 overflow-hidden rounded-[28px] border p-7 transition duration-500 md:grid-cols-[80px_1fr_auto] md:p-9 ${e.destacado ? 'border-tinta bg-noche text-white' : 'border-linea bg-white hover:-translate-y-1 hover:border-tinta hover:shadow-[0_20px_60px_rgba(23,25,30,.12)]'}`}>
                  {e.destacado && <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.45),transparent)] animate-[deriva2_16s_ease-in-out_infinite_alternate]" />}
                  <span className={`relative font-display text-2xl font-semibold ${e.destacado ? 'text-vino' : 'text-ceniza'}`}>{e.n}</span>
                  <div className="relative">
                    <h3 className="font-display text-3xl font-semibold">{e.t}{e.destacado && <span className="ml-3 inline-block whitespace-nowrap rounded-full bg-vino px-3 py-1 align-middle font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white">{e.sello}</span>}</h3>
                    <p className={`mt-2 max-w-2xl ${e.destacado ? 'text-white/65' : 'text-niebla'}`}>{e.d}</p>
                  </div>
                  <div className="relative md:text-right">
                    <p className={`text-sm ${e.destacado ? 'text-white/70' : 'text-grafito'}`}>{e.p}</p>
                    <p className={`mt-2 font-semibold ${e.destacado ? 'text-vino' : ''}`}>Ver más <span className="inline-block transition-transform group-hover:translate-x-1.5">→</span></p>
                  </div>
                </Link>
              </Aparecer>
            ))}
          </div>
          <Aparecer className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-8">
            <a href="#carta-qr" className="inline-block font-semibold underline decoration-vino decoration-2 underline-offset-4">¿Y la carta QR? Tiene su propia sección, es por donde se empieza ↓</a>
            <Link href="/precios" className="inline-block font-semibold underline decoration-vino decoration-2 underline-offset-4">Ver todos los precios →</Link>
          </Aparecer>
        </div>
      </section>

      <SeccionQrPortada />

      <ComparativaQr variante="portada" />

      <section className="relative overflow-hidden bg-noche py-24 text-white md:py-32">
        <FondoVivo className="opacity-60" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-vino">Demos en vivo</p>
          <TextoRevelado texto="Ábrelas en tu móvil. Así se ve una app con marca propia." className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-5xl" />
          <Aparecer retraso={0.2}><p className="mt-5 max-w-2xl text-lg text-white/65">Tres apps Signature con carta, pedidos, pago y club de puntos, cada una con su propio diseño. Ninguna se parece a otra, porque ningún local se parece a otro.</p></Aparecer>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {DEMOS.map((d, i) => (
              <Aparecer key={d.n} retraso={i * 0.08}>
                <a href={d.href} target="_blank" rel="noopener noreferrer" className="group block rounded-[28px] border border-white/15 bg-white/5 p-7 backdrop-blur transition duration-500 hover:-translate-y-1 hover:border-white/50">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/50">{d.t}</p>
                  <p className="font-display mt-3 text-3xl font-semibold">{d.n}</p>
                  <p className="mt-6 font-semibold text-vino">Abrir demo <span className="inline-block transition-transform group-hover:translate-x-1.5">→</span></p>
                </a>
              </Aparecer>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <BotonMagnetico href="/signature" className="inline-flex justify-center rounded-full bg-vino px-8 py-4 text-[15px] font-semibold">Todo sobre Signature →</BotonMagnetico>
            <a href={WHATSAPP_DEMO} target="_blank" rel="noopener noreferrer" className="inline-flex justify-center rounded-full border border-white/20 px-8 py-4 text-[15px] font-semibold hover:border-white/50">Quiero una demo con mi carta</a>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-noche py-24 text-white md:py-32">
        <FondoVivo className="opacity-60" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2 md:px-8">
          <div>
            <p className="etiqueta-dk text-vino">Caso real</p>
            <TextoRevelado texto="Néstor Pizzas vende con su propia app, no con la de otros." className="font-display mt-4 text-4xl font-semibold leading-[1.02] md:text-5xl" />
            <Aparecer retraso={0.2}><p className="mt-5 text-lg text-white/65">Carta, pedidos, programa de puntos y avisos a sus clientes con su marca. Sin comisiones por pedido y con sus datos en su casa.</p></Aparecer>
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <div><dt className="font-display text-4xl font-semibold"><Contador hasta={0} sufijo=" %" /></dt><dd className="mt-1 text-xs text-white/50">comisión por pedido</dd></div>
              <div><dt className="font-display text-4xl font-semibold"><Contador hasta={100} sufijo=" %" /></dt><dd className="mt-1 text-xs text-white/50">clientes propios</dd></div>
              <div><dt className="font-display text-4xl font-semibold"><Contador hasta={1} /></dt><dd className="mt-1 text-xs text-white/50">app con su marca</dd></div>
            </dl>
            <Link href="/casos-de-exito" className="mt-10 inline-flex items-center gap-2 font-semibold">Ver casos de éxito <span className="text-vino">→</span></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Aparecer><TarjetaTilt className="relative aspect-[9/16] overflow-hidden rounded-[28px] ring-1 ring-white/15"><Image src="/images/casos-de-exito/nestor-pizza-home.jpg" alt="App de Néstor Pizzas, portada" fill sizes="300px" className="object-cover" /></TarjetaTilt></Aparecer>
            <Aparecer retraso={0.15}><TarjetaTilt className="relative mt-12 aspect-[9/16] overflow-hidden rounded-[28px] ring-1 ring-white/15"><Image src="/images/casos-de-exito/nestor-pizza-menu.jpg" alt="App de Néstor Pizzas, carta" fill sizes="300px" className="object-cover" /></TarjetaTilt></Aparecer>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-noche py-28 text-center text-white md:py-36">
        <FondoVivo />
        <div className="relative mx-auto max-w-3xl px-6">
          <TextoRevelado texto="Tu marca. Tu app. Hoy." className="font-display text-5xl font-semibold leading-[1.0] md:text-8xl" />
          <p className="mx-auto mt-6 max-w-lg text-lg text-white/65">Te enseñamos tu app con tu carta antes de pagar nada. O empieza por la carta QR: primer mes por {QR_MENU.primerMes} €, sin permanencia.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"><a href={WHATSAPP_DEMO} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-vino px-10 py-5 text-base font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)]">Pedir mi demo por WhatsApp</a><Link href="/qr#planes" className="inline-block rounded-full border border-white/20 px-10 py-5 text-base font-semibold hover:border-white/50">Carta QR por {QR_MENU.primerMes} €</Link></div>
        </div>
      </section>
    </div>
  );
}
