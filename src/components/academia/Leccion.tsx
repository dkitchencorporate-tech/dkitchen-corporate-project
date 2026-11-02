'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { comprobarPasoAction, completarLeccionAction } from '@/app/academia/actions';

/**
 * Reproductor de lecciones (0116): un paso cada vez. Teoría con ejemplos, preguntas y «ordenar» que corrige el
 * servidor (con la explicación al momento) y dos calculadoras con números reales. No se avanza sin acertar.
 */
type Teoria = { tipo: 'teoria'; titulo: string; parrafos: string[]; clave?: string; bien?: string[]; mal?: string[] };
type Paso = Teoria | { tipo: 'pregunta'; texto: string; opciones: string[] } | { tipo: 'ordenar'; texto: string; items: string[] } | { tipo: 'calc_comisiones' | 'calc_plan' };
export type LeccionVista = { id: string; titulo: string; objetivo: string; minutos: number; pasos: Paso[] };
type Plan = { id: string; nombre: string; mensual: number; topes: { productos: number; mesas: number; camareros: number; reservasMes: number; idiomas: number } };
export type DatosCalc = { planes: Plan[]; idiomaExtra: number; signature: { entrada: number; mesesGratis: number; tramos: { nombre: string; cuota: number; hastaVentas: number; hastaPedidos: number }[] } };

const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' €';

function Num({ id, label, v, set, min = 0, max = 100000, paso = 1, sufijo }: { id: string; label: string; v: number; set: (n: number) => void; min?: number; max?: number; paso?: number; sufijo?: string }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="flex justify-between gap-2"><span>{label}</span><b className="tabular-nums">{v.toLocaleString('es-ES')}{sufijo}</b></span>
      <input id={id} type="range" min={min} max={max} step={paso} value={v} onChange={(e) => set(Number(e.target.value))} className="mt-1 w-full accent-[#6E0C2B]" />
    </label>
  );
}

function CalcPlan({ d }: { d: DatosCalc }) {
  const [x, setX] = useState({ platos: 45, mesas: 9, camareros: 2, idiomas: 2, mesa: true });
  const r = useMemo(() => {
    for (const p of d.planes) {
      const t = p.topes;
      if (x.platos <= t.productos && x.mesas <= t.mesas && x.camareros <= t.camareros && (p.id !== 'basico' || !x.mesa)) {
        const extra = Math.max(0, x.idiomas - t.idiomas);
        return { p, extra, total: p.mensual + extra * d.idiomaExtra, motivo: p.id === 'basico' ? 'Cabe todo y no pide pedido desde la mesa.' : x.mesa && p.id === 'ampliado' && x.platos <= d.planes[0].topes.productos && x.mesas <= d.planes[0].topes.mesas ? 'Por cantidades cabría en Carta, pero quiere pedido desde la mesa.' : 'Es el primer plan cuyas cantidades lo cubren todo.' };
      }
    }
    return null;
  }, [x, d]);
  return (
    <div className="grid gap-5 rounded-[22px] border border-linea bg-white p-5 md:grid-cols-2">
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-vino">Recomendador de plan · mueve los valores</p>
        <Num id="cp-platos" label="Platos en carta" v={x.platos} set={(n) => setX({ ...x, platos: n })} min={5} max={140} />
        <Num id="cp-mesas" label="Mesas" v={x.mesas} set={(n) => setX({ ...x, mesas: n })} min={1} max={40} />
        <Num id="cp-cam" label="Camareros a la vez" v={x.camareros} set={(n) => setX({ ...x, camareros: n })} min={1} max={8} />
        <Num id="cp-id" label="Idiomas que necesita" v={x.idiomas} set={(n) => setX({ ...x, idiomas: n })} min={1} max={6} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={x.mesa} onChange={(e) => setX({ ...x, mesa: e.target.checked })} className="h-5 w-5 accent-[#6E0C2B]" /> Quiere que el cliente pida desde la mesa</label>
      </div>
      <div className="flex flex-col justify-center rounded-2xl bg-noche p-5 text-white">
        {r ? (<>
          <p className="text-xs uppercase tracking-[0.2em] text-oro">Le corresponde</p>
          <p className="font-display text-4xl font-bold">{r.p.nombre}</p>
          <p className="mt-1 text-lg">{eur(r.total)}<span className="text-sm text-white/60">/mes{r.extra ? ` (${eur(r.p.mensual)} + ${r.extra} idioma${r.extra > 1 ? 's' : ''} extra)` : ''}</span></p>
          <p className="mt-3 text-sm text-white/75">{r.motivo}</p>
          <p className="mt-2 text-xs text-white/50">Topes de {r.p.nombre}: {r.p.topes.productos} platos · {r.p.topes.mesas} mesas · {r.p.topes.camareros} camareros · {r.p.topes.idiomas} idiomas</p>
        </>) : <p className="text-sm">Supera el plan Sala: es un <b>plan a medida</b>. Llévalo a dirección.</p>}
      </div>
    </div>
  );
}

function CalcComisiones({ d }: { d: DatosCalc }) {
  const [x, setX] = useState({ pedidos: 300, ticket: 22, comision: 30, paso: 25 });
  const ventas = x.pedidos * x.ticket;
  const comisiones = ventas * (x.comision / 100);
  const ahorro = ventas * (x.paso / 100) * (x.comision / 100);
  const ventasApp = ventas * (x.paso / 100);
  const tramo = d.signature.tramos.find((t) => ventasApp <= t.hastaVentas && x.pedidos * (x.paso / 100) <= t.hastaPedidos) ?? d.signature.tramos[d.signature.tramos.length - 1];
  const neto = ahorro - tramo.cuota;
  const meses = neto > 0 ? Math.ceil(d.signature.entrada / neto) : null;
  return (
    <div className="grid gap-5 rounded-[22px] border border-linea bg-white p-5 md:grid-cols-2">
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-vino">La cuenta de comisiones · con sus números</p>
        <Num id="cc-ped" label="Pedidos al mes en plataformas" v={x.pedidos} set={(n) => setX({ ...x, pedidos: n })} min={20} max={2000} paso={10} />
        <Num id="cc-tic" label="Ticket medio" v={x.ticket} set={(n) => setX({ ...x, ticket: n })} min={8} max={60} sufijo=" €" />
        <Num id="cc-com" label="Comisión de la plataforma" v={x.comision} set={(n) => setX({ ...x, comision: n })} min={10} max={40} sufijo=" %" />
        <Num id="cc-paso" label="Parte que pasa a su app propia" v={x.paso} set={(n) => setX({ ...x, paso: n })} min={5} max={100} paso={5} sufijo=" %" />
      </div>
      <div className="space-y-2 rounded-2xl bg-noche p-5 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-oro">Resultado</p>
        <p className="flex justify-between gap-3 text-sm"><span>Paga hoy en comisiones</span><b className="tabular-nums">{eur(Math.round(comisiones))}/mes</b></p>
        <p className="flex justify-between gap-3 text-sm"><span>Deja de pagar con su app</span><b className="tabular-nums text-oro">{eur(Math.round(ahorro))}/mes</b></p>
        <p className="flex justify-between gap-3 text-sm"><span>Cuota Signature ({tramo.nombre})</span><b className="tabular-nums">− {eur(tramo.cuota)}/mes</b></p>
        <p className="flex justify-between gap-3 border-t border-white/15 pt-2"><span>Neto al mes</span><b className={`tabular-nums ${neto > 0 ? 'text-exito' : 'text-red-300'}`}>{eur(Math.round(neto))}</b></p>
        <p className="text-sm text-white/75">{meses ? `Recupera la entrada (${eur(d.signature.entrada)}) en unos ${meses} mes${meses > 1 ? 'es' : ''}, y además tiene ${d.signature.mesesGratis} meses de mantenimiento incluidos.` : 'Con estos números Signature NO le compensa: véndele la Carta QR. Saber no venderlo también es vender.'}</p>
        <p className="text-xs text-white/50">Es una estimación con SUS números, no una promesa: dilo así.</p>
      </div>
    </div>
  );
}

export default function Leccion({ l, datos, cerrar, hecha }: { l: LeccionVista; datos: DatosCalc; cerrar: () => void; hecha: boolean }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [resp, setResp] = useState<Record<string, unknown>>({});
  const [fb, setFb] = useState<{ ok: boolean; porque: string; elegida?: string } | null>(null);
  const [mal, setMal] = useState<string[]>([]);
  const [orden, setOrden] = useState<string[]>([]);
  const [fin, setFin] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pend, iniciar] = useTransition();
  const p = l.pasos[i];
  const ultimo = i === l.pasos.length - 1;
  const bloqueado = (p.tipo === 'pregunta' || p.tipo === 'ordenar') && !fb?.ok && resp[String(i)] === undefined;

  const comprobar = (r: unknown, elegida?: string) => iniciar(async () => {
    const x = await comprobarPasoAction(l.id, i, r);
    setFb({ ...x, elegida });
    if (x.ok) setResp((v) => ({ ...v, [String(i)]: r })); else if (elegida) setMal((m) => [...m, elegida]);
  });
  const avanzar = () => {
    if (ultimo) {
      iniciar(async () => { const r = await completarLeccionAction(l.id, resp); setFin(r); if ('ok' in r && r.ok) router.refresh(); });
      return;
    }
    setI(i + 1); setFb(null); setMal([]); setOrden([]);
  };

  if (fin?.ok) return (
    <div className="dk-paso space-y-4 rounded-[28px] bg-noche p-8 text-center text-white" data-testid="leccion-hecha">
      <p className="text-xs uppercase tracking-[0.24em] text-oro">Lección completada</p>
      <p className="font-display text-3xl font-bold">{l.titulo}</p>
      <p className="text-sm text-white/70">Queda registrada en tu ficha. Sigue con la siguiente lección o pon a prueba lo aprendido en el test.</p>
      <button type="button" onClick={cerrar} className="min-h-[48px] rounded-full bg-oro px-6 font-semibold text-noche">Volver a la Academia</button>
    </div>
  );

  return (
    <div className="space-y-5" data-testid={`leccion-${l.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={cerrar} className="text-sm font-semibold text-vino">← Academia</button>
        <p className="text-xs text-niebla">{l.id} · paso {i + 1} de {l.pasos.length}{hecha ? ' · ya completada' : ''}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-linea"><span className="block h-full rounded-full bg-vino transition-all" style={{ width: `${((i + (fb?.ok || p.tipo === 'teoria' || p.tipo.startsWith('calc') ? 1 : 0)) / l.pasos.length) * 100}%` }} /></div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-vino">{l.titulo}</p>
        {i === 0 && <p className="mt-1 text-sm text-niebla">{l.objetivo}</p>}
      </div>

      <div key={i} className="dk-paso">
        {p.tipo === 'teoria' && (
          <article className="space-y-4 rounded-[22px] border border-linea bg-white p-5 sm:p-7">
            <h3 className="font-display text-2xl font-bold">{p.titulo}</h3>
            {p.parrafos.map((t) => <p key={t.slice(0, 30)} className="leading-relaxed">{t}</p>)}
            {p.clave && <p className="rounded-2xl bg-noche p-4 font-semibold text-oro">Clave · <span className="text-white">{p.clave}</span></p>}
            {(p.bien || p.mal) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {p.bien && <div className="rounded-2xl border border-exito/40 bg-exito/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-exito">Dilo así</p>{p.bien.map((t) => <p key={t} className="mt-2 text-sm">✓ {t}</p>)}</div>}
                {p.mal && <div className="rounded-2xl border border-red-300 bg-red-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700">Nunca así</p>{p.mal.map((t) => <p key={t} className="mt-2 text-sm">✗ {t}</p>)}</div>}
              </div>
            )}
          </article>
        )}
        {p.tipo === 'calc_plan' && <CalcPlan d={datos} />}
        {p.tipo === 'calc_comisiones' && <CalcComisiones d={datos} />}
        {p.tipo === 'pregunta' && (
          <div className="space-y-3 rounded-[22px] border border-linea bg-white p-5 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-oro">Comprueba lo aprendido</p>
            <p className="font-display text-xl font-bold leading-snug">{p.texto}</p>
            <div className="grid gap-2">
              {p.opciones.map((o) => {
                const elegidaOk = fb?.ok && fb.elegida === o;
                const fallada = mal.includes(o);
                return (
                  <button key={o} type="button" disabled={pend || fb?.ok || fallada} onClick={() => comprobar(o, o)}
                    className={`min-h-[52px] rounded-2xl border px-4 py-3 text-left text-sm transition ${elegidaOk ? 'border-exito bg-exito/10 font-semibold' : fallada ? 'border-red-300 bg-red-50 text-red-800 line-through decoration-red-300' : 'border-linea hover:border-vino'}`}>{o}</button>
                );
              })}
            </div>
          </div>
        )}
        {p.tipo === 'ordenar' && (
          <div className="space-y-3 rounded-[22px] border border-linea bg-white p-5 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-oro">Ordena · toca en el orden correcto</p>
            <p className="font-display text-xl font-bold leading-snug">{p.texto}</p>
            <ol className="space-y-2">
              {orden.map((t, k) => <li key={t} className="flex gap-3 rounded-2xl bg-noche px-4 py-3 text-sm text-white"><b className="text-oro">{k + 1}</b>{t}</li>)}
            </ol>
            <div className="grid gap-2">
              {p.items.filter((t) => !orden.includes(t)).map((t) => (
                <button key={t} type="button" disabled={fb?.ok} onClick={() => setOrden([...orden, t])} className="min-h-[48px] rounded-2xl border border-dashed border-linea px-4 py-3 text-left text-sm hover:border-vino">{t}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pend || orden.length !== p.items.length || fb?.ok} onClick={() => comprobar(orden)} className="min-h-[44px] rounded-full bg-vino px-5 text-sm font-semibold text-white disabled:opacity-40">Comprobar orden</button>
              {!fb?.ok && orden.length > 0 && <button type="button" onClick={() => { setOrden([]); setFb(null); }} className="min-h-[44px] rounded-full border border-linea px-5 text-sm font-semibold">Empezar de nuevo</button>}
            </div>
          </div>
        )}
        {fb && (
          <p className={`mt-3 rounded-2xl p-4 text-sm ${fb.ok ? 'bg-exito/10 text-exito' : 'bg-red-50 text-red-800'}`} role="status">
            <b>{fb.ok ? 'Correcto. ' : 'No es esa. '}</b>{fb.ok ? fb.porque : 'Piensa en la regla de la lección y vuelve a intentarlo.'}
          </p>
        )}
      </div>

      {fin?.error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{fin.error}</p>}
      <div className="flex justify-between gap-3">
        <button type="button" disabled={i === 0} onClick={() => { setI(i - 1); setFb(null); setMal([]); setOrden([]); }} className="min-h-[48px] rounded-full border border-linea px-5 text-sm font-semibold disabled:opacity-30">Anterior</button>
        <button type="button" disabled={bloqueado || pend} onClick={avanzar} className="min-h-[48px] rounded-full bg-vino px-6 text-sm font-semibold text-white disabled:opacity-40" data-testid="leccion-siguiente">
          {pend ? 'Un momento…' : ultimo ? 'Completar lección' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
