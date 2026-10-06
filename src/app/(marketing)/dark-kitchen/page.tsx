import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroPagina, Titulo, Dolores, Faq, Cierre } from '@/components/dk/Bloques';
import { Marquesina, Contador, TarjetaTilt } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { CocinaMultimarca } from '@/components/dk/PiezasProductos';
import { MARCAS } from '@/lib/marcas-data';
import { ModelosReales } from '@/components/dk/Modelos';
import { FondoVivo } from '@/components/dk/Movimiento';

/** Dark Kitchen multimarca — rediseño 29/09/2026. Palabra clave: dark kitchen multimarca / marcas virtuales. */
export const metadata: Metadata = {
  title: 'Dark kitchen multimarca llave en mano · DKitchen',
  description: 'Hasta 7 marcas virtuales en tu cocina con recetas, proveedores y procesos probados, pedidos propios sin comisión y una sola pantalla. Desde 3.000 €.',
  alternates: { canonical: 'https://dkitchencorporate.es/dark-kitchen' },
};

const WA = '#solicitud-dark-kitchen';

export default function PaginaDarkKitchen() {
  return (
    <div className="bg-white text-tinta">
      <HeroPagina etiqueta="Dark Kitchen multimarca"
        titulo="Una cocina. Siete marcas. Cero comisiones."
        sub="Tu cocina ya está pagada. Te damos marcas virtuales con recetas, proveedores y procesos probados, pedidos propios sin comisión y una sola pantalla que ordena todo."
        ctas={[{ href: WA, t: 'Solicitar entrevista de admisión' }, { href: '/marcas', t: 'Ver las marcas', secundario: true }]}
        nota="Solo 2 proyectos por trimestre."
        visual={<CocinaMultimarca />} />

      <Marquesina oscura items={['6 marcas probadas', 'Hasta 7 marcas por cocina', 'Pedidos propios sin comisión', 'Una sola pantalla de cocina', 'Recetas y proveedores cerrados']} />

      <section className="bg-crema py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="El precio de improvisar" texto="Más pedidos con caos es más ruina, no más dinero." sub="Abrir cinco apps de delivery a la vez colapsa los fogones, quema al equipo y se lleva el margen en comisiones." />
          <div className="mt-14 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <Aparecer className="rounded-[28px] bg-noche p-8 text-white md:p-10">
              <p className="text-sm text-white/60">Si facturas en apps de delivery</p>
              <p className="font-display mt-1 text-5xl font-semibold"><Contador hasta={10000} sufijo=" €" /></p>
              <p className="mt-6 text-sm text-white/60">con comisiones del 30 %, pierdes</p>
              <p className="font-display mt-1 text-5xl font-semibold text-vino">−<Contador hasta={3000} sufijo=" €" /></p>
              <p className="mt-6 text-white/65">En tu propio canal, esa misma venta deja 0 € en comisiones de plataforma.</p>
            </Aparecer>
            <Dolores items={[['Fogones colapsados en cada pico.', 'Y el pase se convierte en una guerra.'], ['Recetas que cambian según quién cocina.', 'Y las reseñas lo notan.']]} />
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Qué te llevas" texto="Todo lo difícil, ya resuelto." />
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {([['Marcas llave en mano', 'Seis marcas ya operadas en una cocina real: fichas técnicas, proveedores y tiempos. Tu equipo sigue el protocolo y empaqueta.'], ['Pedidos propios', 'Tu propia app de pedidos: el cliente pide en dos toques, el dinero va a tu banco y la base de clientes es tuya.'], ['Una sola pantalla de cocina', 'Todos los pedidos de todas las marcas, ordenados en una pantalla. El chef solo ve qué cocinar y en qué orden.']] as [string, string][]).map(([t, d], i) => (
              <Aparecer key={t} retraso={i * 0.08}><TarjetaTilt className="h-full rounded-[28px] border border-linea p-7"><span className="font-display text-sm font-semibold text-vino">0{i + 1}</span><p className="mt-3 text-xl font-semibold">{t}</p><p className="mt-2 text-niebla">{d}</p></TarjetaTilt></Aparecer>
            ))}
          </div>
          <div className="mt-14 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {MARCAS.map((m) => (
              <Link key={m.slug} href="/marcas" className="shrink-0 rounded-full border border-linea px-5 py-3 text-sm font-semibold hover:border-tinta">{m.nombre} <span className="font-normal text-ceniza">· {m.concepto}</span></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-noche py-24 text-white md:py-32">
        <FondoVivo className="opacity-50" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-8">
          <Titulo oscuro etiqueta="Desarrollos reales" texto="Tres marcas del catálogo, ya con su app de pedidos." sub="Seven Food Fries, Wing Boss y Bokadipan, marcas propias de DKitchen, ya tienen su app de pedidos, lista para replicar en tu cocina." />
          <ModelosReales />
        </div>
      </section>

      <section className="bg-noche py-24 text-white md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo oscuro etiqueta="Proceso de admisión" texto="No aceptamos todos los proyectos. Y eso te protege." sub="Si los números de tu cocina no garantizan rentabilidad, te lo decimos antes de que gastes un euro." />
          <ol className="mt-14 grid gap-4 md:grid-cols-3">
            {([['Evaluación', 'Analizamos tu cocina, tu radio de reparto y tu coste de producto. Si no sale rentable, paramos aquí.'], ['Ingeniería de carta', 'Adaptamos las recetas a tu equipo, diseñamos el flujo de trabajo y elegimos el envase para que llegue perfecto.'], ['Lanzamiento', 'Montamos los pedidos propios, el cobro y la conexión de repartidores con tu pantalla de cocina.']] as [string, string][]).map(([t, d], i) => (
              <Aparecer key={t} retraso={i * 0.1}><li className="h-full rounded-[28px] border border-white/10 p-7"><p className="font-display text-5xl font-semibold text-vino">{i + 1}</p><p className="mt-3 text-xl font-semibold">{t}</p><p className="mt-2 text-white/60">{d}</p></li></Aparecer>
            ))}
          </ol>
          <Aparecer className="mt-10 rounded-[24px] border border-white/10 bg-white/[0.04] p-6 md:flex md:items-center md:justify-between md:p-8">
            <div><p className="text-sm text-white/60">Inversión</p><p className="font-display text-4xl font-semibold">De 3.000 € a 10.000 € + IVA</p><p className="mt-1 text-sm text-white/50">La cifra exacta se cierra en la evaluación. Es un proyecto a medida, no un plan de catálogo.</p></div>
            <a href={WA} className="mt-6 inline-block rounded-full bg-vino px-7 py-4 font-semibold md:mt-0">Solicitar entrevista</a>
          </Aparecer>
        </div>
      </section>

      <Faq preguntas={[
        ['¿Por qué solo 2 proyectos por trimestre?', 'Es un límite real de capacidad: cada proyecto exige ingeniería de procesos a medida y solo podemos garantizar ese nivel en dos a la vez.'],
        ['¿Qué pasa si no supero la evaluación?', 'Rechazamos el proyecto antes de que gastes un euro, y te explicamos por qué.'],
        ['¿Puedo usar mi propia carta?', 'Sí. Las marcas del catálogo aceleran el arranque, pero los procesos y los pedidos propios funcionan igual con tu menú.'],
        ['¿Tengo que dejar Glovo, Uber Eats o Just Eat?', 'No. Puedes seguir en ellas; tu canal propio es donde no pagas comisión, no el único posible.'],
      ]} />

      <Cierre titulo="Tu cocina ya está pagada. Hazla vender más." sub="Pide la entrevista de admisión. Si no es rentable para ti, te lo decimos antes de que gastes un euro." cta={{ href: WA, t: 'Solicitar entrevista' }} secundario={{ href: '/casos-de-exito', t: 'Ver casos reales' }} />
    </div>
  );
}
