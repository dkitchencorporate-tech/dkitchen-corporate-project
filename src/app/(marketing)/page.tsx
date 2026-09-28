import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import DispositivoVivo from '@/components/dk/DispositivoVivo';
import { FondoVivo, Marquesina, Contador, TextoRevelado, BotonMagnetico, TarjetaTilt } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import VistaExplosionada from '@/components/dk/VistaExplosionada';
import { BandaFoto } from '@/components/dk/Bloques';

/**
 * Portada v2 (29/09/2026): fondo vivo, dispositivo con la carta real, cinta de
 * mensajes, dolores reconocibles, escalera con precios reales, caso real,
 * invitación entre hosteleros y llamada a partners comerciales.
 */
export const metadata: Metadata = {
  title: 'DKitchen · Carta digital QR, apps propias y sistemas para restaurantes',
  description: 'Digitalización para hostelería sin comisiones: carta digital QR desde 9 €/mes, tu propia app de pedidos con DKitchen Signature, eventos llave en mano y dark kitchen multimarca.',
  alternates: { canonical: 'https://dkitchencorporate.es' },
};

const DOLORES = [
  ['Reimprimes la carta cada vez que sube algo.', 'Y aun así hay precios tachados en las mesas.'],
  ['Las plataformas se quedan un buen trozo de cada pedido.', 'Y los datos de tus clientes, también.'],
  ['Tus camareros van y vienen sin saber qué mesa llama.', 'Las mesas esperan y la cuenta llega tarde.'],
  ['Tu carta no dice nada de alérgenos.', 'Y la ley obliga a informar de los 14.'],
];
const ESCALERA = [
  { n: '01', t: 'Carta QR', d: 'Tu carta digital al día desde el móvil. Estilos propios, alérgenos, reservas y llamada al camarero.', p: 'Desde 9 €/mes · primer mes 1 €', href: '/qr', destacado: true },
  { n: '02', t: 'DKitchen Signature', d: 'Tu propia app con tu marca: tus clientes piden y pagan, cocina y TPV integrados. Es tuya.', p: 'Entrada 700 € · 69 €/mes', href: '/base-operativa' },
  { n: '03', t: 'Experience', d: 'Eventos gastronómicos ya diseñados para llenar tus días flojos, con su propia web de reservas.', p: 'Desde 299 € por evento', href: '/experience' },
  { n: '04', t: 'Dark Kitchen', d: 'Marcas virtuales ya operadas para vender a domicilio con la cocina que ya tienes.', p: 'A medida', href: '/dark-kitchen' },
];

export default function Home() {
  return (
    <div className="bg-white text-[#17191E]">
      <section className="relative overflow-hidden bg-[#0A080C] pb-24 pt-36 text-white md:pb-32 md:pt-44">
        <FondoVivo />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-[1.15fr_1fr] md:px-8">
          <div>
            <Aparecer><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2F8F6B]" /> Tecnología para hostelería · sin comisiones</p></Aparecer>
            <TextoRevelado como="h1" texto="Tu restaurante, con sistema propio." className="font-display mt-6 text-[50px] font-semibold leading-[0.98] sm:text-7xl lg:text-[88px]" />
            <Aparecer retraso={0.3}><p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">Empieza con la carta digital por 1 €. Cuando crezcas, tu propia app de pedidos. Sin comisiones por ticket y con tus clientes siempre en tu casa.</p></Aparecer>
            <Aparecer retraso={0.4} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <BotonMagnetico href="/qr" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6E0C2B] px-8 py-4 text-[15px] font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)] hover:bg-[#4A0819]">Empieza por 1 € →</BotonMagnetico>
              <BotonMagnetico href="/base-operativa" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-semibold backdrop-blur hover:border-white/50">Quiero mi propia app</BotonMagnetico>
            </Aparecer>
          </div>
          <DispositivoVivo ancho={280} />
        </div>
      </section>

      <Marquesina oscura items={['Sin comisiones por pedido', 'Cambios al momento', 'Alérgenos según la UE', 'Tu marca, tus clientes', 'Primer mes por 1 €', 'Sin permanencia']} />

      <VistaExplosionada />

      <BandaFoto src="/images/demo/s17.png" frase="La cocina ya es tuya. El cliente también debería serlo." firma="Sin intermediarios entre tu mesa y tu cliente" />

      <section className="bg-[#F7F5F2] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-[#6E0C2B]">¿Te suena?</p>
          <TextoRevelado texto="Lo que le está costando dinero a tu local cada semana." className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl" />
          <div className="mt-14 grid md:grid-cols-2 md:gap-x-14">
            {DOLORES.map(([a, b], i) => (
              <Aparecer key={a} retraso={(i % 2) * 0.08} className="grid grid-cols-[56px_1fr] gap-4 border-t border-[#D9D3CB] py-8">
                <span className="acento-serif text-4xl leading-none text-[#6E0C2B]">{i + 1}</span>
                <div><p className="text-xl font-semibold leading-snug">{a}</p><p className="mt-2 text-[#6B7079]">{b}</p></div>
              </Aparecer>
            ))}
          </div>
          <Aparecer className="mt-10"><BotonMagnetico href="/qr" className="inline-flex rounded-full bg-[#17191E] px-7 py-4 text-[15px] font-semibold text-white">Arreglarlo por 1 € →</BotonMagnetico></Aparecer>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="etiqueta-dk text-[#6E0C2B]">Qué hacemos</p>
          <TextoRevelado texto="Cuatro escalones. Subes cuando tu negocio lo pide." className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl" />
          <div className="mt-14 space-y-4">
            {ESCALERA.map((e, i) => (
              <Aparecer key={e.n} retraso={i * 0.06}>
                <Link href={e.href} className={`group relative grid items-center gap-6 overflow-hidden rounded-[28px] border p-7 transition duration-500 md:grid-cols-[80px_1fr_auto] md:p-9 ${e.destacado ? 'border-[#17191E] bg-[#0A080C] text-white' : 'border-[#E6E6E2] bg-white hover:-translate-y-1 hover:border-[#17191E] hover:shadow-[0_20px_60px_rgba(23,25,30,.12)]'}`}>
                  {e.destacado && <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.45),transparent)] animate-[deriva2_16s_ease-in-out_infinite_alternate]" />}
                  <span className={`relative font-display text-2xl font-semibold ${e.destacado ? 'text-[#6E0C2B]' : 'text-[#9A9EA6]'}`}>{e.n}</span>
                  <div className="relative">
                    <h3 className="font-display text-3xl font-semibold">{e.t}{e.destacado && <span className="ml-3 inline-block whitespace-nowrap rounded-full bg-[#6E0C2B] px-3 py-1 align-middle font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white">Empieza aquí</span>}</h3>
                    <p className={`mt-2 max-w-2xl ${e.destacado ? 'text-white/65' : 'text-[#6B7079]'}`}>{e.d}</p>
                  </div>
                  <div className="relative md:text-right">
                    <p className={`text-sm ${e.destacado ? 'text-white/70' : 'text-[#3F434B]'}`}>{e.p}</p>
                    <p className={`mt-2 font-semibold ${e.destacado ? 'text-[#6E0C2B]' : ''}`}>Ver más <span className="inline-block transition-transform group-hover:translate-x-1.5">→</span></p>
                  </div>
                </Link>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0A080C] py-24 text-white md:py-32">
        <FondoVivo className="opacity-60" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2 md:px-8">
          <div>
            <p className="etiqueta-dk text-[#6E0C2B]">Caso real</p>
            <TextoRevelado texto="Néstor Pizzas vende con su propia app, no con la de otros." className="font-display mt-4 text-4xl font-semibold leading-[1.02] md:text-5xl" />
            <Aparecer retraso={0.2}><p className="mt-5 text-lg text-white/65">Carta, pedidos, programa de puntos y avisos a sus clientes con su marca. Sin comisiones por pedido y con sus datos en su casa.</p></Aparecer>
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <div><dt className="font-display text-4xl font-semibold"><Contador hasta={0} sufijo=" %" /></dt><dd className="mt-1 text-xs text-white/50">comisión por pedido</dd></div>
              <div><dt className="font-display text-4xl font-semibold"><Contador hasta={100} sufijo=" %" /></dt><dd className="mt-1 text-xs text-white/50">clientes propios</dd></div>
              <div><dt className="font-display text-4xl font-semibold"><Contador hasta={1} /></dt><dd className="mt-1 text-xs text-white/50">app con su marca</dd></div>
            </dl>
            <Link href="/casos-de-exito" className="mt-10 inline-flex items-center gap-2 font-semibold">Ver casos de éxito <span className="text-[#6E0C2B]">→</span></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Aparecer><TarjetaTilt className="relative aspect-[9/16] overflow-hidden rounded-[28px] ring-1 ring-white/15"><Image src="/images/casos-de-exito/nestor-pizza-home.jpg" alt="App de Néstor Pizzas, portada" fill sizes="300px" className="object-cover" /></TarjetaTilt></Aparecer>
            <Aparecer retraso={0.15}><TarjetaTilt className="relative mt-12 aspect-[9/16] overflow-hidden rounded-[28px] ring-1 ring-white/15"><Image src="/images/casos-de-exito/nestor-pizza-menu.jpg" alt="App de Néstor Pizzas, carta" fill sizes="300px" className="object-cover" /></TarjetaTilt></Aparecer>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0A080C] py-28 text-center text-white md:py-36">
        <FondoVivo />
        <div className="relative mx-auto max-w-3xl px-6">
          <TextoRevelado texto="Empieza por la carta. Hoy." className="font-display text-5xl font-semibold leading-[1.0] md:text-8xl" />
          <p className="mx-auto mt-6 max-w-lg text-lg text-white/65">Primer mes por 1 €, sin permanencia. Si en un mes no te convence, lo dejas.</p>
          <div className="mt-10"><BotonMagnetico href="/qr#planes" className="inline-block rounded-full bg-[#6E0C2B] px-10 py-5 text-base font-semibold shadow-[0_10px_40px_rgba(163,24,74,.45)]">Empezar por 1 €</BotonMagnetico></div>
        </div>
      </section>
    </div>
  );
}
