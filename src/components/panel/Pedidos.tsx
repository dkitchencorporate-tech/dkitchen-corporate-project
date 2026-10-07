'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import type { Cuenta, CartaPanel, MesasEnVivo as Datos } from '@/lib/comandero';
import {
  mesasEnVivoAction, cuentaDetalleAction, rondaRevisadaAction, cerrarCuentaAction, anularLineaAction, anularCuentaAction,
  cartaPedidosAction, anadirRondaAction, cambiarCantidadAction, moverMesaAction, reenviarTpvAction, abrirMesaAction,
} from '@/app/panel/actions';
import { probarSonido } from '@/lib/alarma-camarero';

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const haceMin = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const INTERVALO_MS = 5000;

/** Color por tiempo en mesa: verde hasta 45 min, ámbar hasta 90, rojo después. */
function tono(min: number) {
  if (min >= 90) return { borde: 'border-red-500', fondo: 'bg-red-50', texto: 'text-red-700' };
  if (min >= 45) return { borde: 'border-amber-400', fondo: 'bg-amber-50', texto: 'text-amber-800' };
  return { borde: 'border-green-500', fondo: 'bg-green-50', texto: 'text-green-800' };
}

type Aviso = { ok: boolean; texto: string } | null;

/**
 * Pedidos (B2, 07/10/2026): el centro donde entra todo lo de sala. Rondas por
 * pasar (o que el TPV no recibió) arriba, con aviso sonoro; mesas abiertas por
 * colores según el tiempo; y en cada mesa el encargado añade productos, cambia
 * cantidades, anula con motivo, mueve o junta mesas, reenvía al TPV y cierra.
 * Los precios los pone siempre el servidor; nada se borra (0045 + 0046).
 */
/** Datos de ejemplo para la demo pública del panel (sin sesión no hay base). */
const hace = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const EJEMPLO: Datos = {
  tpv: false, pro: false, mesas: [],
  cuentas: [
    { id: 'd1', mesa: '3', comensales: 4, abierta_en: hace(25), minutos: 25, abierta_por: 'Lucía', importe: 64.5, rondas: 2 },
    { id: 'd2', mesa: '7', comensales: 2, abierta_en: hace(58), minutos: 58, abierta_por: 'Marcos', importe: 38, rondas: 3 },
    { id: 'd3', mesa: 'T1', comensales: 6, abierta_en: hace(97), minutos: 97, abierta_por: null, importe: 142.8, rondas: 5 },
  ],
  rondas_entrantes: [
    { id: 'r1', mesa: '3', cuenta_id: 'd1', estado: 'registrado', creado_en: hace(2), detalle_tpv: null, camarero: 'Lucía',
      lineas: [{ nombre: 'Croquetas de jamón', cantidad: 2, nota: '' }, { nombre: 'Entrecot', cantidad: 1, nota: 'poco hecho' }] },
  ],
};

export default function Pedidos({ demo = false }: { demo?: boolean }) {
  const [datos, setDatos] = useState<Datos | null>(demo ? EJEMPLO : null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [carta, setCarta] = useState<CartaPanel | null>(null);
  const [actualizado, setActualizado] = useState<number>(Date.now());
  const vistas = useRef<Set<string> | null>(null);

  const cargar = useCallback(async () => {
    if (demo || (typeof document !== 'undefined' && document.hidden)) return;
    const r = await mesasEnVivoAction();
    if (!r.ok) { setError(r.error); return; }
    // Aviso sonoro corto por cada ronda NUEVA por pasar (no en la primera carga)
    const ids = new Set(r.datos.rondas_entrantes.map((x) => x.id));
    if (vistas.current && [...ids].some((id) => !vistas.current!.has(id))) probarSonido();
    vistas.current = ids;
    setDatos(r.datos); setError(null); setActualizado(Date.now());
  }, [demo]);
  useEffect(() => { cargar(); const t = setInterval(cargar, INTERVALO_MS); return () => clearInterval(t); }, [cargar]);

  const pedirCarta = useCallback(async () => {
    if (carta) return carta;
    const r = await cartaPedidosAction();
    if (r.ok) { setCarta(r.datos); return r.datos; }
    setError(r.error); return null;
  }, [carta]);

  if (error && !datos) return <p className="rounded-2xl border border-linea bg-white p-5 text-sm text-red-600">{error}</p>;
  if (!datos) return <p className="rounded-2xl border border-linea bg-white p-5 text-sm text-niebla">Cargando pedidos…</p>;

  const total = datos.cuentas.reduce((s, k) => s + Number(k.importe), 0);
  const porPasar = datos.rondas_entrantes;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Pedidos</h2>
          <p className="text-sm text-niebla">Todo lo que entra de sala, en directo. Se actualiza solo cada 5 s · {demo || Math.round((Date.now() - actualizado) / 1000) < 10 ? 'al día' : 'reconectando…'}</p>
        </div>
        <button onClick={() => { setNuevo(true); void pedirCarta(); }} className="rounded-full bg-vino px-5 py-3 text-sm font-bold text-white hover:bg-vino-hondo">+ Nuevo pedido</button>
      </header>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {demo && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ejemplo de un servicio en marcha. En tu panel real, desde aquí añades productos, cambias cantidades, mueves o juntas mesas y las cierras.</p>}

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {([['Mesas abiertas', String(datos.cuentas.length)], ['En sala', euros(total)], [datos.tpv ? 'Sin llegar al TPV' : 'Por pasar', String(porPasar.length)]] as const).map(([k, v], i) => (
          <div key={k} className={`rounded-2xl border p-3 sm:p-4 ${i === 2 && porPasar.length > 0 ? 'border-vino bg-vino/10' : 'border-linea bg-white'}`}>
            <dt className="text-[11px] uppercase tracking-wider text-niebla">{k}</dt>
            <dd className="text-xl font-black sm:text-2xl">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-niebla">
          {datos.tpv ? 'Rondas que el TPV no recibió' : 'Rondas por pasar a cocina / TPV'} ({porPasar.length})
        </h3>
        {porPasar.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-linea bg-white p-5 text-center text-sm text-niebla">
            {datos.tpv ? 'Todo ha llegado a tu TPV.' : 'No hay nada pendiente. Cuando un camarero (o tú) añada una ronda, aparecerá aquí y sonará un aviso.'}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {porPasar.map((r) => <RondaEntrante key={r.id} ronda={r} tpv={datos.tpv} onHecho={cargar} onAbrir={() => r.cuenta_id && setAbierta(r.cuenta_id)} />)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-niebla">Mesas abiertas ({datos.cuentas.length})</h3>
        {datos.cuentas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-linea bg-white p-5 text-center text-sm text-niebla">Ninguna mesa abierta. Los camareros las abren desde su app, o tú con «+ Nuevo pedido».</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {datos.cuentas.map((k) => {
              const t = tono(k.minutos);
              return (
                <li key={k.id}>
                  <button onClick={() => setAbierta(k.id)} className={`w-full rounded-2xl border-2 ${t.borde} ${t.fondo} p-3 text-left transition hover:shadow-md`}>
                    <p className="flex items-baseline justify-between gap-2"><span className="text-xl font-black">Mesa {k.mesa}</span><span className="font-bold">{euros(k.importe)}</span></p>
                    <p className={`text-xs font-semibold ${t.texto}`}>{k.minutos} min · {k.rondas} {k.rondas === 1 ? 'ronda' : 'rondas'}{k.comensales ? ` · ${k.comensales} pax` : ''}</p>
                    <p className="truncate text-xs text-niebla">{k.abierta_por ?? 'Encargado'}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-ceniza">Verde: menos de 45 min · ámbar: 45–90 min · rojo: más de 90 min. El cobro y el ticket se hacen siempre en tu TPV.</p>
      </section>

      {abierta && !demo && <DetalleCuenta id={abierta} tpv={datos.tpv} pedirCarta={pedirCarta} onCerrar={() => { setAbierta(null); cargar(); }} />}
      {nuevo && !demo && (
        <NuevoPedido mesas={datos.mesas.map((m) => m.numero)} abiertas={datos.cuentas.map((k) => k.mesa)} pedirCarta={pedirCarta}
          onCerrar={(cuenta) => { setNuevo(false); cargar(); if (cuenta) setAbierta(cuenta); }} />
      )}
    </div>
  );
}

function RondaEntrante({ ronda, tpv, onHecho, onAbrir }: { ronda: Datos['rondas_entrantes'][number]; tpv: boolean; onHecho: () => void; onAbrir: () => void }) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<Aviso>(null);
  const min = haceMin(ronda.creado_en);
  return (
    <div className={`rounded-2xl border-l-8 bg-white p-4 shadow-sm ${min >= 10 ? 'border-red-500' : 'border-vino'}`}>
      <div className="flex items-start justify-between gap-3">
        <button onClick={onAbrir} className="text-left">
          <p className="text-2xl font-black">Mesa {ronda.mesa}</p>
          <p className="text-xs text-niebla">{ronda.camarero ?? 'Encargado'} · hace {min} min</p>
        </button>
        <div className="flex shrink-0 flex-col gap-2">
          <button disabled={pendiente} onClick={() => iniciar(async () => { await rondaRevisadaAction(ronda.id); onHecho(); })}
            className="rounded-full bg-vino px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Pasada ✓</button>
          {tpv && (
            <button disabled={pendiente} onClick={() => iniciar(async () => {
              const r = await reenviarTpvAction(ronda.id);
              setAviso(r.ok ? (r.datos.enviado ? { ok: true, texto: 'Enviada al TPV.' } : { ok: false, texto: 'El TPV sigue sin recibirla. Pásala a mano.' }) : { ok: false, texto: r.error });
              onHecho();
            })} className="rounded-full border border-vino px-4 py-2 text-sm font-bold text-vino disabled:opacity-50">Reenviar al TPV</button>
          )}
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-base">
        {ronda.lineas.map((l, i) => (
          <li key={i}><strong>{l.cantidad} ×</strong> {l.nombre}{l.nota ? <span className="ml-1 rounded bg-amber-100 px-1.5 text-sm font-semibold text-amber-900">{l.nota}</span> : null}</li>
        ))}
      </ul>
      {ronda.estado === 'error_tpv' && <p className="mt-2 text-xs text-red-600">El TPV no la recibió{ronda.detalle_tpv ? `: ${ronda.detalle_tpv}` : ''}</p>}
      {aviso && <p className={`mt-2 text-xs ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}
    </div>
  );
}

/** Selector de productos: buscador, secciones y cantidades con nota. Devuelve las líneas al confirmar. */
function Selector({ carta, enviando, textoBoton, onEnviar }: {
  carta: CartaPanel; enviando: boolean; textoBoton: string; onEnviar: (lineas: { plato_id: string; cantidad: number; nota: string }[]) => void;
}) {
  const [busca, setBusca] = useState('');
  const [seccion, setSeccion] = useState<string | null>(null);
  const [cesta, setCesta] = useState<Record<string, { cantidad: number; nota: string }>>({});
  const lista = useMemo(() => carta.carta.filter((p) =>
    (!seccion || p.seccion_id === seccion) && (!busca || p.nombre.toLowerCase().includes(busca.toLowerCase()))), [carta, busca, seccion]);
  const poner = (id: string, delta: number) => setCesta((c) => {
    const n = Math.max(0, Math.min(50, (c[id]?.cantidad ?? 0) + delta));
    const copia = { ...c };
    if (n === 0) delete copia[id]; else copia[id] = { cantidad: n, nota: c[id]?.nota ?? '' };
    return copia;
  });
  const lineas = Object.entries(cesta).map(([plato_id, v]) => ({ plato_id, ...v }));
  const total = lineas.reduce((s, l) => s + l.cantidad * Number(carta.carta.find((p) => p.id === l.plato_id)?.precio ?? 0), 0);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-linea p-3">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar producto…" className="w-full rounded-xl border border-acero bg-white px-3 py-2.5 text-sm" />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setSeccion(null)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${!seccion ? 'bg-tinta text-white' : 'bg-papel'}`}>Todo</button>
          {carta.secciones.map((s) => (
            <button key={s.id} onClick={() => setSeccion(s.id)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${seccion === s.id ? 'bg-tinta text-white' : 'bg-papel'}`}>{s.nombre}</button>
          ))}
        </div>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-linea overflow-y-auto px-3">
        {lista.map((p) => {
          const v = cesta[p.id];
          return (
            <li key={p.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-sm"><span className="font-medium">{p.nombre}</span> <span className="text-niebla">{euros(p.precio)}</span></span>
                <span className="flex shrink-0 items-center gap-2">
                  {v && <button onClick={() => poner(p.id, -1)} aria-label={`Quitar ${p.nombre}`} className="h-9 w-9 rounded-full bg-papel text-lg font-bold">−</button>}
                  {v && <span className="w-5 text-center font-bold">{v.cantidad}</span>}
                  <button onClick={() => poner(p.id, 1)} aria-label={`Añadir ${p.nombre}`} className="h-9 w-9 rounded-full bg-vino text-lg font-bold text-white">+</button>
                </span>
              </div>
              {v && <input value={v.nota} maxLength={120} onChange={(e) => setCesta((c) => ({ ...c, [p.id]: { ...c[p.id], nota: e.target.value } }))}
                placeholder="Nota (sin cebolla, poco hecho…)" className="mt-1.5 w-full rounded-lg border border-acero bg-white px-2 py-1.5 text-xs" />}
            </li>
          );
        })}
        {lista.length === 0 && <li className="py-6 text-center text-sm text-niebla">Nada coincide con la búsqueda.</li>}
      </ul>
      <div className="border-t border-linea p-3">
        <button disabled={enviando || lineas.length === 0} onClick={() => onEnviar(lineas)} className="w-full rounded-full bg-vino py-3 text-sm font-bold text-white disabled:opacity-40">
          {textoBoton} {lineas.length > 0 ? `· ${lineas.reduce((s, l) => s + l.cantidad, 0)} productos · ${euros(total)}` : ''}
        </button>
        <p className="mt-1 text-center text-[11px] text-ceniza">El precio lo pone siempre tu carta, no se puede cambiar aquí.</p>
      </div>
    </div>
  );
}

function Modal({ titulo, sub, onCerrar, children }: { titulo: string; sub?: string; onCerrar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onCerrar} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()} className="flex h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white text-carbon sm:h-[85vh] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-linea p-4">
          <div><h3 className="text-xl font-black">{titulo}</h3>{sub && <p className="text-sm text-niebla">{sub}</p>}</div>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-1 text-xl text-ceniza">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NuevoPedido({ mesas, abiertas, pedirCarta, onCerrar }: {
  mesas: string[]; abiertas: string[]; pedirCarta: () => Promise<CartaPanel | null>; onCerrar: (cuenta?: string) => void;
}) {
  const [mesa, setMesa] = useState('');
  const [pax, setPax] = useState('');
  const [carta, setCarta] = useState<CartaPanel | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [pendiente, iniciar] = useTransition();
  useEffect(() => { pedirCarta().then(setCarta); }, [pedirCarta]);
  const valida = /^[A-Za-z0-9-]{1,12}$/.test(mesa);
  return (
    <Modal titulo="Nuevo pedido" sub="Elige la mesa y añade los productos" onCerrar={() => onCerrar()}>
      <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-linea p-3">
        <input value={mesa} onChange={(e) => setMesa(e.target.value.trim().slice(0, 12))} list="dk-mesas" placeholder="Mesa (p. ej. 5, T2, Barra-1)" className="rounded-xl border border-acero bg-white px-3 py-2.5 text-sm" />
        <input value={pax} onChange={(e) => setPax(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="Pax" className="w-20 rounded-xl border border-acero bg-white px-3 py-2.5 text-sm" />
        <datalist id="dk-mesas">{mesas.map((m) => <option key={m} value={m} />)}</datalist>
        {mesa && abiertas.includes(mesa) && <p className="col-span-2 text-xs text-amber-700">La mesa {mesa} ya está abierta: los productos se suman a su cuenta.</p>}
      </div>
      {aviso && <p className={`px-4 pt-2 text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}
      {!carta ? <p className="p-6 text-center text-sm text-niebla">Cargando carta…</p> : (
        <Selector carta={carta} enviando={pendiente || !valida} textoBoton={valida ? `Enviar a mesa ${mesa}` : 'Escribe la mesa'}
          onEnviar={(lineas) => iniciar(async () => {
            if (pax) await abrirMesaAction(mesa, Number(pax));
            const r = await anadirRondaAction(mesa, lineas);
            if (!r.ok) { setAviso({ ok: false, texto: r.error }); return; }
            const k = await abrirMesaAction(mesa, null);
            onCerrar(k.ok ? k.datos ?? undefined : undefined);
          })} />
      )}
    </Modal>
  );
}

function DetalleCuenta({ id, tpv, pedirCarta, onCerrar }: { id: string; tpv: boolean; pedirCarta: () => Promise<CartaPanel | null>; onCerrar: () => void }) {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cuentaId, setCuentaId] = useState(id);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [modo, setModo] = useState<'ver' | 'anadir' | 'mover'>('ver');
  const [anulando, setAnulando] = useState<string | null>(null); // id de línea o 'cuenta'
  const [motivo, setMotivo] = useState('');
  const [destino, setDestino] = useState('');
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [carta, setCarta] = useState<CartaPanel | null>(null);
  const [pendiente, iniciar] = useTransition();

  const cargar = useCallback(async () => {
    const r = await cuentaDetalleAction(cuentaId);
    if (r.ok) setCuenta(r.datos); else setAviso({ ok: false, texto: r.error });
  }, [cuentaId]);
  useEffect(() => { cargar(); }, [cargar]);

  const ejecutar = (fn: () => Promise<{ ok: boolean; error?: string; datos?: unknown }>, ok: string, salir = false) => iniciar(async () => {
    const r = await fn();
    if (!r.ok) { setAviso({ ok: false, texto: r.error ?? 'No se pudo completar.' }); return; }
    if (r.datos === false) { setAviso({ ok: false, texto: 'La mesa ya no está abierta o no hubo cambios.' }); await cargar(); return; }
    setAviso({ ok: true, texto: ok }); setAnulando(null); setMotivo(''); setConfirmarCierre(false); setModo('ver');
    if (salir) onCerrar(); else await cargar();
  });

  const abiertaCuenta = cuenta?.estado === 'abierta';
  const activas = cuenta?.lineas.filter((l) => !l.anulada) ?? [];
  const anuladas = cuenta?.lineas.filter((l) => l.anulada) ?? [];

  return (
    <Modal titulo={`Mesa ${cuenta?.mesa ?? '…'}`} sub={cuenta ? `${euros(cuenta.importe)} · ${cuenta.minutos} min${cuenta.comensales ? ` · ${cuenta.comensales} pax` : ''} · abrió ${cuenta.abierta_por ?? 'el encargado'}` : undefined} onCerrar={onCerrar}>
      {aviso && <p className={`px-4 pt-3 text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}

      {modo === 'anadir' && carta ? (
        <>
          <button onClick={() => setModo('ver')} className="px-4 pt-3 text-left text-sm font-semibold text-vino">← Volver a la cuenta</button>
          <Selector carta={carta} enviando={pendiente} textoBoton="Añadir a la mesa"
            onEnviar={(lineas) => ejecutar(() => anadirRondaAction(cuenta!.mesa, lineas), tpv ? 'Ronda añadida y enviada al TPV.' : 'Ronda añadida: aparece en «por pasar».')} />
        </>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-linea overflow-y-auto px-4">
            {activas.map((l) => (
              <li key={l.id} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">{l.nombre}<span className="text-xs text-ceniza"> · {l.camarero ?? 'encargado'}</span></span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {abiertaCuenta && <button disabled={pendiente} onClick={() => ejecutar(() => cambiarCantidadAction(l.id, l.cantidad - 1, ''), l.cantidad > 1 ? 'Cantidad cambiada.' : 'Línea quitada.')} aria-label="Uno menos" className="h-8 w-8 rounded-full bg-papel font-bold">−</button>}
                    <span className="w-6 text-center font-bold">{l.cantidad}</span>
                    {abiertaCuenta && <button disabled={pendiente} onClick={() => ejecutar(() => cambiarCantidadAction(l.id, l.cantidad + 1, ''), 'Cantidad cambiada.')} aria-label="Uno más" className="h-8 w-8 rounded-full bg-papel font-bold">+</button>}
                    <span className="w-16 text-right font-semibold">{euros(l.cantidad * Number(l.precio))}</span>
                  </span>
                </div>
                {l.nota && <p className="text-xs font-semibold text-amber-800">{l.nota}</p>}
                {abiertaCuenta && anulando !== l.id && <button onClick={() => { setAnulando(l.id); setMotivo(''); }} className="text-xs text-red-600">Anular con motivo</button>}
                {anulando === l.id && (
                  <Motivo motivo={motivo} setMotivo={setMotivo} pendiente={pendiente} onCancelar={() => setAnulando(null)}
                    onConfirmar={() => ejecutar(() => anularLineaAction(l.id, motivo), 'Línea anulada.')} />
                )}
              </li>
            ))}
            {activas.length === 0 && <li className="py-6 text-center text-sm text-niebla">Sin productos todavía.</li>}
            {anuladas.length > 0 && (
              <li className="py-2.5">
                <details><summary className="cursor-pointer text-xs text-ceniza">{anuladas.length} {anuladas.length === 1 ? 'línea anulada' : 'líneas anuladas'} (se guardan para tus informes)</summary>
                  <ul className="mt-1 space-y-1 text-xs text-ceniza">{anuladas.map((l) => <li key={l.id}><span className="line-through">{l.cantidad} × {l.nombre}</span> — {l.motivo_anulacion}</li>)}</ul>
                </details>
              </li>
            )}
          </ul>

          {cuenta && (
            <div className="space-y-2 border-t border-linea p-4">
              {abiertaCuenta ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={async () => { const c = await pedirCarta(); if (c) { setCarta(c); setModo('anadir'); } }} className="rounded-full bg-tinta py-2.5 text-sm font-bold text-white">+ Añadir productos</button>
                    <button onClick={() => setModo(modo === 'mover' ? 'ver' : 'mover')} className="rounded-full border border-linea-fuerte py-2.5 text-sm font-bold">Mover / juntar</button>
                  </div>
                  {modo === 'mover' && (
                    <div className="flex gap-2 rounded-xl bg-crema p-2">
                      <input value={destino} onChange={(e) => setDestino(e.target.value.trim().slice(0, 12))} placeholder="A la mesa…" className="min-w-0 flex-1 rounded-lg border border-acero bg-white px-3 py-2 text-sm" />
                      <button disabled={pendiente || !/^[A-Za-z0-9-]{1,12}$/.test(destino)} onClick={() => iniciar(async () => {
                        const r = await moverMesaAction(cuenta.id, destino);
                        if (!r.ok) { setAviso({ ok: false, texto: r.error }); return; }
                        if (!r.datos.ok) { setAviso({ ok: false, texto: 'No se pudo mover (misma mesa o ya cerrada).' }); return; }
                        setAviso({ ok: true, texto: r.datos.juntada ? `Juntada con la mesa ${destino}.` : `Movida a la mesa ${destino}.` });
                        setModo('ver'); setDestino(''); if (r.datos.cuenta) setCuentaId(r.datos.cuenta);
                      })} className="rounded-lg bg-vino px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Mover</button>
                    </div>
                  )}
                  {tpv && <p className="text-center text-[11px] text-amber-700">Los cambios de cantidad y las anulaciones no se envían al TPV: corrígelos también allí.</p>}
                  {confirmarCierre ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setConfirmarCierre(false)} className="rounded-full border border-linea-fuerte py-2.5 text-sm font-bold">Cancelar</button>
                      <button disabled={pendiente} onClick={() => ejecutar(() => cerrarCuentaAction(cuenta.id), 'Mesa cerrada.', true)} className="rounded-full bg-green-700 py-2.5 text-sm font-bold text-white">Sí, cobrada en el TPV</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmarCierre(true)} className="w-full rounded-full bg-vino py-3 text-sm font-bold text-white">Cerrar mesa (cobrada fuera) · {euros(cuenta.importe)}</button>
                  )}
                  {anulando === 'cuenta' ? (
                    <Motivo motivo={motivo} setMotivo={setMotivo} pendiente={pendiente} onCancelar={() => setAnulando(null)}
                      onConfirmar={() => ejecutar(() => anularCuentaAction(cuenta.id, motivo), 'Cuenta anulada.', true)} />
                  ) : (
                    <button onClick={() => { setAnulando('cuenta'); setMotivo(''); }} className="w-full text-xs text-red-600">Anular la cuenta entera (abierta por error)</button>
                  )}
                  <p className="text-center text-[11px] text-ceniza">{cuenta.aviso}. El cobro y el ticket se hacen en tu TPV.</p>
                </>
              ) : (
                <p className="text-center text-sm text-niebla">Esta cuenta ya está {cuenta.estado}.</p>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Motivo({ motivo, setMotivo, pendiente, onCancelar, onConfirmar }: {
  motivo: string; setMotivo: (v: string) => void; pendiente: boolean; onCancelar: () => void; onConfirmar: () => void;
}) {
  const valido = motivo.trim().length >= 3;
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-crema p-2 sm:flex-row">
      <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value.slice(0, 200))} placeholder="Motivo (plato devuelto, error al pedir…)"
        className="min-w-0 flex-1 rounded-lg border border-acero bg-white px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button onClick={onCancelar} className="rounded-lg px-3 py-2 text-sm">Cancelar</button>
        <button disabled={!valido || pendiente} onClick={onConfirmar} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Anular</button>
      </div>
    </div>
  );
}
