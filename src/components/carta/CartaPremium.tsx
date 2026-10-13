'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Carta, PlatoCarta, SeccionCarta } from '@/lib/menu';
import FichaPlato from '@/components/carta/FichaPlato';
import { EtiquetaPlato, PrecioAnterior, ComboPlato } from '@/components/carta/ExtrasPlato';

/**
 * CARTA PREMIUM (12/10/2026, karc0; subida a nivel «de autor» el 13/10).
 * Es la carta de TODOS los locales del QR: sustituye a las plantillas antiguas
 * y a la Carta de Autor de pago. Lenguaje de carta impresa de restaurante
 * (Cormorant, versalitas espaciadas, secciones numeradas en romanos, filete
 * de puntos hasta el precio, foto protagonista por sección) con lo que una
 * carta impresa no tiene: buscador, «Sorpréndeme», categorías fijas al bajar,
 * «De la casa» y fichas que se abren.
 *
 * Dos composiciones, elegidas por la plantilla que guardó el local:
 *  - autor: lista editorial con filete de puntos; la foto, una por sección.
 *  - foto:  la foto de cada plato vende (brunch, hamburguesas, gastro).
 * Tema Noir (fondo oscuro) o Crema (papel), con el color de la marca de acento.
 */

export type VariantePremium = 'autor' | 'foto';
type Tema = { fondo: string; superficie: string; tinta: string; suave: string; tenue: string; linea: string; vidrio: string; precio: string; oro: string };
const TEMAS: Record<'noir' | 'crema', Tema> = {
  noir: { fondo: '#0B0A09', superficie: '#15130F', tinta: '#F4EEE4', suave: 'rgba(244,238,228,.64)', tenue: 'rgba(244,238,228,.42)', linea: 'rgba(244,238,228,.12)', vidrio: 'rgba(11,10,9,.78)', precio: '#F2C14E', oro: '#F2C14E' },
  crema: { fondo: '#F7F3EA', superficie: '#FFFDF8', tinta: '#221D17', suave: 'rgba(34,29,23,.62)', tenue: 'rgba(34,29,23,.42)', linea: 'rgba(34,29,23,.14)', vidrio: 'rgba(247,243,234,.86)', precio: '#221D17', oro: '#A8782A' },
};

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const versalitas = 'text-[11px] font-medium uppercase tracking-[0.28em]';
const euros = (p: string) => `${Number(p).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CartaPremium({
  carta, grupos, nombres, color, oscuro, serifClase, accion, portadaFallback, tras, variante = 'autor',
}: {
  carta: Carta; grupos: SeccionCarta[]; nombres: Record<string, string>; color: string; oscuro: boolean;
  serifClase: string; accion: ReactNode; portadaFallback: string | null;
  /** Lo que va justo después de la portada (idiomas, banners, aviso de respaldo). */
  tras?: ReactNode;
  variante?: VariantePremium;
}) {
  const t = oscuro ? TEMAS.noir : TEMAS.crema;
  const [busca, setBusca] = useState('');
  const [activa, setActiva] = useState(grupos[0]?.id ?? '');
  const [brillo, setBrillo] = useState<string | null>(null);
  const pastillas = useRef<HTMLDivElement>(null);
  const portada = carta.portadaUrl || portadaFallback;
  const todos = useMemo(() => grupos.flatMap((g) => g.platos), [grupos]);

  // «De la casa»: primero lo marcado como recomendado/especial; si no hay, los primeros con foto.
  const destacados = useMemo(() => {
    const marcados = todos.filter((p) => p.etiqueta === 'recomendado' || p.etiqueta === 'especial');
    const base = marcados.length >= 3 ? marcados : [...marcados, ...todos.filter((p) => p.fotoUrl && !marcados.includes(p))];
    return base.filter((p) => p.fotoUrl).slice(0, 8);
  }, [todos]);

  const resultados = useMemo(() => {
    const q = normal(busca.trim());
    if (q.length < 2) return null;
    return todos.filter((p) => normal(`${p.nombre} ${p.descripcion ?? ''}`).includes(q));
  }, [busca, todos]);

  // Categoría activa al hacer scroll.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.isIntersecting && setActiva(e.target.id.replace('p-', ''))),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    grupos.forEach((g) => { const el = document.getElementById(`p-${g.id}`); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [grupos]);

  useEffect(() => {
    const b = pastillas.current?.querySelector<HTMLElement>(`[data-g="${activa}"]`);
    b?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activa]);

  function sorprendeme() {
    const conFoto = todos.filter((p) => p.fotoUrl);
    const lista = conFoto.length ? conFoto : todos;
    const p = lista[Math.floor(Math.random() * lista.length)];
    if (!p) return;
    setBusca('');
    setTimeout(() => {
      document.getElementById(`plato-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setBrillo(p.id);
      setTimeout(() => setBrillo(null), 2200);
    }, 50);
  }

  const vars = { '--marca': color, background: t.fondo, color: t.tinta } as CSSProperties;
  const anillo = (id: string) => ({ className: `rounded-[22px] transition duration-500 ${brillo === id ? 'ring-2 ring-offset-4' : ''}`, style: { ['--tw-ring-color' as string]: color, ['--tw-ring-offset-color' as string]: t.fondo } });

  return (
    <div style={vars} className="min-h-screen antialiased">
      {/* Portada: a sangre, nombre centrado como en una carta impresa */}
      <header className={`relative w-full overflow-hidden ${carta.portadaConNombre ? 'aspect-[4/3] min-h-[300px] max-h-[560px]' : 'h-[78vh] min-h-[480px] max-h-[760px]'}`}
        style={{ background: portada ? '#15120f' : `linear-gradient(160deg, color-mix(in srgb, ${color} 70%, #0B0A09), ${color})` }}>
        {/* Si la portada ya lleva el nombre escrito (cartel, rótulo), se ve entera: contain sobre la misma foto desenfocada. */}
        {portada && carta.portadaConNombre && <img src={portada} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl" />}
        {portada && <img src={portada} alt="" className={`absolute inset-0 h-full w-full ${carta.portadaConNombre ? 'object-contain object-top' : 'object-cover'} motion-safe:animate-[dkzoom_18s_ease-out_both]`} />}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,.5) 0%, rgba(0,0,0,.08) 30%, rgba(0,0,0,.35) 62%, ${t.fondo} 100%)` }} />
        <div className="absolute inset-0 shadow-[inset_0_0_160px_rgba(0,0,0,.45)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
          {carta.logoUrl ? (
            <img src={carta.logoUrl} alt={carta.nombre} className="h-12 w-12 rounded-full bg-black/30 object-cover ring-1 ring-white/40" />
          ) : <span />}
          {carta.horario && (
            <span className="flex max-w-[62%] items-center gap-2 truncate rounded-full border border-white/20 bg-black/40 px-3.5 py-2 text-[12px] text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="truncate">{carta.horario}</span>
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl px-6 pb-10 text-center text-white">
          <p className={`${versalitas} text-white/75`}>La carta</p>
          {!carta.portadaConNombre && (
            <h1 className={`${serifClase} mx-auto mt-3 max-w-2xl text-[clamp(46px,13vw,92px)] font-medium leading-[0.98]`}>{carta.nombre}</h1>
          )}
          <div className="mx-auto mt-5 flex items-center justify-center gap-3" aria-hidden="true">
            <span className="h-px w-10 bg-white/50" /><span className="h-1.5 w-1.5 rotate-45" style={{ background: t.oro }} /><span className="h-px w-10 bg-white/50" />
          </div>
          {carta.descripcion && <p className={`${serifClase} mx-auto mt-4 max-w-md text-xl italic leading-snug text-white/85`}>{carta.descripcion}</p>}
          <div className="mt-6 flex justify-center">{accion}</div>
        </div>
      </header>

      {tras}

      {/* Herramientas + categorías fijas */}
      <div className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: t.vidrio, borderColor: t.linea }}>
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <div className="flex gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-full border px-4 py-2.5" style={{ borderColor: t.linea, background: t.superficie }}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-55" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar un plato" aria-label="Buscar en la carta"
                className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-60" style={{ color: t.tinta }} />
            </label>
            <button type="button" onClick={sorprendeme} className={`${serifClase} flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-[16px] italic`}
              style={{ borderColor: t.linea, color: t.tinta, background: t.superficie }}>
              <span aria-hidden="true" style={{ color: t.oro }}>✦</span> Sorpréndeme
            </button>
          </div>
          {!resultados && grupos.length > 1 && (
            <nav ref={pastillas} aria-label="Secciones de la carta" className="-mx-4 mt-2 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
              {grupos.map((g, i) => {
                const on = activa === g.id;
                return (
                  <a key={g.id} href={`#p-${g.id}`} data-g={g.id}
                    className={`${versalitas} shrink-0 border-b-2 px-3 py-3 transition`}
                    style={{ borderColor: on ? color : 'transparent', color: on ? t.tinta : t.tenue }}>
                    <span className="mr-1.5 opacity-60">{ROMANOS[i] ?? i + 1}</span>{g.nombre}
                  </a>
                );
              })}
            </nav>
          )}
          {resultados && <div className="h-3" />}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 pb-10">
        {resultados ? (
          <section className="pt-8">
            <p className={`${versalitas}`} style={{ color: t.tenue }}>{resultados.length} {resultados.length === 1 ? 'plato' : 'platos'} · «{busca.trim()}»</p>
            <ul className="mt-6 space-y-7">
              {resultados.map((p) => <li key={p.id}><PlatoLista plato={p} t={t} serif={serifClase} nombres={nombres} foto /></li>)}
            </ul>
            {resultados.length === 0 && <p className={`${serifClase} py-16 text-center text-2xl italic`} style={{ color: t.suave }}>No lo encontramos. Prueba con otra palabra.</p>}
          </section>
        ) : grupos.length === 0 ? (
          <p className={`${serifClase} py-24 text-center text-2xl italic`} style={{ color: t.suave }}>Muy pronto, nuestra carta.</p>
        ) : (
          <>
            {destacados.length >= 3 && (
              <section className="pt-14">
                <div className="text-center">
                  <p className={versalitas} style={{ color }}>Recomendados</p>
                  <h2 className={`${serifClase} mt-2 text-4xl font-medium sm:text-5xl`}>De la casa</h2>
                  <div className="mx-auto mt-5 h-px w-12" style={{ background: color }} />
                </div>
                <ul className="-mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
                  {destacados.map((p, i) => (
                    <li key={p.id} className="w-[70%] shrink-0 snap-center sm:w-[42%]">
                      <FichaPlato plato={p} nombresAlergenos={nombres} className="block">
                        <span className="relative block aspect-[4/5] overflow-hidden rounded-[22px]" style={{ background: t.superficie }}>
                          <img src={p.fotoUrl!} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" />
                          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
                          <span className={`${serifClase} absolute left-4 top-3 text-lg italic text-white/85`}>{ROMANOS[i]}</span>
                          <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                            <span className={`${serifClase} block text-[25px] font-medium leading-[1.05]`}>{p.nombre}</span>
                            <span className={`${serifClase} mt-1 block text-[19px] tabular-nums`} style={{ color: '#F2C14E' }}>{euros(p.precio)}</span>
                          </span>
                        </span>
                      </FichaPlato>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {grupos.map((g, i) => {
              const destacado = g.platos.find((p) => p.fotoUrl && p.fotoUrl !== portada) ?? null;
              const lista = variante === 'foto' && destacado ? g.platos.filter((p) => p.id !== destacado.id) : g.platos;
              return (
                <section key={g.id} id={`p-${g.id}`} className="scroll-mt-32 pt-20">
                  <div className="text-center">
                    <p className={versalitas} style={{ color }}>{ROMANOS[i] ?? i + 1}</p>
                    <h2 className={`${serifClase} mt-2 text-[42px] font-medium leading-none sm:text-5xl`}>{g.nombre}</h2>
                    <div className="mx-auto mt-5 h-px w-12" style={{ background: color }} />
                    {g.descripcion && <p className={`${serifClase} mx-auto mt-4 max-w-md text-lg italic leading-snug`} style={{ color: t.suave }}>{g.descripcion}</p>}
                  </div>

                  {destacado && variante === 'autor' && (
                    <figure className="mt-10">
                      <FichaPlato plato={destacado} nombresAlergenos={nombres} className="block">
                        <span className="block overflow-hidden rounded-[4px]">
                          <img src={destacado.fotoUrl!} alt={destacado.nombre} loading="lazy" className="aspect-[3/2] w-full object-cover transition duration-700 hover:scale-[1.03]" />
                        </span>
                      </FichaPlato>
                      <figcaption className={`${serifClase} mt-2.5 text-center text-base italic`} style={{ color: t.tenue }}>{destacado.nombre}</figcaption>
                    </figure>
                  )}

                  {destacado && variante === 'foto' && (
                    <div id={`plato-${destacado.id}`} {...anillo(destacado.id)} className={`mt-10 ${anillo(destacado.id).className}`}>
                      <FichaPlato plato={destacado} nombresAlergenos={nombres} className="block">
                        <span className="relative block h-[440px] overflow-hidden rounded-[22px]">
                          <img src={destacado.fotoUrl!} alt={destacado.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" />
                          <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
                          <span className="absolute inset-x-0 bottom-0 p-6 text-white">
                            {destacado.etiqueta && <span className={`${versalitas} mb-2 block text-white/75`}>{destacado.etiqueta === 'especial' ? 'Especial' : destacado.etiqueta === 'nuevo' ? 'Novedad' : 'De la casa'}</span>}
                            <span className={`${serifClase} block text-[34px] font-medium leading-[1.02]`}>{destacado.nombre}</span>
                            {destacado.descripcion && <span className={`${serifClase} mt-1.5 line-clamp-2 block text-[17px] italic text-white/80`}>{destacado.descripcion}</span>}
                            <span className={`${serifClase} mt-3 block text-[22px] tabular-nums`} style={{ color: '#F2C14E' }}><PrecioAnterior plato={destacado} />{euros(destacado.precio)}</span>
                          </span>
                        </span>
                      </FichaPlato>
                    </div>
                  )}

                  <ul className="mt-10 space-y-7">
                    {lista.map((p) => (
                      <li key={p.id} id={`plato-${p.id}`} {...anillo(p.id)}>
                        <PlatoLista plato={p} t={t} serif={serifClase} nombres={nombres} foto={variante === 'foto' || (!!p.fotoUrl && p.id !== destacado?.id)} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </>
        )}
      </div>
      <style>{'@keyframes dkzoom{from{transform:scale(1.08)}to{transform:scale(1)}}'}</style>
    </div>
  );
}

/** Plato en lista: nombre en serif, filete de puntos hasta el precio, descripción en cursiva y alérgenos en versalitas. */
function PlatoLista({ plato, t, serif, nombres, foto }: { plato: PlatoCarta; t: Tema; serif: string; nombres: Record<string, string>; foto: boolean }) {
  return (
    <FichaPlato plato={plato} nombresAlergenos={nombres} className="block">
      <span className="flex gap-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-3">
            <span className={`${serif} text-[22px] font-semibold leading-tight`}><EtiquetaPlato plato={plato} />{plato.nombre}</span>
            <span aria-hidden="true" className="min-w-6 flex-1 translate-y-[-4px] border-b border-dotted" style={{ borderColor: t.linea.replace(/[\d.]+\)$/, '.38)') }} />
            <span className={`${serif} whitespace-nowrap text-[21px] font-semibold tabular-nums`} style={{ color: t.precio }}><PrecioAnterior plato={plato} />{euros(plato.precio)}</span>
          </span>
          <ComboPlato plato={plato} />
          {plato.descripcion && <span className={`${serif} mt-1 block text-[17px] italic leading-snug`} style={{ color: t.suave }}>{plato.descripcion}</span>}
          {plato.alergenos.length > 0 && (
            <span className="mt-1.5 block text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: t.tenue }}>
              <span className="sr-only">Alérgenos: </span>{plato.alergenos.map((a) => nombres[a] ?? a).join(' · ')}
            </span>
          )}
        </span>
        {foto && plato.fotoUrl && <img src={plato.fotoUrl} alt="" loading="lazy" className="mt-1 h-[76px] w-[76px] shrink-0 rounded-full object-cover" />}
      </span>
    </FichaPlato>
  );
}
