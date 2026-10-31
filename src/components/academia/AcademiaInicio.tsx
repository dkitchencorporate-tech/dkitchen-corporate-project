'use client';

import { useState } from 'react';
import Entrenador, { type Lanzar } from '@/components/academia/Entrenador';

/**
 * Inicio de la Academia (01/11): progreso visual, módulos y perfiles en tarjetas que se giran (nada de
 * pantallas de texto), tests N1–N3, práctica de objeciones y los 4 escenarios a pie y en digital.
 */
type Bloque = { mejor: number; aprobado: boolean; intentos: number };
export type EstadoAcademia = { bloques: Record<string, Bloque>; cumple: boolean; rol: string; alex: boolean };
export type Tarjeta = { titulo: string; frente: string; dorso: string[] };

const ESC = [['E1', 'Hamburguesería del Puerto', 'Signature'], ['E2', 'Mesón Los Arcos', 'Carta QR'], ['E3', 'Bodega La Parra', 'Experience'], ['E4', 'Casa Paco', 'Piloto o abandonar']] as const;

function Mini({ n, ok }: { n: number | null; ok: boolean }) {
  const C = 2 * Math.PI * 16;
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90"><circle cx="20" cy="20" r="16" fill="none" stroke="#E6E6E2" strokeWidth="4" />
        {n !== null && <circle cx="20" cy="20" r="16" fill="none" stroke={ok ? '#2F8F6B' : '#D9B25C'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(n / 100) * C} ${C}`} className="dk-anillo" style={{ ['--l' as string]: `${C}` }} />}</svg>
      <b className="text-[11px]">{n === null ? '—' : ok ? '✓' : n}</b>
    </span>
  );
}

function Giratoria({ t }: { t: Tarjeta }) {
  const [dada, setDada] = useState(false);
  return (
    <button type="button" onClick={() => setDada(!dada)} className="group h-56 w-full [perspective:900px]" aria-pressed={dada}>
      <span className={`relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${dada ? '[transform:rotateY(180deg)]' : ''}`}>
        <span className="absolute inset-0 flex flex-col justify-between rounded-[22px] bg-noche p-5 text-left text-white [backface-visibility:hidden]">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-oro">{t.titulo}</span>
          <span className="font-display text-xl font-bold leading-snug">{t.frente}</span>
          <span className="text-xs text-white/50">Toca para ver la clave →</span>
        </span>
        <span className="absolute inset-0 space-y-1.5 overflow-hidden rounded-[22px] border border-linea bg-white p-5 text-left text-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {t.dorso.map((x) => <span key={x} className="block">✓ {x}</span>)}
        </span>
      </span>
    </button>
  );
}

export default function AcademiaInicio({ estado, modulos, perfiles }: { estado: EstadoAcademia; modulos: Tarjeta[]; perfiles: Tarjeta[] }) {
  const [lanzar, setLanzar] = useState<Lanzar | null>(null);
  const b = (k: string) => estado.bloques[k];
  const tests = (['N1', 'N2', 'N3'] as const).map((n) => ({ n, x: b(`${n}:test`) }));
  const hechos = tests.filter((t) => (t.x?.mejor ?? 0) >= 90).length + ESC.reduce((s, [e]) => s + (b(`${e}:pie`)?.aprobado ? 1 : 0) + (b(`${e}:digital`)?.aprobado ? 1 : 0), 0);
  const pct = Math.round((hechos / 11) * 100);

  if (lanzar) return <Entrenador lanzar={lanzar} cerrar={() => setLanzar(null)} />;
  return (
    <div className="space-y-8">
      <section className="dk-carta overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-oro">Tu habilitación</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <p className="font-display text-4xl font-bold sm:text-5xl"><span className="cv-cifra">{pct}</span> %</p>
          <p className="max-w-md text-sm text-white/70">{estado.rol === 'en_formacion' ? (estado.cumple ? 'Lo tienes todo: dirección revisa y te habilita para vender.' : 'Necesitas N1, N2 y N3 al 90 % y los 4 escenarios a pie y en digital. Después, el OK de dirección.') : 'Ya estás habilitado. Sigue entrenando: cada intento cuenta.'}</p>
        </div>
        <div className="dk-barra-prog mt-4 h-2.5 overflow-hidden rounded-full bg-white/10"><span style={{ width: `${Math.max(3, pct)}%` }} /></div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">1 · Lo que vendes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modulos.map((t) => <Giratoria key={t.titulo} t={t} />)}</div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">2 · A quién se lo vendes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{perfiles.map((t) => <Giratoria key={t.titulo} t={t} />)}</div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">3 · Test por niveles</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {tests.map(({ n, x }) => (
            <button key={n} type="button" onClick={() => setLanzar({ tipo: 'test', nivel: n, titulo: `Test ${n}` })} className="dk-carta flex items-center gap-3 rounded-[22px] border border-linea bg-white p-4 text-left transition hover:border-vino" data-testid={`test-${n}`}>
              <Mini n={x ? x.mejor : null} ok={(x?.mejor ?? 0) >= 90} />
              <span><b className="block font-display text-lg">{n} · {n === 'N1' ? 'Base' : n === 'N2' ? 'Calle' : 'Cierre'}</b><span className="text-xs text-niebla">{x ? `${x.intentos} intento${x.intentos === 1 ? '' : 's'} · mejor ${x.mejor} %` : 'Sin empezar'}</span></span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['N1', 'N2', 'N3'] as const).map((n) => (
            <button key={n} type="button" onClick={() => setLanzar({ tipo: 'test', nivel: n, practica: true, titulo: `Practicar objeciones · ${n === 'N1' ? 'fácil' : n === 'N2' ? 'intermedio' : 'difícil'}` })} className="min-h-[44px] rounded-full border border-linea bg-white px-4 text-sm font-semibold hover:border-vino">Practicar objeciones {n === 'N1' ? 'fáciles' : n === 'N2' ? 'intermedias' : 'difíciles'}</button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">4 · Escenarios reales</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ESC.map(([e, t, obj]) => (
            <div key={e} className="dk-carta rounded-[22px] border border-linea bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-vino">{e} · {obj}</p>
              <p className="font-display text-lg font-bold">{t}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['pie', 'digital'] as const).map((v) => {
                  const x = b(`${e}:${v}`);
                  return (
                    <button key={v} type="button" onClick={() => setLanzar({ tipo: 'esc', id: e, version: v, titulo: `${t} · ${v === 'pie' ? 'a pie' : 'digital'}` })} className="flex items-center gap-2 rounded-2xl bg-papel px-3 py-2 text-left text-sm font-semibold hover:bg-linea" data-testid={`esc-${e}-${v}`}>
                      <Mini n={x ? x.mejor : null} ok={!!x?.aprobado} />{v === 'pie' ? 'A pie' : 'Digital'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
