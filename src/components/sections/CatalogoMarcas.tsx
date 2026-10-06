import { MARCAS } from '@/lib/marcas-data';
import Hero3DLazy from '@/components/motion/Hero3DLazy';
import TiltCard from '@/components/motion/TiltCard';

const WHATSAPP_MARCA = (nombre: string) =>
  `https://wa.me/34622652659?text=${encodeURIComponent(`Hola, quiero sumar la marca ${nombre} a mi cocina.`)}`;

export default function CatalogoMarcas() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-vino text-sm font-bold tracking-widest uppercase">
            Marcas virtuales
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-balance">
            Seis marcas ya operadas, listas para tu cocina.
          </h2>
          <p className="text-lg md:text-xl text-gray-600 text-pretty">
            No son conceptos por desarrollar — operaron entre 2020 y 2022 en una dark kitchen real en Madrid, con
            menú, pricing y procesos ya probados. Elige cuál sumar a tu cocina, o úsala como base de tu próximo
            evento DKitchen Experience.
          </p>
        </div>

        {/* Elemento 3D del hero (Parte 7, Sección 2.3): estante de las 6
            marcas, rotable al arrastrar o con auto-rotación lenta. */}
        <Hero3DLazy preset="marcas" className="w-full h-64 md:h-80 mb-14" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MARCAS.map((marca) => (
            <TiltCard
              key={marca.slug}
              className="bg-[#FDFCF8] rounded-3xl border border-gray-100 p-7 flex flex-col hover:shadow-xl hover:border-vino/30 transition-all scroll-mt-28"
            >
              <span id={marca.slug} className="block h-0" aria-hidden />
              <div className="text-4xl mb-3">{marca.emoji}</div>
              <h3 className="text-xl font-black mb-1">{marca.nombre}</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-vino mb-3">{marca.concepto}</p>
              <p className="text-gray-600 text-sm mb-5">{marca.descripcion}</p>

              <ul className="space-y-1.5 text-sm text-gray-700 mb-5 flex-1">
                {marca.menu.slice(0, 5).map((item) => (
                  <li key={item.nombre} className="flex justify-between gap-3 border-b border-gray-100 pb-1.5">
                    <span>{item.nombre}</span>
                    <span className="font-bold text-gray-900 whitespace-nowrap">{item.precio}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-gray-400 mb-4">
                Formato de evento emparejado: <span className="font-semibold text-gray-500">{marca.formatoEvento}</span>
              </p>

              <a
                href={WHATSAPP_MARCA(marca.nombre)}
                className="text-center bg-gray-900 text-white px-5 py-3 rounded-full font-bold text-sm hover:bg-black transition-colors"
              >
                Sumar {marca.nombre} a mi cocina
              </a>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
