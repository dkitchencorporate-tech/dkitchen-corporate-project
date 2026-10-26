/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Anton, Cormorant_Garamond, Playfair_Display } from 'next/font/google';

import { obtenerCartaConRespaldo } from '@/lib/cache-resiliencia';
import { imagenCarta, metadatosCarta, urlResenas } from '@/lib/carta-compartir';
import { landingPublica } from '@/lib/landing';
import type { BloqueLanding, EstiloLanding, Landing } from '@/lib/landing-tipos';
import Reservar from '@/components/carta/Reservar';
import { composicionDe } from '@/lib/composiciones';

const serif = Cormorant_Garamond({ weight: ['500', '600'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap' });
// 26/10: los títulos hablan la letra de la composición de la carta (la misma que en /m y en el kit).
const playfair = Playfair_Display({ weight: ['700', '800'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap', preload: false });
const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap', preload: false });
const versalitas = 'text-[11px] font-medium uppercase tracking-[0.28em]';
const euros = (p: string) => `${Number(p).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const revalidate = 60;

/** Paletas de autor de la landing (0076). El color de la marca, como acento secundario. */
const PALETAS: Record<EstiloLanding, { fondo: string; superficie: string; tinta: string; suave: string; linea: string; acento: string; velo: string; claro: boolean }> = {
  noir:  { fondo: '#0B0A09', superficie: '#15130F', tinta: '#F4EEE4', suave: 'rgba(244,238,228,.66)', linea: 'rgba(244,238,228,.12)', acento: '#F2C14E', velo: '#0B0A09', claro: false },
  crema: { fondo: '#F5EFE4', superficie: '#FFFBF4', tinta: '#221D17', suave: 'rgba(34,29,23,.68)', linea: 'rgba(34,29,23,.12)', acento: '#8C0D37', velo: '#F5EFE4', claro: true },
  brasa: { fondo: '#140B07', superficie: '#21130C', tinta: '#F6E7D8', suave: 'rgba(246,231,216,.68)', linea: 'rgba(246,231,216,.12)', acento: '#E8792E', velo: '#140B07', claro: false },
  mar:   { fondo: '#08161F', superficie: '#0E2230', tinta: '#EAF2F4', suave: 'rgba(234,242,244,.68)', linea: 'rgba(234,242,244,.12)', acento: '#7FC8D9', velo: '#08161F', claro: false },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await obtenerCartaConRespaldo(slug);
  if (!r || r.carta.plan === 'basico') return { title: 'Local no disponible', robots: { index: false } };
  const base = metadatosCarta(r.carta, `/l/${slug}`, 'local');
  const l = await landingPublica(slug);
  if (!l) return base;
  const titulo = l.seoTitulo || r.carta.nombre;
  const desc = l.seoDescripcion || l.subtitulo || (base.description as string);
  return { ...base, title: { absolute: titulo }, description: desc, openGraph: { ...base.openGraph, title: titulo, description: desc }, twitter: { ...base.twitter, title: titulo, description: desc } };
}

/**
 * LANDING DEL RESTAURANTE (13/10, karc0). Con landing guardada en el Estudio
 * (0076): estilo, textos, bloques en su orden, platos elegidos, galería y FAQ.
 * Sin ella, se construye sola con los datos de la carta. Plan Carta → la carta.
 */
export default async function LandingLocal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await obtenerCartaConRespaldo(slug);
  if (!r) notFound();
  const { carta } = r;
  if (carta.plan === 'basico') redirect(`/m/${carta.slug}`);
  const l: Landing | null = await landingPublica(slug);

  const marca = carta.colorMarca || '#6E0C2B';
  // Sin estilo guardado en el Estudio, la landing toma la piel de la composición de su carta (26/10, diseño de autor automático).
  const comp = composicionDe(carta);
  const claro = carta.estiloFondo === 'papel' || carta.estiloFondo === 'blanco';
  const P = l?.estilo ? PALETAS[l.estilo]
    : comp === 'urbano' ? { ...PALETAS.noir, fondo: '#0E0D0B', superficie: '#181612', velo: '#0E0D0B', acento: marca }
    : comp === 'taberna' ? (claro ? { ...PALETAS.crema, acento: marca } : { ...PALETAS.noir, fondo: '#131711', superficie: '#1B2019', velo: '#131711', acento: '#F2D9A6' })
    : PALETAS[claro ? 'crema' : 'noir'];
  const tit = comp === 'taberna' ? `${playfair.className} font-bold italic` : comp === 'urbano' ? `${anton.className} uppercase tracking-[0.005em]` : serif.className;
  const portada = imagenCarta(carta);
  const platos = [...carta.secciones.flatMap((s) => s.platos), ...carta.sueltos];
  const elegidos = (l?.destacados ?? []).map((id) => platos.find((p) => p.id === id)).filter((p): p is (typeof platos)[number] => !!p);
  const casa = (elegidos.length ? elegidos : [...platos.filter((p) => p.fotoUrl && (p.etiqueta === 'recomendado' || p.etiqueta === 'especial')), ...platos.filter((p) => p.fotoUrl)])
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i && (elegidos.length || p.fotoUrl !== carta.portadaUrl)).slice(0, 6);
  const tel = carta.telefono?.replace(/\s/g, '');
  const mapa = carta.direccion ? `https://maps.google.com/?q=${encodeURIComponent(`${carta.nombre} ${carta.direccion}`)}` : null;
  const resenas = urlResenas(carta);
  const verCarta = `/m/${carta.slug}`;
  const boton = 'inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold transition';
  const bloques: BloqueLanding[] = l?.bloques?.length ? l.bloques : ['historia', 'destacados', 'galeria', 'datos', 'resenas', 'faq', 'reserva'];
  const cta = l?.ctaPrincipal ?? 'reservar';
  const secundario = { color: P.tinta, borderColor: P.linea } as CSSProperties;

  const principal = cta === 'carta'
    ? <Link href={verCarta} className={boton} style={{ background: P.acento, color: P.claro ? '#FFFFFF' : P.fondo }}>Ver la carta →</Link>
    : cta === 'llamar' && tel
      ? <a href={`tel:${tel}`} className={boton} style={{ background: P.acento, color: P.claro ? '#FFFFFF' : P.fondo }}>Llamar</a>
      : <Reservar slug={carta.slug} color={marca} nombreLocal={carta.nombre} />;

  const secciones: Record<BloqueLanding, ReactNode> = {
    historia: (
      <section key="historia" className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-24 md:grid-cols-[1fr_1.1fr] md:gap-16">
        {l?.fotoHistoriaUrl ? (
          <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
            <img src={l.fotoHistoriaUrl} alt={`${carta.nombre}, la casa`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 0 1px ${P.linea}` }} />
          </div>
        ) : <div className="hidden md:block" aria-hidden="true"><p className={`${serif.className} text-[180px] italic leading-none`} style={{ color: P.linea }}>“</p></div>}
        <div className={l?.fotoHistoriaUrl ? '' : 'md:col-span-1'}>
          <p className={versalitas} style={{ color: P.acento }}>La casa</p>
          <h2 className={`${tit} mt-3 text-5xl font-medium leading-[1.02] md:text-6xl`}>Ven a {carta.nombre}</h2>
          <div className="mt-6 h-px w-14" style={{ background: P.acento }} />
          <p className={`${serif.className} mt-6 whitespace-pre-line text-xl italic leading-relaxed md:text-2xl`} style={{ color: P.suave }}>
            {l?.historia || carta.descripcion || 'Cocina de verdad, servida con calma. Reserva tu mesa en un minuto y mira la carta antes de venir.'}
          </p>
        </div>
      </section>
    ),
    destacados: casa.length >= 2 ? (
      <section key="destacados" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className={versalitas} style={{ color: P.acento }}>De nuestra cocina</p><h2 className={`${tit} mt-3 text-5xl font-medium`}>Platos de la casa</h2></div>
          <Link href={verCarta} className={`${versalitas} border-b pb-1`} style={{ borderColor: P.acento }}>Toda la carta →</Link>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {casa.map((p, i) => (
            <li key={p.id} className={`group relative overflow-hidden rounded-[24px] ${i === 0 && casa.length >= 3 ? 'col-span-2 row-span-2 aspect-square sm:col-span-2' : 'aspect-[4/5]'}`} style={{ background: P.superficie }}>
              {p.fotoUrl && <img src={p.fotoUrl} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4 text-[#F4EEE4]">
                <span className={`${tit} block leading-tight ${i === 0 && casa.length >= 3 ? 'text-3xl' : 'text-[22px]'}`}>{p.nombre}</span>
                <span className={`${serif.className} text-lg`} style={{ color: P.claro ? '#F2C14E' : P.acento }}>{euros(p.precio)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    ) : null,
    galeria: (l?.galeria?.length ?? 0) > 0 ? (
      <section key="galeria" className="mx-auto max-w-6xl px-6 pb-24">
        <p className={`${versalitas} text-center`} style={{ color: P.acento }}>El local</p>
        <div className="mt-8 columns-2 gap-3 sm:columns-3 [&>img]:mb-3">
          {l!.galeria.map((u, i) => <img key={u} src={u} alt={`${carta.nombre}, foto ${i + 1}`} loading="lazy" className="w-full break-inside-avoid rounded-[20px] object-cover" />)}
        </div>
      </section>
    ) : null,
    datos: (
      <section key="datos" className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-px overflow-hidden rounded-[26px] sm:grid-cols-3" style={{ background: P.linea, boxShadow: `0 0 0 1px ${P.linea}` }}>
          <Dato P={P} titulo="Horario" texto={carta.horario || 'Pregúntanos por teléfono'} />
          <Dato P={P} titulo="Dónde" texto={carta.direccion || 'Escríbenos y te lo contamos'} enlace={mapa} enlaceTexto="Cómo llegar" />
          <Dato P={P} titulo="Contacto" texto={carta.telefono || (carta.instagram ? `@${carta.instagram.replace('@', '')}` : 'Reserva online')} enlace={tel ? `tel:${tel}` : null} enlaceTexto="Llamar" />
        </div>
      </section>
    ),
    resenas: (
      <section key="resenas" className="px-6 pb-24 text-center">
        <p className={`${tit} text-[44px] leading-tight`}>¿Ya nos conoces?</p>
        <p className="mx-auto mt-3 max-w-md" style={{ color: P.suave }}>Tu opinión ayuda a otros a encontrarnos.</p>
        <a href={resenas} target="_blank" rel="noopener" className={`${boton} mt-6 border`} style={secundario}><span className="mr-2" style={{ color: '#F2C14E' }}>★★★★★</span> Opiniones en Google</a>
      </section>
    ),
    faq: (l?.faq?.length ?? 0) > 0 ? (
      <section key="faq" className="mx-auto max-w-3xl px-6 pb-24">
        <p className={`${versalitas} text-center`} style={{ color: P.acento }}>Antes de venir</p>
        <h2 className={`${tit} mt-3 text-center text-5xl font-medium`}>Preguntas frecuentes</h2>
        <div className="mt-10 divide-y" style={{ borderColor: P.linea }}>
          {l!.faq.map((q) => (
            <details key={q.p} className="group py-5" style={{ borderColor: P.linea }}>
              <summary className={`${serif.className} flex cursor-pointer list-none items-center justify-between gap-4 text-2xl`}>{q.p}<span className="text-xl transition group-open:rotate-45" style={{ color: P.acento }}>+</span></summary>
              <p className="mt-3 leading-relaxed" style={{ color: P.suave }}>{q.r}</p>
            </details>
          ))}
        </div>
      </section>
    ) : null,
    reserva: (
      <section key="reserva" className="px-6 pb-24">
        <div className="mx-auto max-w-xl rounded-[30px] p-10 text-center" style={{ background: P.superficie, boxShadow: `0 0 0 1px ${P.linea}` }}>
          <p className={versalitas} style={{ color: P.acento }}>Reservas</p>
          <h2 className={`${tit} mt-3 text-5xl font-medium`}>Te guardamos mesa</h2>
          <p className="mt-3" style={{ color: P.suave }}>Elige día, hora y personas. Te confirmamos enseguida.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Reservar slug={carta.slug} color={marca} nombreLocal={carta.nombre} />
            <Link href={verCarta} className={`${boton} border`} style={secundario}>Ver la carta</Link>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <main className="min-h-screen antialiased" style={{ background: P.fondo, color: P.tinta, '--marca': marca } as CSSProperties}>
      <style>{`@keyframes dk-zoom{from{transform:scale(1.12)}to{transform:scale(1)}}@media (prefers-reduced-motion:no-preference){.dk-portada{animation:dk-zoom 9s ease-out both}}`}</style>
      {/* Portada */}
      <header className={`relative overflow-hidden ${carta.portadaConNombre ? 'flex flex-col pt-16 sm:pt-20' : 'h-[92vh] min-h-[560px]'}`}>
        {portada && carta.portadaConNombre && <img src={portada} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-3xl" />}
        {portada && <img src={portada} alt="" className={carta.portadaConNombre ? 'relative mx-auto w-full max-w-4xl sm:rounded-[28px]' : 'dk-portada absolute inset-0 h-full w-full object-cover'} />}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.08) 35%,rgba(0,0,0,.5) 62%,${P.velo} 100%)` }} />
        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-10">
          {carta.logoUrl ? <img src={carta.logoUrl} alt={carta.nombre} className="h-12 w-12 rounded-full object-cover ring-1 ring-white/40" /> : <span />}
          <Link href={verCarta} className={`${versalitas} rounded-full border border-white/30 bg-black/30 px-4 py-2.5 text-white backdrop-blur`}>La carta</Link>
        </nav>
        <div className={`z-10 mx-auto max-w-3xl px-6 pb-14 text-center ${carta.portadaConNombre ? 'relative w-full pt-6' : 'absolute inset-x-0 bottom-0'}`} style={{ color: P.claro && carta.portadaConNombre ? P.tinta : '#FFFFFF' }}>
          <p className={`${versalitas} opacity-80`}>{l?.titular ? carta.nombre : 'Bienvenidos'}</p>
          {!carta.portadaConNombre && <h1 className={`${tit} mt-3 text-[clamp(48px,12vw,104px)] font-medium leading-[0.95]`}>{l?.titular || carta.nombre}</h1>}
          {carta.portadaConNombre && <h1 className="sr-only">{l?.titular || carta.nombre}</h1>}
          {(l?.subtitulo || carta.descripcion) && <p className={`${serif.className} mx-auto mt-4 max-w-lg text-2xl italic leading-snug opacity-90`}>{l?.subtitulo || carta.descripcion}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {principal}
            {cta !== 'carta' && <Link href={verCarta} className={`${boton} border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20`}>Ver la carta →</Link>}
          </div>
          <a href={resenas} target="_blank" rel="noopener" className="mt-5 inline-flex items-center gap-2 text-sm opacity-85 underline-offset-4 hover:underline">
            <span className="text-[#F2C14E]">★★★★★</span> Lee nuestras reseñas en Google
          </a>
        </div>
      </header>

      {bloques.map((b) => secciones[b])}

      <footer className="pb-12 pt-6 text-center" style={{ borderTop: `1px solid ${P.linea}` }}>
        <p className={`${tit} mt-10 text-3xl`}>{carta.nombre}</p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em]" style={{ color: P.suave }}>Web y carta digital · <a href="https://dkitchencorporate.es/qr">DKitchen</a></p>
      </footer>
    </main>
  );
}

function Dato({ P, titulo, texto, enlace, enlaceTexto }: { P: (typeof PALETAS)[EstiloLanding]; titulo: string; texto: string; enlace?: string | null; enlaceTexto?: string }) {
  return (
    <div className="p-7" style={{ background: P.fondo }}>
      <p className={versalitas} style={{ color: P.suave }}>{titulo}</p>
      <p className={`${serif.className} mt-2 text-2xl leading-snug`}>{texto}</p>
      {enlace && <a href={enlace} target={enlace.startsWith('http') ? '_blank' : undefined} rel="noopener" className={`${versalitas} mt-3 inline-block border-b pb-0.5`} style={{ borderColor: P.acento }}>{enlaceTexto}</a>}
    </div>
  );
}
