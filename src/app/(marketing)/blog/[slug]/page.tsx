import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ARTICULOS, articulo } from '@/lib/blog';

export function generateStaticParams() {
  return ARTICULOS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = articulo((await params).slug);
  if (!a) return { title: 'Artículo no encontrado' };
  return {
    title: `${a.titulo} · DKitchen`,
    description: a.descripcion,
    alternates: { canonical: `https://dkitchencorporate.es/blog/${a.slug}` },
    openGraph: { title: a.titulo, description: a.descripcion, type: 'article', publishedTime: a.fecha },
  };
}

const fecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function PaginaArticulo({ params }: { params: Promise<{ slug: string }> }) {
  const a = articulo((await params).slug);
  if (!a) notFound();
  const otros = ARTICULOS.filter((x) => x.slug !== a.slug);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article', headline: a.titulo, description: a.descripcion,
    datePublished: a.fecha, author: { '@type': 'Organization', name: 'DKitchen' },
    publisher: { '@type': 'Organization', name: 'DKitchen', url: 'https://dkitchencorporate.es' },
    mainEntityOfPage: `https://dkitchencorporate.es/blog/${a.slug}`,
  };

  return (
    <article className="bg-white text-[#17191E]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <header className="bg-[#17191E] pb-16 pt-36 text-white md:pt-44">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/blog" className="text-sm text-white/50 hover:text-white">← Blog</Link>
          <h1 className="font-display mt-5 text-4xl font-semibold leading-[1.03] md:text-6xl">{a.titulo}</h1>
          <p className="mt-5 text-lg text-white/60">{a.descripcion}</p>
          <p className="mt-6 text-sm text-white/40">{fecha.format(new Date(a.fecha))} · {a.lectura} de lectura</p>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        {a.secciones.map((s) => (
          <section key={s.h} className="mt-12 first:mt-0">
            <h2 className="font-display text-3xl font-semibold">{s.h}</h2>
            {s.p.map((t, i) => <p key={i} className="mt-4 text-lg leading-relaxed text-[#3F434B]">{t}</p>)}
          </section>
        ))}
        <aside className="mt-16 rounded-[28px] bg-[#17191E] p-8 text-white md:p-10">
          <p className="font-display text-3xl font-semibold">Tu carta digital, hoy.</p>
          <p className="mt-3 text-white/60">Alérgenos, estilos propios y cambios al momento. Primer mes por 1 €, sin permanencia.</p>
          <Link href="/qr" className="mt-6 inline-block rounded-full bg-[#6E0C2B] px-6 py-3.5 font-semibold">Ver la carta QR</Link>
        </aside>
        <nav aria-label="Más artículos" className="mt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A9EA6]">Sigue leyendo</p>
          <ul className="mt-4 space-y-3">
            {otros.map((o) => <li key={o.slug}><Link href={`/blog/${o.slug}`} className="font-semibold hover:text-[#6E0C2B]">{o.titulo} →</Link></li>)}
          </ul>
        </nav>
      </div>
    </article>
  );
}
