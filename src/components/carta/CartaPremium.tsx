'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Carta, PlatoCarta, SeccionCarta } from '@/lib/menu';
import FichaPlato from '@/components/carta/FichaPlato';
import { EtiquetaPlato, PrecioAnterior, ComboPlato } from '@/components/carta/ExtrasPlato';

/**
 * CARTA PREMIUM (12/10/2026, karc0): estilo incluido en todos los planes que
 * sustituye a la Carta de Autor de pago. Objetivo: superar en nivel visual a
 * las cartas «premium» de la competencia (Vitrina Viva) sin perder lo que ellas
 * no tienen (reservas, llamada al camarero, idiomas, banners, alérgenos UE).
 * Portada a sangre, buscador, «Sorpréndeme», categorías fijas al hacer scroll,
 * «Los que más salen» y fichas grandes. Tema Noir (oscuro) o Crema (claro),
 * con el color de la marca como acento.
 */

type Tema = { fondo: string; superficie: string; tinta: string; suave: string; linea: string; vidrio: string };
const TEMAS: Record<'noir' | 'crema', Tema> = {
  noir: { fondo: '#0B0A09', superficie: '#16140F', tinta: '#F4EEE4', suave: 'rgba(244,238,228,.62)', linea: 'rgba(255,255,255,.09)', vidrio: 'rgba(22,20,15,.72)' },
  crema: { fondo: '#F8F3EA', superficie: '#FFFFFF', tinta: '#1F1A15', suave: 'rgba(31,26,21,.6)', linea: 'rgba(31,26,21,.1)', vidrio: 'rgba(255,253,248,.82)' },
};

const euros = (p: string) => `${Number(p).toLocaleString('es-ES', { minimumFractionDigits: Number(p) % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CartaPremium({
  carta, grupos, nombres, color, oscuro, serifClase, accion, portadaFallback, tras,
}: {
  carta: Carta; grupos: SeccionCarta[]; nombres: Record<string, string>; color: string; oscuro: boolean;
  serifClase: string; accion: ReactNode; portadaFallback: string | null;
  /** Lo que va justo después de la portada (idiomas, banners, aviso de respaldo). */
  tras?: ReactNode;
}) {
  const t = oscuro ? TEMAS.noir : TEMAS.crema;
  const [busca, setBusca] = useState('');
  const [activa, setActiva] = useState(grupos[0]?.id ?? '');
  const [brillo, setBrillo] = useState<string | null>(null);
  const pastillas = useRef<HTMLDivElement>(null);
  const portada = carta.portadaUrl || portadaFallback;
  const todos = useMemo(() => grupos.flatMap((g) => g.platos), [grupos]);

  // «Los que más salen»: primero lo marcado como recomendado/especial; si no hay, los primeros con foto.
  const destacados = useMemo(() => {
    const marcados = todos.filter((p) => p.etiqueta === 'recomendado' || p.etiqueta === 'especial');
    const base = marcados.length >= 3 ? marcados : [...marcados, ...todos.filter((p) => p.fotoUrl && !marcados.includes(p))];
    return base.slice(0, 8);
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

  return (
    <div style={vars} className="min-h-screen">
      {/* Portada a sangre */}
      <header className="relative h-[68vh] min-h-[440px] max-h-[720px] w-full overflow-hidden" style={{ background: '#15120f' }}>
        {portada && <img src={portada} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.05) 35%, rgba(0,0,0,.25) 60%, ${t.fondo} 100%)` }} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-5">
          {carta.logoUrl ? (
            <img src={carta.logoUrl} alt={carta.nombre} className="h-12 w-12 rounded-full border border-white/30 bg-black/40 object-cover backdrop-blur" />
          ) : (
            <span className={`${serifClase} grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/40 text-xl text-white backdrop-blur`}>{carta.nombre.charAt(0)}</span>
          )}
          {carta.horario && (
            <span className="flex max-w-[65%] items-center gap-2 truncate rounded-full border border-white/20 bg-black/45 px-3.5 py-2 text-[13px] text-white backdrop-blur">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="truncate">{carta.horario}</span>
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl px-5 pb-8">
          <span className="inline-block rounded-full border border-white/25 bg-black/40 px-3.5 py-1.5 font-mono text-[12px] uppercase tracking-[0.25em] text-white backdrop-blur">Carta digital</span>
          {!carta.portadaConNombre && (
            <h1 className={`${serifClase} mt-4 text-[clamp(44px,13vw,84px)] font-medium leading-[0.95] text-white`}>{carta.nombre}</h1>
          )}
          {carta.descripcion && <p className={`${serifClase} mt-2 text-xl italic text-white/80`}>{carta.descripcion}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {carta.direccion && <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[13px] text-white/85 backdrop-blur">📍 {carta.direccion}</span>}
            {carta.instagram && (
              <a href={`https://instagram.com/${carta.instagram.replace('@', '')}`} target="_blank" rel="noopener" className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[13px] text-white/85 backdrop-blur">
                @{carta.instagram.replace('@', '')}
              </a>
            )}
          </div>
          <div className="mt-5">{accion}</div>
        </div>
      </header>

      {tras}

      {/* Herramientas + categorías fijas */}
      <div className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: t.vidrio, borderColor: t.linea }}>
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <div className="flex gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-full border px-4 py-2.5" style={{ borderColor: t.linea, background: t.superficie }}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar en la carta" aria-label="Buscar en la carta"
                className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-60" style={{ color: t.tinta }} />
            </label>
            <button type="button" onClick={sorprendeme} className="flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-[14px] font-medium"
              style={{ borderColor: color, color: oscuro ? '#fff' : color, background: `${color}22` }}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" /><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" /><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" /></svg>
              Sorpréndeme
            </button>
          </div>
          {!resultados && grupos.length > 1 && (
            <div ref={pastillas} className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
              {grupos.map((g) => {
                const on = activa === g.id;
                return (
                  <a key={g.id} href={`#p-${g.id}`} data-g={g.id}
                    className="shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition"
                    style={on ? { background: color, color: '#fff', boxShadow: `0 8px 24px -8px ${color}` } : { color: t.suave }}>
                    {g.nombre}
                  </a>
                );
              })}
            </div>
          )}
          {resultados && <div className="h-3" />}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-10">
        {resultados ? (
          <section className="pt-6">
            <p className="px-1 text-sm" style={{ color: t.suave }}>{resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'} para «{busca.trim()}»</p>
            <ul className="mt-4 space-y-3">
              {resultados.map((p) => <li key={p.id}><Fila plato={p} t={t} color={color} serif={serifClase} nombres={nombres} brillo={false} /></li>)}
            </ul>
          </section>
        ) : (
          <>
            {destacados.length >= 3 && (
              <section className="pt-8">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className={`${serifClase} text-[34px] font-medium leading-none`}>Los que más salen</h2>
                  <span className="font-mono text-sm" style={{ color: t.suave }}>{String(destacados.length).padStart(2, '0')}</span>
                </div>
                <ul className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
                  {destacados.map((p, i) => (
                    <li key={p.id} className="w-[72%] shrink-0 snap-start sm:w-[44%]">
                      <FichaPlato plato={p} nombresAlergenos={nombres} className="block">
                        <span className="relative block aspect-[4/5] overflow-hidden rounded-[26px]" style={{ background: t.superficie }}>
                          {p.fotoUrl && <img src={p.fotoUrl} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">{String(i + 1).padStart(2, '0')}</span>
                          <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                            <span className={`${serifClase} block text-[24px] leading-tight`}>{p.nombre}</span>
                            <span className="mt-1 block font-mono text-[15px]" style={{ color: '#F2C14E' }}>{euros(p.precio)}</span>
                          </span>
                        </span>
                      </FichaPlato>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {grupos.map((g) => {
              const [primero, ...resto] = g.platos.filter(Boolean);
              const portadaSeccion = primero?.fotoUrl ? primero : null;
              const lista = portadaSeccion ? resto : g.platos;
              return (
                <section key={g.id} id={`p-${g.id}`} className="scroll-mt-36 pt-12">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className={`${serifClase} text-[40px] font-medium leading-none`}>{g.nombre}</h2>
                    <span className="font-mono text-sm" style={{ color: t.suave }}>{String(g.platos.length).padStart(2, '0')}</span>
                  </div>
                  {g.descripcion && <p className="mt-2 px-1 text-[15px]" style={{ color: t.suave }}>{g.descripcion}</p>}
                  {portadaSeccion && (
                    <div id={`plato-${portadaSeccion.id}`} className={`mt-5 rounded-[28px] transition ${brillo === portadaSeccion.id ? 'ring-4' : ''}`} style={{ ['--tw-ring-color' as string]: color }}>
                      <FichaPlato plato={portadaSeccion} nombresAlergenos={nombres} className="block">
                        <span className="relative block h-[420px] overflow-hidden rounded-[28px]">
                          <img src={portadaSeccion.fotoUrl!} alt={portadaSeccion.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                          <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                          <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                            {portadaSeccion.etiqueta && <span className="mb-2 inline-block rounded-full border border-white/30 bg-black/40 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em]">{portadaSeccion.etiqueta === 'especial' ? 'Especial' : portadaSeccion.etiqueta === 'nuevo' ? 'Nuevo' : 'De la casa'}</span>}
                            <span className={`${serifClase} block text-[32px] leading-[1.02]`}>{portadaSeccion.nombre}</span>
                            {portadaSeccion.descripcion && <span className="mt-1.5 line-clamp-1 block text-[15px] text-white/80">{portadaSeccion.descripcion}</span>}
                            <span className="mt-2 flex items-center justify-between">
                              <span className="font-mono text-[18px]" style={{ color: '#F2C14E' }}><PrecioAnterior plato={portadaSeccion} />{euros(portadaSeccion.precio)}</span>
                              <span className="grid h-11 w-11 place-items-center rounded-full text-2xl text-black" style={{ background: '#F2C14E' }} aria-hidden="true">+</span>
                            </span>
                          </span>
                        </span>
                      </FichaPlato>
                    </div>
                  )}
                  <ul className="mt-3 space-y-3">
                    {lista.map((p) => <li key={p.id} id={`plato-${p.id}`}><Fila plato={p} t={t} color={color} serif={serifClase} nombres={nombres} brillo={brillo === p.id} /></li>)}
                  </ul>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function Fila({ plato, t, color, serif, nombres, brillo }: { plato: PlatoCarta; t: Tema; color: string; serif: string; nombres: Record<string, string>; brillo: boolean }) {
  return (
    <div className={`rounded-[24px] transition ${brillo ? 'ring-4' : ''}`} style={{ ['--tw-ring-color' as string]: color }}>
      <FichaPlato plato={plato} nombresAlergenos={nombres} className="block">
        <span className="flex gap-4 rounded-[24px] border p-3.5" style={{ background: t.superficie, borderColor: t.linea }}>
          {plato.fotoUrl && <img src={plato.fotoUrl} alt={plato.nombre} loading="lazy" className="h-[104px] w-[104px] shrink-0 rounded-[18px] object-cover" />}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`${serif} text-[22px] leading-[1.1]`}><EtiquetaPlato plato={plato} />{plato.nombre}</span>
            {plato.descripcion && <span className="mt-1 line-clamp-2 text-[14px] leading-snug" style={{ color: t.suave }}>{plato.descripcion}</span>}
            <ComboPlato plato={plato} />
            <span className="mt-auto flex items-end justify-between gap-2 pt-2">
              <span className="font-mono text-[17px]" style={{ color }}><PrecioAnterior plato={plato} />{euros(plato.precio)}</span>
              {plato.alergenos.length > 0 && (
                <span className="flex flex-wrap justify-end gap-1">
                  {plato.alergenos.slice(0, 5).map((a) => (
                    <span key={a} title={nombres[a]} className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: t.linea, color: t.suave }}>{a}</span>
                  ))}
                </span>
              )}
            </span>
          </span>
        </span>
      </FichaPlato>
    </div>
  );
}
