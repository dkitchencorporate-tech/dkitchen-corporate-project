'use client';

import { useState } from 'react';
import Entrenador, { type Lanzar } from '@/components/academia/Entrenador';
import Leccion, { type LeccionVista, type DatosCalc } from '@/components/academia/Leccion';

/**
 * Academia (01/11; rehecha 02/11, 0116): una RUTA, no tarjetas sueltas. Contrato firmado → 8 lecciones
 * interactivas (teoría con ejemplos, preguntas corregidas en el servidor, ordenar, calculadoras) → tests N1–N3
 * con banco ampliado (se abren al terminar las lecciones) → escenarios a pie y digitales (E5–E6 ramificados de
 * práctica) → habilitación por dirección. El repaso rápido (tarjetas) queda al final.
 */
type Bloque = { mejor: number; aprobado: boolean; intentos: number };
export type EstadoAcademia = { bloques: Record<string, Bloque>; cumple: boolean; rol: string; alex: boolean };
export type Tarjeta = { titulo: string; frente: string; dorso: string[] };
export type Contrato = { firmado: boolean; simulacion: boolean; fecha: string | null } | null;

const ESC = [['E1', 'Hamburguesería del Puerto', 'Signature'], ['E2', 'Mesón Los Arcos', 'Carta QR'], ['E3', 'Bodega La Parra', 'Experience'], ['E4', 'Casa Paco', 'Piloto o abandonar']] as const;
const ESC_EXTRA = [['E5', 'Cafetería La Plaza', 'Decide la madre, lleva las redes la hija'], ['E6', 'Hotel Alcazaba', 'Llegar al decisor · Sala + Experience']] as const;

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

function Hito({ n, titulo, valor, ok, activo }: { n: number; titulo: string; valor: string; ok: boolean; activo: boolean }) {
  return (
    <li className={`min-w-0 rounded-2xl p-3 ring-1 ${ok ? 'bg-exito/20 ring-exito/50' : activo ? 'bg-oro/15 ring-oro/60' : 'bg-white/[0.05] ring-white/10'}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">{ok ? '✓ Hecho' : activo ? 'Ahora' : `Paso ${n}`}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{titulo}</p>
      <p className="text-xs text-white/70">{valor}</p>
    </li>
  );
}

export default function AcademiaInicio({ estado, modulos, perfiles, lecciones, datos, contrato }: {
  estado: EstadoAcademia; modulos: Tarjeta[]; perfiles: Tarjeta[]; lecciones: LeccionVista[]; datos: DatosCalc; contrato: Contrato;
}) {
  const [lanzar, setLanzar] = useState<Lanzar | null>(null);
  const [leccion, setLeccion] = useState<LeccionVista | null>(null);
  const b = (k: string) => estado.bloques[k];
  const dir = estado.rol === 'direccion';
  const lecHechas = lecciones.filter((l) => b(`${l.id}:leccion`)?.aprobado).length;
  const tests = (['N1', 'N2', 'N3'] as const).map((n) => ({ n, x: b(`${n}:test`) }));
  const testsOk = tests.filter((t) => (t.x?.mejor ?? 0) >= 90).length;
  const escOk = ESC.reduce((s, [e]) => s + (b(`${e}:pie`)?.aprobado ? 1 : 0) + (b(`${e}:digital`)?.aprobado ? 1 : 0), 0);
  const firmado = dir || !!contrato?.firmado;
  const total = 1 + lecciones.length + 3 + 8;
  const pct = Math.round(((firmado ? 1 : 0) + lecHechas + testsOk + escOk) / total * 100);
  const testsAbiertos = dir || lecHechas === lecciones.length;

  if (leccion) return <Leccion l={leccion} datos={datos} hecha={!!b(`${leccion.id}:leccion`)?.aprobado} cerrar={() => setLeccion(null)} />;
  if (lanzar) return <Entrenador lanzar={lanzar} cerrar={() => setLanzar(null)} />;
  const siguiente = lecciones.find((l) => !b(`${l.id}:leccion`)?.aprobado);

  return (
    <div className="space-y-8">
      <section className="dk-carta overflow-hidden rounded-[28px] bg-noche p-6 text-white sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-oro">Tu ruta para vender con DKitchen</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <p className="font-display text-4xl font-bold sm:text-5xl"><span className="cv-cifra">{pct}</span> %</p>
          <p className="max-w-md text-sm text-white/70">{estado.rol === 'en_formacion' ? (estado.cumple ? 'Lo tienes todo: dirección revisa tu ficha y te habilita para vender.' : 'Contrato, 8 lecciones, los 3 tests al 90 % y los 4 escenarios a pie y en digital. Después, el OK de dirección.') : dir ? 'Vista de dirección: todo abierto para revisar.' : 'Ya estás habilitado. Sigue entrenando: cada intento cuenta.'}</p>
        </div>
        <div className="dk-barra-prog mt-4 h-2.5 overflow-hidden rounded-full bg-white/10"><span style={{ width: `${Math.max(3, pct)}%` }} /></div>
        <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Hito n={0} titulo="Contrato" valor={dir ? 'No aplica a dirección' : contrato?.firmado ? `Firmado${contrato.simulacion ? ' (simulación)' : ''}` : 'Sin firmar'} ok={firmado} activo={!firmado} />
          <Hito n={1} titulo="Lecciones" valor={`${lecHechas} de ${lecciones.length}`} ok={lecHechas === lecciones.length} activo={firmado && lecHechas < lecciones.length} />
          <Hito n={2} titulo="Tests N1–N3" valor={`${testsOk} de 3 al 90 %`} ok={testsOk === 3} activo={testsAbiertos && testsOk < 3} />
          <Hito n={3} titulo="Escenarios" valor={`${escOk} de 8 aprobados`} ok={escOk === 8} activo={testsAbiertos && testsOk === 3 && escOk < 8} />
          <Hito n={4} titulo="Habilitación" valor={estado.cumple ? 'Lista para dirección' : 'Al terminar todo'} ok={estado.rol === 'comercial'} activo={estado.cumple && estado.rol === 'en_formacion'} />
        </ol>
        {contrato?.firmado && <a href="/academia/contrato-pdf" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/15">Descargar mi contrato firmado (PDF)</a>}
      </section>

      <section className="space-y-3" id="lecciones">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">1 · Aprende: 8 lecciones</h2>
          {siguiente && <button type="button" onClick={() => setLeccion(siguiente)} className="min-h-[44px] rounded-full bg-vino px-5 text-sm font-semibold text-white" data-testid="seguir-leccion">Seguir por {siguiente.id} →</button>}
        </div>
        <p className="text-sm text-niebla">Cada lección es interactiva: teoría con ejemplos reales, preguntas que se corrigen al momento, ejercicios y calculadoras con números de verdad. Para completarla hay que acertarlo todo.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {lecciones.map((l) => {
            const ok = !!b(`${l.id}:leccion`)?.aprobado;
            return (
              <button key={l.id} type="button" onClick={() => setLeccion(l)} className={`dk-carta flex min-h-[150px] flex-col justify-between rounded-[22px] border p-4 text-left transition hover:border-vino ${ok ? 'border-exito/50 bg-exito/5' : 'border-linea bg-white'}`} data-testid={`abrir-${l.id}`}>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vino">{l.id} · {l.minutos} min · {l.pasos.length} pasos</span>
                <span className="font-display text-lg font-bold leading-snug">{l.titulo}</span>
                <span className="text-xs text-niebla">{ok ? '✓ Completada · repasar' : l.objetivo}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">2 · Demuéstralo: tests por niveles</h2>
        {!testsAbiertos && <p className="rounded-2xl bg-oro/15 p-3 text-sm">Los tests se abren al completar las 8 lecciones. Llevas {lecHechas}.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          {tests.map(({ n, x }) => (
            <button key={n} type="button" disabled={!testsAbiertos} onClick={() => setLanzar({ tipo: 'test', nivel: n, titulo: `Test ${n}` })} className="dk-carta flex items-center gap-3 rounded-[22px] border border-linea bg-white p-4 text-left transition hover:border-vino disabled:cursor-not-allowed disabled:opacity-50">
              <Mini n={x ? x.mejor : null} ok={(x?.mejor ?? 0) >= 90} />
              <span><b className="block font-display text-lg">{n} · {n === 'N1' ? 'Producto y reglas' : n === 'N2' ? 'Calle, digital y ley' : 'Cierre y casos complejos'}</b><span className="text-xs text-niebla">{n === 'N3' ? '12' : '15'} preguntas al azar · aprobado 90 %{x ? ` · mejor ${x.mejor} %` : ''}</span></span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['N1', 'N2', 'N3'] as const).map((n) => (
            <button key={n} type="button" disabled={!testsAbiertos} onClick={() => setLanzar({ tipo: 'test', nivel: n, practica: true, titulo: `Practicar objeciones · ${n === 'N1' ? 'fácil' : n === 'N2' ? 'intermedio' : 'difícil'}` })} className="min-h-[44px] rounded-full border border-linea bg-white px-4 text-sm font-semibold hover:border-vino disabled:opacity-50">Practicar objeciones {n === 'N1' ? 'fáciles' : n === 'N2' ? 'intermedias' : 'difíciles'}</button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">3 · Véndelo: escenarios reales</h2>
        <p className="text-sm text-niebla">Conversaciones con dueños reales. Cada respuesta tiene consecuencias; romper una regla de «lo que nunca se dice» suspende el escenario aunque el resto esté bien.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[...ESC.map((x) => [...x, false] as const), ...ESC_EXTRA.map((x) => [...x, true] as const)].map(([e, t, obj, extra]) => (
            <div key={e} className={`dk-carta rounded-[22px] border bg-white p-4 ${extra ? 'border-oro/60' : 'border-linea'}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-vino">{e} · {obj}{extra ? ' · ramificado · práctica' : ''}</p>
              <p className="font-display text-lg font-bold">{t}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['pie', 'digital'] as const).map((v) => {
                  const x = b(`${e}:${v}`);
                  return (
                    <button key={v} type="button" disabled={!testsAbiertos} onClick={() => setLanzar({ tipo: 'esc', id: e, version: v, titulo: `${t} · ${v === 'pie' ? 'a pie' : 'digital'}` })} className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-papel px-3 py-2 text-left text-sm font-semibold hover:ring-1 hover:ring-vino disabled:opacity-50">
                      <Mini n={x ? x.mejor : null} ok={!!x?.aprobado} />{v === 'pie' ? 'A pie' : 'Digital'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Repaso rápido</h2>
        <p className="text-sm text-niebla">Antes de una visita: lo que vendes y a quién, en tarjetas. Toca para girar.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modulos.map((t) => <Giratoria key={t.titulo} t={t} />)}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{perfiles.map((t) => <Giratoria key={t.titulo} t={t} />)}</div>
      </section>
    </div>
  );
}
