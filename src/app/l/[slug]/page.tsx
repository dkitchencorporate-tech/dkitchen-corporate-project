/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond } from 'next/font/google';

import { obtenerCartaConRespaldo } from '@/lib/cache-resiliencia';
import { imagenCarta, metadatosCarta, urlResenas } from '@/lib/carta-compartir';
import Reservar from '@/components/carta/Reservar';

const serif = Cormorant_Garamond({ weight: ['500', '600'], style: ['normal', 'italic'], subsets: ['latin'], display: 'swap' });
const versalitas = 'text-[11px] font-medium uppercase tracking-[0.28em]';
const euros = (p: string) => `${Number(p).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await obtenerCartaConRespaldo(slug);
  if (!r) return { title: 'Local no disponible', robots: { index: false } };
  return metadatosCarta(r.carta, `/l/${slug}`, 'local');
}

/**
 * LANDING DEL RESTAURANTE (13/10, karc0): la «web» del local, incluida con la carta QR.
 * Portada, la casa, horario y cómo llegar, platos de la casa, reseñas de Google,
 * motor de reserva (modal) y botón para ver la carta. Todo sale de los datos de su carta.
 */
export default async function LandingLocal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await obtenerCartaConRespaldo(slug);
  if (!r) notFound();
  const { carta } = r;
  const color = carta.colorMarca || '#6E0C2B';
  const portada = imagenCarta(carta);
  const platos = [...carta.secciones.flatMap((s) => s.platos), ...carta.sueltos];
  const casa = [...platos.filter((p) => p.fotoUrl && (p.etiqueta === 'recomendado' || p.etiqueta === 'especial')), ...platos.filter((p) => p.fotoUrl)]
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i && p.fotoUrl !== carta.portadaUrl).slice(0, 6);
  const tel = carta.telefono?.replace(/\s/g, '');
  const mapa = carta.direccion ? `https://maps.google.com/?q=${encodeURIComponent(`${carta.nombre} ${carta.direccion}`)}` : null;
  const resenas = urlResenas(carta);
  const verCarta = `/m/${carta.slug}`;
  const boton = 'inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold transition';

  return (
    <main className="min-h-screen bg-[#0B0A09] text-[#F4EEE4] antialiased" style={{ '--marca': color } as CSSProperties}>
      {/* Portada */}
      <header className="relative h-[92vh] min-h-[560px] overflow-hidden">
        {portada && carta.portadaConNombre && <img src={portada} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />}
        {portada && <img src={portada} alt="" className={`absolute inset-0 h-full w-full ${carta.portadaConNombre ? 'object-contain object-top' : 'object-cover'}`} />}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.55)_0%,rgba(0,0,0,.1)_35%,rgba(0,0,0,.5)_62%,#0B0A09_100%)]" />
        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-10">
          {carta.logoUrl ? <img src={carta.logoUrl} alt={carta.nombre} className="h-12 w-12 rounded-full object-cover ring-1 ring-white/40" /> : <span />}
          <Link href={verCarta} className={`${versalitas} rounded-full border border-white/30 bg-black/30 px-4 py-2.5 backdrop-blur`}>La carta</Link>
        </nav>
        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-3xl px-6 pb-14 text-center">
          <p className={`${versalitas} text-white/75`}>Bienvenidos</p>
          {!carta.portadaConNombre && <h1 className={`${serif.className} mt-3 text-[clamp(52px,14vw,110px)] font-medium leading-[0.95]`}>{carta.nombre}</h1>}
          {carta.portadaConNombre && <h1 className="sr-only">{carta.nombre}</h1>}
          {carta.descripcion && <p className={`${serif.className} mx-auto mt-4 max-w-lg text-2xl italic leading-snug text-white/85`}>{carta.descripcion}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Reservar slug={carta.slug} color={color} nombreLocal={carta.nombre} />
            <Link href={verCarta} className={`${boton} border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20`}>Ver la carta →</Link>
          </div>
          <a href={resenas} target="_blank" rel="noopener" className="mt-5 inline-flex items-center gap-2 text-sm text-white/80 underline-offset-4 hover:underline">
            <span className="text-[#F2C14E]">★★★★★</span> Lee nuestras reseñas en Google
          </a>
        </div>
      </header>

      {/* La casa */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className={versalitas} style={{ color }}>La casa</p>
        <h2 className={`${serif.className} mt-3 text-5xl font-medium`}>Ven a {carta.nombre}</h2>
        <div className="mx-auto mt-6 h-px w-12" style={{ background: color }} />
        <p className={`${serif.className} mx-auto mt-6 max-w-xl text-xl italic leading-relaxed text-white/70`}>
          {carta.descripcion || 'Cocina de verdad, servida con calma. Reserva tu mesa en un minuto y mira la carta antes de venir.'}
        </p>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10 sm:grid-cols-3">
          <Dato titulo="Horario" texto={carta.horario || 'Consúltanos'} />
          <Dato titulo="Dónde" texto={carta.direccion || 'Consúltanos'} enlace={mapa} enlaceTexto="Cómo llegar" />
          <Dato titulo="Contacto" texto={carta.telefono || (carta.instagram ? `@${carta.instagram.replace('@', '')}` : 'Reserva online')} enlace={tel ? `tel:${tel}` : null} enlaceTexto="Llamar" />
        </div>
      </section>

      {/* De nuestra cocina */}
      {casa.length >= 2 && (
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="text-center">
            <p className={versalitas} style={{ color }}>Recomendados</p>
            <h2 className={`${serif.className} mt-3 text-5xl font-medium`}>De nuestra cocina</h2>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {casa.map((p) => (
              <li key={p.id} className="group relative aspect-[4/5] overflow-hidden rounded-[22px]">
                <img src={p.fotoUrl!} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4">
                  <span className={`${serif.className} block text-[22px] leading-tight`}>{p.nombre}</span>
                  <span className={`${serif.className} text-lg text-[#F2C14E]`}>{euros(p.precio)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Link href={verCarta} className={`${boton} text-white`} style={{ background: color }}>Ver la carta completa →</Link>
          </div>
        </section>
      )}

      {/* Reseñas + reserva final */}
      <section className="border-t border-white/10 px-6 py-24 text-center">
        <p className={`${serif.className} text-4xl italic`}>¿Ya nos conoces?</p>
        <p className="mx-auto mt-3 max-w-md text-white/60">Tu opinión ayuda a otros a encontrarnos.</p>
        <a href={resenas} target="_blank" rel="noopener" className={`${boton} mt-6 border border-white/30 text-white hover:bg-white/10`}>
          <span className="mr-2 text-[#F2C14E]">★</span> Opiniones en Google
        </a>
        <div className="mx-auto mt-20 max-w-xl rounded-[28px] border border-white/10 bg-white/[0.03] p-10">
          <p className={versalitas} style={{ color }}>Reservas</p>
          <h2 className={`${serif.className} mt-3 text-5xl font-medium`}>Te guardamos mesa</h2>
          <p className="mt-3 text-white/60">Elige día, hora y personas. Te confirmamos enseguida.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Reservar slug={carta.slug} color={color} nombreLocal={carta.nombre} />
            <Link href={verCarta} className={`${boton} border border-white/30 text-white hover:bg-white/10`}>Ver la carta</Link>
          </div>
        </div>
      </section>

      <footer className="pb-12 text-center">
        <p className={`${serif.className} text-2xl`}>{carta.nombre}</p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/30">Web y carta digital · <a href="https://dkitchencorporate.es/qr" className="hover:text-white/60">DKitchen</a></p>
      </footer>
    </main>
  );
}

function Dato({ titulo, texto, enlace, enlaceTexto }: { titulo: string; texto: string; enlace?: string | null; enlaceTexto?: string }) {
  return (
    <div className="bg-[#0B0A09] p-6">
      <p className={`${versalitas} text-white/45`}>{titulo}</p>
      <p className={`${serif.className} mt-2 text-xl leading-snug`}>{texto}</p>
      {enlace && <a href={enlace} target={enlace.startsWith('http') ? '_blank' : undefined} rel="noopener" className={`${versalitas} mt-3 inline-block border-b border-current pb-0.5 text-white/75`}>{enlaceTexto}</a>}
    </div>
  );
}
