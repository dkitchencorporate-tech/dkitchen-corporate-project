import Link from 'next/link';
import type { Calor } from '@/lib/mapa-web';

/**
 * Calor y temperatura de la web (E3, 0107): lo que hacen de verdad los visitantes que aceptan la medición.
 * Temperatura = visitas de la página respecto a la más vista (de azul frío a vino caliente); al lado,
 * tiempo medio, % de visitas que terminan ahí (salida) y los clics más repetidos con su zona.
 */
const PERIODOS = [7, 30, 90];

function color(t: number) {
  // Frío (#5B7FA6) → oro → vino, en tres tramos.
  if (t < 0.34) return '#5B7FA6';
  if (t < 0.67) return '#C9A24B';
  return '#8E2C48';
}
const tiempo = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)}′ ${String(s % 60).padStart(2, '0')}″`);

export default function CalorWeb({ calor, dias, recorrido }: { calor: Calor; dias: number; recorrido: string | null }) {
  const porRuta = new Map<string, Calor['clics']>();
  for (const k of calor.clics) (porRuta.get(k.ruta) ?? porRuta.set(k.ruta, []).get(k.ruta)!).push(k);
  const q = (d: number) => `?${new URLSearchParams({ ...(recorrido ? { r: recorrido } : {}), d: String(d) })}#calor`;

  return (
    <section id="calor" className="rounded-[28px] bg-noche p-5 text-white sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oro">E3 · Calor</p>
          <h2 className="font-display mt-1 text-2xl font-semibold">Qué hacen de verdad los visitantes</h2>
          <p className="mt-1 text-sm text-white/55">{calor.visitas} páginas vistas desde el {new Date(calor.desde).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}. Solo cuenta a quien pulsa «Aceptar» en las cookies; sin datos personales.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-white/10 p-1 text-sm">
          {PERIODOS.map((d) => (
            <Link key={d} href={q(d)} scroll={false} className={`rounded-full px-4 py-1.5 ${d === dias ? 'bg-vino font-semibold' : 'text-white/60 hover:text-white'}`}>{d} días</Link>
          ))}
        </div>
      </div>

      {calor.paginas.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/60">Aún no hay medidas en este periodo. Llegan en cuanto los visitantes acepten las cookies y naveguen.</p>
      ) : (
        <ol className="mt-6 space-y-2">
          {calor.paginas.slice(0, 60).map((p) => (
            <li key={p.ruta} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color(p.temp), boxShadow: `0 0 ${6 + p.temp * 18}px ${color(p.temp)}` }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{p.ruta}</span>
                <span className="text-sm tabular-nums"><b>{p.visitas}</b> <span className="text-white/50">visitas</span></span>
                <span className="text-sm tabular-nums text-white/70">{tiempo(p.seg_medio)}</span>
                <span className={`text-sm tabular-nums ${p.salida_pct >= 60 ? 'text-[#FFB3C3]' : 'text-white/70'}`}>{p.salida_pct} % salen</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${Math.max(3, p.temp * 100)}%`, background: color(p.temp) }} />
              </div>
              {(porRuta.get(p.ruta) ?? []).length > 0 && (
                <p className="mt-3 text-xs text-white/55">
                  {(porRuta.get(p.ruta) ?? []).slice(0, 5).map((k) => `${k.destino}${k.zona ? ` (${k.zona})` : ''} · ${k.clics}`).join('   ·   ')}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
