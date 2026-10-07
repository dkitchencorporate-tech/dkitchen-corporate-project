import type { CSSProperties } from 'react';
import { Cormorant_Garamond } from 'next/font/google';

import type { Banner, Carta, PlatoCarta, SeccionCarta } from '@/lib/menu';
import { nombreAlergeno } from '@/lib/alergenos';
import BotonesMesa from '@/components/carta/BotonesMesa';
import CarruselBanners from '@/components/carta/CarruselBanners';
import FichaPlato from '@/components/carta/FichaPlato';
import Reservar from '@/components/carta/Reservar';
import IndiceSecciones from '@/components/carta/IndiceSecciones';
import { EtiquetaPlato, PrecioAnterior, ComboPlato } from '@/components/carta/ExtrasPlato';

/**
 * CARTA DE AUTOR (nivel 2) — rediseño 28/09/2026
 *
 * Lenguaje de carta impresa de restaurante: papel marfil, tinta, una
 * tipografía clásica (Cormorant) con versalitas espaciadas, secciones
 * numeradas, filete de puntos hasta el precio y fotos tratadas como
 * protagonistas puntuales (no un mosaico de tarjetas). El color de la casa
 * se usa con mesura: filetes, numeración y botones.
 * Mantiene TODAS las funciones del QR: alérgenos (Reglamento UE 1169/2011),
 * reservas, banners, camarero, reseñas. Sigue siendo solo para mirar.
 */

const serif = Cormorant_Garamond({ weight: ['500', '600'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap' });
const precio = (p: string) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: Number(p) % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(Number(p));
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const versalitas = 'text-[11px] font-medium uppercase tracking-[0.28em]';

export default function CartaAutor({
  carta, banners, desdeRespaldo = false, vistaPrevia = false, legal = false }: { carta: Carta; banners: Banner[]; desdeRespaldo?: boolean; vistaPrevia?: boolean; legal?: boolean }) {
  const color = carta.colorMarca || '#8A5A2B';
  const ampliado = carta.plan !== 'basico';
  const grupos: SeccionCarta[] = [
    ...carta.secciones,
    ...(carta.sueltos.length > 0 ? [{ id: 'otros', nombre: 'Otros platos', platos: carta.sueltos }] : []),
  ];
  const alergenosEnCarta = [...new Set(grupos.flatMap((g) => g.platos.flatMap((p) => p.alergenos)))].sort();
  const nombres = Object.fromEntries(alergenosEnCarta.map((a) => [a, nombreAlergeno(a)]));
  const portada = carta.portadaUrl || grupos.flatMap((g) => g.platos).find((p) => p.fotoUrl)?.fotoUrl || null;
  const tel = carta.telefono?.replace(/\s/g, '');
  const mapa = carta.direccion ? `https://maps.google.com/?q=${encodeURIComponent(carta.direccion)}` : null;

  return (
    <main
      className="min-h-screen bg-[#F7F3EA] text-[#221D17] antialiased"
      style={{ '--marca': color } as CSSProperties}
    >
      {/* Portada */}
      <header id="inicio" className="relative">
        <div className={`relative w-full overflow-hidden ${portada ? 'h-[68vh] min-h-[420px] max-h-[720px] bg-[#221D17]' : 'h-[46vh] min-h-[340px] max-h-[520px]'}`} style={portada ? undefined : { background: 'linear-gradient(160deg, color-mix(in srgb, var(--marca) 70%, #17191E), var(--marca))' }}>
          {portada && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={portada} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          )}
          {portada && <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/70" />}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 text-white sm:px-8">
            {carta.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={carta.logoUrl} alt={carta.nombre} className="h-11 w-11 rounded-full object-cover ring-1 ring-white/40" />
            ) : <span />}
            {!vistaPrevia && <Reservar slug={carta.slug} color={color} nombreLocal={carta.nombre} />}
          </div>
          <div className="absolute inset-x-0 bottom-0 px-6 pb-10 text-center text-white sm:pb-14">
            <p className={`${versalitas} text-white/75`}>La carta</p>
            <h1 className={`${serif.className} mx-auto mt-3 max-w-2xl text-5xl font-medium leading-[1.02] sm:text-7xl`}>{carta.nombre}</h1>
            {carta.descripcion && <p className={`${serif.className} mx-auto mt-4 max-w-md text-xl italic leading-snug text-white/85`}>{carta.descripcion}</p>}
          </div>
        </div>
      </header>

      {desdeRespaldo && (
        <p className="mx-auto mt-4 max-w-2xl px-6 text-center text-xs text-amber-900/80">
          Puede que esta carta no refleje los últimos cambios en los próximos minutos.
        </p>
      )}

      {/* Índice */}
      {grupos.length > 1 && (
        <IndiceSecciones grupos={grupos.map(({ id, nombre }) => ({ id, nombre }))} variante="autor" />
      )}

      <div className="pt-6"><CarruselBanners banners={banners} color={color} /></div>

      {/* Secciones */}
      <div className="mx-auto max-w-2xl px-6 pb-32">
        {grupos.length === 0 ? (
          <p className={`${serif.className} py-24 text-center text-2xl italic text-black/50`}>Muy pronto, nuestra carta.</p>
        ) : (
          grupos.map((g, i) => {
            const destacado = g.platos.find((p) => p.fotoUrl && p.fotoUrl !== portada);
            return (
              <section key={g.id} id={`s-${g.id}`} className="scroll-mt-16 pt-16">
                <div className="text-center">
                  <p className={`${versalitas}`} style={{ color: 'var(--marca)' }}>{ROMANOS[i] ?? i + 1}</p>
                  <h2 className={`${serif.className} mt-2 text-4xl font-medium sm:text-5xl`}>{g.nombre}</h2>
                  <div className="mx-auto mt-5 h-px w-12" style={{ background: 'var(--marca)' }} />
                </div>

                {destacado?.fotoUrl && (
                  <figure className="mt-10 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={destacado.fotoUrl} alt={destacado.nombre} loading="lazy" className="aspect-[3/2] w-full object-cover" />
                    <figcaption className={`${serif.className} mt-2 text-center text-base italic text-black/50`}>{destacado.nombre}</figcaption>
                  </figure>
                )}

                <ul className="mt-10 space-y-7">
                  {g.platos.map((p) => (
                    <li key={p.id}>
                      <FichaPlato plato={p} nombresAlergenos={nombres}>
                        <PlatoAutor plato={p} serifClase={serif.className} />
                      </FichaPlato>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}

        {alergenosEnCarta.length > 0 && (
          <section className="mt-24 border-t border-[#221D17]/15 pt-10 text-center">
            <p className={versalitas + ' text-black/45'}>Alérgenos</p>
            <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-black/55">
              {alergenosEnCarta.map((c) => `${c} · ${nombres[c]}`).join('   ·   ')}
            </p>
            <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-black/45">
              Información conforme al Reglamento (UE) 1169/2011. Si tienes una alergia o intolerancia, consúltalo con nuestro
              equipo antes de pedir: en cocina pueden existir trazas que no figuran en la carta.
            </p>
          </section>
        )}

        {ampliado && carta.urlResenas && (
          <section className="mt-16 text-center">
            <p className={`${serif.className} text-3xl italic`}>¿Te ha gustado?</p>
            <a href={carta.urlResenas} target="_blank" rel="noopener"
               className={`${versalitas} mt-5 inline-block border px-7 py-3.5 transition-colors hover:text-white`}
               style={{ borderColor: 'var(--marca)', color: 'var(--marca)' }}>
              Déjanos tu opinión en Google
            </a>
          </section>
        )}

        {(carta.direccion || carta.horario || carta.telefono || carta.instagram) && (
          <section className="mt-20 border-t border-[#221D17]/15 pt-12 text-center">
            <p className={versalitas + ' text-black/45'}>Dónde encontrarnos</p>
            {carta.direccion && <p className={`${serif.className} mx-auto mt-4 max-w-sm text-2xl leading-snug`}>{carta.direccion}</p>}
            {carta.horario && <p className="mt-2 text-sm text-black/55">{carta.horario}</p>}
            <p className={`${versalitas} mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-black/70`}>
              {mapa && <a href={mapa} target="_blank" rel="noopener" className="border-b border-current pb-0.5">Cómo llegar</a>}
              {tel && <a href={`tel:${tel}`} className="border-b border-current pb-0.5">Llamar</a>}
              {carta.instagram && <a href={`https://instagram.com/${carta.instagram}`} target="_blank" rel="noopener" className="border-b border-current pb-0.5">Instagram</a>}
            </p>
          </section>
        )}

        <footer className="mt-20 text-center">
          <p className="mb-2 text-[11px] text-black/40">{legal && (
            <span className="mb-1 block"><a href={`/m/${carta.slug}/legal#aviso`} className="hover:underline">Aviso legal</a> · <a href={`/m/${carta.slug}/legal#privacidad`} className="hover:underline">Privacidad</a> · <a href={`/m/${carta.slug}/legal#cookies`} className="hover:underline">Cookies</a></span>
          )}</p>
          <p className={`${serif.className} text-2xl`}>{carta.nombre}</p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-black/30">
            Carta digital · <a href="https://dkitchencorporate.es/qr" className="hover:text-black/60">DKitchen</a>
          </p>
        </footer>
      </div>

      {!vistaPrevia && <BotonesMesa slug={carta.slug} color={color} />}
    </main>
  );
}

function PlatoAutor({ plato, serifClase }: { plato: PlatoCarta; serifClase: string }) {
  return (
    <span className="block text-left">
      <span className="flex items-baseline gap-3">
        <span className={`${serifClase} text-[22px] font-semibold leading-tight`}><EtiquetaPlato plato={plato} />{plato.nombre}</span>
        <span aria-hidden="true" className="min-w-6 flex-1 translate-y-[-4px] border-b border-dotted border-[#221D17]/30" />
        <span className={`${serifClase} whitespace-nowrap text-[21px] font-semibold tabular-nums`}><PrecioAnterior plato={plato} />{precio(plato.precio)}</span>
      </span>
      <ComboPlato plato={plato} />
      {plato.descripcion && <span className={`${serifClase} mt-1 block pr-12 text-[17px] italic leading-snug text-black/60`}>{plato.descripcion}</span>}
      {plato.alergenos.length > 0 && (
        <span className="mt-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-black/40">
          <span className="sr-only">Alérgenos: </span>{plato.alergenos.map(nombreAlergeno).join(' · ')}
        </span>
      )}
    </span>
  );
}
