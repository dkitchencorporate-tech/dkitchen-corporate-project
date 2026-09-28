'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface MesaSala { id: string; numero: string; zona: string; forma: string; plazas: number; x: number; y: number; mia: boolean; camarero: string | null; ancho?: number; alto?: number }
interface Elemento { tipo: string; x: number; y: number; ancho: number; alto: number; etiqueta: string | null; color: string | null }
interface Llamada { id: string; mesa: string; motivo: 'camarero' | 'cuenta'; creada_en: string }
interface Contexto {
  camarero: { id: string; nombre: string };
  restaurante: { nombre: string; color: string | null; tpv: boolean };
  mesas: MesaSala[];
  elementos?: Elemento[];
  llamadas: Llamada[];
  carta: { id: string; nombre: string; seccion: string | null }[];
}

/**
 * App de sala del camarero: mesas (las suyas destacadas), llamadas en tiempo
 * casi real (cada 6 s, con aviso sonoro) y registro de lo que pide cada mesa
 * → se envía al TPV del local. Sin precios ni cobros: eso es del TPV (o del
 * Núcleo Operativo).
 */
export default function AppSala({ token }: { token: string }) {
  const [ctx, setCtx] = useState<Contexto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soloMias, setSoloMias] = useState(true);
  const [vista, setVista] = useState<'lista' | 'plano'>('lista');
  const [mesaAbierta, setMesaAbierta] = useState<string | null>(null);
  const [sonido, setSonido] = useState(false);
  const previas = useRef<Set<string>>(new Set());

  const pedir = useCallback(async (cuerpo: object) => {
    const r = await fetch('/api/sala', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...cuerpo }) });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, [token]);

  const cargar = useCallback(async () => {
    const { status, json } = await pedir({ accion: 'contexto' });
    if (status === 401) { setError('Este acceso no es válido o ha sido desactivado. Pide un enlace nuevo al responsable.'); return; }
    if (status !== 200) return;
    const nuevo = json as Contexto;
    const nuevas = nuevo.llamadas.filter((l) => !previas.current.has(l.id));
    if (sonido && nuevas.length > 0 && previas.current.size > 0) {
      try { new AudioContext().resume().then(function () { const a = new AudioContext(); const o = a.createOscillator(); o.frequency.value = 880; o.connect(a.destination); o.start(); o.stop(a.currentTime + 0.35); }); } catch { /* sin audio */ }
      navigator.vibrate?.(300);
    }
    previas.current = new Set(nuevo.llamadas.map((l) => l.id));
    setCtx(nuevo);
  }, [pedir, sonido]);

  useEffect(() => { cargar(); const t = setInterval(cargar, 6000); return () => clearInterval(t); }, [cargar]);

  const color = ctx?.restaurante.color || '#D9531E';
  const mesas = useMemo(() => (ctx?.mesas ?? []).filter((m) => !soloMias || m.mia || !m.camarero), [ctx, soloMias]);
  const llamadasMesa = (numero: string) => (ctx?.llamadas ?? []).filter((l) => l.mesa === numero);

  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#F6F5F3] p-6 text-center text-[#1A1714]"><p>{error}</p></main>;
  if (!ctx) return <main className="flex min-h-screen items-center justify-center bg-[#F6F5F3] text-[#6B6560]">Cargando sala…</main>;

  return (
    <main className="min-h-screen bg-[#F6F5F3] pb-24 text-[#1A1714]">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-black/50">{ctx.restaurante.nombre}</p>
            <p className="font-bold">Hola, {ctx.camarero.nombre}</p>
          </div>
          <button onClick={() => setSonido((s) => !s)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${sonido ? 'text-white' : 'bg-black/5'}`} style={sonido ? { background: color } : undefined}>
            {sonido ? 'Aviso sonoro activo' : 'Activar aviso sonoro'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 pt-4">
        {ctx.llamadas.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-black/50">Llamadas ({ctx.llamadas.length})</h2>
            {ctx.llamadas.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm" style={{ borderLeft: `5px solid ${color}` }}>
                <div>
                  <p className="text-lg font-bold">Mesa {l.mesa}</p>
                  <p className="text-sm text-black/55">{l.motivo === 'cuenta' ? 'Pide la cuenta' : 'Llama al camarero'} · hace {Math.max(0, Math.round((Date.now() - new Date(l.creada_en).getTime()) / 60000))} min</p>
                </div>
                <button onClick={async () => { await pedir({ accion: 'atender', llamadaId: l.id }); cargar(); }} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: color }}>
                  Atendida
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-black/50">Mesas</h2>
            <div className="flex gap-3">
              {(ctx.elementos?.length ?? 0) + ctx.mesas.length > 0 && (
                <button onClick={() => setVista((v) => (v === 'lista' ? 'plano' : 'lista'))} className="text-xs font-semibold text-black/55 underline">{vista === 'lista' ? 'Ver plano' : 'Ver lista'}</button>
              )}
              <button onClick={() => setSoloMias((v) => !v)} className="text-xs font-semibold text-black/55 underline">
                {soloMias ? 'Ver todas' : 'Solo las mías'}
              </button>
            </div>
          </div>
          {vista === 'plano' ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-black/10 bg-white">
              {(ctx.elementos ?? []).map((e, i) => (
                <div key={i} className="absolute rounded-sm p-0.5 text-[9px] font-bold text-black/60"
                  style={{ left: `${e.x}%`, top: `${e.y}%`, width: `${e.ancho}%`, height: `${e.alto}%`,
                    ...(e.tipo === 'zona' ? { background: `${e.color ?? color}18`, border: `1.5px dashed ${e.color ?? color}` } : { background: e.tipo === 'barra' ? '#8a6a45' : e.tipo === 'puerta' ? '#3a6ea5' : '#9d968e' }) }}>
                  {e.etiqueta}
                </div>
              ))}
              {ctx.mesas.map((m) => {
                const aviso = llamadasMesa(m.numero).length > 0;
                return (
                  <button key={m.id} onClick={() => setMesaAbierta(m.numero)}
                    className={`absolute z-10 flex items-center justify-center text-xs font-black shadow ${m.forma === 'redonda' ? 'rounded-full' : 'rounded-md'} ${aviso ? 'animate-pulse text-white' : ''}`}
                    style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.ancho ?? 7}%`, height: `${m.alto ?? 10}%`,
                      background: aviso ? color : m.mia ? '#fff' : '#ece8e2', outline: m.mia ? `2px solid ${color}` : undefined, opacity: soloMias && !m.mia && m.camarero ? 0.4 : 1 }}>
                    {m.numero}
                  </button>
                );
              })}
            </div>
          ) : mesas.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-black/50">No tienes mesas asignadas todavía.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {mesas.map((m) => {
                const aviso = llamadasMesa(m.numero).length > 0;
                return (
                  <li key={m.id}>
                    <button onClick={() => setMesaAbierta(m.numero)}
                      className={`flex aspect-square w-full flex-col items-center justify-center rounded-2xl border-2 bg-white text-center shadow-sm ${m.forma === 'redonda' ? 'rounded-full' : ''}`}
                      style={{ borderColor: aviso ? color : m.mia ? `${color}55` : 'transparent' }}>
                      <span className="text-xl font-black">{m.numero}</span>
                      <span className="text-[10px] text-black/45">{m.zona} · {m.plazas}p</span>
                      {aviso && <span className="mt-1 text-xs font-bold" style={{ color }}>● llamando</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {mesaAbierta && <RegistroMesa mesa={mesaAbierta} ctx={ctx} color={color} onCerrar={() => setMesaAbierta(null)} pedir={pedir} />}
    </main>
  );
}

function RegistroMesa({ mesa, ctx, color, onCerrar, pedir }: {
  mesa: string; ctx: Contexto; color: string; onCerrar: () => void;
  pedir: (c: object) => Promise<{ status: number; json: Record<string, unknown> }>;
}) {
  const [lineas, setLineas] = useState<Record<string, { cantidad: number; nota: string }>>({});
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');
  const platos = ctx.carta.filter((p) => !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()));
  const total = Object.values(lineas).reduce((s, l) => s + l.cantidad, 0);
  const cambiar = (id: string, d: number) => setLineas((prev) => {
    const cant = Math.max(0, (prev[id]?.cantidad ?? 0) + d);
    const copia = { ...prev };
    if (cant === 0) delete copia[id]; else copia[id] = { cantidad: cant, nota: prev[id]?.nota ?? '' };
    return copia;
  });

  async function enviar() {
    setEstado('enviando');
    const { status, json } = await pedir({
      accion: 'registrar', mesa,
      lineas: Object.entries(lineas).map(([plato_id, l]) => ({ plato_id, cantidad: l.cantidad, nota: l.nota })),
    });
    if (status === 200) {
      const tpv = json.tpv as { enviado: boolean; motivo?: string } | undefined;
      setEstado('ok');
      setMensaje(!ctx.restaurante.tpv ? 'Registrado.' : tpv?.enviado ? 'Registrado y enviado al TPV ✓' : 'Registrado, pero el TPV no respondió. Avisa al responsable.');
      setTimeout(onCerrar, 1800);
    } else {
      setEstado('error'); setMensaje('No se pudo registrar. Inténtalo de nuevo.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white">
        <div className="flex items-center justify-between border-b border-black/5 p-4">
          <h2 className="text-lg font-bold">Mesa {mesa}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-black/40">✕</button>
        </div>
        <div className="p-4 pb-2">
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar en la carta…" className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
        </div>
        <ul className="flex-1 divide-y divide-black/5 overflow-y-auto px-4">
          {platos.map((p) => {
            const l = lineas[p.id];
            return (
              <li key={p.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.nombre}</p>
                    {p.seccion && <p className="text-xs text-black/40">{p.seccion}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {l && <button onClick={() => cambiar(p.id, -1)} className="h-9 w-9 rounded-full bg-black/5 text-lg font-bold">−</button>}
                    {l && <span className="w-6 text-center font-bold">{l.cantidad}</span>}
                    <button onClick={() => cambiar(p.id, 1)} className="h-9 w-9 rounded-full text-lg font-bold text-white" style={{ background: color }}>+</button>
                  </div>
                </div>
                {l && (
                  <input value={l.nota} onChange={(e) => setLineas((prev) => ({ ...prev, [p.id]: { ...prev[p.id], nota: e.target.value.slice(0, 120) } }))}
                    placeholder="Nota (sin cebolla, al punto…)" className="mt-2 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm" />
                )}
              </li>
            );
          })}
        </ul>
        <div className="border-t border-black/5 p-4">
          {estado === 'ok' || estado === 'error' ? (
            <p className={`mb-2 text-center text-sm font-semibold ${estado === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{mensaje}</p>
          ) : null}
          <button disabled={total === 0 || estado === 'enviando' || estado === 'ok'} onClick={enviar}
            className="w-full rounded-2xl py-3.5 font-bold text-white disabled:opacity-40" style={{ background: color }}>
            {estado === 'enviando' ? 'Enviando…' : `Registrar ${total > 0 ? `(${total})` : ''}${ctx.restaurante.tpv ? ' y enviar al TPV' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
