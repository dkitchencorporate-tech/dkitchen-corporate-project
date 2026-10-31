'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { empezarTestAction, entregarTestAction, empezarEscenarioAction, responderEscenarioAction } from '@/app/academia/actions';

/**
 * Entrenador de la Academia (01/11): test pregunta a pregunta, objeciones en práctica y escenarios en
 * conversación (3 opciones por nodo). Todo se corrige en el servidor; aquí solo se juega. Movimiento < 0,6 s.
 */
type Vista = { id: string; texto: string; opciones: string[] };
type Fallo = { donde: string; elegiste: string; correcta: string; porque: string; mejora: string; dim: string };
type Res = { nota: number; aprobado: boolean; dims: Record<string, number>; fallos: Fallo[] };
export type Lanzar = { tipo: 'test'; nivel: 'N1' | 'N2' | 'N3' | 'N4' | 'ALEX'; practica?: boolean; titulo: string } | { tipo: 'esc'; id: string; version: 'pie' | 'digital'; titulo: string };

const DIM: Record<string, string> = { prospector: 'Prospector', cerrador: 'Cerrador', fisico: 'Comercial físico', digital: 'Comercial digital' };
const nivelDe = (n: number) => (n >= 90 ? 'Cerrador DKitchen' : n >= 75 ? 'Sólido' : n >= 50 ? 'En desarrollo' : 'Aprendiz');

function Anillo({ n, ok }: { n: number; ok: boolean }) {
  const C = 2 * Math.PI * 44;
  return (
    <div className="relative grid h-32 w-32 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90"><circle cx="50" cy="50" r="44" fill="none" stroke="#EDEDEA" strokeWidth="9" />
        <circle cx="50" cy="50" r="44" fill="none" stroke={ok ? '#2F8F6B' : '#6E0C2B'} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(n / 100) * C} ${C}`} className="dk-anillo" style={{ ['--l' as string]: `${C}` }} /></svg>
      <b className="font-display text-3xl">{n} %</b>
    </div>
  );
}

export function Resultado({ r, titulo, volver, error }: { r: Res; titulo: string; volver: () => void; error?: string | null }) {
  return (
    <div className="dk-paso space-y-5" data-testid="academia-resultado">
      <div className="flex flex-wrap items-center gap-5">
        <Anillo n={r.nota} ok={r.aprobado} />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-vino">{titulo}</p>
          <p className="font-display text-3xl font-bold">{r.aprobado ? 'Aprobado' : 'Suspendido'}</p>
          <p className="text-sm text-niebla">Nivel: <b className="text-tinta">{nivelDe(r.nota)}</b>. Nota real, sin redondeos a favor.</p>
        </div>
      </div>
      {error && <p className="rounded-2xl bg-vino/10 px-4 py-3 text-sm text-vino">{error}</p>}
      {!!Object.keys(r.dims).length && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(r.dims).map(([d, n]) => (
            <div key={d} className="rounded-2xl bg-white p-3"><p className="text-xs text-niebla">{DIM[d] ?? d}</p><b className="font-display text-xl">{n} %</b>
              <div className="dk-barra-prog mt-1 h-1.5 overflow-hidden rounded-full bg-linea"><span style={{ width: `${n}%` }} /></div></div>
          ))}
        </div>
      )}
      {r.fallos.length > 0 && (
        <div className="space-y-2">
          <p className="font-display text-lg font-bold">Dónde perdiste la venta</p>
          {r.fallos.slice(0, 3).map((f, i) => (
            <div key={i} className="rounded-2xl border border-linea bg-white p-4 text-sm">
              <p className="font-semibold">{i + 1}. {f.donde}</p>
              <p className="mt-1 text-red-700">Elegiste: {f.elegiste}</p>
              <p className="text-exito">Lo correcto: {f.correcta}</p>
              <p className="mt-1 text-niebla">{f.porque}</p>
              <p className="mt-1"><b>Acción:</b> {f.mejora}</p>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={volver} className="dk-btn min-h-[48px] rounded-full bg-vino px-6 text-sm font-bold text-white">Volver</button>
    </div>
  );
}

export default function Entrenador({ lanzar, cerrar }: { lanzar: Lanzar; cerrar: () => void }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [preguntas, setPreguntas] = useState<Vista[]>([]);
  const [i, setI] = useState(0);
  const [resp, setResp] = useState<Record<string, number>>({});
  const [nodo, setNodo] = useState<{ id: string; situacion: string; opciones: string[] } | null>(null);
  const [esc, setEsc] = useState<{ ficha: string; objetivo: string; total: number } | null>(null);
  const [chat, setChat] = useState<{ yo?: string; ellos?: string; fb?: string; puntos?: number; mejor?: string | null }[]>([]);
  const [res, setRes] = useState<Res | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [empezado, setEmpezado] = useState(false);

  const empezar = () => iniciar(async () => {
    setError(null); setEmpezado(true);
    if (lanzar.tipo === 'test') {
      const r = await empezarTestAction(lanzar.nivel, !!lanzar.practica);
      if ('error' in r && r.error) { setError(r.error); return; }
      if ('token' in r) { setToken(r.token); setPreguntas(r.preguntas); setI(0); setResp({}); }
    } else {
      const r = await empezarEscenarioAction(lanzar.id, lanzar.version);
      if ('error' in r && r.error) { setError(r.error); return; }
      if ('token' in r && r.token) { setToken(r.token); setNodo(r.nodo); setEsc({ ficha: r.ficha, objetivo: r.objetivo, total: r.total }); setChat([{ ellos: r.nodo.situacion }]); }
    }
  });

  const elegirTest = (k: number) => {
    const q = preguntas[i];
    const nuevas = { ...resp, [q.id]: k };
    setResp(nuevas);
    if (i + 1 < preguntas.length) { setI(i + 1); return; }
    iniciar(async () => {
      const r = await entregarTestAction(token!, nuevas, lanzar.tipo === 'test' && !!lanzar.practica);
      if ('resultado' in r && r.resultado) setRes(r.resultado as Res);
      setError(r.error ?? null);
      router.refresh();
    });
  };

  const elegirNodo = (k: number) => iniciar(async () => {
    const r = await responderEscenarioAction(token!, k);
    if ('error' in r && r.error && !('feedback' in r)) { setError(r.error); return; }
    if (!('feedback' in r)) return;
    const linea = { yo: nodo!.opciones[k], fb: r.feedback, puntos: r.puntos, mejor: r.mejor };
    if (r.terminado) {
      setChat((c) => [...c, linea]);
      setRes({ nota: r.resultado.nota, aprobado: r.resultado.aprobado, dims: r.resultado.dims as Record<string, number>, fallos: r.resultado.fallos });
      setError(('error' in r && r.error) ? r.error : r.resultado.regla ? 'Has roto una regla de M5 (prometer, inventar precio, correo frío o regalar sin OK): escenario suspendido.' : null);
      router.refresh();
    } else {
      setChat((c) => [...c, linea, { ellos: r.nodo.situacion }]);
      setToken(r.token); setNodo(r.nodo);
    }
  });

  const tarjeta = 'dk-tarjeta w-full rounded-[20px] border-[1.5px] border-linea bg-white p-4 text-left text-[15px] transition hover:border-vino active:scale-[.99]';

  return (
    <section className="rounded-[26px] border border-linea bg-crema p-5 sm:p-7" data-testid="entrenador">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">{lanzar.titulo}</h2>
        <button type="button" onClick={cerrar} className="grid h-10 w-10 place-items-center rounded-full hover:bg-papel" aria-label="Cerrar">✕</button>
      </div>

      {res ? <Resultado r={res} titulo={lanzar.titulo} volver={cerrar} error={error} />
      : !empezado ? (
        <div className="dk-paso space-y-4">
          <p className="text-sm text-niebla">{lanzar.tipo === 'test' ? (lanzar.practica ? 'Práctica de objeciones: no cuenta para la nota.' : 'Preguntas sorteadas. Para aprobar: 90 %. Tras 2 suspensos seguidos, espera de 24 h.') : 'Conversación real: 3 opciones en cada momento. Romper una regla de M5 suspende el escenario.'}</p>
          <button type="button" onClick={empezar} disabled={pend} className="dk-btn min-h-[52px] w-full rounded-full bg-vino text-base font-bold text-white sm:w-auto sm:px-10" data-testid="empezar">{pend ? 'Preparando…' : 'Empezar'}</button>
        </div>
      ) : error && !token ? <p className="rounded-2xl bg-vino/10 px-4 py-3 text-sm text-vino">{error}</p>
      : lanzar.tipo === 'test' && preguntas[i] ? (
        <div key={preguntas[i].id} className="dk-paso space-y-4">
          <div className="flex gap-1">{preguntas.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < i ? 'bg-vino' : k === i ? 'bg-oro' : 'bg-linea'}`} />)}</div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-niebla">Pregunta {i + 1} de {preguntas.length}</p>
          <p className="font-display text-xl font-bold leading-snug">{preguntas[i].texto}</p>
          <div className="space-y-2.5">{preguntas[i].opciones.map((o, k) => <button key={k} type="button" disabled={pend} onClick={() => elegirTest(k)} className={tarjeta} data-testid="opcion">{o}</button>)}</div>
        </div>
      ) : lanzar.tipo === 'esc' && esc ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-noche p-4 text-white"><p className="text-[11px] uppercase tracking-[0.2em] text-oro">Ficha del local · objetivo: {esc.objetivo}</p><p className="mt-1 text-sm">{esc.ficha}</p></div>
          <div className="space-y-2.5">
            {chat.map((m, k) => (
              <div key={k} className="dk-paso space-y-1.5">
                {m.ellos && <p className="max-w-[85%] rounded-[18px] rounded-tl-md bg-white px-4 py-3 text-sm shadow-sm">{m.ellos}</p>}
                {m.yo && <p className="ml-auto max-w-[85%] rounded-[18px] rounded-tr-md bg-vino px-4 py-3 text-sm text-white">{m.yo}</p>}
                {m.fb && <p className={`ml-auto max-w-[85%] rounded-xl px-3 py-2 text-xs font-semibold ${m.puntos === 10 ? 'bg-exito/10 text-exito' : m.puntos! < 0 ? 'bg-red-50 text-red-700' : 'bg-oro/15 text-tinta'}`}>{m.puntos! > 0 ? '+' : ''}{m.puntos} · {m.fb}{m.mejor ? ` Mejor: «${m.mejor}»` : ''}</p>}
              </div>
            ))}
          </div>
          {nodo && <div className="space-y-2.5 border-t border-linea pt-4">{nodo.opciones.map((o, k) => <button key={nodo.id + k} type="button" disabled={pend} onClick={() => elegirNodo(k)} className={tarjeta} data-testid="opcion">{o}</button>)}</div>}
        </div>
      ) : <p className="text-sm text-niebla">Cargando…</p>}
    </section>
  );
}
