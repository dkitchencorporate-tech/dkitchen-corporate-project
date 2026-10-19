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

/* ───────────────────────────── TABERNA · bar de tapas ───────────────────────────── */
function Taberna({ carta, grupos, nombres, color, oscuro, display, accion, portadaFallback, tras, resenas }: Props) {
  const c = useCarta(grupos);
  const f = carta.firma ?? {};
  const portada = ambiente(carta, grupos, portadaFallback);
  const pizarra = `color-mix(in srgb, ${color} 28%, #1C261D)`;
  const t = oscuro
    ? { fondo: '#151A16', ficha: '#1D241E', tarjeta: '#232B24', tinta: '#F1EADB', suave: 'rgba(241,234,219,.62)', linea: 'rgba(241,234,219,.1)', chip: 'rgba(241,234,219,.08)' }
    : { fondo: '#FAF7F1', ficha: '#FFFFFF', tarjeta: '#FEFCF8', tinta: '#26332A', suave: '#6B7264', linea: '#E8E1D2', chip: '#F3EAD6' };
  const hoy = c.destacados[0];
  return (
    <div className="min-h-screen antialiased" style={{ background: t.fondo, color: t.tinta, '--marca': color } as CSSProperties}>
      <header className="relative overflow-hidden text-[#F4ECD8]" style={{ background: pizarra }}>
        {portada && <img src={portada} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <span className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${pizarra})` }} />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-12 pt-10 text-center">
          {carta.logoUrl && <img src={carta.logoUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-[#F4ECD8]/40" />}
          <h1 className={`${display} mt-4 text-[clamp(42px,11vw,80px)] font-extrabold italic leading-[0.95] tracking-tight`}>{carta.nombre}</h1>
          <p className="mt-4 inline-block border-t border-[#F4ECD8]/25 pt-2 text-[11px] font-semibold uppercase tracking-[0.26em] opacity-85">{f.lema || carta.descripcion || 'Tapas, raciones y vinos'}</p>
          {carta.horario && <p className="mt-3 rounded-full bg-black/25 px-3.5 py-1.5 text-xs">{carta.horario}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {accion}
            {resenas && <a href={resenas} target="_blank" rel="noopener" className="rounded-full border border-[#F4ECD8]/40 px-4 py-2.5 text-sm font-semibold"><span className="text-[#F2C14E]">★★★★★</span> Google</a>}
          </div>
        </div>
      </header>

      {hoy && (
        <FichaPlato plato={hoy} nombresAlergenos={nombres} className="block">
          <span className="block px-4 py-6 text-white" style={{ background: color }}>
            <span className="mx-auto flex max-w-xl items-center gap-4 rounded-2xl border-2 border-dashed border-white/40 p-4 text-left">
              <img src={hoy.fotoUrl!} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] opacity-85">{f.destacados || 'Hoy recomendamos'}</span>
                <span className={`${display} line-clamp-2 block text-xl font-bold italic leading-tight sm:text-2xl`}>{hoy.nombre}</span>
              </span>
              <span className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-lg font-black tabular-nums">{euros(hoy.precio)}</span>
            </span>
          </span>
        </FichaPlato>
      )}

      {tras}

      <div className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: oscuro ? 'rgba(21,26,22,.9)' : 'rgba(250,247,241,.92)', borderColor: t.linea }}>
        <div className="mx-auto max-w-5xl px-4 py-3">
          <Buscador valor={c.busca} cambiar={c.setBusca} clase="rounded-xl border px-4 py-2.5" estilo={{ borderColor: t.linea, background: t.ficha }} />
          {!c.resultados && grupos.length > 1 && (
            <nav ref={c.nav} aria-label="Secciones de la carta" className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
              {grupos.map((g) => {
                const on = c.activa === g.id;
                return <a key={g.id} href={`#p-${g.id}`} data-g={g.id} className="shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition" style={{ background: on ? color : t.chip, color: on ? '#fff' : t.tinta }}>{g.nombre}</a>;
              })}
            </nav>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        {(c.resultados ? [{ id: 'busca', nombre: `${c.resultados.length} resultados`, platos: c.resultados } as SeccionCarta] : grupos).map((g) => (
          <section key={g.id} id={`p-${g.id}`} className="scroll-mt-32 rounded-[28px] border p-5 sm:p-8" style={{ background: t.ficha, borderColor: t.linea }}>
            <h2 className={`${display} inline-block border-b-[3px] pb-2 text-[30px] font-bold leading-none sm:text-4xl`} style={{ borderColor: color }}>{g.nombre}</h2>
            {g.descripcion && <p className="mt-3 text-sm" style={{ color: t.suave }}>{g.descripcion}</p>}
            <ul className="mt-7 grid gap-4 md:grid-cols-2">
              {g.platos.map((p) => (
                <li key={p.id}>
                  <FichaPlato plato={p} nombresAlergenos={nombres} className="block h-full">
                    <span className="flex h-full gap-4 rounded-3xl border p-3.5 text-left transition hover:shadow-lg" style={{ background: t.tarjeta, borderColor: t.linea }}>
                      {p.fotoUrl && <img src={p.fotoUrl} alt={p.nombre} loading="lazy" className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28" />}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[17px] font-bold leading-tight"><EtiquetaPlato plato={p} />{p.nombre}</span>
                          <span className="shrink-0 whitespace-nowrap rounded-xl px-2.5 py-1 text-[15px] font-black tabular-nums" style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color: oscuro ? `color-mix(in srgb, ${color} 50%, #fff)` : color }}>{euros(p.precio)}</span>
                        </span>
                        {p.precioAnterior && <span className="mt-0.5 block text-xs" style={{ color: t.suave }}>Antes <PrecioAnterior plato={p} /></span>}
                        <ComboPlato plato={p} />
                        {p.descripcion && <span className="mt-1.5 line-clamp-3 block text-[13.5px] leading-relaxed" style={{ color: t.suave }}>{p.descripcion}</span>}
                        <Alergenos plato={p} nombres={nombres} clase="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" estilo={{ background: t.chip }} />
                      </span>
                    </span>
                  </FichaPlato>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!c.resultados && f.nota && (
          <figure className="rounded-[28px] px-6 py-10 text-center text-[#F4ECD8]" style={{ background: pizarra }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-70">Palabra de la casa</p>
            <blockquote className={`${display} mx-auto mt-4 max-w-xl text-[clamp(22px,4.5vw,30px)] font-bold italic leading-snug`}>«{f.nota}»</blockquote>
            {f.autor && <figcaption className="mt-4 text-sm opacity-80">— {f.autor}</figcaption>}
          </figure>
        )}
      </main>
    </div>
  );
}

/* ───────────────────────────── URBANO · street food ───────────────────────────── */
function Urbano({ carta, grupos, nombres, color, oscuro, cartel, accion, portadaFallback, tras, resenas }: Props) {
  const c = useCarta(grupos);
  const f = carta.firma ?? {};
  const portada = ambiente(carta, grupos, portadaFallback);
  const t = oscuro
    ? { fondo: '#141009', tarjeta: '#1D1811', tinta: '#FFFFFF', suave: '#A8A29E', linea: 'rgba(255,255,255,.08)', borde: '1px solid rgba(255,255,255,.08)', chip: '#2A241C' }
    : { fondo: '#FFF7EC', tarjeta: '#FFFFFF', tinta: '#141009', suave: '#5B534A', linea: '#141009', borde: '2px solid #141009', chip: '#F3E6D2' };
  const inicial = carta.nombre.trim().charAt(0).toUpperCase();
  return (
    <div className="min-h-screen antialiased" style={{ background: t.fondo, color: t.tinta, '--marca': color } as CSSProperties}>
      <header className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: oscuro ? 'rgba(20,16,9,.88)' : 'rgba(255,247,236,.9)', borderColor: t.linea }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {carta.logoUrl
            ? <img src={carta.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" style={{ boxShadow: `0 0 18px color-mix(in srgb, ${color} 55%, transparent)` }} />
            : <span className={`${cartel} grid h-10 w-10 place-items-center rounded-xl text-2xl text-white`} style={{ background: color, boxShadow: `0 0 18px color-mix(in srgb, ${color} 55%, transparent)` }}>{inicial}</span>}
          <span className="min-w-0 flex-1">
            <span className={`${cartel} block truncate text-xl uppercase leading-none`}>{carta.nombre}</span>
            {carta.horario && <span className="block truncate text-[10px] font-bold uppercase tracking-widest" style={{ color: t.suave }}>{carta.horario}</span>}
          </span>
        </div>
        {!c.resultados && grupos.length > 1 && (
          <nav ref={c.nav} aria-label="Secciones de la carta" className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
            {grupos.map((g) => {
              const on = c.activa === g.id;
              return <a key={g.id} href={`#p-${g.id}`} data-g={g.id} className="shrink-0 rounded-xl px-4 py-2 text-[12px] font-black uppercase tracking-wide transition" style={{ background: on ? color : t.chip, color: on ? '#fff' : t.tinta }}>{g.nombre}</a>;
            })}
          </nav>
        )}
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-5">
        <div className="relative overflow-hidden rounded-[28px] p-7 text-white sm:p-12" style={{ background: `linear-gradient(120deg, ${color}, color-mix(in srgb, ${color} 45%, #FF9F1C))`, boxShadow: `0 24px 60px color-mix(in srgb, ${color} 28%, transparent)` }}>
          <div className="relative z-10 max-w-[62%] sm:max-w-xl">
            <span className="inline-block rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase tracking-widest">{f.lema || 'Recién hecho'}</span>
            <h1 className={`${cartel} mt-4 text-[clamp(40px,10vw,84px)] uppercase leading-[0.9] drop-shadow-lg`}>{carta.nombre}</h1>
            {carta.descripcion && <p className="mt-3 text-[15px] font-bold leading-snug opacity-90 sm:text-lg">{carta.descripcion}</p>}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {accion}
              {resenas && <a href={resenas} target="_blank" rel="noopener" className="rounded-xl bg-black/30 px-4 py-2.5 text-sm font-black uppercase">★ Google</a>}
            </div>
          </div>
          {portada && <img src={portada} alt="" className="absolute -bottom-10 -right-14 h-56 w-56 rotate-[-12deg] rounded-full border-[6px] object-cover sm:-bottom-16 sm:-right-10 sm:h-80 sm:w-80" style={{ borderColor: 'rgba(255,255,255,.35)' }} />}
        </div>
      </section>

      {tras}

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Buscador valor={c.busca} cambiar={c.setBusca} clase="rounded-2xl px-4 py-3" estilo={{ background: t.tarjeta, border: t.borde }} />
        {!c.resultados && c.destacados.length >= 3 && (
          <section className="pt-10">
            <h2 className={`${cartel} flex items-center gap-4 text-3xl uppercase`}>{f.destacados || 'Los que más piden'}<span className="h-1 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} /></h2>
            <ul className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
              {c.destacados.map((p, i) => (
                <li key={p.id} className="w-[58%] shrink-0 snap-start sm:w-[30%]">
                  <FichaPlato plato={p} nombresAlergenos={nombres} className="block">
                    <span className="relative block aspect-square overflow-hidden rounded-3xl">
                      <img src={p.fotoUrl!} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                      <span className={`${cartel} absolute left-3 top-2 text-4xl text-white/90`}>#{i + 1}</span>
                      <span className="absolute inset-x-0 bottom-0 p-3 text-left text-white">
                        <span className="block text-[15px] font-black uppercase leading-tight">{p.nombre}</span>
                        <span className="mt-1 inline-block rounded-lg px-2 py-0.5 text-sm font-black" style={{ background: color }}>{euros(p.precio)}</span>
                      </span>
                    </span>
                  </FichaPlato>
                </li>
              ))}
            </ul>
          </section>
        )}
        {(c.resultados ? [{ id: 'busca', nombre: `${c.resultados.length} resultados`, platos: c.resultados } as SeccionCarta] : grupos).map((g) => (
          <section key={g.id} id={`p-${g.id}`} className="scroll-mt-32 pt-12">
            <h2 className={`${cartel} flex items-center gap-4 text-[34px] uppercase leading-none`}>{g.nombre}<span className="h-1 flex-1 rounded-full" style={{ background: oscuro ? 'linear-gradient(90deg,#3f3a33,transparent)' : 'linear-gradient(90deg,#141009,transparent)' }} /></h2>
            {g.descripcion && <p className="mt-2 text-sm font-semibold" style={{ color: t.suave }}>{g.descripcion}</p>}
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.platos.map((p) => (
                <li key={p.id}>
                  <FichaPlato plato={p} nombresAlergenos={nombres} className="block h-full">
                    <span className="flex h-full flex-col overflow-hidden rounded-3xl text-left transition hover:-translate-y-0.5" style={{ background: t.tarjeta, border: t.borde }}>
                      {p.fotoUrl && (
                        <span className="relative block aspect-[4/3] overflow-hidden bg-black">
                          <img src={p.fotoUrl} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-110" />
                          {p.etiqueta && <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase text-white" style={{ background: color }}>{p.etiqueta === 'nuevo' ? 'Nuevo' : p.etiqueta === 'especial' ? 'Especial' : 'Top'}</span>}
                          <span className="absolute bottom-3 right-3 rounded-xl border border-white/10 bg-black/80 px-3 py-1.5 text-lg font-black text-white backdrop-blur"><PrecioAnterior plato={p} />{euros(p.precio)}</span>
                        </span>
                      )}
                      <span className="flex flex-1 flex-col p-5">
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-lg font-black uppercase leading-tight tracking-tight">{!p.fotoUrl && <EtiquetaPlato plato={p} />}{p.nombre}</span>
                          {!p.fotoUrl && <span className="shrink-0 text-lg font-black tabular-nums" style={{ color }}><PrecioAnterior plato={p} />{euros(p.precio)}</span>}
                        </span>
                        <ComboPlato plato={p} />
                        {p.descripcion && <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed" style={{ color: t.suave }}>{p.descripcion}</span>}
                        <Alergenos plato={p} nombres={nombres} clase="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase" estilo={{ background: t.chip }} />
                      </span>
                    </span>
                  </FichaPlato>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!c.resultados && f.nota && (
          <figure className="mt-14 rounded-[28px] p-8 text-center sm:p-12" style={{ background: t.tarjeta, border: t.borde }}>
            <blockquote className={`${cartel} mx-auto max-w-2xl text-[clamp(26px,5vw,40px)] uppercase leading-[1.05]`}>«{f.nota}»</blockquote>
            {f.autor && <figcaption className="mt-4 text-xs font-black uppercase tracking-widest" style={{ color }}>{f.autor}</figcaption>}
          </figure>
        )}
      </main>
    </div>
  );
}
