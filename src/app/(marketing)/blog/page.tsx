import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICULOS } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog de DKitchen · Carta digital, alérgenos y tecnología para restaurantes',
  description: 'Guías prácticas para bares y restaurantes: carta digital QR, alérgenos obligatorios, app propia frente a plataformas de delivery y más.',
  alternates: { canonical: 'https://dkitchencorporate.es/blog' },
};

const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Blog() {
  return (
    <div className="bg-[#F7F5F2] text-[#17191E]">
      <section className="bg-[#17191E] pb-20 pt-36 text-white md:pt-44">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <p className="etiqueta-dk text-[#6E0C2B]">Blog</p>
          <h1 className="font-display mt-4 max-w-3xl text-5xl font-semibold leading-[1.0] md:text-7xl">Lo que tu restaurante necesita saber.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/60">Guías claras, sin humo, escritas por el equipo de DKitchen.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-24">
        <ul className="grid gap-5 md:grid-cols-2">
          {ARTICULOS.map((a, i) => (
            <li key={a.slug} className={i === 0 ? 'md:col-span-2' : ''}>
              <Link href={`/blog/${a.slug}`} className="group flex h-full flex-col rounded-[28px] border border-[#E6E6E2] bg-white p-7 transition hover:border-[#17191E] md:p-9">
                <p className="text-xs text-[#9A9EA6]">{fecha.format(new Date(a.fecha))} · {a.lectura} de lectura</p>
                <h2 className={`font-display mt-3 font-semibold leading-[1.05] ${i === 0 ? 'text-4xl' : 'text-2xl'}`}>{a.titulo}</h2>
                <p className="mt-3 flex-1 text-[#6B7079]">{a.descripcion}</p>
                <p className="mt-6 font-semibold">Leer <span className="inline-block text-[#6E0C2B] transition-transform group-hover:translate-x-1">→</span></p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
