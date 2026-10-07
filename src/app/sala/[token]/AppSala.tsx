'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { esIOS, probarSonido, useAlarmaLlamadas } from '@/lib/alarma-camarero';

interface MesaSala { id: string; numero: string; zona: string; forma: string; plazas: number; x: number; y: number; mia: boolean; camarero: string | null; ancho?: number; alto?: number }
interface Elemento { tipo: string; x: number; y: number; ancho: number; alto: number; etiqueta: string | null; color: string | null }
interface Llamada { id: string; mesa: string; motivo: 'camarero' | 'cuenta'; creada_en: string }
interface Contexto {
  camarero: { id: string; nombre: string };
  restaurante: { nombre: string; color: string | null; tpv: boolean };
  mesas: MesaSala[];
  elementos?: Elemento[];
  llamadas: Llamada[];
  carta: { id: string; nombre: string; precio: number; seccion_id: string | null; seccion: string | null }[];
  secciones?: { id: string; nombre: string }[];
  cuentas?: { id: string; mesa: string; comensales: number | null; minutos: number; importe: number }[];
}
interface LineaCuenta { id: string; nombre: string; cantidad: number; precio: number; nota: string; camarero: string | null; anulada: boolean; motivo_anulacion: string | null }
interface Cuenta {
  id: string; mesa: string; comensales: number | null; minutos: number; importe: number; abierta_por: string | null;
  lineas: LineaCuenta[]; rondas: { id: string; estado: string; creado_en: string }[]; aviso: string;
}

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

/**
 * App de sala del camarero (comandero, 0045): mesas con su cuenta abierta
 * (importe y minutos), llamadas casi en tiempo real (cada 4 s, con alarma
 * en bucle hasta que se atienden, B1 07/10), rondas por secciones que van al TPV del local o a la pantalla del
 * encargado, y cierre de mesa «cobrada fuera». No cobra ni emite tickets: la
 * precuenta solo se ve en pantalla y no es una factura. El camarero no anula.
 */
export default function AppSala({ token }: { token: string }) {
  const [ctx, setCtx] = useState<Contexto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soloMias, setSoloMias] = useState(true);
  const [vista, setVista] = useState<'lista' | 'plano'>('lista');
  const [mesaAbierta, setMesaAbierta] = useState<string | null>(null);

  const pedir = useCallback(async (cuerpo: object) => {
    const r = await fetch('/api/sala', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...cuerpo }) });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, [token]);

  const cargar = useCallback(async () => {
    const { status, json } = await pedir({ accion: 'contexto' });
    if (status === 401) { setError('Este acceso no es válido o ha sido desactivado. Pide un enlace nuevo al responsable.'); return; }
    if (status !== 200) return;
    setCtx(json as Contexto);
  }, [pedir]);

  useEffect(() => { cargar(); const t = setInterval(cargar, 4000); return () => clearInterval(t); }, [cargar]);
  const pendientes = ctx?.llamadas ?? [];
  const { listo, activar } = useAlarmaLlamadas(pendientes.length > 0, pendientes.length === 1 ? `Mesa ${pendientes[0].mesa} llama` : `${pendientes.length} mesas llaman`);

  const color = ctx?.restaurante.color || '#6E0C2B';
  const mesas = useMemo(() => (ctx?.mesas ?? []).filter((m) => !soloMias || m.mia || !m.camarero), [ctx, soloMias]);
  const llamadasMesa = (numero: string) => (ctx?.llamadas ?? []).filter((l) => l.mesa === numero);
  const cuentaDe = (numero: string) => (ctx?.cuentas ?? []).find((k) => k.mesa === numero);
  const [otraMesa, setOtraMesa] = useState('');

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
          {listo ? (
            <button onClick={probarSonido} className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold">🔔 Sonido activo · probar</button>
          ) : (
            <button onClick={activar} className="animate-pulse rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-black">🔔 Toca para activar el sonido</button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 pt-4">
        {ctx.llamadas.length > 0 && (
          <section className="space-y-2 rounded-2xl bg-red-600/10 p-2 ring-2 ring-red-600 animate-pulse">
            {esIOS() && <p className="px-2 text-xs font-semibold text-red-700">En iPhone, quita el modo silencio para oír la alarma.</p>}
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
                    {m.numero}{cuentaDe(m.numero) ? ' ●' : ''}
                  </button>
                );
              })}
            </div>
          ) : mesas.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-black/50">No tienes mesas asignadas todavía. Puedes abrir una por su número aquí abajo.</p>
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
                      {cuentaDe(m.numero) && <span className="mt-0.5 text-xs font-bold">{euros(cuentaDe(m.numero)!.importe)} · {cuentaDe(m.numero)!.minutos} min</span>}
                      {aviso && <span className="mt-1 text-xs font-bold" style={{ color }}>● llamando</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {(ctx.cuentas ?? []).filter((k) => !ctx.mesas.some((m) => m.numero === k.mesa)).map((k) => (
            <button key={k.id} onClick={() => setMesaAbierta(k.mesa)} className="flex w-full items-center justify-between rounded-2xl bg-white p-3 text-sm shadow-sm">
              <span className="font-bold">Mesa {k.mesa}</span><span>{euros(k.importe)} · {k.minutos} min</span>
            </button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (/^[A-Za-z0-9-]{1,12}$/.test(otraMesa)) { setMesaAbierta(otraMesa); setOtraMesa(''); } }} className="flex gap-2">
            <input value={otraMesa} onChange={(e) => setOtraMesa(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 12))} placeholder="Mesa nº (barra, terraza…)" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" />
            <button disabled={!otraMesa} className="rounded-xl px-4 text-sm font-bold text-white disabled:opacity-40" style={{ background: color }}>Abrir</button>
          </form>
        </section>
      </div>

      {mesaAbierta && <CuentaMesa mesa={mesaAbierta} ctx={ctx} color={color} onCerrar={() => { setMesaAbierta(null); cargar(); }} pedir={pedir} />}
    </main>
  );
}

function CuentaMesa({ mesa, ctx, color, onCerrar, pedir }: {
  mesa: string; ctx: Contexto; color: string; onCerrar: () => void;
  pedir: (c: object) => Promise<{ status: number; json: Record<string, unknown> }>;
}) {
  const [cuenta, setCuenta] = useState<Cuenta | null | undefined>(undefined);
  const [vista, setVista] = useState<'cuenta' | 'anadir' | 'precuenta'>('cuenta');
  const [comensales, setComensales] = useState(2);
  const [lineas, setLineas] = useState<Record<string, { cantidad: number; nota: string }>>({});
  const [buscar, setBuscar] = useState('');
  const [seccion, setSeccion] = useState<string | null>(null);
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'error'>('idle');
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  const cargarCuenta = useCallback(async () => {
    const { status, json } = await pedir({ accion: 'cuenta', mesa });
    if (status === 200) setCuenta((json.cuenta as Cuenta | null) ?? null);
  }, [pedir, mesa]);
  useEffect(() => { cargarCuenta(); const t = setInterval(cargarCuenta, 10000); return () => clearInterval(t); }, [cargarCuenta]);

  const precioDe = (id: string) => ctx.carta.find((p) => p.id === id)?.precio ?? 0;
  const platos = ctx.carta.filter((p) => (!seccion || p.seccion_id === seccion) && (!buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase())));
  const unidades = Object.values(lineas).reduce((s, l) => s + l.cantidad, 0);
  const totalRonda = Object.entries(lineas).reduce((s, [id, l]) => s + l.cantidad * precioDe(id), 0);
  const cambiar = (id: string, d: number) => setLineas((prev) => {
    const cant = Math.min(50, Math.max(0, (prev[id]?.cantidad ?? 0) + d));
    const copia = { ...prev };
    if (cant === 0) delete copia[id]; else copia[id] = { cantidad: cant, nota: prev[id]?.nota ?? '' };
    return copia;
  });

  async function abrir() {
    setEstado('enviando');
    const { status } = await pedir({ accion: 'abrir', mesa, comensales });
    setEstado(status === 200 ? 'idle' : 'error');
    if (status === 200) { await cargarCuenta(); setVista('anadir'); } else setMensaje({ ok: false, texto: 'No se pudo abrir la mesa.' });
  }

  async function enviarRonda() {
    setEstado('enviando'); setMensaje(null);
    const { status, json } = await pedir({
      accion: 'registrar', mesa,
      lineas: Object.entries(lineas).map(([plato_id, l]) => ({ plato_id, cantidad: l.cantidad, nota: l.nota })),
    });
    if (status === 200) {
      const tpv = json.tpv as { enviado: boolean } | undefined;
      setEstado('idle'); setLineas({}); setVista('cuenta');
      setMensaje({ ok: true, texto: ctx.restaurante.tpv && tpv?.enviado ? 'Ronda enviada al TPV ✓' : ctx.restaurante.tpv ? 'El TPV no respondió: la ronda está en la pantalla del encargado.' : 'Ronda enviada a la pantalla del encargado ✓' });
      await cargarCuenta();
    } else {
      setEstado('error'); setMensaje({ ok: false, texto: 'No se pudo enviar la ronda. Inténtalo de nuevo.' });
    }
  }

  async function cerrarMesa() {
    if (!cuenta) return;
    setEstado('enviando');
    const { json } = await pedir({ accion: 'cerrar', cuentaId: cuenta.id });
    setEstado('idle');
    if (json.ok) onCerrar(); else setMensaje({ ok: false, texto: 'No se pudo cerrar la mesa (quizá ya estaba cerrada).' });
  }

  // Precuenta: solo en pantalla, agrupada por plato y precio; no se imprime ni se numera.
  const agrupadas = Object.values((cuenta?.lineas ?? []).filter((l) => !l.anulada).reduce<Record<string, { nombre: string; cantidad: number; precio: number }>>((acc, l) => {
    const k = `${l.nombre}|${l.precio}`;
    acc[k] = { nombre: l.nombre, precio: Number(l.precio), cantidad: (acc[k]?.cantidad ?? 0) + l.cantidad };
    return acc;
  }, {}));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={`Mesa ${mesa}`} onClick={(e) => e.stopPropagation()} className="flex max-h-[94vh] w-full max-w-lg flex-col rounded-t-3xl bg-white">
        <div className="flex items-start justify-between gap-3 border-b border-black/5 p-4">
          <div>
            <h2 className="text-lg font-bold">Mesa {mesa}</h2>
            {cuenta && <p className="text-sm text-black/55">{euros(cuenta.importe)} · {cuenta.minutos} min{cuenta.comensales ? ` · ${cuenta.comensales} pax` : ''}</p>}
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-1 text-black/40">✕</button>
        </div>
        {mensaje && <p className={`px-4 pt-3 text-center text-sm font-semibold ${mensaje.ok ? 'text-green-700' : 'text-red-700'}`}>{mensaje.texto}</p>}

        {cuenta === undefined ? (
          <p className="p-8 text-center text-sm text-black/50">Cargando…</p>
        ) : cuenta === null ? (
          <div className="space-y-4 p-5">
            <p className="text-sm text-black/60">Esta mesa no tiene cuenta abierta.</p>
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm font-semibold">Comensales</span>
              <button onClick={() => setComensales((n) => Math.max(1, n - 1))} className="h-10 w-10 rounded-full bg-black/5 text-lg font-bold" aria-label="Menos comensales">−</button>
              <span className="w-8 text-center text-xl font-black">{comensales}</span>
              <button onClick={() => setComensales((n) => Math.min(99, n + 1))} className="h-10 w-10 rounded-full bg-black/5 text-lg font-bold" aria-label="Más comensales">+</button>
            </div>
            <button disabled={estado === 'enviando'} onClick={abrir} className="w-full rounded-2xl py-3.5 font-bold text-white disabled:opacity-40" style={{ background: color }}>Abrir mesa</button>
          </div>
        ) : vista === 'precuenta' ? (
          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-3 rounded-lg bg-amber-100 p-2 text-center text-xs font-bold uppercase tracking-wide text-amber-900">{cuenta.aviso}</p>
            <ul className="divide-y divide-black/5 text-sm">
              {agrupadas.map((l) => (
                <li key={`${l.nombre}${l.precio}`} className="flex justify-between gap-3 py-2"><span>{l.cantidad} × {l.nombre}</span><span className="font-semibold">{euros(l.cantidad * l.precio)}</span></li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-black/10 pt-3 text-lg font-black"><span>Total</span><span>{euros(cuenta.importe)}</span></p>
            <p className="mt-2 text-center text-[11px] text-black/45">Solo para enseñar en pantalla. El cobro y el ticket se hacen en el TPV del local.</p>
            <button onClick={() => setVista('cuenta')} className="mt-4 w-full rounded-2xl bg-black/5 py-3 font-bold">Volver a la cuenta</button>
          </div>
        ) : vista === 'cuenta' ? (
          <>
            <ul className="flex-1 divide-y divide-black/5 overflow-y-auto px-4">
              {cuenta.lineas.length === 0 && <li className="py-8 text-center text-sm text-black/50">Mesa abierta. Añade la primera ronda.</li>}
              {cuenta.lineas.map((l) => (
                <li key={l.id} className={`py-2.5 text-sm ${l.anulada ? 'text-black/35' : ''}`}>
                  <div className="flex justify-between gap-3">
                    <span className={l.anulada ? 'line-through' : ''}>{l.cantidad} × {l.nombre}</span>
                    <span className={`shrink-0 font-semibold ${l.anulada ? 'line-through' : ''}`}>{euros(l.cantidad * Number(l.precio))}</span>
                  </div>
                  {l.nota && <p className="text-xs text-black/45">{l.nota}</p>}
                  {l.anulada && <p className="text-xs">Anulada por el encargado: {l.motivo_anulacion}</p>}
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-black/5 p-4">
              <button onClick={() => { setMensaje(null); setVista('anadir'); }} className="w-full rounded-2xl py-3.5 font-bold text-white" style={{ background: color }}>Añadir ronda</button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setVista('precuenta')} disabled={cuenta.lineas.length === 0} className="rounded-2xl bg-black/5 py-3 text-sm font-bold disabled:opacity-40">Ver precuenta</button>
                {confirmarCierre ? (
                  <button onClick={cerrarMesa} disabled={estado === 'enviando'} className="rounded-2xl bg-green-700 py-3 text-sm font-bold text-white">Sí, ya está cobrada</button>
                ) : (
                  <button onClick={() => setConfirmarCierre(true)} className="rounded-2xl bg-black/5 py-3 text-sm font-bold">Cerrar mesa</button>
                )}
              </div>
              {confirmarCierre && <p className="text-center text-xs text-black/55">Cierra la mesa solo cuando se haya cobrado en el TPV. <button onClick={() => setConfirmarCierre(false)} className="underline">Cancelar</button></p>}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 p-4 pb-2">
              <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar en la carta…" className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm" />
              {(ctx.secciones?.length ?? 0) > 0 && (
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {[{ id: null as string | null, nombre: 'Todo' }, ...(ctx.secciones ?? [])].map((s) => (
                    <button key={s.id ?? 'todo'} onClick={() => setSeccion(s.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${seccion === s.id ? 'text-white' : 'bg-black/5'}`} style={seccion === s.id ? { background: color } : undefined}>{s.nombre}</button>
                  ))}
                </div>
              )}
            </div>
            <ul className="flex-1 divide-y divide-black/5 overflow-y-auto px-4">
              {platos.map((p) => {
                const l = lineas[p.id];
                return (
                  <li key={p.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.nombre}</p>
                        <p className="text-xs text-black/45">{euros(p.precio)}{p.seccion ? ` · ${p.seccion}` : ''}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {l && <button onClick={() => cambiar(p.id, -1)} className="h-9 w-9 rounded-full bg-black/5 text-lg font-bold" aria-label={`Quitar ${p.nombre}`}>−</button>}
                        {l && <span className="w-6 text-center font-bold">{l.cantidad}</span>}
                        <button onClick={() => cambiar(p.id, 1)} className="h-9 w-9 rounded-full text-lg font-bold text-white" style={{ background: color }} aria-label={`Añadir ${p.nombre}`}>+</button>
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
            <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-black/5 p-4">
              <button onClick={() => setVista('cuenta')} className="rounded-2xl bg-black/5 px-4 font-bold">Cuenta</button>
              <button disabled={unidades === 0 || estado === 'enviando'} onClick={enviarRonda} className="rounded-2xl py-3.5 font-bold text-white disabled:opacity-40" style={{ background: color }}>
                {estado === 'enviando' ? 'Enviando…' : unidades > 0 ? `Enviar ronda (${unidades} · ${euros(totalRonda)})` : 'Elige platos'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
