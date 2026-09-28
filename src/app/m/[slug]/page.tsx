import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { type Carta, type PlatoCarta, type SeccionCarta, type Banner, obtenerBanners } from '@/lib/menu';
import { obtenerCartaConRespaldo } from '@/lib/cache-resiliencia';
import { nombreAlergeno } from '@/lib/alergenos';
import BotonesMesa from '@/components/carta/BotonesMesa';
import CarruselBanners from '@/components/carta/CarruselBanners';
import CartaAutor from '@/components/carta/CartaAutor';
import FichaPlato from '@/components/carta/FichaPlato';
import Reservar from '@/components/carta/Reservar';
import { traducirCarta, IDIOMAS } from '@/lib/idiomas';
import { Cormorant_Garamond } from 'next/font/google';

const serifCarta = Cormorant_Garamond({ weight: ['500', '600', '700'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', variable: '--fuente-serif' });

/** Fondos cerrados del selector de estilo (0031). */
const FONDO: Record<string, string> = {
  papel: 'bg-[#F7F3EA] text-[#221D17]',
  blanco: 'bg-white text-[#1B1D22]',
  oscuro: 'carta-oscura bg-[#15161A] text-[#F3F1EC]',
};

/**
 * LA CARTA VIVA
 *
 * Se renderiza en el servidor y llega al teléfono como HTML: se lee sin
 * JavaScript, con lector de pantalla y zoom, y no puede romperse a mitad.
 * La carta es SOLO PARA MIRAR (el QR no toma pedidos: eso es el Núcleo
 * Operativo). Lo interactivo es opcional: carrusel de banners, ficha ampliada
 * de cada plato, reservar mesa y llamar al camarero.
 *
 * Orden (28/09, karc0): cabecera (logo, nombre, descripción, Reservar) →
 * carrusel de banners → índice de secciones → platos → alérgenos → reseñas →
 * datos del local (horario, dirección, teléfono, redes) al final.
 *
 * TRES PLANTILLAS (0023), elegidas por el hostelero: todas usan su color de
 * marca y su logo.
 *  - clasica: restaurante / menú del día, cartas largas en lista.
 *  - visual:  gastro / brunch / hamburguesería, la foto vende.
 *  - express: bar / cafetería / terraza, filas densas sin foto.
 *
 * PUNTO ÚNICO DE FALLO: `obtenerCartaConRespaldo()` intenta Neon y, si falla,
 * sirve el espejo de sólo lectura con aviso visible. Los banners no están en
 * el espejo: si Neon falla, la carta sale sin carrusel.
 *
 * FOTOS: `img` normales, no `next/image`: el optimizador solo sirve dominios
 * declarados y autorizar `**` lo convertiría en un proxy de imágenes abierto.
 */

// Se revalida cada minuto: un plato agotado o un banner que empieza a las
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
    openGraph: { title: `Carta de ${carta.nombre}`, type: 'website', images: carta.logoUrl ? [carta.logoUrl] : undefined },
  };
}

export default async function CartaPublica({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const resultado = await obtenerCartaConRespaldo(slug);
  if (!resultado) notFound();
  const { desdeRespaldo } = resultado;
  // Pack de idiomas (0027): ?lang=en muestra la carta traducida (lo no traducido, en español)
  const idioma = lang && (resultado.carta.idiomas ?? []).includes(lang) ? lang : 'es';
  const carta = idioma === 'es' ? resultado.carta : await traducirCarta(resultado.carta, idioma);
  const selector = <SelectorIdioma slug={carta.slug} idiomas={carta.idiomas ?? []} actual={idioma} />;

  let banners: Banner[] = [];
  try {
    banners = await obtenerBanners(carta.slug);
  } catch {
    banners = [];
  }

  // Nivel 2 / 3 (asignado por DKitchen): Carta de Autor
  if (carta.nivelDiseno === 'autor' || carta.nivelDiseno === 'signature') {
    return <>{selector}<CartaAutor carta={carta} banners={banners} desdeRespaldo={desdeRespaldo} /></>;
  }

  const plantilla = ['visual', 'express', 'editorial'].includes(carta.plantilla ?? '') ? (carta.plantilla as string) : 'clasica';
  const fondo = FONDO[carta.estiloFondo ?? 'papel'] ?? FONDO.papel;
  const letra = carta.estiloLetra === 'serif' || plantilla === 'editorial' ? `carta-serif ${serifCarta.variable}` : '';
  const color = carta.colorMarca || '#D9531E';
  const ampliado = carta.plan === 'ampliado';

  const grupos: SeccionCarta[] = [
    ...carta.secciones,
    ...(carta.sueltos.length > 0 ? [{ id: 'otros', nombre: 'Otros platos', platos: carta.sueltos }] : []),
  ];
  const alergenosEnCarta = [...new Set(grupos.flatMap((g) => g.platos.flatMap((p) => p.alergenos)))].sort();
  const nombres = Object.fromEntries(alergenosEnCarta.map((a) => [a, nombreAlergeno(a)]));
  const fotoPortada = grupos.flatMap((g) => g.platos).find((p) => p.fotoUrl)?.fotoUrl ?? null;
  const ancho = plantilla === 'visual' ? 'max-w-3xl' : 'max-w-2xl';
  const reservar = ampliado ? <Reservar slug={carta.slug} color={color} nombreLocal={carta.nombre} /> : null;

  return (
    <main className={`min-h-screen ${fondo} ${letra}`} style={{ '--marca': color } as CSSProperties}>
      {plantilla === 'editorial' ? (
        <CabeceraEditorial carta={carta} accion={reservar} />
      ) : plantilla === 'visual' ? (
        <CabeceraVisual carta={carta} foto={fotoPortada} accion={reservar} />
      ) : plantilla === 'express' ? (
        <CabeceraExpress carta={carta} accion={reservar} />
      ) : (
        <CabeceraClasica carta={carta} accion={reservar} />
      )}

      {desdeRespaldo && (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs text-amber-800">
          Puede que esta carta no refleje los últimos cambios en los próximos minutos.
        </p>
      )}

      {selector}
      <CarruselBanners banners={banners} color={color} />

      {grupos.length > 1 && <IndiceSecciones grupos={grupos} plantilla={plantilla} ancho={ancho} />}

      <div className={`mx-auto px-5 pb-28 ${ancho}`}>
        {grupos.length === 0 ? (
          <p className="py-20 text-center text-black/50">Esta carta todavía no tiene platos publicados.</p>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.id} id={`s-${grupo.id}`} className={`scroll-mt-16 ${plantilla === 'express' ? 'pt-6' : 'pt-10'}`}>
              <h2
                className={
                  plantilla === 'editorial'
                    ? 'mb-6 text-center text-4xl font-medium'
                    : plantilla === 'express'
                    ? 'mb-2 text-xs font-bold uppercase tracking-widest text-black/50'
                    : 'mb-3 flex items-baseline justify-between px-1 text-xl font-semibold tracking-tight'
                }
              >
                {grupo.nombre}
                {plantilla === 'clasica' && (
                  <span className="text-xs font-normal text-black/35">
                    {grupo.platos.length} {grupo.platos.length === 1 ? 'plato' : 'platos'}
                  </span>
                )}
              </h2>
              {plantilla === 'editorial' ? (
                <ul className="space-y-6">
                  {grupo.platos.map((plato) => (
                    <li key={plato.id}>
                      <FichaPlato plato={plato} nombresAlergenos={nombres}><PlatoEditorial plato={plato} /></FichaPlato>
                    </li>
                  ))}
                </ul>
              ) : plantilla === 'visual' ? (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {grupo.platos.map((plato) => (
                    <li key={plato.id}>
                      <FichaPlato plato={plato} nombresAlergenos={nombres}><PlatoVisual plato={plato} /></FichaPlato>
                    </li>
                  ))}
                </ul>
              ) : plantilla === 'express' ? (
                <ul className="divide-y divide-black/5 rounded-xl bg-white">
                  {grupo.platos.map((plato) => (
                    <li key={plato.id}>
                      <FichaPlato plato={plato} nombresAlergenos={nombres}><PlatoExpress plato={plato} /></FichaPlato>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
                  {grupo.platos.map((plato) => (
                    <li key={plato.id}>
                      <FichaPlato plato={plato} nombresAlergenos={nombres} className="px-4 py-4 hover:bg-black/[0.02]">
                        <Plato plato={plato} />
                      </FichaPlato>
                    </li>
                  ))}
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
                  <span className="font-semibold text-black/80">{codigo}</span> {nombres[codigo]}
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
            className="mt-8 block rounded-xl border border-black/10 bg-white p-4 text-center text-sm font-semibold hover:border-black/30"
          >
            ¿Te ha gustado? Déjanos tu reseña en Google
          </a>
        )}

        <DatosLocal carta={carta} />

        <footer className="mt-8 text-center text-[11px] text-black/30">
          Carta digital de {carta.nombre} · Tecnología de <a href="https://dkitchencorporate.es/qr" className="hover:underline">DKitchen</a>
        </footer>
      </div>

      {ampliado && <BotonesMesa slug={carta.slug} color={color} />}
    </main>
  );
}

/* ---------------------------------------------------------------- cabeceras */

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

function CabeceraClasica({ carta, accion }: { carta: Carta; accion: ReactNode }) {
  return (
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-5 py-7 text-center">
        <Logo carta={carta} tam={76} />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{carta.nombre}</h1>
        {carta.descripcion && <p className="max-w-md text-sm leading-relaxed text-black/60">{carta.descripcion}</p>}
        {accion && <div className="pt-1">{accion}</div>}
      </div>
    </header>
  );
}

function CabeceraEditorial({ carta, accion }: { carta: Carta; accion: ReactNode }) {
  return (
    <header className="px-6 pb-10 pt-12 text-center">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <Logo carta={carta} tam={64} />
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.3em]" style={{ color: 'var(--marca)' }}>La carta</p>
        <h1 className="mt-3 text-5xl font-medium leading-[1.05] sm:text-6xl">{carta.nombre}</h1>
        {carta.descripcion && <p className="mt-4 max-w-md text-lg italic leading-snug opacity-70">{carta.descripcion}</p>}
        <div className="mt-6 h-px w-12" style={{ background: 'var(--marca)' }} />
        {accion && <div className="pt-6">{accion}</div>}
      </div>
    </header>
  );
}

function CabeceraVisual({ carta, foto, accion }: { carta: Carta; foto: string | null; accion: ReactNode }) {
  return (
    <header className="bg-white">
      <div className="relative h-52 w-full sm:h-64" style={{ background: 'var(--marca)' }}>
        {foto && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={foto} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-3xl items-end gap-4 px-5 pb-5">
          <Logo carta={carta} tam={64} />
          <h1 className="text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl">{carta.nombre}</h1>
        </div>
      </div>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        {carta.descripcion && <p className="min-w-0 flex-1 text-sm leading-relaxed text-black/60">{carta.descripcion}</p>}
        {accion}
      </div>
    </header>
  );
}

function CabeceraExpress({ carta, accion }: { carta: Carta; accion: ReactNode }) {
  return (
    <header className="bg-white" style={{ borderTop: '4px solid var(--marca)' }}>
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
        <Logo carta={carta} tam={44} />
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold leading-tight">{carta.nombre}</h1>
        {accion}
      </div>
    </header>
  );
}

function IndiceSecciones({ grupos, plantilla, ancho }: { grupos: SeccionCarta[]; plantilla: string; ancho: string }) {
  return (
    <nav aria-label="Secciones de la carta" className="sticky top-0 z-10 mt-4 border-y border-black/10 bg-white/95 backdrop-blur">
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

/* --------------------------------------------------------- datos del local */

function DatosLocal({ carta }: { carta: Carta }) {
  if (!(carta.horario || carta.direccion || carta.telefono || carta.instagram)) return null;
  const fila = 'flex items-start gap-3 py-2.5 text-sm';
  return (
    <section className="mt-8 rounded-2xl border border-black/10 bg-white px-5 py-3" aria-label="Información del local">
      <h2 className="pt-2 text-sm font-semibold">{carta.nombre}</h2>
      <ul className="divide-y divide-black/5">
        {carta.horario && <li className={fila}><span className="w-20 shrink-0 text-xs uppercase tracking-wider text-black/40">Horario</span><span className="text-black/70">{carta.horario}</span></li>}
        {carta.direccion && (
          <li className={fila}>
            <span className="w-20 shrink-0 text-xs uppercase tracking-wider text-black/40">Dirección</span>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(carta.direccion)}`} target="_blank" rel="noopener" className="text-black/70 hover:underline">
              {carta.direccion}
            </a>
          </li>
        )}
        {carta.telefono && (
          <li className={fila}>
            <span className="w-20 shrink-0 text-xs uppercase tracking-wider text-black/40">Teléfono</span>
            <a href={`tel:${carta.telefono.replace(/\s/g, '')}`} className="text-black/70 hover:underline">{carta.telefono}</a>
          </li>
        )}
        {carta.instagram && (
          <li className={fila}>
            <span className="w-20 shrink-0 text-xs uppercase tracking-wider text-black/40">Instagram</span>
            <a href={`https://instagram.com/${carta.instagram}`} target="_blank" rel="noopener" className="text-black/70 hover:underline">@{carta.instagram}</a>
          </li>
        )}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ platos */

function Alergenos({ plato, compacto = false }: { plato: PlatoCarta; compacto?: boolean }) {
  if (plato.alergenos.length === 0) return null;
  return (
    <span className={`flex flex-wrap gap-1.5 ${compacto ? 'mt-0.5' : 'mt-1.5'}`}>
      {plato.alergenos.map((codigo) => (
        <span key={codigo} title={nombreAlergeno(codigo)} className="rounded border border-black/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-black/45">
          <span className="sr-only">Contiene </span>
          {codigo}
        </span>
      ))}
    </span>
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
  // Carta básica: texto a la izquierda, foto pequeña siempre a la derecha
  // (alineación constante aunque algunos platos no tengan foto).
  return (
    <span className="flex items-start gap-4">
      <span className="block min-w-0 flex-1">
        <span className="nombre-plato block font-semibold leading-snug">{plato.nombre}</span>
        {plato.descripcion && <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-black/55">{plato.descripcion}</span>}
        <Alergenos plato={plato} />
        <span className="mt-2 block text-[15px]"><Precio plato={plato} /></span>
      </span>
      {plato.fotoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={plato.fotoUrl} alt="" width={76} height={76} loading="lazy" decoding="async" className="h-[76px] w-[76px] shrink-0 rounded-xl bg-black/5 object-cover" />
      )}
    </span>
  );
}

function PlatoVisual({ plato }: { plato: PlatoCarta }) {
  return (
    <span className="block overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      {plato.fotoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={plato.fotoUrl} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full bg-black/5 object-cover" />
      ) : (
        <span className="block aspect-[4/3] w-full" style={{ background: 'color-mix(in srgb, var(--marca) 12%, white)' }} aria-hidden="true" />
      )}
      <span className="block p-4">
        <span className="flex items-baseline justify-between gap-3">
          <span className="nombre-plato font-semibold leading-snug">{plato.nombre}</span>
          <Precio plato={plato} destacado />
        </span>
        {plato.descripcion && <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-black/55">{plato.descripcion}</span>}
        <Alergenos plato={plato} />
      </span>
    </span>
  );
}

function PlatoEditorial({ plato }: { plato: PlatoCarta }) {
  return (
    <span className="block text-left">
      <span className="flex items-baseline gap-3">
        <span className="nombre-plato text-[21px] font-semibold leading-tight">{plato.nombre}</span>
        <span aria-hidden="true" className="min-w-6 flex-1 -translate-y-1 border-b border-dotted border-current opacity-30" />
        <span className="whitespace-nowrap text-[20px] font-semibold tabular-nums">{euros.format(Number(plato.precio)).replace(/\s?€/, '')}</span>
      </span>
      {plato.descripcion && <span className="mt-1 block pr-10 text-[16px] italic leading-snug opacity-65">{plato.descripcion}</span>}
      {plato.alergenos.length > 0 && (
        <span className="mt-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] opacity-45">
          <span className="sr-only">Alérgenos: </span>{plato.alergenos.map(nombreAlergeno).join(' · ')}
        </span>
      )}
    </span>
  );
}

function PlatoExpress({ plato }: { plato: PlatoCarta }) {
  return (
    <span className="block px-4 py-3">
      <span className="flex items-baseline justify-between gap-3">
        <span className="nombre-plato text-[15px] font-medium leading-snug">{plato.nombre}</span>
        <Precio plato={plato} />
      </span>
      {plato.descripcion && <span className="line-clamp-1 block text-xs leading-relaxed text-black/50">{plato.descripcion}</span>}
      <Alergenos plato={plato} compacto />
    </span>
  );
}

/** Selector de idioma (solo si el local tiene el Pack de idiomas con idiomas activos). */
function SelectorIdioma({ slug, idiomas, actual }: { slug: string; idiomas: string[]; actual: string }) {
  if (idiomas.length === 0) return null;
  const opciones = ['es', ...idiomas];
  return (
    <nav aria-label="Idioma" className="fixed bottom-5 left-4 z-20 flex gap-1 rounded-full bg-white/95 p-1 shadow-lg backdrop-blur">
      {opciones.map((i) => (
        <a key={i} href={i === 'es' ? `/m/${slug}` : `/m/${slug}?lang=${i}`} hrefLang={i} aria-current={i === actual ? 'true' : undefined}
           className={`rounded-full px-2.5 py-1.5 text-xs font-bold uppercase ${i === actual ? 'bg-[#1a1a1a] text-white' : 'text-black/60'}`}
           title={i === 'es' ? 'Español' : IDIOMAS[i]?.nombre}>
          {i}
        </a>
      ))}
    </nav>
  );
}
