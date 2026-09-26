import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type PlatoCarta, type SeccionCarta } from '@/lib/menu';
import { obtenerCartaConRespaldo } from '@/lib/cache-resiliencia';
import { nombreAlergeno } from '@/lib/alergenos';
import BotonesMesa from '@/components/carta/BotonesMesa';

/**
 * LA CARTA VIVA
 *
 * Se renderiza en el servidor y llega al teléfono como HTML. Ni una línea de
 * JavaScript hace falta para leerla, y eso es una decisión, no una limitación:
 *
 *  - Se lee de pie, en un local, con la cobertura que haya. Cada kilobyte que
 *    no se envía es medio segundo que el cliente no espera mirando el móvil.
 *  - Funciona con el lector de pantalla y con el zoom del navegador, que en
 *    hostelería se usan más de lo que parece.
 *  - No puede romperse a mitad: o llega la carta o no llega.
 *
 * El aspecto es deliberadamente claro y neutro. Esta pantalla es del
 * restaurante, no nuestra: quien la mira es su cliente. DKitchen aparece una
 * vez, al pie, en pequeño.
 *
 * PUNTO ÚNICO DE FALLO, y su respuesta: esta página puede recibir tráfico
 * directo de un buscador, sin pasar por `/r/{codigo}`, así que necesita su
 * propio respaldo frente a una caída de Neon. `obtenerCartaConRespaldo()`
 * intenta Neon y, solo si falla, sirve el espejo de sólo lectura en Vercel
 * Global Config (`src/lib/cache-resiliencia.ts`). Se avisa con un aviso
 * discreto cuando ocurre, nunca en silencio: los datos pueden tener hasta
 * unos minutos de antigüedad frente a lo que hay en Neon.
 *
 * SOBRE LAS FOTOS: se usan etiquetas `img` normales, no `next/image`, y es a
 * propósito. El optimizador de Next solo sirve imágenes de los dominios que se
 * declaren en `remotePatterns`; un `foto_url` de cualquier otro host haría
 * fallar la petición y dejaría la carta rota en la mesa. Y la alternativa
 * —autorizar `**`— convierte nuestro optimizador en un proxy de imágenes
 * gratuito para cualquiera que descubra la ruta, que es un problema de coste y
 * de abuso, no de rendimiento. Cuando el almacenamiento esté decidido y las
 * fotos vivan en un dominio propio, se declara ese dominio y se vuelve a
 * `next/image` con sus ventajas.
 */

// Sin `generateStaticParams`, Next renderiza bajo demanda. Se revalida cada
// minuto: un plato que se agota a media cena desaparece de la carta sin que
// nadie tenga que desplegar nada.
export const revalidate = 60;

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resultado = await obtenerCartaConRespaldo(slug);
  if (!resultado) return { title: 'Carta no disponible', robots: { index: false } };
  const { carta } = resultado;

  return {
    title: `Carta de ${carta.nombre}`,
    description: `Carta digital de ${carta.nombre}, con precios y alérgenos actualizados.`,
    // La carta de un restaurante real sí interesa que se indexe: es una página
    // con su nombre y sus platos, y trae búsquedas locales.
    robots: { index: true, follow: true },
    openGraph: {
      title: `Carta de ${carta.nombre}`,
      type: 'website',
      images: carta.logoUrl ? [carta.logoUrl] : undefined,
    },
  };
}

export default async function CartaPublica({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resultado = await obtenerCartaConRespaldo(slug);
  if (!resultado) notFound();
  const { carta, desdeRespaldo } = resultado;

  const grupos: SeccionCarta[] = [
    ...carta.secciones,
    ...(carta.sueltos.length > 0
      ? [{ id: 'otros', nombre: 'Otros platos', platos: carta.sueltos }]
      : []),
  ];

  const alergenosEnCarta = [
    ...new Set(grupos.flatMap((g) => g.platos.flatMap((p) => p.alergenos))),
  ].sort();

  return (
    <main className="min-h-screen bg-[#fbfaf8] text-[#1a1a1a]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-8 text-center">
          {carta.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={carta.logoUrl}
              alt={carta.nombre}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border border-black/10 object-cover"
            />
          )}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{carta.nombre}</h1>
          {carta.descripcion ? (
            <p className="max-w-md text-sm leading-relaxed text-black/60">{carta.descripcion}</p>
          ) : (
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">Carta</p>
          )}
          {(carta.horario || carta.direccion || carta.telefono || carta.instagram) && (
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-black/50">
              {carta.horario && <li>🕒 {carta.horario}</li>}
              {carta.direccion && (
                <li>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(carta.direccion)}`} target="_blank" rel="noopener" className="hover:underline">
                    📍 {carta.direccion}
                  </a>
                </li>
              )}
              {carta.telefono && (
                <li>
                  <a href={`tel:${carta.telefono.replace(/\s/g, '')}`} className="hover:underline">📞 {carta.telefono}</a>
                </li>
              )}
              {carta.instagram && (
                <li>
                  <a href={`https://instagram.com/${carta.instagram}`} target="_blank" rel="noopener" className="hover:underline">📷 @{carta.instagram}</a>
                </li>
              )}
            </ul>
          )}
        </div>
      </header>

      {desdeRespaldo && (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs text-amber-800">
          Puede que esta carta no refleje los últimos cambios en los próximos minutos.
        </p>
      )}

      {/* Índice por anclas: navegar una carta larga sin JavaScript. */}
      {grupos.length > 1 && (
        <nav
          aria-label="Secciones de la carta"
          className="sticky top-0 z-10 border-b border-black/10 bg-white/95 backdrop-blur"
        >
          <ul className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-5 py-3">
            {grupos.map((g) => (
              <li key={g.id} className="shrink-0">
                <a
                  href={`#s-${g.id}`}
                  className="block rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/70 transition-colors hover:border-[#D9531E] hover:text-[#D9531E]"
                >
                  {g.nombre}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mx-auto max-w-2xl px-5 pb-16">
        {grupos.length === 0 ? (
          <p className="py-20 text-center text-black/50">
            Esta carta todavía no tiene platos publicados.
          </p>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.id} id={`s-${grupo.id}`} className="scroll-mt-16 pt-10">
              <h2 className="mb-5 border-b border-black/10 pb-2 text-lg font-semibold tracking-tight">
                {grupo.nombre}
              </h2>
              <ul className="space-y-5">
                {grupo.platos.map((plato) => (
                  <Plato key={plato.id} plato={plato} />
                ))}
              </ul>
            </section>
          ))
        )}

        {alergenosEnCarta.length > 0 && (
          <section className="mt-14 rounded-lg border border-black/10 bg-white p-5">
            <h2 className="text-sm font-semibold">Alérgenos</h2>
            <p className="mt-1 text-xs leading-relaxed text-black/50">
              Información facilitada conforme al Reglamento (UE) 1169/2011. Si tienes una
              alergia o intolerancia, consúltalo con el personal antes de pedir: en cocina
              pueden existir trazas que no figuran en la carta.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {alergenosEnCarta.map((codigo) => (
                <li key={codigo} className="text-xs text-black/60">
                  <span className="font-semibold text-black/80">{codigo}</span>{' '}
                  {nombreAlergeno(codigo)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {carta.plan === 'ampliado' && carta.urlResenas && (
          <a
            href={carta.urlResenas}
            target="_blank"
            rel="noopener"
            className="mt-10 block rounded-xl border border-black/10 bg-white p-4 text-center text-sm font-semibold hover:border-black/30"
          >
            ⭐ ¿Te ha gustado? Déjanos tu reseña en Google
          </a>
        )}
        <footer className="mt-10 mb-20 text-center text-[11px] text-black/30">
          Carta digital de DKitchen
        </footer>
      </div>
      {carta.plan === 'ampliado' && <BotonesMesa slug={carta.slug} color={carta.colorMarca || '#D9531E'} />}
    </main>
  );
}

function Plato({ plato }: { plato: PlatoCarta }) {
  return (
    <li className="flex gap-4">
      {plato.fotoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={plato.fotoUrl}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className="h-20 w-20 shrink-0 rounded-md bg-black/5 object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium leading-snug">{plato.nombre}</h3>
          {/* El precio no se parte de línea ni se encoge: es lo que más se mira. */}
          <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
            {euros.format(Number(plato.precio))}
          </span>
        </div>

        {plato.descripcion && (
          <p className="mt-1 text-sm leading-relaxed text-black/55">{plato.descripcion}</p>
        )}

        {plato.alergenos.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {plato.alergenos.map((codigo) => (
              <span
                key={codigo}
                title={nombreAlergeno(codigo)}
                className="rounded border border-black/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-black/45"
              >
                <span className="sr-only">Contiene </span>
                {codigo}
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}
