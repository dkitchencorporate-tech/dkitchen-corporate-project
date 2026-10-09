import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CompraEntradas from '@/components/entradas/CompraEntradas';
import { euros, eventoPublico, fechaEvento, plazasLibres, ventaAbierta } from '@/lib/entradas';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await eventoPublico((await params).slug).catch(() => null);
  if (!e) return { title: 'Evento no disponible', robots: { index: false } };
  return {
    title: `${e.titulo} · ${e.local_nombre}`,
    description: `${fechaEvento(e.fecha)} · ${euros(e.precio_centimos)} por persona. Entradas con QR.`.slice(0, 155),
    openGraph: e.imagen_url ? { images: [e.imagen_url] } : undefined,
  };
}

/** Página pública de venta de entradas de un evento de Experience (0067). */
export default async function Evento({ params }: Props) {
  const e = await eventoPublico((await params).slug).catch(() => null);
  if (!e) notFound();
  const libres = plazasLibres(e);
  const abierta = ventaAbierta(e);
  const clave = process.env.STRIPE_PUBLISHABLE_KEY ?? '';

  return (
    <main className="min-h-screen bg-papel px-4 py-10 text-carbon">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1.1fr_1fr]">
        <section className="min-w-0">
          {e.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.imagen_url} alt="" className="mb-6 aspect-[4/5] w-full rounded-[22px] object-cover md:aspect-[4/3]" />
          )}
          <p className="text-sm font-semibold uppercase tracking-wide text-vino">{e.local_nombre}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">{e.titulo}</h1>
          <p className="mt-4 text-lg capitalize text-grafito">{fechaEvento(e.fecha)}</p>
          {e.lugar && <p className="mt-1 text-grafito">{e.lugar}</p>}
          {e.descripcion && <div className="mt-6 whitespace-pre-line leading-relaxed text-pizarra">{e.descripcion}</div>}
        </section>
        <aside className="h-fit rounded-[22px] border border-linea bg-white p-6 md:sticky md:top-6">
          <p className="text-3xl font-semibold tabular-nums">{euros(e.precio_centimos)} <span className="text-base font-normal text-pizarra">por persona</span></p>
          <p className="mt-1 text-sm text-pizarra">{abierta ? (libres <= 10 ? `Quedan ${libres} plazas` : 'Plazas disponibles') : e.estado === 'cerrado' || libres === 0 ? 'Entradas agotadas o venta cerrada' : 'La venta aún no está abierta'}</p>
          <div className="mt-6">
            {abierta && clave
              ? <CompraEntradas slug={e.slug} clavePublica={clave} precioCentimos={e.precio_centimos} maximo={Math.min(e.max_por_compra, libres)} />
              : <p className="rounded-xl bg-papel px-4 py-3 text-sm text-pizarra">Ahora mismo no se pueden comprar entradas para este evento.</p>}
          </div>
          <p className="mt-6 text-center text-xs text-niebla">Entradas con QR único · Pago seguro con Stripe · Tecnología de DKitchen</p>
        </aside>
      </div>
    </main>
  );
}
