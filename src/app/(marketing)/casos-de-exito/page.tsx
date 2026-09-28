import type { Metadata } from 'next';
import Image from 'next/image';
import { HeroPagina, Titulo, Cierre } from '@/components/dk/Bloques';
import { Marquesina, Contador, TarjetaTilt } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';

/** Casos de éxito — rediseño 29/09/2026. Solo lo que cada cliente ha autorizado mostrar. */
export const metadata: Metadata = {
  title: 'Casos de éxito · Restaurantes con app propia y sin comisiones · DKitchen',
  description: 'Negocios reales que ya venden con su propia app, sin comisiones de plataforma: pedido, catálogo y club de fidelización con su marca.',
  alternates: { canonical: 'https://dkitchencorporate.es/casos-de-exito' },
};

const WA = 'https://wa.me/34622652659?text=Hola,%20he%20visto%20los%20casos%20de%20%C3%A9xito%20y%20quiero%20hablar%20sobre%20mi%20negocio.';

function Movil({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-[40px] p-[3px] shadow-[0_40px_90px_-20px_rgba(0,0,0,.6)] [background:linear-gradient(145deg,#6b707b,#1b1d22_35%,#0b0c0f_70%,#4a4e57)]">
      <div className="rounded-[37px] bg-[#0B0C0F] p-[8px]"><div className="relative aspect-[9/19] overflow-hidden rounded-[30px]"><Image src={src} alt={alt} fill sizes="260px" className="object-cover object-top" /></div></div>
    </div>
  );
}

export default function CasosDeExito() {
  return (
    <div className="bg-white text-[#17191E]">
      <HeroPagina etiqueta="Casos de éxito"
        titulo="Esto no es una promesa. Ya está funcionando."
        sub="Sin cifras inventadas ni medias de mercado: cada caso muestra solo lo que ese negocio tiene funcionando y ha autorizado a enseñar."
        ctas={[{ href: '#nestor', t: 'Ver el caso' }, { href: WA, t: 'Quiero lo mismo', secundario: true }]}
        visual={<div className="mx-auto grid max-w-[420px] grid-cols-2 gap-4"><div className="mt-10"><Movil src="/images/casos-de-exito/nestor-pizza-home.jpg" alt="App de Néstor Pizzas: inicio" /></div><Movil src="/images/casos-de-exito/nestor-pizza-productos.jpg" alt="App de Néstor Pizzas: productos" /></div>} />

      <Marquesina oscura items={['App propia en producción', 'Pedido directo', 'Club de fidelización', 'Más de 50 productos', 'Sin apps de delivery']} />

      <section id="nestor" className="scroll-mt-20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Canilés, Granada · DKitchen Signature" texto="Néstor Pizzas: de pedir por teléfono a tener su propia app." />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <Aparecer className="rounded-[28px] border border-[#E6E6E2] bg-[#F7F7F5] p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A9EA6]">Antes</p><p className="font-display mt-3 text-3xl font-semibold">Pedidos solo por teléfono, sin carta digital propia.</p></Aparecer>
            <Aparecer retraso={0.1} className="rounded-[28px] bg-[#111317] p-8 text-white"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8592A]">Ahora</p><p className="font-display mt-3 text-3xl font-semibold">Su propia app en producción: pedido, catálogo y club de fidelización.</p></Aparecer>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {([[50, '+', 'productos en su carta, con ingredientes y precio'], [0, ' %', 'de comisión de plataforma por pedido'], [1, '', 'club de fidelización propio con puntos y canje']] as [number, string, string][]).map(([n, s, t], i) => (
              <Aparecer key={t} retraso={i * 0.08}><TarjetaTilt className="h-full rounded-[28px] border border-[#E6E6E2] p-7"><p className="font-display text-5xl font-semibold text-[#E8592A]"><Contador hasta={n} sufijo={s} /></p><p className="mt-2 text-[#6B7079]">{t}</p></TarjetaTilt></Aparecer>
            ))}
          </div>
          <Aparecer className="mt-10"><a href="https://nestorpizzas.es/" target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-semibold">Ver su app en vivo <span className="text-[#E8592A]">↗</span></a></Aparecer>
        </div>
      </section>

      <section className="bg-[#F7F7F5] py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Aparecer className="rounded-[28px] border border-dashed border-[#D6D6D1] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A9EA6]">Próximamente</p>
            <p className="font-display mt-2 text-3xl font-semibold">Seven Food Fries</p>
            <p className="mt-2 max-w-2xl text-[#6B7079]">Publicaremos su caso en cuanto el cliente autorice qué datos de su negocio se pueden mostrar. No antes.</p>
          </Aparecer>
        </div>
      </section>

      <Cierre titulo="El próximo caso puede ser el tuyo." sub="Cuéntanos cómo vendes hoy y te decimos qué tendría sentido para tu negocio." cta={{ href: WA, t: 'Hablar sobre mi negocio' }} secundario={{ href: '/base-operativa', t: 'Ver DKitchen Signature' }} />
    </div>
  );
}
