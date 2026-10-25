import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CompraEntradas from '@/components/entradas/CompraEntradas';
import SimulacionCompra from '@/components/entradas/SimulacionCompra';
import { euros, eventoPublico, fechaEvento, leerLanding, plazasLibres, ventaAbierta } from '@/lib/entradas';
import { FORMATOS_EXPERIENCE } from '@/lib/experience-formatos';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };
const SITIO = 'https://dkitchencorporate.es';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await eventoPublico((await params).slug).catch(() => null);
  if (!e) return { title: 'Evento no disponible', robots: { index: false } };
  const l = leerLanding(e.landing);
  const imagen = e.imagen_url ? (e.imagen_url.startsWith('/') ? `${SITIO}${e.imagen_url}` : e.imagen_url) : null;
  return {
    title: `${e.titulo} · ${e.local_nombre}`,
    description: (l.subtitulo || `${fechaEvento(e.fecha)} · ${euros(e.precio_centimos)} por persona. Entradas con QR.`).slice(0, 155),
    // Las muestras no se indexan: son para enseñar a los dueños cómo lo verán sus clientes.
    robots: e.muestra ? { index: false, follow: true } : undefined,
    openGraph: imagen ? { images: [imagen] } : undefined,
  };
}

/**
 * Landing de venta de un evento de Experience (0067; landing de autor desde 0084, decisión de karc0 del 17/10).
 * Lo que necesita el comensal para decidir y comprar: qué es, qué se come y se bebe, cuándo pasa cada cosa,
 * qué incluye, quién lo hace, dónde es y las dudas típicas. Las muestras (`muestra`) se ven igual pero no venden.
 */
export default async function Evento({ params }: Props) {
  const e = await eventoPublico((await params).slug).catch(() => null);
  if (!e) notFound();
  const l = leerLanding(e.landing);
  const libres = plazasLibres(e);
  const abierta = ventaAbierta(e);
  const clave = process.env.STRIPE_PUBLISHABLE_KEY ?? '';
  const formato = FORMATOS_EXPERIENCE.find((f) => f.slug === e.formato) ?? null;
  const estadoVenta = e.muestra ? 'Evento de muestra'
    : abierta ? (libres <= 10 ? `Quedan ${libres} ${libres === 1 ? 'plaza' : 'plazas'}` : 'Plazas disponibles')
    : e.estado === 'cerrado' || libres === 0 ? 'Entradas agotadas o venta cerrada' : 'La venta aún no está abierta';
  const compartir = `https://wa.me/?text=${encodeURIComponent(`${e.titulo} · ${e.local_nombre} · ${SITIO}/e/${e.slug}`)}`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'Event', name: e.titulo, startDate: new Date(e.fecha).toISOString(),
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: e.local_nombre, address: l.direccion || e.lugar },
    description: l.historia[0] ?? e.descripcion, image: e.imagen_url ? [e.imagen_url.startsWith('/') ? `${SITIO}${e.imagen_url}` : e.imagen_url] : undefined,
    organizer: { '@type': 'Organization', name: e.local_nombre },
    offers: { '@type': 'Offer', price: (e.precio_centimos / 100).toFixed(2), priceCurrency: 'EUR', url: `${SITIO}/e/${e.slug}`,
      availability: abierta ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut' },
  };

  return (
    <main className="min-h-screen bg-crema pb-28 text-carbon lg:pb-0">
      {!e.muestra && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />}

      {e.muestra && (
        <div className="bg-oro px-4 py-2.5 text-center text-[13px] font-semibold text-noche">
          Así verán tus clientes tu evento · evento de muestra con un local inventado, no se venden entradas.
          {formato && <> <Link href={`/experience/${formato.slug}#configurar`} className="underline underline-offset-2">Quiero este evento en mi local →</Link> · <Link href="/experience#formatos" className="underline underline-offset-2">Ver otros eventos</Link></>}
        </div>
      )}

      {/* Portada */}
      <header className="relative isolate overflow-hidden bg-noche text-white">
        {e.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.imagen_url} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-95" />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,8,7,.10)_0%,rgba(11,8,7,.30)_40%,rgba(11,8,7,.92)_100%)]" />
        <div className="mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-end px-4 pb-10 pt-24 sm:px-6 lg:min-h-[70vh] lg:pb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-oro">{e.local_nombre}{formato ? ` · ${formato.nombre}` : ''}</p>
          <h1 className="font-display mt-3 max-w-3xl break-words text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">{e.titulo}</h1>
          {l.subtitulo && <p className="mt-4 text-base text-white/80 sm:text-lg">{l.subtitulo}</p>}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#entradas" className="rounded-full bg-vino px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(110,12,43,.45)] transition hover:bg-vino-hondo">
              {e.muestra ? 'Ver cómo se compra' : abierta ? `Comprar entradas · ${euros(e.precio_centimos)}` : 'Ver entradas'}
            </a>
            <span className="rounded-full border border-white/25 px-4 py-2 text-sm text-white/85 first-letter:uppercase">{fechaEvento(e.fecha)}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-16">
        <div className="min-w-0 space-y-14">
          {/* La historia */}
          {(l.historia.length > 0 || e.descripcion) && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-vino">El evento</p>
              <div className="mt-3 space-y-4 text-[17px] leading-relaxed">
                {(l.historia.length ? l.historia : [e.descripcion]).map((p, i) => (
                  <p key={i} className={i === 0 ? 'font-display text-2xl leading-snug text-carbon sm:text-[28px]' : 'text-carbon/85'}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {/* El menú */}
          {l.menu.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-vino">En la mesa</p>
              <h2 className="font-display mt-2 text-3xl font-semibold">El menú</h2>
              <ol className="mt-6 divide-y divide-linea overflow-hidden rounded-[26px] border border-linea bg-white">
                {l.menu.map((m, i) => (
                  <li key={i} className="grid gap-1 px-5 py-4 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-5 sm:px-7">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-oro sm:pt-1">{m.pase || `Pase ${i + 1}`}</span>
                    <span className="min-w-0">
                      {m.plato && <span className="block font-display text-lg leading-snug">{m.plato}</span>}
                      {m.bebida && <span className="mt-0.5 block text-sm italic text-niebla">Con {m.bebida.charAt(0).toLowerCase() + m.bebida.slice(1)}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Programa e incluye */}
          {(l.programa.length > 0 || l.incluye.length > 0) && (
            <section className="grid gap-6 md:grid-cols-2">
              {l.programa.length > 0 && (
                <div className="rounded-[26px] bg-noche p-6 text-white sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-oro">La noche, paso a paso</p>
                  <ol className="mt-5 space-y-4">
                    {l.programa.map((p, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="font-display w-14 shrink-0 text-xl text-oro">{p.hora}</span>
                        <span className="text-[15px] text-white/85">{p.que}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {l.incluye.length > 0 && (
                <div className="rounded-[26px] border border-oro/40 bg-papel p-6 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-vino">Tu entrada incluye</p>
                  <ul className="mt-5 space-y-3">
                    {l.incluye.map((x, i) => (
                      <li key={i} className="flex gap-3 text-[15px]"><span className="text-vino" aria-hidden="true">✓</span><span>{x}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Anfitrión */}
          {l.anfitrion && (
            <section className="flex flex-col gap-4 rounded-[26px] border border-linea bg-white p-6 sm:flex-row sm:items-center sm:p-7">
              <span className="font-display flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-vino text-2xl text-oro" aria-hidden="true">
                {l.anfitrion.nombre.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Te recibe</p>
                <p className="font-display text-2xl font-semibold">{l.anfitrion.nombre}{l.anfitrion.rol && <span className="text-base font-normal text-niebla"> · {l.anfitrion.rol}</span>}</p>
                {l.anfitrion.texto && <p className="mt-1 text-[15px] text-carbon/80">{l.anfitrion.texto}</p>}
              </div>
            </section>
          )}

          {/* Dónde */}
          {(l.direccion || e.lugar) && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-vino">Dónde</p>
              <p className="font-display mt-2 text-2xl font-semibold">{e.local_nombre}</p>
              <p className="mt-1 text-[15px] text-carbon/80">{l.direccion || e.lugar}</p>
              {l.mapa && <a href={l.mapa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-vino underline underline-offset-4">Abrir en el mapa →</a>}
            </section>
          )}

          {/* Preguntas */}
          {l.faq.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-vino">Antes de que lo preguntes</p>
              <div className="mt-4 divide-y divide-linea rounded-[26px] border border-linea bg-white">
                {l.faq.map((f, i) => (
                  <details key={i} className="group px-5 py-4 sm:px-7">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                      {f.p}<span className="text-vino transition group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p className="mt-2 text-[15px] text-carbon/80">{f.r}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {l.avisos && <p className="rounded-2xl bg-papel px-5 py-4 text-sm text-carbon/80 ring-1 ring-linea">{l.avisos}</p>}
        </div>

        {/* Compra (fija al bajar en escritorio) */}
        <aside id="entradas" className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_24px_60px_rgba(11,8,7,.12)] ring-1 ring-linea sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vino">Entradas</p>
            <p className="font-display mt-2 text-4xl font-semibold">{euros(e.precio_centimos)} <span className="text-base font-normal text-niebla">por persona</span></p>
            <p className="mt-1 text-sm text-niebla first-letter:uppercase">{fechaEvento(e.fecha)}</p>
            <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${abierta && libres <= 10 ? 'bg-vino text-white' : 'bg-papel text-carbon'}`}>{estadoVenta}</p>
            <div className="mt-5">
              {abierta && clave
                ? <CompraEntradas slug={e.slug} clavePublica={clave} precioCentimos={e.precio_centimos} maximo={Math.min(e.max_por_compra, libres)} />
                : e.muestra
                  ? <SimulacionCompra precioCentimos={e.precio_centimos} titulo={e.titulo} local={e.local_nombre} fecha={fechaEvento(e.fecha)} formato={formato?.slug ?? null} formatoNombre={formato?.nombre ?? null} />
                  : <p className="rounded-2xl bg-papel px-4 py-3 text-sm text-carbon/80">Ahora mismo no se pueden comprar entradas para este evento.</p>}
            </div>
            <a href={compartir} target="_blank" rel="noopener noreferrer" className="mt-4 block text-center text-sm font-semibold text-vino underline underline-offset-4">Compartir por WhatsApp</a>
            <p className="mt-4 border-t border-linea pt-4 text-[12px] leading-relaxed text-niebla">Entradas con QR único · pago seguro · tecnología de DKitchen</p>
          </div>
        </aside>
      </div>

      {/* Barra de compra en el móvil */}
      <div data-barra-inferior="on" className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-white/95 px-4 py-3 backdrop-blur lg:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold leading-none">{euros(e.precio_centimos)}</p>
            <p className="mt-1 truncate text-xs text-niebla">{estadoVenta}</p>
          </div>
          <a href="#entradas" className="shrink-0 rounded-full bg-vino px-6 py-3 text-sm font-semibold text-white">{e.muestra ? 'Probar la compra' : abierta ? 'Comprar' : 'Ver'}</a>
        </div>
      </div>
    </main>
  );
}
