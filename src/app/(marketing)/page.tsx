import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MovilCss } from '@/components/qr-landing/Movil3D';
import Aparecer from '@/components/qr-landing/Aparecer';

/**
 * Portada (rediseño 29/09/2026, PROPUESTA_REDISENO_WEB_Y_SISTEMA): una promesa,
 * el producto funcionando, la escalera de productos con precios reales y un
 * caso real. Sin emojis ni tarjetas genéricas.
 */
export const metadata: Metadata = {
  title: 'DKitchen · Carta digital QR, apps propias y sistemas para restaurantes',
  description: 'Digitalización para hostelería sin comisiones: carta digital QR desde 9 €/mes, tu propia app de pedidos con DKitchen Signature, eventos llave en mano y dark kitchen multimarca.',
  alternates: { canonical: 'https://dkitchencorporate.es' },
};

const ESCALERA = [
  { n: '01', t: 'Carta QR', d: 'Tu carta digital al día desde el móvil. Estilos propios, alérgenos, reservas y llamada al camarero.', p: 'Desde 9 €/mes · primer mes 1 €', href: '/qr', destacado: true },
  { n: '02', t: 'DKitchen Signature', d: 'Tu propia app con tu marca: tus clientes piden y pagan, cocina y TPV integrados. Es tuya.', p: 'Entrada 700 € · 69 €/mes', href: '/base-operativa' },
  { n: '03', t: 'Experience', d: 'Eventos gastronómicos ya diseñados para llenar tus días flojos, con su propia web de reservas.', p: 'Desde 299 € por evento', href: '/experience' },
  { n: '04', t: 'Dark Kitchen', d: 'Marcas virtuales ya operadas para vender a domicilio con la cocina que ya tienes.', p: 'A medida', href: '/dark-kitchen' },
];

export default function Home() {
  return (
    <div className="bg-white text-[#17191E]">
      <section className="relative overflow-hidden bg-[#17191E] pb-20 pt-36 text-white md:pb-28 md:pt-44">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 h-[640px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(232,89,42,.22),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-[1.2fr_1fr] md:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-[#2F8F6B]" /> Tecnología para hostelería · sin comisiones</p>
            <h1 className="font-display mt-6 text-[48px] font-semibold leading-[0.98] sm:text-7xl lg:text-[88px]">Tu restaurante,<br /><span className="text-[#E8592A]">con sistema propio.</span></h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/65">Empieza con la carta digital por 1 €. Cuando crezcas, tu propia app de pedidos. Sin comisiones por ticket y con los datos de tus clientes siempre en tu casa.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/qr" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E8592A] px-7 py-4 text-[15px] font-semibold hover:bg-[#CF4A1F]">Ver la carta QR →</Link>
              <Link href="/base-operativa" className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-4 text-[15px] font-semibold hover:border-white/40">Quiero mi propia app</Link>
            </div>
          </div>
          <MovilCss />
        </div>
      </section>

      <section className="bg-[#F7F7F5] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Aparecer>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8592A]">Qué hacemos</p>
            <h2 className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] md:text-6xl">Cuatro escalones. Subes cuando tu negocio lo pide.</h2>
          </Aparecer>
          <div className="mt-14 space-y-4">
            {ESCALERA.map((e, i) => (
              <Aparecer key={e.n} retraso={i * 0.06}>
                <Link href={e.href} className={`group grid items-center gap-6 rounded-[28px] border p-7 transition md:grid-cols-[80px_1fr_auto] md:p-9 ${e.destacado ? 'border-[#17191E] bg-[#17191E] text-white' : 'border-[#E6E6E2] bg-white hover:border-[#17191E]'}`}>
                  <span className={`font-display text-2xl font-semibold ${e.destacado ? 'text-[#E8592A]' : 'text-[#9A9EA6]'}`}>{e.n}</span>
                  <div>
                    <h3 className="font-display text-3xl font-semibold">{e.t}{e.destacado && <span className="ml-3 rounded-full bg-[#E8592A] px-3 py-1 align-middle font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white">Empieza aquí</span>}</h3>
                    <p className={`mt-2 max-w-2xl ${e.destacado ? 'text-white/65' : 'text-[#6B7079]'}`}>{e.d}</p>
                  </div>
                  <div className="md:text-right">
                    <p className={`text-sm ${e.destacado ? 'text-white/70' : 'text-[#3F434B]'}`}>{e.p}</p>
                    <p className={`mt-2 font-semibold ${e.destacado ? 'text-[#E8592A]' : ''}`}>Ver más <span className="inline-block transition-transform group-hover:translate-x-1">→</span></p>
                  </div>
                </Link>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2 md:px-8">
          <Aparecer>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8592A]">Caso real</p>
            <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.02] md:text-5xl">Néstor Pizzas vende con su propia app, no con la de otros.</h2>
            <p className="mt-5 text-lg text-[#6B7079]">Carta, pedidos, programa de puntos y avisos a sus clientes con su marca. Sin comisiones por pedido y con sus datos en su casa.</p>
            <Link href="/casos-de-exito" className="mt-8 inline-flex items-center gap-2 font-semibold">Ver casos de éxito <span className="text-[#E8592A]">→</span></Link>
          </Aparecer>
          <Aparecer retraso={0.1} className="grid grid-cols-2 gap-4">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-[#E6E6E2]"><Image src="/images/casos-de-exito/nestor-pizza-home.jpg" alt="App de Néstor Pizzas, portada" fill sizes="300px" className="object-cover" /></div>
            <div className="relative mt-10 aspect-[9/16] overflow-hidden rounded-[28px] border border-[#E6E6E2]"><Image src="/images/casos-de-exito/nestor-pizza-menu.jpg" alt="App de Néstor Pizzas, carta" fill sizes="300px" className="object-cover" /></div>
          </Aparecer>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#17191E] py-24 text-center text-white md:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(232,89,42,.22),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-6">
          <h2 className="font-display text-5xl font-semibold leading-[1.0] md:text-7xl">Empieza por la carta. Hoy.</h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">Primer mes por 1 €, sin permanencia. Si en un mes no te convence, lo dejas.</p>
          <Link href="/qr#planes" className="mt-10 inline-block rounded-full bg-[#E8592A] px-8 py-4 text-[15px] font-semibold">Empezar por 1 €</Link>
        </div>
      </section>
    </div>
  );
}
