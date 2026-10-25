'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Carta, FirmaCarta, PlatoCarta, SeccionCarta } from '@/lib/menu';
import FichaPlato from '@/components/carta/FichaPlato';
import { EtiquetaPlato, PrecioAnterior, ComboPlato } from '@/components/carta/ExtrasPlato';

/**
 * CARTAS DE AUTOR (R3, 19/10/2026, karc0): «premium, de autor, con capacidades
 * de diseño real, no plantillas idénticas siempre repetibles».
 *
 * Tres composiciones al nivel de las 3 demos de /demos/carta, cada una con su
 * tipografía, su maquetación y su ritmo (no solo otro color):
 *  - gastro:  alta cocina. Negro editorial, letra fina espaciada, platos en filas
 *             alternas con la foto grande, nota del chef firmada.
 *  - taberna: bar de tapas. Cabecera de pizarra, recomendación del día en cinta,
 *             secciones en fichas de papel y precios en pastilla.
 *  - urbano:  hamburguesería / street food. Tarjetón con degradado de la marca,
 *             rejilla de tarjetas con el precio sobre la foto, letra de cartel.
 *
 * Lo que hace única cada carta aunque compartan composición es su FIRMA (0096):
 * lema, título de los destacados, nota del chef y quién la firma, adorno; más su
 * color libre (Central), su portada, su logo, su fondo y su letra.
 */

import type { Composicion } from '@/lib/composiciones';

const euros = (p: string) => `${Number(p).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const dos = (n: number) => String(n + 1).padStart(2, '0');

type Props = {
  carta: Carta; grupos: SeccionCarta[]; nombres: Record<string, string>; color: string; oscuro: boolean;
  composicion: Composicion; serif: string; display: string; cartel: string;
  accion: ReactNode; portadaFallback: string | null; tras?: ReactNode; resenas?: string;
};

/** Lo común: buscador, sección activa al bajar y los destacados «de la casa». */
/** Foto de ambiente: la portada, salvo que ya lleve el nombre escrito (cartel): entonces, la de un plato. */
function ambiente(carta: Carta, grupos: SeccionCarta[], respaldo: string | null) {
  if (carta.portadaUrl && !carta.portadaConNombre) return carta.portadaUrl;
  return grupos.flatMap((g) => g.platos).find((p) => p.fotoUrl)?.fotoUrl ?? (carta.portadaConNombre ? null : respaldo);
}

function useCarta(grupos: SeccionCarta[]) {
  const [busca, setBusca] = useState('');
  const [activa, setActiva] = useState(grupos[0]?.id ?? '');
  const nav = useRef<HTMLElement>(null);
  const todos = useMemo(() => grupos.flatMap((g) => g.platos), [grupos]);
  const destacados = useMemo(() => {
    const marcados = todos.filter((p) => p.etiqueta === 'recomendado' || p.etiqueta === 'especial');
    const base = marcados.length >= 3 ? marcados : [...marcados, ...todos.filter((p) => p.fotoUrl && !marcados.includes(p))];
    return base.filter((p) => p.fotoUrl).slice(0, 6);
  }, [todos]);
  const resultados = useMemo(() => {
    const q = normal(busca.trim());
    return q.length < 2 ? null : todos.filter((p) => normal(`${p.nombre} ${p.descripcion ?? ''}`).includes(q));
  }, [busca, todos]);
  useEffect(() => {
    const obs = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActiva(e.target.id.replace('p-', ''))), { rootMargin: '-40% 0px -55% 0px' });
    grupos.forEach((g) => { const el = document.getElementById(`p-${g.id}`); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [grupos]);
  useEffect(() => {
    nav.current?.querySelector<HTMLElement>(`[data-g="${activa}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activa]);
  return { busca, setBusca, activa, nav, destacados, resultados };
}

/** Adorno de la firma: el remate gráfico bajo el nombre y los títulos. */
export function Adorno({ tipo = 'rombo', color, claro }: { tipo?: FirmaCarta['adorno']; color: string; claro?: boolean }) {
  if (tipo === 'ninguno') return null;
  const linea = claro ? 'rgba(255,255,255,.5)' : 'currentColor';
  const centro = tipo === 'estrella' ? <span className="text-sm leading-none" style={{ color }}>✦</span>
    : tipo === 'ola' ? <svg viewBox="0 0 40 8" className="h-2 w-10" fill="none" stroke={color} strokeWidth="1.5"><path d="M0 4c5 0 5-3 10-3s5 6 10 6 5-6 10-6 5 3 10 3" /></svg>
    : tipo === 'sello' ? <span className="grid h-5 w-5 place-items-center rounded-full border text-[8px] font-bold" style={{ borderColor: color, color }}>✓</span>
    : <span className="h-1.5 w-1.5 rotate-45" style={{ background: color }} />;
  return (
    <span className="mx-auto flex items-center justify-center gap-3 opacity-90" aria-hidden="true">
      <span className="h-px w-10" style={{ background: linea, opacity: claro ? 1 : 0.35 }} />{centro}<span className="h-px w-10" style={{ background: linea, opacity: claro ? 1 : 0.35 }} />
    </span>
  );
}

function Buscador({ valor, cambiar, clase, estilo }: { valor: string; cambiar: (v: string) => void; clase: string; estilo?: CSSProperties }) {
  return (
    <label className={`flex items-center gap-2 ${clase}`} style={estilo}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-55" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input value={valor} onChange={(e) => cambiar(e.target.value)} placeholder="Buscar un plato" aria-label="Buscar en la carta" className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-60" />
    </label>
  );
}

function Alergenos({ plato, nombres, clase, estilo }: { plato: PlatoCarta; nombres: Record<string, string>; clase: string; estilo?: CSSProperties }) {
  if (!plato.alergenos.length) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      <span className="sr-only">Alérgenos: </span>
      {plato.alergenos.map((a) => <span key={a} className={clase} style={estilo}>{nombres[a] ?? a}</span>)}
    </span>
  );
}

export default function CartaComposicion(p: Props) {
  if (p.composicion === 'taberna') return <Taberna {...p} />;
  if (p.composicion === 'urbano') return <Urbano {...p} />;
  return <Gastro {...p} />;
}

/* ───────────────────────────── GASTRO · alta cocina ───────────────────────────── */
function Gastro({ carta, grupos, nombres, color, oscuro, serif, accion, portadaFallback, tras, resenas }: Props) {
  const c = useCarta(grupos);
  const f = carta.firma ?? {};
  const portada = ambiente(carta, grupos, portadaFallback);
  const t = oscuro
    ? { fondo: '#0A0A0A', tinta: '#F5F2EC', suave: 'rgba(245,242,236,.6)', linea: 'rgba(245,242,236,.1)', vidrio: 'rgba(10,10,10,.82)', acento: `color-mix(in srgb, ${color} 55%, #F2D9A6)` }
    : { fondo: '#F4F0E8', tinta: '#1A1714', suave: 'rgba(26,23,20,.6)', linea: 'rgba(26,23,20,.12)', vidrio: 'rgba(244,240,232,.86)', acento: color };
  const seleccion = c.destacados[0];
  return (
    <div className="min-h-screen antialiased" style={{ background: t.fondo, color: t.tinta, '--marca': color } as CSSProperties}>
      <header className="flex items-center justify-between gap-4 border-b px-5 py-5 sm:px-10" style={{ borderColor: t.linea }}>
        <span className="flex min-w-0 items-center gap-3">
          {carta.logoUrl && <img src={carta.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />}
          <span className="truncate text-[13px] font-light uppercase tracking-[0.32em]">{carta.nombre}</span>
        </span>
        {carta.horario && <span className="hidden truncate text-[10px] uppercase tracking-[0.24em] sm:block" style={{ color: t.acento }}>{carta.horario}</span>}
      </header>

      <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden px-6 py-24 text-center">
        {portada && <img src={portada} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 motion-safe:animate-[dkzoom_20s_ease-out_both]" style={{ mixBlendMode: oscuro ? 'luminosity' : 'multiply' }} />}
        <span className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 0%, ${t.fondo} 78%)` }} />
        <div className="relative max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: t.acento }}>{f.lema || 'Menú de temporada'}</p>
          <h1 className={`${serif} mt-6 text-[clamp(44px,11vw,96px)] font-light leading-[0.95]`}>{carta.nombre}</h1>
          <div className="mt-7"><Adorno tipo={f.adorno} color={t.acento} /></div>
          {carta.descripcion && <p className={`${serif} mx-auto mt-6 max-w-md text-xl font-light italic leading-snug`} style={{ color: t.suave }}>{carta.descripcion}</p>}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {accion}
            {resenas && <a href={resenas} target="_blank" rel="noopener" className="border px-6 py-3 text-[10px] uppercase tracking-[0.28em]" style={{ borderColor: t.acento, color: t.acento }}>Reseñas en Google</a>}
          </div>
        </div>
      </section>

      {tras}

      <div className="sticky top-0 z-30 border-y backdrop-blur-xl" style={{ background: t.vidrio, borderColor: t.linea }}>
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-5 pb-3 sm:flex-row sm:items-center sm:gap-4 sm:pb-0">
          <nav ref={c.nav} aria-label="Secciones de la carta" className="flex min-w-0 flex-1 gap-6 overflow-x-auto py-3.5 [scrollbar-width:none] sm:py-4">
            {grupos.map((g, i) => (
              <a key={g.id} href={`#p-${g.id}`} data-g={g.id} className="shrink-0 text-[10px] uppercase tracking-[0.28em] transition"
                style={{ color: c.activa === g.id ? t.acento : t.suave }}>
                <span className="mr-2 opacity-60">{dos(i)}</span>{g.nombre}
              </a>
            ))}
          </nav>
          <Buscador valor={c.busca} cambiar={c.setBusca} clase="w-full border-b py-1 sm:w-56" estilo={{ borderColor: t.linea }} />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        {grupos.length === 0 && <SinPlatos serif={serif} suave={t.suave} acento={t.acento} nombre={carta.nombre} />}
        {c.resultados ? (
          <section className="space-y-10 py-16">
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: t.suave }}>{c.resultados.length} resultados · «{c.busca.trim()}»</p>
            {c.resultados.map((p) => <FilaGastro key={p.id} plato={p} t={t} serif={serif} nombres={nombres} invertir={false} />)}
          </section>
        ) : (
          <>
            {seleccion && (
              <section className="pt-20 sm:pt-28">
                <p className="text-center text-[10px] uppercase tracking-[0.4em]" style={{ color: t.acento }}>{f.destacados || 'Selección del chef'}</p>
                <FichaPlato plato={seleccion} nombresAlergenos={nombres} className="mt-8 block">
                  <span className="relative block aspect-[4/5] overflow-hidden sm:aspect-[21/9]">
                    <img src={seleccion.fotoUrl!} alt={seleccion.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-1000 hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-6 text-center text-white sm:p-10">
                      <span className={`${serif} block text-[clamp(30px,6vw,56px)] font-light leading-none`}>{seleccion.nombre}</span>
                      <span className="mt-3 block text-[12px] uppercase tracking-[0.3em]" style={{ color: '#E8CF9C' }}>{euros(seleccion.precio)}</span>
                    </span>
                  </span>
                </FichaPlato>
              </section>
            )}
            {grupos.map((g, i) => (
              <section key={g.id} id={`p-${g.id}`} className="scroll-mt-24 pt-24 sm:pt-32">
                <h2 className={`${serif} flex items-center gap-5 text-[30px] font-light sm:text-4xl`}>
                  <span className="text-[11px] tracking-[0.3em]" style={{ color: t.acento }}>{dos(i)}</span>
                  <span className="h-px w-10 sm:w-16" style={{ background: t.acento, opacity: 0.6 }} />{g.nombre}
                </h2>
                {g.descripcion && <p className={`${serif} mt-3 max-w-lg text-lg font-light italic`} style={{ color: t.suave }}>{g.descripcion}</p>}
                <div className="mt-12 space-y-14 sm:space-y-20">
                  {g.platos.map((p, k) => <FilaGastro key={p.id} plato={p} t={t} serif={serif} nombres={nombres} invertir={k % 2 === 1} />)}
                </div>
              </section>
            ))}
            {f.nota && (
              <figure className="mx-auto max-w-2xl pt-28 text-center">
                <Adorno tipo={f.adorno} color={t.acento} />
                <blockquote className={`${serif} mt-8 text-[clamp(24px,4.5vw,34px)] font-light italic leading-snug`}>«{f.nota}»</blockquote>
                {f.autor && <figcaption className="mt-6 text-[10px] uppercase tracking-[0.36em]" style={{ color: t.acento }}>{f.autor}</figcaption>}
              </figure>
            )}
          </>
        )}
      </main>
      <style>{'@keyframes dkzoom{from{transform:scale(1.08)}to{transform:scale(1)}}'}</style>
    </div>
  );
}

type TemaG = { suave: string; linea: string; acento: string };
function FilaGastro({ plato, t, serif, nombres, invertir }: { plato: PlatoCarta; t: TemaG; serif: string; nombres: Record<string, string>; invertir: boolean }) {
  const texto = (
    <span className="block min-w-0 flex-1">
      <span className="flex items-baseline justify-between gap-4">
        <span className={`${serif} text-[23px] font-light leading-tight sm:text-[26px]`}><EtiquetaPlato plato={plato} />{plato.nombre}</span>
        <span className="shrink-0 text-[15px] tabular-nums" style={{ color: t.acento }}><PrecioAnterior plato={plato} />{euros(plato.precio)}</span>
      </span>
      <ComboPlato plato={plato} />
      {plato.descripcion && <span className="mt-2 block text-[14px] font-light leading-relaxed" style={{ color: t.suave }}>{plato.descripcion}</span>}
      <Alergenos plato={plato} nombres={nombres} clase="border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] opacity-70" />
    </span>
  );
  if (!plato.fotoUrl) {
    return <span className="block border-b pb-10" style={{ borderColor: t.linea }}><FichaPlato plato={plato} nombresAlergenos={nombres} className="block w-full text-left">{texto}</FichaPlato></span>;
  }
  return (
    <FichaPlato plato={plato} nombresAlergenos={nombres} className="block text-left">
      <span className={`flex flex-col gap-6 sm:items-center sm:gap-12 ${invertir ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}>
        <span className="relative block aspect-[4/3] w-full overflow-hidden sm:w-1/2">
          <img src={plato.fotoUrl} alt={plato.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale-[25%] transition duration-1000 hover:scale-105 hover:grayscale-0" />
        </span>
        <span className="block sm:w-1/2">{texto}</span>
      </span>
    </FichaPlato>
  );
}

/** Carta aún sin platos: se dice con la misma voz de la composición, nunca un hueco. */
function SinPlatos({ serif, suave, acento, nombre }: { serif: string; suave: string; acento: string; nombre: string }) {
  return (
    <section className="mx-auto max-w-md py-28 text-center">
      <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: acento }}>La carta</p>
      <p className={`${serif} mt-5 text-[32px] font-light italic leading-tight`}>Estamos escribiendo la carta de {nombre}.</p>
      <p className="mt-4 text-sm leading-relaxed" style={{ color: suave }}>Vuelve en un rato o pregunta al equipo: te cuentan lo que hay hoy.</p>
    </section>
  );
}

/** La descripción no se repite si ya la dice el lema (p. ej. «Pizzería en Baza desde 1992»). */
const otraFrase = (texto: string | null | undefined, lema?: string) => {
  const n = (s: string) => normal(s).replace(/[^a-z0-9]+/g, ' ').trim();
  return texto && (!lema || n(texto) !== n(lema)) ? texto : null;
};

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const listaAlergenos = (p: PlatoCarta, nombres: Record<string, string>) => p.alergenos.map((a) => nombres[a] ?? a).join(' · ');

/* ───────────────────────────── TABERNA · bar de tapas ─────────────────────────────
 * 26/10 (karc0: «subir a autor premium»): carta impresa de taberna. Portada de pizarra a sangre con la
 * foto del local, la recomendación del día como pieza de revista, secciones numeradas en romanos con su
 * adorno y platos en filas con filete de puntos hasta el precio, foto redonda como un plato visto desde
 * arriba y alérgenos en versalitas. Sin cajas ni pastillas: tipografía (Playfair + Cormorant) y aire. */
function Taberna({ carta, grupos, nombres, color, oscuro, serif, display, accion, portadaFallback, tras, resenas }: Props) {
  const c = useCarta(grupos);
  const f = carta.firma ?? {};
  const portada = ambiente(carta, grupos, portadaFallback);
  const pizarra = `color-mix(in srgb, ${color} 24%, #141A13)`;
  const t = oscuro
    ? { fondo: '#131711', tinta: '#EFE8D8', suave: 'rgba(239,232,216,.62)', linea: 'rgba(239,232,216,.14)', vidrio: 'rgba(19,23,17,.86)', acento: `color-mix(in srgb, ${color} 55%, #F2D9A6)` }
    : { fondo: '#F6F1E7', tinta: '#1F241D', suave: 'rgba(31,36,29,.62)', linea: 'rgba(31,36,29,.16)', vidrio: 'rgba(246,241,231,.9)', acento: color };
  const hoy = c.destacados[0];
  const lista = c.resultados ? [{ id: 'busca', nombre: `${c.resultados.length} resultados`, platos: c.resultados } as SeccionCarta] : grupos;
  return (
    <div className="min-h-screen antialiased" style={{ background: t.fondo, color: t.tinta, '--marca': color } as CSSProperties}>
      <header className="relative isolate overflow-hidden text-[#F4ECD8]" style={{ background: pizarra }}>
        {portada && <img src={portada} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50 motion-safe:animate-[dkzoom_20s_ease-out_both]" />}
        <span className="absolute inset-0 -z-10" style={{ background: `linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 30%, color-mix(in srgb, ${pizarra} 70%, transparent) 62%, ${pizarra} 100%)` }} />
        <div className="mx-auto flex min-h-[76svh] max-w-4xl flex-col items-center justify-end px-6 pb-14 pt-24 text-center sm:min-h-[72vh] sm:pb-20">
          {carta.logoUrl && <img src={carta.logoUrl} alt="" className="mb-6 h-16 w-16 rounded-full object-cover ring-1 ring-[#F4ECD8]/40" />}
          <p className="text-[10px] font-semibold uppercase tracking-[0.42em] opacity-85">{f.lema}</p>
          <h1 className={`${display} mt-5 text-[clamp(46px,12.5vw,108px)] font-extrabold italic leading-[0.92] [text-wrap:balance]`}>{carta.nombre}</h1>
          <div className="mt-7"><Adorno tipo={f.adorno} color="#F2D9A6" claro /></div>
          {otraFrase(carta.descripcion, f.lema) && <p className={`${serif} mt-5 max-w-md text-[20px] italic leading-snug opacity-90`}>{carta.descripcion}</p>}
          {carta.horario && <p className="mt-4 text-[10px] uppercase tracking-[0.3em] opacity-70">{carta.horario}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {accion}
            {resenas && <a href={resenas} target="_blank" rel="noopener" className="border-b border-[#F4ECD8]/50 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.24em] transition hover:border-[#F4ECD8]"><span className="text-[#F2C14E]">★</span> Reseñas en Google</a>}
          </div>
        </div>
      </header>

      {tras}

      <div className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: t.vidrio, borderColor: t.linea }}>
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-5 pb-3 sm:flex-row sm:items-center sm:gap-6 sm:pb-0">
          {!c.resultados && grupos.length > 1 && (
            <nav ref={c.nav} aria-label="Secciones de la carta" className="flex min-w-0 flex-1 gap-6 overflow-x-auto pt-3.5 [scrollbar-width:none] sm:py-4">
              {grupos.map((g) => {
                const on = c.activa === g.id;
                return <a key={g.id} href={`#p-${g.id}`} data-g={g.id} className={`${display} shrink-0 border-b-2 pb-1 text-[16px] font-bold italic transition`} style={{ color: on ? t.tinta : t.suave, borderColor: on ? color : 'transparent' }}>{g.nombre}</a>;
              })}
            </nav>
          )}
          <Buscador valor={c.busca} cambiar={c.setBusca} clase={`w-full border-b py-1.5 ${grupos.length > 1 ? 'sm:w-56' : 'mt-3'}`} estilo={{ borderColor: t.linea }} />
        </div>
      </div>

      {hoy && !c.resultados && (
        <section className="mx-auto max-w-5xl px-5 pt-14 sm:pt-20">
          <FichaPlato plato={hoy} nombresAlergenos={nombres} className="block w-full text-left">
            <span className="grid items-center gap-7 sm:grid-cols-[1.15fr_1fr] sm:gap-12">
              <span className="relative block aspect-[4/3] overflow-hidden">
                <img src={hoy.fotoUrl!} alt={hoy.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-1000 hover:scale-105" />
                <span className="absolute left-0 top-5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-white" style={{ background: color }}>{f.destacados}</span>
              </span>
              <span className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.36em]" style={{ color: t.acento }}>De la pizarra</span>
                <span className={`${display} mt-3 block text-[clamp(32px,5.5vw,50px)] font-bold italic leading-[1.02]`}>{hoy.nombre}</span>
                {hoy.descripcion && <span className={`${serif} mt-3 block text-[19px] italic leading-snug`} style={{ color: t.suave }}>{hoy.descripcion}</span>}
                <span className="mt-6 flex items-center gap-4">
                  <span className="h-px flex-1" style={{ background: t.linea }} />
                  <span className={`${display} text-[26px] font-bold tabular-nums`} style={{ color: t.acento }}>{euros(hoy.precio)}</span>
                </span>
              </span>
            </span>
          </FichaPlato>
        </section>
      )}

      <main className="mx-auto max-w-5xl px-5 pb-6">
        {grupos.length === 0 && <SinPlatos serif={display} suave={t.suave} acento={t.acento} nombre={carta.nombre} />}
        {lista.map((g, i) => (
          <section key={g.id} id={`p-${g.id}`} className="scroll-mt-28 pt-16 sm:pt-24">
            <header className="text-center">
              {!c.resultados && <span className={`${serif} block text-[15px] italic`} style={{ color: t.acento }}>{ROMANOS[i] ?? i + 1}</span>}
              <h2 className={`${display} mt-1 text-[clamp(34px,6.5vw,56px)] font-bold italic leading-none [text-wrap:balance]`}>{g.nombre}</h2>
              <div className="mt-5"><Adorno tipo={f.adorno} color={t.acento} /></div>
              {g.descripcion && <p className={`${serif} mx-auto mt-4 max-w-md text-[19px] italic leading-snug`} style={{ color: t.suave }}>{g.descripcion}</p>}
            </header>
            <ul className="mt-8 grid gap-x-14 md:grid-cols-2">
              {g.platos.map((p) => (
                <li key={p.id} className="border-b py-6" style={{ borderColor: t.linea }}>
                  <FichaPlato plato={p} nombresAlergenos={nombres} className="block w-full text-left">
                    <span className="flex items-start gap-4 sm:gap-5">
                      {p.fotoUrl && <img src={p.fotoUrl} alt={p.nombre} loading="lazy" className="h-[84px] w-[84px] shrink-0 rounded-full object-cover sm:h-24 sm:w-24" style={{ boxShadow: `0 0 0 4px ${t.fondo}, 0 0 0 5px ${t.linea}` }} />}
                      <span className="min-w-0 flex-1">
                        {(p.etiqueta || p.combo?.length || p.precioAnterior) && <span className="mb-1 block"><EtiquetaPlato plato={p} /></span>}
                        <span className="flex items-baseline gap-2">
                          <span className={`${display} text-[19px] font-bold leading-snug`}>{p.nombre}</span>
                          <span aria-hidden="true" className="mb-1.5 min-w-4 flex-1 border-b-2 border-dotted" style={{ borderColor: t.linea }} />
                          <span className={`${display} shrink-0 whitespace-nowrap text-[19px] font-bold tabular-nums`} style={{ color: t.acento }}><PrecioAnterior plato={p} />{euros(p.precio)}</span>
                        </span>
                        <ComboPlato plato={p} />
                        {p.descripcion && <span className={`${serif} mt-1 block text-[17px] italic leading-snug`} style={{ color: t.suave }}>{p.descripcion}</span>}
                        {p.alergenos.length > 0 && <span className="mt-2 block text-[10px] uppercase tracking-[0.2em]" style={{ color: t.suave }}><span className="sr-only">Alérgenos: </span>{listaAlergenos(p, nombres)}</span>}
                      </span>
                    </span>
                  </FichaPlato>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      {!c.resultados && f.nota && (
        <figure className="mt-20 px-6 py-20 text-center text-[#F4ECD8] sm:py-28" style={{ background: pizarra }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] opacity-70">Palabra de la casa</p>
          <blockquote className={`${display} mx-auto mt-6 max-w-2xl text-[clamp(26px,4.8vw,40px)] font-bold italic leading-snug`}>«{f.nota}»</blockquote>
          <div className="mt-8"><Adorno tipo={f.adorno} color="#F2D9A6" claro /></div>
          {f.autor && <figcaption className="mt-5 text-[11px] uppercase tracking-[0.3em] opacity-80">{f.autor}</figcaption>}
        </figure>
      )}
      <style>{'@keyframes dkzoom{from{transform:scale(1.08)}to{transform:scale(1)}}'}</style>
    </div>
  );
}

/* ───────────────────────────── URBANO · street food ─────────────────────────────
 * 26/10 (karc0: «subir a autor premium»): póster de street food. Portada a sangre con la foto y el color
 * de la marca, nombre en letra de cartel gigante con el lema en cinta de precinto, cinta en movimiento con
 * las secciones, ranking «los que más piden» con números perfilados y platos como carteles: foto 4:3 con
 * el precio estampado. Los platos sin foto van en lista con filete, nunca en una tarjeta vacía. */
function Urbano({ carta, grupos, nombres, color, oscuro, cartel, accion, portadaFallback, tras, resenas }: Props) {
  const c = useCarta(grupos);
  const f = carta.firma ?? {};
  const portada = ambiente(carta, grupos, portadaFallback);
  const t = oscuro
    ? { fondo: '#0E0D0B', tinta: '#FFFFFF', suave: '#A8A29E', linea: 'rgba(255,255,255,.12)', vidrio: 'rgba(14,13,11,.88)' }
    : { fondo: '#FBF6EE', tinta: '#111111', suave: '#5B534A', linea: 'rgba(17,17,17,.14)', vidrio: 'rgba(251,246,238,.9)' };
  const inicial = carta.nombre.trim().charAt(0).toUpperCase();
  const cinta = grupos.length ? Array.from({ length: Math.max(8, grupos.length) }, (_, i) => grupos[i % grupos.length].nombre) : [];
  const lista = c.resultados ? [{ id: 'busca', nombre: `${c.resultados.length} resultados`, platos: c.resultados } as SeccionCarta] : grupos;
  return (
    <div className="min-h-screen antialiased" style={{ background: t.fondo, color: t.tinta, '--marca': color } as CSSProperties}>
      <section className="relative isolate overflow-hidden bg-[#0B0A08] text-white">
        {portada && <img src={portada} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-75 motion-safe:animate-[dkzoom_20s_ease-out_both]" />}
        <span className="absolute inset-0 -z-10" style={{ background: `linear-gradient(180deg, rgba(0,0,0,.45) 0%, transparent 28%, rgba(0,0,0,.88) 78%), linear-gradient(100deg, color-mix(in srgb, ${color} 62%, transparent) 0%, transparent 58%)` }} />
        <div className="mx-auto flex min-h-[74svh] max-w-6xl flex-col justify-end px-5 pb-12 pt-24 sm:min-h-[68vh] sm:px-8 sm:pb-16">
          <span className="flex items-center gap-3">
            {carta.logoUrl
              ? <img src={carta.logoUrl} alt="" className="h-12 w-12 rounded-[14px] object-cover ring-2 ring-white/30" />
              : <span className={`${cartel} grid h-12 w-12 place-items-center rounded-[14px] text-3xl`} style={{ background: color }}>{inicial}</span>}
            {carta.horario && <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/75">{carta.horario}</span>}
          </span>
          <span className="mt-7 inline-block w-fit -rotate-2 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-lg" style={{ background: color }}>{f.lema}</span>
          <h1 className={`${cartel} mt-4 text-[clamp(56px,16vw,156px)] uppercase leading-[0.86] [text-wrap:balance]`}>{carta.nombre}</h1>
          {otraFrase(carta.descripcion, f.lema) && <p className="mt-4 max-w-lg text-[16px] font-semibold leading-snug text-white/85 sm:text-lg">{carta.descripcion}</p>}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            {accion}
            {resenas && <a href={resenas} target="_blank" rel="noopener" className={`${cartel} text-lg uppercase tracking-wide text-white/90 underline decoration-2 underline-offset-[6px]`} style={{ textDecorationColor: color }}>★ Reseñas</a>}
          </div>
        </div>
      </section>

      {cinta.length > 0 && (
        <div className="overflow-hidden py-3 text-white" style={{ background: color }} aria-hidden="true">
          <div className="flex w-max motion-safe:animate-[dkcinta_40s_linear_infinite]">
            {[0, 1].map((k) => (
              <span key={k} className={`${cartel} flex shrink-0 items-center gap-6 pr-6 text-[22px] uppercase leading-none`}>
                {cinta.map((n, i) => <span key={i} className="flex items-center gap-6">{n}<span className="text-sm opacity-70">✦</span></span>)}
              </span>
            ))}
          </div>
        </div>
      )}

      {tras}

      <div className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: t.vidrio, borderColor: t.linea }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-8">
          {!c.resultados && grupos.length > 1 && (
            <nav ref={c.nav} aria-label="Secciones de la carta" className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {grupos.map((g) => {
                const on = c.activa === g.id;
                return <a key={g.id} href={`#p-${g.id}`} data-g={g.id} className={`${cartel} shrink-0 rounded-[10px] border px-3.5 py-1.5 text-[15px] uppercase tracking-wide transition`} style={{ background: on ? color : 'transparent', borderColor: on ? color : t.linea, color: on ? '#fff' : t.tinta }}>{g.nombre}</a>;
              })}
            </nav>
          )}
          <Buscador valor={c.busca} cambiar={c.setBusca} clase={`w-full rounded-[12px] border px-3.5 py-2 ${grupos.length > 1 ? 'sm:w-60' : ''}`} estilo={{ borderColor: t.linea }} />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-6 sm:px-8">
        {grupos.length === 0 && <SinPlatos serif={cartel} suave={t.suave} acento={color} nombre={carta.nombre} />}
        {!c.resultados && c.destacados.length >= 3 && (
          <section className="pt-12">
            <h2 className={`${cartel} text-[clamp(34px,6vw,56px)] uppercase leading-none`}>{f.destacados}</h2>
            <ul className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8">
              {c.destacados.map((p, i) => (
                <li key={p.id} className="w-[72%] shrink-0 snap-start sm:w-[38%] lg:w-[27%]">
                  <FichaPlato plato={p} nombresAlergenos={nombres} className="block w-full text-left">
                    <span className="relative block aspect-[4/5] overflow-hidden rounded-[18px] bg-black">
                      <img src={p.fotoUrl!} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <span className={`${cartel} absolute left-4 top-1 text-[76px] leading-none text-transparent`} style={{ WebkitTextStroke: '2px rgba(255,255,255,.92)' }}>{i + 1}</span>
                      <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <span className={`${cartel} block text-[24px] uppercase leading-[1.02]`}>{p.nombre}</span>
                        <span className={`${cartel} mt-2 inline-block rounded-[8px] px-2.5 py-0.5 text-lg`} style={{ background: color }}>{euros(p.precio)}</span>
                      </span>
                    </span>
                  </FichaPlato>
                </li>
              ))}
            </ul>
          </section>
        )}
        {lista.map((g, i) => {
          const conFoto = g.platos.filter((p) => p.fotoUrl);
          const sinFoto = g.platos.filter((p) => !p.fotoUrl);
          return (
            <section key={g.id} id={`p-${g.id}`} className="scroll-mt-32 pt-16">
              <h2 className="flex items-end gap-4">
                <span className={`${cartel} text-[clamp(40px,8vw,76px)] uppercase leading-[0.86] [text-wrap:balance]`}>{g.nombre}</span>
                {!c.resultados && <span className={`${cartel} mb-1 text-2xl text-transparent`} style={{ WebkitTextStroke: `1px ${t.tinta}` }}>{dos(i)}</span>}
              </h2>
              <span className="mt-4 block h-[4px] w-16" style={{ background: color }} />
              {g.descripcion && <p className="mt-4 max-w-xl text-[15px] font-semibold" style={{ color: t.suave }}>{g.descripcion}</p>}
              {conFoto.length > 0 && (
                <ul className="mt-8 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {conFoto.map((p) => (
                    <li key={p.id}>
                      <FichaPlato plato={p} nombresAlergenos={nombres} className="block h-full w-full text-left">
                        <span className="relative block aspect-[4/3] overflow-hidden rounded-[18px] bg-black">
                          <img src={p.fotoUrl!} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" />
                          {p.etiqueta && <span className="absolute left-3 top-3 rounded-[8px] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black">{p.etiqueta === 'nuevo' ? 'Nuevo' : p.etiqueta === 'especial' ? 'Especial' : 'Top'}</span>}
                          <span className={`${cartel} absolute bottom-3 left-3 rounded-[10px] px-3 py-1 text-[22px] text-white shadow-lg`} style={{ background: color }}><PrecioAnterior plato={p} />{euros(p.precio)}</span>
                        </span>
                        <span className="block px-1 pt-4">
                          <span className={`${cartel} block text-[24px] uppercase leading-[1.02]`}>{p.nombre}</span>
                          <ComboPlato plato={p} />
                          {p.descripcion && <span className="mt-2 line-clamp-3 block text-[14.5px] leading-relaxed" style={{ color: t.suave }}>{p.descripcion}</span>}
                          {p.alergenos.length > 0 && <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: t.suave }}><span className="sr-only">Alérgenos: </span>{listaAlergenos(p, nombres)}</span>}
                        </span>
                      </FichaPlato>
                    </li>
                  ))}
                </ul>
              )}
              {sinFoto.length > 0 && (
                <ul className="mt-6 grid gap-x-12 md:grid-cols-2">
                  {sinFoto.map((p) => (
                    <li key={p.id} className="border-b py-4" style={{ borderColor: t.linea }}>
                      <FichaPlato plato={p} nombresAlergenos={nombres} className="block w-full text-left">
                        <span className="flex items-baseline gap-2">
                          <span className={`${cartel} text-[21px] uppercase leading-tight`}><EtiquetaPlato plato={p} />{p.nombre}</span>
                          <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b-2 border-dotted" style={{ borderColor: t.linea }} />
                          <span className={`${cartel} shrink-0 whitespace-nowrap text-[21px]`} style={{ color }}><PrecioAnterior plato={p} />{euros(p.precio)}</span>
                        </span>
                        <ComboPlato plato={p} />
                        {p.descripcion && <span className="mt-1 block text-[14px] leading-relaxed" style={{ color: t.suave }}>{p.descripcion}</span>}
                        {p.alergenos.length > 0 && <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: t.suave }}><span className="sr-only">Alérgenos: </span>{listaAlergenos(p, nombres)}</span>}
                      </FichaPlato>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </main>
      {!c.resultados && f.nota && (
        <figure className="mt-20 px-6 py-16 text-center text-white sm:py-24" style={{ background: color }}>
          <blockquote className={`${cartel} mx-auto max-w-3xl text-[clamp(30px,6vw,60px)] uppercase leading-[0.98]`}>«{f.nota}»</blockquote>
          {f.autor && <figcaption className="mt-5 text-xs font-black uppercase tracking-[0.3em] opacity-85">{f.autor}</figcaption>}
        </figure>
      )}
      <style>{'@keyframes dkzoom{from{transform:scale(1.08)}to{transform:scale(1)}}@keyframes dkcinta{from{transform:translateX(0)}to{transform:translateX(-50%)}}'}</style>
    </div>
  );
}
