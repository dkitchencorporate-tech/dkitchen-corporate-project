import type { Metadata } from 'next';
import { HeroPagina, Titulo, Cierre } from '@/components/dk/Bloques';
import { Marquesina, TarjetaTilt } from '@/components/dk/Movimiento';
import Aparecer from '@/components/qr-landing/Aparecer';
import { CocinaMultimarca } from '@/components/dk/PiezasProductos';
import { MARCAS } from '@/lib/marcas-data';

/** Catálogo de marcas virtuales — rediseño 29/09/2026. Palabra clave: marcas virtuales para restaurantes. */
export const metadata: Metadata = {
  title: 'Marcas virtuales para tu cocina, ya probadas · DKitchen',
  description: 'Seis marcas virtuales que ya operaron en una dark kitchen real en Madrid, con carta, precios y procesos probados. Súmalas a tu cocina.',
  alternates: { canonical: 'https://dkitchencorporate.es/marcas' },
};

const COLORES = ['#B23A48', '#2F8F6B', '#6E0C2B', '#5B3E8A', '#3B6EA5', '#D99A1E'];
const wa = (n: string) => `#solicitud-marcas~${encodeURIComponent(n)}`;

export default function PaginaMarcas() {
  return (
    <div className="bg-white text-tinta">
      <HeroPagina etiqueta="Marcas virtuales"
        titulo="Seis marcas probadas. Listas para tu cocina."
        sub="No son ideas por desarrollar: operaron entre 2020 y 2022 en una dark kitchen real en Madrid, con carta, precios y procesos ya probados. Elige cuál sumas a tu cocina."
        ctas={[{ href: '#catalogo', t: 'Ver el catálogo' }, { href: '/dark-kitchen', t: 'Cómo funciona', secundario: true }]}
        visual={<CocinaMultimarca />} />

      <Marquesina oscura items={MARCAS.map((m) => m.nombre)} />

      <section id="catalogo" className="scroll-mt-20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <Titulo etiqueta="Catálogo" texto="Elige la que encaja con tu cocina." sub="Cada marca incluye carta, precios de referencia y un formato de evento con el que funciona especialmente bien." />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {MARCAS.map((m, i) => (
              <Aparecer key={m.slug} retraso={(i % 2) * 0.08}>
                <TarjetaTilt className="group relative h-full overflow-hidden rounded-[32px] bg-noche p-8 text-white">
                  <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-60 blur-2xl transition-transform duration-700 group-hover:scale-125" style={{ background: `radial-gradient(closest-side, ${COLORES[i % COLORES.length]}, transparent)` }} />
                  <p className="relative text-xs uppercase tracking-[0.22em]" style={{ color: COLORES[i % COLORES.length] }}>{m.concepto}</p>
                  <p className="font-display relative mt-2 text-4xl font-semibold">{m.nombre}</p>
                  <p className="relative mt-3 text-white/65">{m.descripcion}</p>
                  <ul className="relative mt-6 divide-y divide-white/10 border-y border-white/10 text-sm">
                    {m.menu.slice(0, 5).map((it) => (
                      <li key={it.nombre} className="flex items-baseline gap-3 py-2.5"><span>{it.nombre}</span><span className="flex-1 border-b border-dotted border-white/20" /><span className="whitespace-nowrap font-semibold">{it.precio}</span></li>
                    ))}
                  </ul>
                  <p className="relative mt-5 text-sm text-white/50">Evento ideal: {m.formatoEvento}</p>
                  <a href={wa(m.nombre)} className="relative mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-tinta">Sumar {m.nombre} a mi cocina</a>
                </TarjetaTilt>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <Cierre titulo="Tu cocina, con marcas que ya venden." sub="Cuéntanos qué cocina tienes y te decimos qué marca encaja mejor." cta={{ href: '#solicitud-marcas', t: 'Hablar con DKitchen' }} secundario={{ href: '/experience', t: 'Usarla en un evento' }} />
    </div>
  );
}
