import Link from 'next/link';
import type { ReactNode } from 'react';
import { moverFaseAction } from '@/app/admin-dkitchen/servicios/tablero-actions';

/**
 * Tablero de servicio (decisión 8 de karc0, 01/11): columnas con tarjetas visuales (logo o foto,
 * barra de progreso, fecha clave), contador por fase y cambio de fase con BOTÓN (sin arrastrar: móvil).
 * 02/11 (responsividad): carril horizontal con columnas de ancho fijo (nunca se aplastan); en móvil y
 * tableta, fila de fases con su contador que lleva a cada columna de un toque; en escritorio ancho,
 * las columnas se reparten el espacio y, si no caben, el carril se desplaza.
 */
export type Columna = { clave: string; nombre: string; fases: string[]; destino?: string };
export type Tarjeta = {
  id: string; titulo: string; sub?: string | null; fase: string; fecha?: string | null; vencido?: boolean;
  href?: string; foto?: string | null; importe?: string | null; etiqueta?: string | null;
  /** Acción propia de la tarjeta (p. ej. abrir la venta del evento). */
  extra?: ReactNode;
  /** 'proyecto' = botón «Pasar a …» con dk.admin_proyecto_fase; 'ninguno' = sin botón. */
  moverCon?: 'proyecto' | 'ninguno';
};

const dia = (s: string) => new Date(s + (s.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short' });
const sinPrueba = (t: string) => t.replace(/^PRUEBA\s*·\s*/i, '');
const iniciales = (t: string) => sinPrueba(t).split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '·';

export default function Tablero({ columnas, tarjetas, volver, resaltar }: { columnas: Columna[]; tarjetas: Tarjeta[]; volver: string; resaltar?: string }) {
  const indice = (fase: string) => columnas.findIndex((c) => c.fases.includes(fase));
  const porColumna = columnas.map((_, ci) => tarjetas.filter((t) => indice(t.fase) === ci));
  const idCol = (clave: string) => `fase-${volver.split('/').pop()}-${clave}`;
  return (
    <div data-testid="tablero">
      {/* Móvil y tableta: todas las fases a la vista, con su contador; un toque lleva a la columna. */}
      <nav aria-label="Fases" className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden">
        {columnas.map((col, ci) => (
          <a key={col.clave} href={`#${idCol(col.clave)}`}
            className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition ${porColumna[ci].length ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white text-niebla'}`}>
            <span className="whitespace-nowrap">{col.nombre}</span>
            <span className={`cv-cifra grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] ${porColumna[ci].length ? 'bg-oro text-tinta' : 'bg-papel text-niebla'}`}>{porColumna[ci].length}</span>
          </a>
        ))}
      </nav>
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0">
        {columnas.map((col, ci) => {
          const suyas = porColumna[ci];
          const siguiente = columnas[ci + 1];
          const prog = Math.round(((ci + 1) / columnas.length) * 100);
          return (
            <section key={col.clave} id={idCol(col.clave)}
              className="dk-col flex w-[min(84vw,330px)] shrink-0 snap-start scroll-mt-24 flex-col rounded-[22px] border border-linea bg-papel/60 p-2.5 sm:w-[300px] lg:w-auto lg:min-w-[232px] lg:flex-1 lg:basis-0"
              data-testid={`col-${col.clave}`}>
              <header className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-1">
                <h3 className="min-w-0 font-display text-xs font-bold uppercase tracking-[0.12em] text-tinta">{col.nombre}</h3>
                <span className="cv-cifra grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-tinta px-2 text-xs font-bold text-white">{suyas.length}</span>
              </header>
              <div className="space-y-2.5">
                {suyas.length === 0 && <p className="rounded-2xl border border-dashed border-linea-fuerte px-3 py-6 text-center text-xs text-niebla">Nada en esta fase</p>}
                {suyas.map((t, i) => (
                  <article key={t.id} style={{ ['--i' as string]: i }} className={`dk-carta rounded-[18px] border bg-white p-3 shadow-[0_10px_30px_-22px_rgba(62,5,21,.5)] ${resaltar === t.id ? 'border-vino ring-2 ring-vino/20' : 'border-linea'}`} data-testid="tarjeta">
                    <div className="flex items-start gap-3">
                      {t.foto
                        ? <img src={t.foto} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                        : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-vino font-display text-sm font-bold text-oro">{iniciales(t.titulo)}</span>}
                      <div className="min-w-0 flex-1">
                        {t.etiqueta && <span className="mb-1 inline-block rounded-full bg-oro/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tinta">{t.etiqueta}</span>}
                        {t.href ? <Link href={t.href} className="line-clamp-2 break-words font-display text-[15px] font-bold leading-tight hover:text-vino">{t.etiqueta ? sinPrueba(t.titulo) : t.titulo}</Link>
                          : <b className="line-clamp-2 break-words font-display text-[15px] leading-tight">{t.etiqueta ? sinPrueba(t.titulo) : t.titulo}</b>}
                        {t.sub && <p className="mt-0.5 line-clamp-2 text-xs text-niebla">{t.sub}</p>}
                      </div>
                    </div>
                    <div className="dk-barra-prog mt-3 h-1.5 overflow-hidden rounded-full bg-linea"><span style={{ width: `${prog}%` }} /></div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className={t.vencido ? 'font-bold text-red-700' : 'text-niebla'}>{t.fecha ? `${t.vencido ? '⚠ ' : ''}${dia(t.fecha)}` : '—'}</span>
                      {t.importe && <span className="font-semibold tabular-nums">{t.importe}</span>}
                    </div>
                    {t.extra}
                    {siguiente && t.moverCon !== 'ninguno' && (
                      <form action={moverFaseAction} className="mt-2.5">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="fase" value={siguiente.destino ?? siguiente.fases[0]} />
                        <input type="hidden" name="volver" value={volver} />
                        <button className="dk-btn min-h-[44px] w-full rounded-full bg-tinta px-3 text-xs font-bold text-white transition hover:bg-vino" data-testid="mover">
                          Pasar a {siguiente.nombre} →
                        </button>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
