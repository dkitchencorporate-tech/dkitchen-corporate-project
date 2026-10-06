import type { Metadata } from 'next';
import { HeroPagina, Titulo, Dolores, Faq, Cierre } from '@/components/dk/Bloques';
import { Marquesina, TarjetaTilt } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { TaquillaViva, EscaleraPrecios } from '@/components/dk/PiezasProductos';
import Link from 'next/link';
import { FORMATOS_EXPERIENCE } from '@/lib/experience-formatos';
import { EXPERIENCE } from '@/lib/pricing-config';

const { primeraVez, nuevoEvento, reuso, reusoFidelizado, primeraParaClienteQr } = EXPERIENCE.tarifas;

/** DKitchen Experience — rediseño 29/09/2026. Palabra clave: eventos para restaurantes llave en mano. */
export const metadata: Metadata = {
  title: 'Eventos para restaurantes llave en mano · DKitchen',
  description: `Evento completo para tu restaurante: concepto, marketing, anuncios y web de entradas. Sin comisión de DKitchen sobre la taquilla. Desde ${primeraVez.precio} € + IVA.`,
  alternates: { canonical: 'https://dkitchencorporate.es/experience' },
};

const WA = '/pagar/experience';

export default function PaginaExperience() {
  return (
    <div className="bg-white text-tinta">
      <HeroPagina etiqueta="DKitchen Experience"
        titulo="Tu martes vacío, convertido en taquilla llena."
        sub="Te entregamos un evento completo y ya diseñado: concepto, marketing, anuncios y web de venta de entradas. Tú cocinas y la taquilla va directa a tu cuenta, sin comisión de DKitchen."
        ctas={[{ href: WA, t: 'Montar mi primer evento' }, { href: '#precios', t: 'Ver precios', secundario: true }]}
        nota="Unas 3 semanas desde el pago hasta el día del evento."
        visual={<TaquillaViva />} />

      <Marquesina oscura items={['0 % de comisión', 'La taquilla, directa a tu cuenta', '7 formatos listos', 'QR de entrada único', 'Anuncios gestionados', 'Listo en 3 semanas']} />

      <section className="bg-crema py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="El problema" texto="Cada mesa vacía es dinero que no vuelve." sub="El local, el equipo y el alquiler cuestan lo mismo lleno que vacío. La diferencia es quién decide venir." />
          <Dolores items={[
            ['Tienes días que no pagan ni la luz.', 'Y bajar precios solo te enseña a cobrar menos.'],
            ['Montar un evento te roba semanas.', 'Idea, cartelería, anuncios, venta de entradas… y aun así no sabes si vendrá alguien.'],
            ['Las ticketeras se quedan su trozo.', 'Y el dinero tarda en llegarte.'],
            ['Nadie controla la puerta.', 'Listas en papel, efectivo y discusiones en la entrada.'],
          ]} cta={{ href: WA, t: 'Quiero llenar esos días →' }} />
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Siete formatos listos" texto="No inventamos desde cero. El formato ya está hecho." sub="Siete formatos pensados para cualquier tipo de cocina. El formato lo ponemos nosotros; el menú y la esencia de tu local, tú." />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATOS_EXPERIENCE.map(({ slug, nombre: t, etiqueta: m, frase: d }, i) => (
              <Aparecer key={slug} retraso={(i % 3) * 0.07}>
                <Link href={`/experience/${slug}`} className="block h-full"><TarjetaTilt className="group relative h-full overflow-hidden rounded-[28px] bg-noche p-7 text-white">
                  <div aria-hidden="true" className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.4),transparent)] transition-transform duration-700 group-hover:scale-150" />
                  <p className="relative etiqueta-dk text-oro">{m}</p>
                  <p className="font-display relative mt-3 text-3xl font-semibold">{t}</p>
                  <p className="relative mt-2 text-white/60">{d}</p>
                  <p className="relative mt-5 text-sm font-semibold text-oro">Ver el formato y calcular mi evento →</p>
                </TarjetaTilt></Link>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-noche py-24 text-white md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo oscuro etiqueta="Quién hace qué" texto="Nosotros montamos. Tú cocinas y cobras." />
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {([['Lo hacemos nosotros', ['Concepto y guía del evento', 'Plan operativo: antes, durante y después', 'Diseño de piezas digitales y flyer', 'Web de venta de entradas conectada a tu cobro', 'Campaña de anuncios, montada y gestionada', 'Informe final con entradas e ingresos']], ['Lo haces tú', ['Abrir tu cuenta de cobro (Stripe, SumUp o Revolut Pay)', 'Elegir fecha, aforo y precio', 'Pagar la publicidad y los flyers', 'Escanear las entradas en la puerta', 'Cocinar y dar una noche que se recuerde', 'Cobrar la taquilla, sin comisión de DKitchen']]] as [string, string[]][]).map(([t, l], i) => (
              <Aparecer key={t} retraso={i * 0.1} className={`rounded-[28px] p-8 ${i ? 'border border-white/10' : 'bg-vino'}`}>
                <p className="font-display text-2xl font-semibold">{t}</p>
                <ul className="mt-5 space-y-2.5">{l.map((x) => <li key={x} className="flex gap-3 text-[15px]"><span>✓</span><span className={i ? 'text-white/75' : ''}>{x}</span></li>)}</ul>
              </Aparecer>
            ))}
          </div>
          <p className="mt-6 text-sm text-white/70">Cada entrada genera un QR único de un solo uso. La publicidad la pagas directo a Meta o Google: nunca tocamos tu dinero.</p>
        </div>
      </section>

      <section id="precios" className="scroll-mt-20 bg-crema py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Precios" texto="Cuanto más repites, menos pagas." sub="Cuatro tarifas fijas, sin porcentaje ni letra pequeña. El trabajo pesado ya está hecho, así que el precio baja con cada evento." />
          <EscaleraPrecios tramos={[[primeraVez.precio, 'Primera vez', 'Cliente nuevo, cualquiera de los 7 formatos.'], [nuevoEvento.precio, 'Nuevo evento', 'Ya trabajaste con nosotros y quieres otro formato.'], [reuso.precio, 'Reuso', 'El mismo evento, en una fecha nueva.'], [reusoFidelizado.precio, 'Reuso fidelizado', 'A partir de tu tercer evento.']]} />
          <Aparecer className="mt-10 rounded-[24px] bg-noche p-6 text-white md:flex md:items-center md:justify-between md:p-8">
            <p className="text-lg"><strong className="text-oro">¿Tienes la Carta QR con nosotros?</strong> Tu primer evento cuesta {primeraParaClienteQr.precio} € en lugar de {primeraVez.precio} € (+ IVA). Tarifa publicada, sin negociar.</p>
          </Aparecer>
        </div>
      </section>

      <Faq preguntas={[
        ['¿Cómo se cobran las entradas?', 'Con tu propia pasarela: Stripe, SumUp o Revolut Pay, la que elijas. Nosotros la conectamos a la web de venta y el dinero cae directo en tu cuenta.'],
        ['¿Quién paga los anuncios?', 'Tú, directamente a Meta o Google. Nosotros creamos y gestionamos la campaña, pero nunca ponemos ni intermediamos ese dinero.'],
        ['¿Cuánto tarda en montarse?', 'Unas tres semanas desde el pago hasta el día del evento: tiempo para el concepto, la campaña y la venta de entradas.'],
        ['¿Puedo usar mi propia carta?', 'Sí. El formato se mantiene y el menú lo pones tú.'],
      ]} />

      <Cierre titulo="Ese día flojo tiene arreglo." sub="Cuéntanos qué día te cuesta llenar y te proponemos el formato que mejor encaja con tu local." cta={{ href: WA, t: 'Montar mi primer evento' }} secundario={{ href: '/qr', t: 'Ver la carta QR' }} />
    </div>
  );
}
