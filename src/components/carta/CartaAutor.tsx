import type { CSSProperties } from 'react';
import { DM_Serif_Display } from 'next/font/google';

import type { Banner, Carta, PlatoCarta, SeccionCarta } from '@/lib/menu';
import { nombreAlergeno } from '@/lib/alergenos';
import BotonesMesa from '@/components/carta/BotonesMesa';
import CarruselBanners from '@/components/carta/CarruselBanners';
import FichaPlato from '@/components/carta/FichaPlato';
import Reservar from '@/components/carta/Reservar';

/**
 * CARTA DE AUTOR (Nivel 2 · Setup Experto) — 28/09/2026
 *
 * Lenguaje visual editorial inspirado en el trabajo de autor de karc0 (ref.
 * encapaco.es, solo como estilo): fondo crema cálido, títulos en serif
 * editorial, antetítulos en versalitas espaciadas, precio en píldora con el
 * color de la casa, categorías en tarjetas con foto, cabecera flotante con
 * acciones rápidas y un cierre narrativo ("¿Cómo encontrarnos?").
 * Mantiene TODAS las funciones del QR: alérgenos (Reglamento UE 1169/2011),
 * reservas, banners, camarero, reseñas. Sigue siendo solo para mirar.
 */

const serif = DM_Serif_Display({ weight: '400', subsets: ['latin'], display: 'swap' });
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export default function CartaAutor({
  carta, banners, desdeRespaldo = false, vistaPrevia = false,
}: { carta: Carta; banners: Banner[]; desdeRespaldo?: boolean; vistaPrevia?: boolean }) {
  const color = carta.colorMarca || '#8A5A2B';
  const ampliado = carta.plan === 'ampliado';
  const grupos: SeccionCarta[] = [
    ...carta.secciones,
    ...(carta.sueltos.length > 0 ? [{ id: 'otros', nombre: 'Otros platos', platos: carta.sueltos }] : []),
  ];
  const alergenosEnCarta = [...new Set(grupos.flatMap((g) => g.platos.flatMap((p) => p.alergenos)))].sort();
  const nombres = Object.fromEntries(alergenosEnCarta.map((a) => [a, nombreAlergeno(a)]));
  const portada = grupos.flatMap((g) => g.platos).find((p) => p.fotoUrl)?.fotoUrl ?? carta.logoUrl ?? null;
  const tel = carta.telefono?.replace(/\s/g, '');

  return (
    <main
      className="min-h-screen bg-[#FBF7F0] text-[#1C1712]"
      style={{ '--marca': color, '--marca-suave': `color-mix(in srgb, ${color} 14%, #FBF7F0)` } as CSSProperties}
    >
      {/* Cabecera flotante */}
      <header className="sticky top-0 z-20 px-4 pt-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full bg-white/95 px-3 py-2 shadow-[0_6px_24px_rgba(28,23,18,.08)] backdrop-blur">
          <div className="flex gap-1.5">
            {tel && (
              <a href={`tel:${tel}`} aria-label="Llamar" className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-base">📞</a>
            )}
            {carta.direccion && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(carta.direccion)}`} target="_blank" rel="noopener" aria-label="Cómo llegar"
                 className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-base">📍</a>
            )}
          </div>
          <a href="#inicio" className="min-w-0 truncate text-center">
            {carta.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={carta.logoUrl} alt={carta.nombre} className="mx-auto h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className={`${serif.className} text-xl`}>{carta.nombre}</span>
            )}
          </a>
          <div className="flex min-w-[80px] justify-end">{ampliado && !vistaPrevia && <Reservar slug={carta.slug} color={color} nombreLocal={carta.nombre} />}</div>
        </div>
      </header>

      {desdeRespaldo && (
        <p className="mx-auto mt-3 max-w-3xl px-5 text-center text-xs text-amber-800">
          Puede que esta carta no refleje los últimos cambios en los próximos minutos.
        </p>
      )}

      {/* Portada */}
      <section id="inicio" className="mx-auto max-w-3xl px-5 pt-6">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_rgba(28,23,18,.10)]">
          {portada ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={portada} alt="" className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]" />
          ) : (
            <div className="aspect-[16/9] w-full" style={{ background: 'var(--marca-suave)' }} />
          )}
        </div>
        <div className="px-1 pt-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-black/45">Carta digital</p>
          <h1 className={`${serif.className} mt-2 text-4xl leading-tight sm:text-5xl`}>{carta.nombre}</h1>
          {carta.descripcion && <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-black/60">{carta.descripcion}</p>}
        </div>
      </section>

      <CarruselBanners banners={banners} color={color} />

      {/* Categorías en tarjetas */}
      {grupos.length > 1 && (
        <nav aria-label="Categorías" className="mx-auto max-w-3xl px-5 pt-10">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-black/45">Nuestra carta</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {grupos.map((g) => {
              const foto = g.platos.find((p) => p.fotoUrl)?.fotoUrl;
              return (
                <li key={g.id}>
                  <a href={`#s-${g.id}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-sm">
                    {foto ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={foto} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <span className="block h-full w-full" style={{ background: 'var(--marca-suave)' }} />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <span className={`${serif.className} absolute inset-x-3 bottom-2.5 text-lg leading-tight text-white`}>{g.nombre}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Secciones */}
      <div className="mx-auto max-w-3xl px-5 pb-28">
        {grupos.length === 0 ? (
          <p className="py-20 text-center text-black/50">Esta carta todavía no tiene platos publicados.</p>
        ) : (
          grupos.map((g) => (
            <section key={g.id} id={`s-${g.id}`} className="scroll-mt-24 pt-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-black/40">Categoría</p>
              <h2 className={`${serif.className} mt-1 text-3xl`}>{g.nombre}</h2>
              <ul className="mt-4 divide-y divide-black/[0.07]">
                {g.platos.map((p) => (
                  <li key={p.id}>
                    <FichaPlato plato={p} nombresAlergenos={nombres} className="py-5">
                      <PlatoAutor plato={p} serifClase={serif.className} />
                    </FichaPlato>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {alergenosEnCarta.length > 0 && (
          <section className="mt-16 rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-black/40">Información</p>
            <h2 className={`${serif.className} mt-1 text-2xl`}>Alérgenos</h2>
            <p className="mt-2 text-xs leading-relaxed text-black/50">
              Información facilitada conforme al Reglamento (UE) 1169/2011. Si tienes una alergia o intolerancia, consúltalo con el
              personal antes de pedir: en cocina pueden existir trazas que no figuran en la carta.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {alergenosEnCarta.map((c) => (
                <li key={c} className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/65">{nombres[c]}</li>
              ))}
            </ul>
          </section>
        )}

        {ampliado && carta.urlResenas && (
          <a href={carta.urlResenas} target="_blank" rel="noopener"
             className="mt-6 block rounded-3xl p-6 text-center text-white shadow-sm" style={{ background: 'var(--marca)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] opacity-80">Tu opinión cuenta</p>
            <p className={`${serif.className} mt-1 text-2xl`}>¿Te ha gustado? Cuéntalo en Google ⭐</p>
          </a>
        )}

        {(carta.direccion || carta.horario || carta.telefono || carta.instagram) && (
          <section className="mt-6 rounded-3xl bg-white p-6 text-center shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-black/40">¿Cómo encontrarnos?</p>
            <h2 className={`${serif.className} mt-1 text-2xl`}>Te esperamos en {carta.nombre}</h2>
            {carta.direccion && <p className="mt-3 text-[15px] text-black/65">{carta.direccion}</p>}
            {carta.horario && <p className="mt-1 text-sm text-black/50">{carta.horario}</p>}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {carta.direccion && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(carta.direccion)}`} target="_blank" rel="noopener"
                   className="rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: 'var(--marca)' }}>
                  Ver en Google Maps
                </a>
              )}
              {tel && <a href={`tel:${tel}`} className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-bold">Llamar</a>}
              {carta.instagram && (
                <a href={`https://instagram.com/${carta.instagram}`} target="_blank" rel="noopener" className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-bold">
                  @{carta.instagram}
                </a>
              )}
            </div>
          </section>
        )}

        <footer className="mt-12 text-center">
          <p className={`${serif.className} text-xl text-black/70`}>{carta.nombre}</p>
          <p className="mt-2 text-[11px] text-black/30">
            Carta digital · Tecnología de <a href="https://dkitchencorporate.es/qr" className="hover:underline">DKitchen</a>
          </p>
        </footer>
      </div>

      {ampliado && !vistaPrevia && <BotonesMesa slug={carta.slug} color={color} />}
    </main>
  );
}

function PlatoAutor({ plato, serifClase }: { plato: PlatoCarta; serifClase: string }) {
  return (
    <span className="flex items-start gap-4">
      <span className="block min-w-0 flex-1">
        <span className={`${serifClase} block text-[22px] leading-snug`}>{plato.nombre}</span>
        {plato.descripcion && <span className="mt-1 line-clamp-2 block text-[15px] leading-relaxed text-black/55">{plato.descripcion}</span>}
        {plato.alergenos.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {plato.alergenos.map((c) => (
              <span key={c} title={nombreAlergeno(c)} className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-black/45">
                <span className="sr-only">Contiene </span>{c}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <span className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[15px] font-bold tabular-nums"
              style={{ background: 'var(--marca-suave)', color: 'var(--marca)' }}>
          {euros.format(Number(plato.precio))}
        </span>
        {plato.fotoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={plato.fotoUrl} alt="" loading="lazy" className="h-16 w-16 rounded-xl object-cover" />
        )}
      </span>
    </span>
  );
}
