import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type Carta, type PlatoCarta, type SeccionCarta, type PromocionVigente, obtenerPromocionVigente } from '@/lib/menu';
import { obtenerCartaConRespaldo } from '@/lib/cache-resiliencia';
import { nombreAlergeno } from '@/lib/alergenos';
import BotonesMesa from '@/components/carta/BotonesMesa';
import BannerPromocion from '@/components/carta/BannerPromocion';
import Reservar from '@/components/carta/Reservar';

/**
 * LA CARTA VIVA
 *
 * Se renderiza en el servidor y llega al teléfono como HTML. Leer la carta no
 * necesita JavaScript: se lee de pie, con la cobertura que haya, funciona con
 * lector de pantalla y zoom, y no puede romperse a mitad. Solo el banner de
 * promoción, las reservas y los botones de mesa son interactivos, y la carta
 * se lee igual sin ellos.
 *
 * Esta pantalla es del restaurante, no nuestra: DKitchen aparece una vez, al
 * pie, en pequeño.
 *
 * TRES PLANTILLAS (0023), elegidas por el hostelero en su panel. Todas usan su
 * color de marca y su logo, así que cada carta sale única sin diseño a medida:
 *  - clasica: restaurante / menú del día, cartas largas en lista.
 *  - visual:  gastro / brunch / hamburguesería, la foto vende.
 *  - express: bar / cafetería / terraza, filas densas sin foto.
 *
 * PUNTO ÚNICO DE FALLO: `obtenerCartaConRespaldo()` intenta Neon y, solo si
 * falla, sirve el espejo de sólo lectura (`src/lib/cache-resiliencia.ts`), con
 * un aviso visible. La promoción no está en el espejo: si Neon falla, sin banner.
 *
 * SOBRE LAS FOTOS: etiquetas `img` normales, no `next/image`, a propósito: el
 * optimizador solo sirve dominios declarados y autorizar `**` lo convertiría en
 * un proxy de imágenes abierto.
 */

// Se revalida cada minuto: un plato agotado o una promoción que empieza a las
// 12:00 aparecen sin desplegar nada.
export const revalidate = 60;

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resultado = await obtenerCartaConRespaldo(slug);
  if (!resultado) return { title: 'Carta no disponible', robots: { index: false } };
  const { carta } = resultado;

  return {
    title: `Carta de ${carta.nombre}`,
    description: `Carta digital de ${carta.nombre}, con precios y alérgenos actualizados.`,
    // La carta de un restaurante real sí interesa que se indexe: trae búsquedas locales.
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

  let promo: PromocionVigente | null = null;
  try {
    promo = await obtenerPromocionVigente(carta.slug);
  } catch {
    promo = null;
  }

  const plantilla = carta.plantilla === 'visual' || carta.plantilla === 'express' ? carta.plantilla : 'clasica';
  const color = carta.colorMarca || '#D9531E';
  const ampliado = carta.plan === 'ampliado';

  const grupos: SeccionCarta[] = [
    ...carta.secciones,
    ...(carta.sueltos.length > 0 ? [{ id: 'otros', nombre: 'Otros platos', platos: carta.sueltos }] : []),
  ];
  const alergenosEnCarta = [...new Set(grupos.flatMap((g) => g.platos.flatMap((p) => p.alergenos)))].sort();
  const fotoPortada = grupos.flatMap((g) => g.platos).find((p) => p.fotoUrl)?.fotoUrl ?? null;
  const ancho = plantilla === 'visual' ? 'max-w-3xl' : 'max-w-2xl';

  return (
    <main className="min-h-screen bg-[#fbfaf8] text-[#1a1a1a]" style={{ ['--marca' as string]: color }}>
      {plantilla === 'visual' ? (
        <CabeceraVisual carta={carta} foto={fotoPortada} />
      ) : plantilla === 'express' ? (
        <CabeceraExpress carta={carta} />
      ) : (
        <CabeceraClasica carta={carta} />
      )}

      {desdeRespaldo && (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs text-amber-800">
          Puede que esta carta no refleje los últimos cambios en los próximos minutos.
        </p>
      )}

      {grupos.length > 1 && <IndiceSecciones grupos={grupos} plantilla={plantilla} ancho={ancho} />}

      <div className={`mx-auto px-5 pb-16 ${ancho}`}>
        {ampliado && <Reservar slug={carta.slug} color={color} nombreLocal={carta.nombre} />}

        {grupos.length === 0 ? (
          <p className="py-20 text-center text-black/50">Esta carta todavía no tiene platos publicados.</p>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.id} id={`s-${grupo.id}`} className={`scroll-mt-16 ${plantilla === 'express' ? 'pt-6' : 'pt-10'}`}>
              <h2
                className={
                  plantilla === 'express'
                    ? 'mb-2 text-xs font-bold uppercase tracking-widest text-black/50'
                    : 'mb-5 border-b border-black/10 pb-2 text-lg font-semibold tracking-tight'
                }
              >
                {grupo.nombre}
              </h2>
              {plantilla === 'visual' ? (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {grupo.platos.map((plato) => <PlatoVisual key={plato.id} plato={plato} />)}
                </ul>
              ) : plantilla === 'express' ? (
                <ul className="divide-y divide-black/5 rounded-xl bg-white">
                  {grupo.platos.map((plato) => <PlatoExpress key={plato.id} plato={plato} />)}
                </ul>
              ) : (
                <ul className="space-y-5">
                  {grupo.platos.map((plato) => <Plato key={plato.id} plato={plato} />)}
                </ul>
              )}
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
                  <span className="font-semibold text-black/80">{codigo}</span> {nombreAlergeno(codigo)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {ampliado && carta.urlResenas && (
          <a
            href={carta.urlResenas}
            target="_blank"
            rel="noopener"
            className="mt-10 block rounded-xl border border-black/10 bg-white p-4 text-center text-sm font-semibold hover:border-black/30"
          >
            ⭐ ¿Te ha gustado? Déjanos tu reseña en Google
          </a>
        )}
        <footer className="mt-10 mb-20 text-center text-[11px] text-black/30">Carta digital de DKitchen</footer>
      </div>

      {promo && <BannerPromocion promo={promo} color={color} />}
      {ampliado && <BotonesMesa slug={carta.slug} color={color} />}
    </main>
  );
}

function DatosContacto({ carta, centrado = true }: { carta: Carta; centrado?: boolean }) {
  if (!(carta.horario || carta.direccion || carta.telefono || carta.instagram)) return null;
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/50 ${centrado ? 'justify-center' : ''}`}>
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
  );
}

function Logo({ carta, tam }: { carta: Carta; tam: number }) {
  if (!carta.logoUrl) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={carta.logoUrl}
      alt={carta.nombre}
      width={tam}
      height={tam}
      style={{ width: tam, height: tam }}
      className="shrink-0 rounded-full border border-black/10 bg-white object-cover"
    />
  );
}

function CabeceraClasica({ carta }: { carta: Carta }) {
  return (
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-8 text-center">
        <Logo carta={carta} tam={80} />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{carta.nombre}</h1>
        {carta.descripcion ? (
          <p className="max-w-md text-sm leading-relaxed text-black/60">{carta.descripcion}</p>
        ) : (
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">Carta</p>
        )}
        <DatosContacto carta={carta} />
      </div>
    </header>
  );
}

function CabeceraVisual({ carta, foto }: { carta: Carta; foto: string | null }) {
  return (
    <header className="bg-white pb-6">
      <div className="relative h-56 w-full sm:h-72" style={{ background: 'var(--marca)' }}>
        {foto && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={foto} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-3xl items-end gap-4 px-5 pb-5">
          <Logo carta={carta} tam={72} />
          <h1 className="text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl">{carta.nombre}</h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-3 px-5 pt-5">
        {carta.descripcion && <p className="text-sm leading-relaxed text-black/60">{carta.descripcion}</p>}
        <DatosContacto carta={carta} centrado={false} />
      </div>
    </header>
  );
}

function CabeceraExpress({ carta }: { carta: Carta }) {
  return (
    <header className="bg-white" style={{ borderTop: '4px solid var(--marca)' }}>
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
        <Logo carta={carta} tam={44} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight">{carta.nombre}</h1>
          {carta.horario && <p className="truncate text-xs text-black/50">🕒 {carta.horario}</p>}
        </div>
        {carta.telefono && (
          <a
            href={`tel:${carta.telefono.replace(/\s/g, '')}`}
            className="ml-auto shrink-0 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold"
          >
            📞 Llamar
          </a>
        )}
      </div>
    </header>
  );
}

function IndiceSecciones({ grupos, plantilla, ancho }: { grupos: SeccionCarta[]; plantilla: string; ancho: string }) {
  return (
    <nav aria-label="Secciones de la carta" className="sticky top-0 z-10 border-b border-black/10 bg-white/95 backdrop-blur">
      <ul className={`mx-auto flex gap-2 overflow-x-auto px-5 py-3 ${ancho}`}>
        {grupos.map((g) => (
          <li key={g.id} className="shrink-0">
            <a
              href={`#s-${g.id}`}
              className={
                plantilla === 'express'
                  ? 'block rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black/60 hover:text-[var(--marca)]'
                  : 'block rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/70 transition-colors hover:border-[var(--marca)] hover:text-[var(--marca)]'
              }
            >
              {g.nombre}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Alergenos({ plato, compacto = false }: { plato: PlatoCarta; compacto?: boolean }) {
  if (plato.alergenos.length === 0) return null;
  return (
    <p className={`flex flex-wrap gap-1.5 ${compacto ? 'mt-0.5' : 'mt-1.5'}`}>
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
  );
}

function Precio({ plato, destacado = false }: { plato: PlatoCarta; destacado?: boolean }) {
  // El precio no se parte de línea ni se encoge: es lo que más se mira.
  return (
    <span
      className={`shrink-0 whitespace-nowrap tabular-nums ${destacado ? 'font-bold' : 'font-semibold'}`}
      style={destacado ? { color: 'var(--marca)' } : undefined}
    >
      {euros.format(Number(plato.precio))}
    </span>
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
          <Precio plato={plato} />
        </div>
        {plato.descripcion && <p className="mt-1 text-sm leading-relaxed text-black/55">{plato.descripcion}</p>}
        <Alergenos plato={plato} />
      </div>
    </li>
  );
}

function PlatoVisual({ plato }: { plato: PlatoCarta }) {
  return (
    <li className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      {plato.fotoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={plato.fotoUrl} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full bg-black/5 object-cover" />
      ) : (
        <div
          className="flex aspect-[4/3] w-full items-center justify-center text-3xl"
          style={{ background: 'color-mix(in srgb, var(--marca) 12%, white)' }}
          aria-hidden="true"
        >
          🍽️
        </div>
      )}
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold leading-snug">{plato.nombre}</h3>
          <Precio plato={plato} destacado />
        </div>
        {plato.descripcion && <p className="mt-1 text-sm leading-relaxed text-black/55">{plato.descripcion}</p>}
        <Alergenos plato={plato} />
      </div>
    </li>
  );
}

function PlatoExpress({ plato }: { plato: PlatoCarta }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-medium leading-snug">{plato.nombre}</h3>
        <Precio plato={plato} />
      </div>
      {plato.descripcion && <p className="text-xs leading-relaxed text-black/50">{plato.descripcion}</p>}
      <Alergenos plato={plato} compacto />
    </li>
  );
}
