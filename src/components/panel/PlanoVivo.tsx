'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { MesasEnVivo as Datos } from '@/lib/comandero';
import type { ElementoPlano } from '@/lib/sala';
import type { LlamadaCamarero } from '@/lib/llamadas-camarero';
import { atenderLlamadaAction, guardarMesaAction, llamadasPendientesAction, rondaRevisadaAction } from '@/app/panel/actions';
import { EVENTO_LLAMADAS } from './AlarmaLlamadas';

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const COLORES_ZONA = ['#7A0F31', '#2F8F6B', '#1F4E79', '#C58B2A', '#5B3E8A'];

type MesaViva = Datos['mesas'][number];
type Estado = 'llama' | 'pedido' | 'abierta' | 'libre';

/**
 * PLANO EN VIVO (13/10, karc0): la sala del local como la enseña la web.
 * Cada mesa se ve libre, abierta (con importe y minutos) y PARPADEA solo mientras
 * pasa algo: una llamada sin atender (rojo) o una ronda nueva por pasar (vino).
 * Al tocar una mesa: asignar camarero, atender, marcar la ronda, ver la cuenta o tomar un pedido.
 * Rediseño de autor (13/10, karc0): escenario oscuro que cabe entero sin scroll
 * (lienzo 4:3 ajustado con container queries), carril «Ahora» y pantalla completa de servicio.
 */
export default function PlanoVivo({
  datos, elementos, camareros, onCambio, onVerCuenta, onPedido,
}: {
  datos: Datos; elementos: ElementoPlano[]; camareros: { id: string; nombre: string; activo: boolean }[];
  onCambio: () => void; onVerCuenta: (cuentaId: string) => void; onPedido: (mesa: string) => void;
}) {
  const [llamadas, setLlamadas] = useState<LlamadaCamarero[]>([]);
  const [sel, setSel] = useState<MesaViva | null>(null);
  const [completa, setCompleta] = useState(false);
  const raiz = useRef<HTMLElement>(null);

  // Pantalla de servicio: ocupa toda la pantalla (y la del dispositivo si el navegador lo permite). Esc o «Salir» vuelven.
  const alternarCompleta = useCallback(() => {
    const sig = !completa;
    setCompleta(sig);
    try {
      if (sig && raiz.current?.requestFullscreen) void raiz.current.requestFullscreen().catch(() => {});
      if (!sig && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch { /* sin API de pantalla completa: basta el modo fijo */ }
  }, [completa]);
  useEffect(() => {
    const fuera = () => { if (!document.fullscreenElement) setCompleta(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setCompleta(false); };
    document.addEventListener('fullscreenchange', fuera);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('fullscreenchange', fuera); window.removeEventListener('keydown', esc); };
  }, []);

  const refrescar = useCallback(async () => {
    try { setLlamadas(await llamadasPendientesAction()); } catch { /* siguiente ciclo */ }
  }, []);
  useEffect(() => {
    refrescar();
    const t = setInterval(refrescar, 5000);
    window.addEventListener(EVENTO_LLAMADAS, refrescar);
    return () => { clearInterval(t); window.removeEventListener(EVENTO_LLAMADAS, refrescar); };
  }, [refrescar]);

  const estado = (m: MesaViva): Estado =>
    llamadas.some((l) => l.mesa === m.numero) ? 'llama'
    : datos.rondas_entrantes.some((r) => r.mesa === m.numero) ? 'pedido'
    : datos.cuentas.some((k) => k.mesa === m.numero) ? 'abierta' : 'libre';

  const zonas = elementos.filter((e) => e.tipo === 'zona');
  const otros = elementos.filter((e) => e.tipo !== 'zona');

  if (datos.mesas.length === 0) {
    return (
      <a href="/panel?pestana=sala" className="block rounded-[28px] border-2 border-dashed border-linea bg-white p-6 text-center text-sm">
        <span className="block text-lg font-semibold">Dibuja tu sala</span>
        <span className="text-niebla">Coloca tus mesas y zonas una vez y aquí verás en directo cuál llama, cuál pide y de quién es cada una →</span>
      </a>
    );
  }

  // Encuadre: caja que envuelve mesas y elementos (+3 % de aire); el lienzo toma su proporción real.
  const piezas = [...elementos, ...datos.mesas];
  const minX = Math.max(0, Math.min(...piezas.map((o) => o.x)) - 3);
  const minY = Math.max(0, Math.min(...piezas.map((o) => o.y)) - 3);
  const maxX = Math.min(100, Math.max(...piezas.map((o) => o.x + o.ancho)) + 3);
  const maxY = Math.min(100, Math.max(...piezas.map((o) => o.y + o.alto)) + 3);
  const bw = Math.max(10, maxX - minX), bh = Math.max(10, maxY - minY);
  const proporcion = (bw * 4) / (bh * 3); // el editor dibuja sobre 4:3
  const pos = (o: { x: number; y: number; ancho: number; alto: number }) => ({
    left: `${((o.x - minX) / bw) * 100}%`, top: `${((o.y - minY) / bh) * 100}%`,
    width: `${(o.ancho / bw) * 100}%`, height: `${(o.alto / bh) * 100}%`,
  });

  const llaman = datos.mesas.filter((m) => estado(m) === 'llama');
  const total = datos.cuentas.reduce((s, k) => s + Number(k.importe), 0);
  const libres = datos.mesas.filter((m) => estado(m) === 'libre').length;

  return (
    <section ref={raiz} className={completa
      ? 'fixed inset-0 z-[60] flex flex-col gap-3 bg-[#0D090F] p-3 sm:p-5'
      : 'flex flex-col gap-3 rounded-[32px] bg-[#0D090F] p-3 shadow-[0_30px_60px_-30px_rgba(13,9,15,.8)] sm:p-4 lg:h-[calc(100dvh-210px)] lg:min-h-[520px]'}
      style={{ backgroundImage: 'radial-gradient(120% 80% at 15% 0%, rgba(110,12,43,.35), transparent 60%), radial-gradient(90% 70% at 100% 100%, rgba(217,178,92,.10), transparent 60%)' }}>
      <style>{`
        @keyframes dk-llama{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.8),0 10px 24px -8px rgba(0,0,0,.6);transform:scale(1)}50%{box-shadow:0 0 0 14px rgba(239,68,68,0),0 10px 24px -8px rgba(0,0,0,.6);transform:scale(1.06)}}
        @keyframes dk-pide{0%,100%{box-shadow:0 0 0 0 rgba(217,178,92,.65),0 10px 24px -8px rgba(0,0,0,.6)}50%{box-shadow:0 0 0 12px rgba(217,178,92,0),0 10px 24px -8px rgba(0,0,0,.6)}}
        .dk-escena{container-type:size}
      `}</style>

      {/* Cabecera del escenario: titular de autor + cifras + controles */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-1 text-white">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-2xl italic tracking-tight text-[#F2C14E] sm:text-3xl">Sala en directo</span>
          <span className="hidden text-[11px] uppercase tracking-[0.25em] text-white/45 sm:inline">{completa ? 'pantalla de servicio' : 'toca una mesa'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:gap-3">
          <Cifra k="Llaman" v={String(llaman.length)} alerta={llaman.length > 0} />
          <Cifra k="Por pasar" v={String(datos.rondas_entrantes.length)} alerta={datos.rondas_entrantes.length > 0} />
          <Cifra k="Abiertas" v={String(datos.cuentas.length)} />
          <Cifra k="Libres" v={String(libres)} />
          <Cifra k="En sala" v={euros(total)} />
          <button type="button" onClick={alternarCompleta}
            className="rounded-full border border-[#F2C14E]/50 px-4 py-2 text-xs font-bold text-[#F2C14E] transition hover:bg-[#F2C14E] hover:text-[#0D090F]">
            {completa ? 'Salir ✕' : 'Pantalla completa ⤢'}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Escenario: el plano cabe entero, sin scroll, con proporción 4:3 */}
        <div className="dk-escena relative grid min-h-[300px] place-items-center sm:min-h-[420px] lg:min-h-0">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#17121A]"
            style={{ width: `min(100cqw, calc(100cqh * ${proporcion.toFixed(4)}))`, aspectRatio: String(proporcion), backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '5% 6.6667%' }}>
            {zonas.map((z, i) => {
              const c = z.color ?? COLORES_ZONA[i % COLORES_ZONA.length];
              const cam = camareros.find((x) => x.id === z.camareroId)?.nombre;
              return (
                <div key={z.id ?? i} className="absolute rounded-[18px] border border-dashed" style={{ ...pos(z), borderColor: `${c}AA`, background: `${c}14` }}>
                  <span className="absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px]" style={{ background: `${c}33`, color: '#F7F5F2' }}>
                    {z.etiqueta ?? 'Zona'}{cam ? ` · ${cam}` : ''}
                  </span>
                </div>
              );
            })}
            {otros.map((e, i) => (
              <div key={e.id ?? `o${i}`} className="absolute flex items-center justify-center rounded-md bg-[linear-gradient(180deg,#4A3F4F,#2A2230)] text-[9px] font-semibold uppercase tracking-[0.2em] text-[#F2C14E]/80 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"
                style={pos(e)}>
                {e.ancho / bw > 0.12 || e.alto / bh > 0.12 ? e.etiqueta ?? '' : ''}
              </div>
            ))}
            {datos.mesas.map((m) => {
              const s = estado(m);
              const cuenta = datos.cuentas.find((k) => k.mesa === m.numero);
              const fondo = s === 'llama' ? 'bg-[linear-gradient(135deg,#EF4444,#991B1B)] text-white ring-2 ring-red-300/60'
                : s === 'pedido' ? 'bg-[linear-gradient(135deg,#8C0D37,#3E0515)] text-[#F2C14E] ring-2 ring-[#F2C14E]/70'
                : s === 'abierta' ? 'bg-[linear-gradient(160deg,#2B2430,#0D090F)] text-[#F2C14E] ring-1 ring-[#F2C14E]/40'
                : 'bg-[linear-gradient(160deg,#FFFAF2,#E9E2D6)] text-[#0D090F] ring-1 ring-black/10';
              return (
                <button key={m.id} type="button" onClick={() => setSel(m)} aria-label={`Mesa ${m.numero}`}
                  className={`absolute flex flex-col items-center justify-center shadow-[0_10px_24px_-8px_rgba(0,0,0,.6)] transition hover:-translate-y-0.5 ${m.forma === 'redonda' ? 'rounded-full' : 'rounded-2xl'} ${fondo}`}
                  style={{ ...pos(m), animation: s === 'llama' ? 'dk-llama 1s ease-in-out infinite' : s === 'pedido' ? 'dk-pide 1.4s ease-in-out infinite' : undefined }}>
                  <span className="font-display text-lg font-semibold leading-none sm:text-3xl">{m.numero}</span>
                  {s === 'llama' && <span className="mt-1 text-[8px] font-bold uppercase tracking-widest sm:text-[10px]">Llama</span>}
                  {s === 'pedido' && <span className="mt-1 text-[8px] font-bold uppercase tracking-widest sm:text-[10px]">Pide</span>}
                  {s === 'abierta' && cuenta && <span className="mt-1 hidden text-[10px] font-semibold text-white/70 sm:block">{cuenta.minutos}′ · {euros(cuenta.importe)}</span>}
                  {m.camarero && m.ancho / bw > 0.07 && <span className="absolute -bottom-1.5 left-1/2 hidden max-w-[110%] -translate-x-1/2 truncate rounded-full bg-[#0D090F] px-2 text-[9px] font-semibold text-white/80 ring-1 ring-white/15 sm:block">{m.camarero}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Carril «Ahora»: lo urgente arriba, sin salir de la pantalla */}
        <aside className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-3 text-white lg:max-h-none max-h-[60dvh]">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">Ahora</p>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {llaman.length === 0 && datos.rondas_entrantes.length === 0 && datos.cuentas.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/55">Sala en calma. Cuando una mesa llame o pida, aparecerá aquí y parpadeará en el plano.</p>
            )}
            {llaman.map((m) => (
              <button key={`l${m.id}`} type="button" onClick={() => setSel(m)} className="flex w-full items-center justify-between rounded-2xl bg-[linear-gradient(135deg,#EF4444,#991B1B)] px-4 py-3 text-left">
                <span><span className="block text-[10px] font-bold uppercase tracking-widest text-white/80">Llama</span><span className="font-display text-xl">Mesa {m.numero}</span></span>
                <span className="text-sm font-bold">Voy →</span>
              </button>
            ))}
            {datos.rondas_entrantes.map((r) => {
              const m = datos.mesas.find((x) => x.numero === r.mesa);
              return (
                <button key={r.id} type="button" onClick={() => m && setSel(m)} className="block w-full rounded-2xl border border-[#F2C14E]/40 bg-[linear-gradient(135deg,#8C0D37,#3E0515)] px-4 py-3 text-left">
                  <span className="flex items-baseline justify-between"><span className="font-display text-xl text-[#F2C14E]">Mesa {r.mesa}</span><span className="text-[11px] text-white/70">{r.camarero ?? 'Encargado'}</span></span>
                  <span className="mt-1 block truncate text-xs text-white/80">{r.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(' · ')}</span>
                </button>
              );
            })}
            {datos.cuentas.map((k) => (
              <button key={k.id} type="button" onClick={() => onVerCuenta(k.id)} className="flex w-full items-center justify-between rounded-2xl bg-white/[0.06] px-4 py-2.5 text-left ring-1 ring-white/10 hover:bg-white/10">
                <span><span className="font-display text-lg">Mesa {k.mesa}</span><span className="ml-2 text-[11px] text-white/55">{k.minutos}′{k.comensales ? ` · ${k.comensales} pax` : ''}</span></span>
                <span className={`text-sm font-bold ${k.minutos >= 90 ? 'text-red-300' : k.minutos >= 45 ? 'text-amber-200' : 'text-[#F2C14E]'}`}>{euros(k.importe)}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onPedido('')} className="rounded-2xl bg-[#F2C14E] py-3 text-sm font-bold text-[#0D090F] transition hover:brightness-110">+ Tomar pedido</button>
        </aside>
      </div>

      {sel && (
        <FichaMesa mesa={sel} estado={estado(sel)} datos={datos} llamadas={llamadas} camareros={camareros}
          onCerrar={() => setSel(null)}
          onHecho={() => { onCambio(); refrescar(); window.dispatchEvent(new Event(EVENTO_LLAMADAS)); }}
          onVerCuenta={(id) => { setSel(null); onVerCuenta(id); }}
          onPedido={() => { setSel(null); onPedido(sel.numero); }} />
      )}
    </section>
  );
}

function Cifra({ k, v, alerta = false }: { k: string; v: string; alerta?: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1.5 ring-1 ${alerta ? 'bg-red-600/90 text-white ring-red-300/50' : 'bg-white/[0.06] text-white/80 ring-white/10'}`}>
      <span className="mr-1.5 uppercase tracking-wider opacity-70">{k}</span><strong className="text-white">{v}</strong>
    </span>
  );
}

function FichaMesa({ mesa, estado, datos, llamadas, camareros, onCerrar, onHecho, onVerCuenta, onPedido }: {
  mesa: MesaViva; estado: Estado; datos: Datos; llamadas: LlamadaCamarero[]; camareros: { id: string; nombre: string; activo: boolean }[];
  onCerrar: () => void; onHecho: () => void; onVerCuenta: (id: string) => void; onPedido: () => void;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cuenta = datos.cuentas.find((k) => k.mesa === mesa.numero);
  const rondas = datos.rondas_entrantes.filter((r) => r.mesa === mesa.numero);
  const llamada = llamadas.filter((l) => l.mesa === mesa.numero);
  const actual = camareros.find((c) => c.nombre === mesa.camarero)?.id ?? '';
  const [camarero, setCamarero] = useState(actual);

  function asignar(id: string) {
    setCamarero(id); setError(null);
    iniciar(async () => {
      try {
        await guardarMesaAction({ id: mesa.id, numero: mesa.numero, zona: mesa.zona, forma: mesa.forma as 'cuadrada', plazas: mesa.plazas, x: mesa.x, y: mesa.y, camareroId: id || null });
        onHecho();
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo asignar.'); setCamarero(actual); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={`Mesa ${mesa.numero}`} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-[28px] border border-[#F2C14E]/25 bg-[#120D14] p-6 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,.8)]" style={{ backgroundImage: 'radial-gradient(120% 70% at 0% 0%, rgba(140,13,55,.45), transparent 60%)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">{mesa.zona} · {mesa.plazas} plazas</p>
            <h3 className="font-display text-4xl italic text-[#F2C14E]">Mesa {mesa.numero}</h3>
            <p className="text-sm text-white/65">{estado === 'llama' ? 'Está llamando' : estado === 'pedido' ? 'Pedido nuevo por pasar' : cuenta ? `Abierta · ${cuenta.minutos} min · ${euros(cuenta.importe)}` : 'Libre'}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white">✕</button>
        </div>

        {llamada.length > 0 && (
          <button disabled={pendiente} onClick={() => iniciar(async () => { for (const l of llamada) await atenderLlamadaAction(l.id).catch(() => {}); onHecho(); onCerrar(); })}
            className="w-full rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white disabled:opacity-50">Voy · marcar llamada atendida</button>
        )}
        {rondas.map((r) => (
          <div key={r.id} className="rounded-2xl border-l-4 border-[#F2C14E] bg-white/[0.06] p-3">
            <ul className="text-sm">{r.lineas.map((l, i) => <li key={i}><strong>{l.cantidad} ×</strong> {l.nombre}{l.nota ? ` · ${l.nota}` : ''}</li>)}</ul>
            <button disabled={pendiente} onClick={() => iniciar(async () => { await rondaRevisadaAction(r.id); onHecho(); })} className="mt-2 rounded-full bg-[#F2C14E] px-4 py-2 text-xs font-bold text-[#0D090F] disabled:opacity-50">Pasada ✓</button>
          </div>
        ))}

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Camarero de la mesa</span>
          <select value={camarero} disabled={pendiente} onChange={(e) => asignar(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-3 text-sm text-white [&>option]:text-tinta">
            <option value="">Sin asignar</option>
            {camareros.filter((c) => c.activo || c.id === camarero).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {camareros.length === 0 && <a href="/panel?pestana=equipo" className="mt-1 block text-xs font-semibold text-[#F2C14E]">Da de alta a tu equipo en Servicio → Equipo →</a>}
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          {cuenta && <button onClick={() => onVerCuenta(cuenta.id)} className="rounded-2xl border border-white/20 py-3.5 text-sm font-bold text-white">Ver cuenta</button>}
          <button onClick={onPedido} className={`rounded-2xl bg-[#F2C14E] py-3.5 text-sm font-bold text-[#0D090F] ${cuenta ? '' : 'col-span-2'}`}>{cuenta ? '+ Añadir' : 'Tomar pedido'}</button>
        </div>
      </div>
    </div>
  );
}
