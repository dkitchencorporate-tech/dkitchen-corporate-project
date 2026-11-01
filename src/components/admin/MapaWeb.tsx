'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Mapa, NodoMapa, ZonaMapa, Capas, CapaPago, CapaPanel } from '@/lib/mapa-web';
import { recorrerMapaAction } from '@/app/admin-dkitchen/mapa/actions';

/**
 * Plano interactivo del mapa de la web (E2, 0106). Cada zona es un territorio sobre un fondo de
 * cuadrícula; cada página, una parcela con su aviso. Al pulsar una, el detalle enseña entradas y
 * salidas (las del menú y el pie, aparte). Filtros: callejones, rotos y flujo de compra.
 */
const ZONAS: { id: ZonaMapa; nombre: string; lema: string; area: string }[] = [
  { id: 'marketing', nombre: 'Marketing', lema: 'Portada, blog y ciudades', area: 'lg:col-span-2' },
  { id: 'qr', nombre: 'Carta QR', lema: 'Producto, demos y cartas', area: 'lg:col-span-2' },
  { id: 'signature', nombre: 'Signature', lema: 'App propia', area: '' },
  { id: 'experience', nombre: 'Experience', lema: 'Eventos y entradas', area: '' },
  { id: 'pago', nombre: 'Pago', lema: 'Altas y solicitudes', area: '' },
  { id: 'panel', nombre: 'Panel', lema: 'Zona cliente y demo', area: '' },
  { id: 'legal', nombre: 'Legal', lema: 'Avisos y condiciones', area: '' },
  { id: 'central', nombre: 'Central', lema: 'Solo administradores', area: '' },
  { id: 'externo', nombre: 'Fuera de la web', lema: 'Destinos externos', area: 'lg:col-span-2' },
];
type Filtro = 'todo' | 'callejones' | 'rotos' | 'compra';
const fecha = (s: string) => new Date(s).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

function tono(n: NodoMapa) {
  if (n.roto) return 'border-[#E0607E] bg-[#E0607E]/20 text-[#FFD3DC]';
  if (n.callejon) return 'border-oro bg-oro/20 text-[#FBE7B0]';
  if (n.externo) return 'border-white/15 bg-white/5 text-white/55';
  if (n.estado_http === null) return 'border-dashed border-white/25 text-white/55';
  return 'border-white/15 bg-white/[0.07] text-white/85';
}

/* E4 (9703bd13): capas sobre el mismo plano. Pago = embudo de las páginas de pago (0032); Panel = seguimiento
   de los pilotos dentro del panel (0078/0115), con una parcela por pantalla aunque el recorrido no entre en /panel. */
type Capa = 'estructura' | 'pago' | 'panel';
const pctDe = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
function tonoPago(p: CapaPago) {
  if (!p.visitas) return 'border-white/15 bg-white/[0.04] text-white/55';
  const c = pctDe(p.pagados, p.visitas);
  return c >= 5 ? 'border-[#5FD3A4] bg-[#5FD3A4]/20 text-[#D7FBEA]' : p.checkout > 0 ? 'border-oro bg-oro/20 text-[#FBE7B0]' : 'border-[#E0607E] bg-[#E0607E]/20 text-[#FFD3DC]';
}
function tonoPanel(p: CapaPanel, max: number) {
  if (p.errores > 0) return 'border-[#E0607E] bg-[#E0607E]/20 text-[#FFD3DC]';
  const f = (p.clics + p.vistas) / Math.max(1, max);
  return f > 0.5 ? 'border-oro bg-oro/30 text-[#FBE7B0]' : f > 0.15 ? 'border-oro/60 bg-oro/15 text-[#FBE7B0]' : 'border-white/15 bg-white/[0.07] text-white/85';
}

export default function MapaWeb({ mapa, capas, dias = 30 }: { mapa: Mapa; capas?: Capas; dias?: number }) {
  const router = useRouter();
  const [capa, setCapa] = useState<Capa>('estructura');
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [buscar, setBuscar] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [recorriendo, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pagoPorUrl = useMemo(() => new Map((capas?.pago ?? []).map((p) => [p.url, p])), [capas]);
  const panelPorUrl = useMemo(() => new Map((capas?.panel ?? []).map((p) => [p.url, p])), [capas]);
  const maxPanel = Math.max(1, ...(capas?.panel ?? []).map((p) => p.clics + p.vistas));
  // Parcelas que el recorrido no ve (pantallas del panel con sesión, páginas de pago sin enlace) se añaden en su capa.
  const nodos = useMemo<NodoMapa[]>(() => {
    const hay = new Set(mapa.nodos.map((n) => n.url));
    const extra = (url: string, zona: ZonaMapa, titulo: string): NodoMapa => ({ url, zona, titulo, estado_http: null, ms: null, callejon: false, roto: false, externo: false });
    if (capa === 'pago') return [...mapa.nodos, ...(capas?.pago ?? []).filter((p) => !hay.has(p.url)).map((p) => extra(p.url, 'pago', p.nombre))];
    if (capa === 'panel') return [...mapa.nodos, ...(capas?.panel ?? []).filter((p) => !hay.has(p.url)).map((p) => extra(p.url, 'panel', `Panel · ${p.pantalla}`))];
    return mapa.nodos;
  }, [mapa, capas, capa]);

  const { porUrl, entradas, salidas, compra } = useMemo(() => {
    const porUrl = new Map(nodos.map((n) => [n.url, n]));
    const entradas = new Map<string, typeof mapa.aristas>();
    const salidas = new Map<string, typeof mapa.aristas>();
    for (const a of mapa.aristas) {
      (entradas.get(a.d) ?? entradas.set(a.d, []).get(a.d)!).push(a);
      (salidas.get(a.o) ?? salidas.set(a.o, []).get(a.o)!).push(a);
    }
    // Flujo de compra: páginas desde las que se llega a Pago por enlaces propios (sin contar menú y pie).
    const compra = new Set(mapa.nodos.filter((n) => n.zona === 'pago').map((n) => n.url));
    const cola = [...compra];
    while (cola.length) {
      const u = cola.pop()!;
      for (const a of entradas.get(u) ?? []) if (!a.g && !compra.has(a.o)) { compra.add(a.o); cola.push(a.o); }
    }
    return { porUrl, entradas, salidas, compra };
  }, [mapa, nodos]);
  const enCapa = (n: NodoMapa) => capa === 'estructura' || (capa === 'pago' ? pagoPorUrl.has(n.url) : panelPorUrl.has(n.url));
  const tonoNodo = (n: NodoMapa) => {
    if (capa === 'pago' && pagoPorUrl.has(n.url)) return tonoPago(pagoPorUrl.get(n.url)!);
    if (capa === 'panel' && panelPorUrl.has(n.url)) return tonoPanel(panelPorUrl.get(n.url)!, maxPanel);
    return tono(n);
  };
  const cifra = (n: NodoMapa) => {
    const p = capa === 'pago' ? pagoPorUrl.get(n.url) : undefined;
    if (p) return ` · ${p.visitas}→${p.pagados}`;
    const q = capa === 'panel' ? panelPorUrl.get(n.url) : undefined;
    if (q) return ` · ${q.clics} clics${q.errores ? ` · ${q.errores} ⚠` : ''}`;
    return '';
  };

  const visible = (n: NodoMapa) =>
    (filtro === 'todo' || (filtro === 'callejones' && n.callejon) || (filtro === 'rotos' && n.roto) || (filtro === 'compra' && compra.has(n.url)))
    && (!buscar || n.url.toLowerCase().includes(buscar.toLowerCase()) || (n.titulo ?? '').toLowerCase().includes(buscar.toLowerCase()));
  const r = mapa.recorrido;
  const nodo = sel ? porUrl.get(sel) ?? null : null;

  function recorrer() {
    setError(null);
    iniciar(async () => {
      const x = await recorrerMapaAction().catch(() => ({ ok: false as const, error: 'Se cortó la conexión durante el recorrido. Recarga en un minuto: puede haberse guardado.' }));
      if (x.ok) { setSel(null); router.push('/admin-dkitchen/mapa'); router.refresh(); } else setError(x.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {([['Páginas', r?.paginas ?? 0, ''], ['Callejones', r?.callejones ?? 0, 'callejones'], ['Rotos', r?.rotos ?? 0, 'rotos'], ['Externos', r?.externos ?? 0, '']] as [string, number, Filtro | ''][]).map(([t, n, f]) => (
            <button key={t} disabled={!f} onClick={() => f && setFiltro(filtro === f ? 'todo' : f)}
              className={`rounded-[22px] border bg-white p-4 text-left transition ${f && filtro === f ? 'border-vino ring-2 ring-vino/20' : 'border-linea'} ${f ? 'hover:border-vino/50' : 'cursor-default'}`}>
              <p className="text-xs text-niebla">{t}</p>
              <p className={`font-display mt-1 text-3xl font-semibold ${t !== 'Páginas' && t !== 'Externos' && n > 0 ? 'text-vino' : ''}`}>{n}</p>
            </button>
          ))}
        </div>
        <div className="w-full sm:w-auto">
          <button onClick={recorrer} disabled={recorriendo} className="w-full rounded-full bg-vino px-6 py-3 text-sm font-semibold text-white hover:bg-vino-hondo disabled:opacity-60">
            {recorriendo ? 'Recorriendo la web… (1–4 min)' : 'Recorrer ahora'}
          </button>
          <p className="mt-1 text-center text-[11px] text-niebla">{r ? `Último: ${fecha(r.creado_en)} · ${Math.round(r.duracion_ms / 1000)} s` : 'Aún no hay ningún recorrido'}</p>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Capa del mapa" data-testid="capas-mapa">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-niebla">Capa</span>
        <div className="flex rounded-full bg-noche p-1">
          {([['estructura', 'Estructura'], ['pago', `Pago · ${capas?.pago.reduce((a, p) => a + p.pagados, 0) ?? 0} pagos`], ['panel', `Panel · ${capas?.panel.length ?? 0} pantallas`]] as [Capa, string][]).map(([c, t]) => (
            <button key={c} onClick={() => { setCapa(c); setSel(null); }} aria-pressed={capa === c}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${capa === c ? 'bg-oro text-noche shadow-[0_6px_18px_-8px_rgba(217,178,92,.8)]' : 'text-white/70 hover:text-white'}`}>{t}</button>
          ))}
        </div>
        <span className="text-[11px] text-niebla">Últimos {dias} días{capa === 'pago' ? ' · detalle en ' : capa === 'panel' ? ' · por local en la ficha (Seguimiento)' : ''}
          {capa === 'pago' && <a href={`/admin-dkitchen/embudo?dias=${dias}`} className="font-semibold text-vino underline">Embudo</a>}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([['todo', 'Todo'], ['callejones', 'Solo callejones'], ['rotos', 'Solo rotos'], ['compra', 'Solo flujo de compra']] as [Filtro, string][]).map(([f, t]) => (
          <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filtro === f ? 'bg-noche text-oro' : 'border border-linea bg-white text-niebla hover:text-tinta'}`}>{t}</button>
        ))}
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar una URL o un título" aria-label="Buscar una URL o un título"
          className="ml-auto w-full rounded-full border border-linea bg-white px-4 py-2 text-sm sm:w-64" />
        {mapa.recorridos.length > 1 && (
          <select aria-label="Recorrido" value={r?.id ?? ''} onChange={(e) => { setSel(null); router.push(`/admin-dkitchen/mapa?r=${e.target.value}`); }}
            className="rounded-full border border-linea bg-white px-3 py-2 text-sm">
            {mapa.recorridos.map((x) => <option key={x.id} value={x.id}>{fecha(x.creado_en)} · {x.callejones} callejones · {x.rotos} rotos</option>)}
          </select>
        )}
      </div>

      {!r ? (
        <div className="rounded-[28px] bg-noche p-10 text-center text-crema">
          <p className="font-display text-2xl">Todavía no hay mapa</p>
          <p className="mt-2 text-sm text-crema/70">Pulsa «Recorrer ahora» y en unos minutos tendrás cada página de la web en su sitio.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          {/* El plano: territorios sobre cuadrícula */}
          <div className="relative overflow-hidden rounded-[28px] bg-noche p-4 sm:p-6"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
            <div className="grid gap-4 lg:grid-cols-4">
              {ZONAS.map((z) => {
                const todas = nodos.filter((n) => n.zona === z.id);
                const ns = todas.filter(visible);
                if (!todas.length) return null;
                const avisos = todas.filter((n) => n.callejon || n.roto).length;
                return (
                  <section key={z.id} aria-label={`Zona ${z.nombre}`} className={`rounded-[22px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-[1px] transition-all duration-500 ${(capa === 'panel' && z.id === 'panel') || (capa === 'pago' && z.id === 'pago') ? 'order-first border-oro/40 lg:col-span-4' : z.area}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-crema">{z.nombre}</h3>
                      <span className="text-[11px] tabular-nums text-white/50">{todas.length}{avisos ? <span className="ml-1.5 font-bold text-oro">· {avisos} ⚑</span> : null}</span>
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">{z.lema}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ns.map((n) => (
                        <button key={n.url} onClick={() => setSel(n.url)} title={n.titulo ?? n.url}
                          className={`max-w-full truncate rounded-lg border px-2 py-1 text-left font-mono text-[11px] transition duration-300 hover:brightness-125 ${tonoNodo(n)} ${enCapa(n) ? '' : 'opacity-25'} ${sel === n.url ? 'ring-2 ring-oro' : ''}`}>
                          {n.externo ? n.url.replace(/^www\./, '') : n.url}{cifra(n) && <b className="font-sans font-bold">{cifra(n)}</b>}
                        </button>
                      ))}
                      {!ns.length && <p className="text-xs text-white/35">Nada con este filtro.</p>}
                    </div>
                  </section>
                );
              })}
            </div>
            {capa === 'pago' && (
              <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/60">
                <span>Cifra = entran → pagan.</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-[#5FD3A4] bg-[#5FD3A4]/30" />Convierte (≥ 5 %)</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-oro bg-oro/30" />Van a pagar, pocos pagan</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-[#E0607E] bg-[#E0607E]/30" />Entran y nadie va a pagar</span>
              </div>
            )}
            {capa === 'panel' && (
              <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/60">
                <span>{capas?.panel.length ? 'Pantallas del panel que usan los pilotos en seguimiento.' : 'Sin actividad de pilotos en seguimiento en este periodo.'}</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-oro bg-oro/30" />Más uso</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-[#E0607E] bg-[#E0607E]/30" />Con errores</span>
              </div>
            )}
            <div className={`mt-4 flex flex-wrap gap-3 text-[11px] text-white/60 ${capa === 'estructura' ? '' : 'hidden'}`}>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-oro bg-oro/30" />Callejón</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-[#E0607E] bg-[#E0607E]/30" />Roto</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-dashed border-white/40" />Enlazada, no recorrida</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-white/20 bg-white/10" />Bien</span>
            </div>
          </div>

          {/* Detalle de la página elegida */}
          <aside className="rounded-[28px] border border-linea bg-white p-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            {!nodo ? (
              <p className="text-sm text-niebla">Pulsa una página del plano para ver de dónde se llega a ella, adónde lleva y sus avisos.</p>
            ) : (
              <>
                {capa === 'pago' && pagoPorUrl.has(nodo.url) && <DetallePago p={pagoPorUrl.get(nodo.url)!} dias={dias} />}
                {capa === 'panel' && panelPorUrl.has(nodo.url) && <DetallePanel p={panelPorUrl.get(nodo.url)!} />}
                <Detalle nodo={nodo} entradas={entradas.get(nodo.url) ?? []} salidas={salidas.get(nodo.url) ?? []} enCompra={compra.has(nodo.url)} ir={setSel} />
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function DetallePago({ p, dias }: { p: CapaPago; dias: number }) {
  const pasos: [string, number][] = [['Entran', p.visitas], ['Rellenan', p.interes], ['Van a pagar', p.checkout], ['Pagan', p.pagados]];
  return (
    <div className="mb-5 rounded-2xl bg-noche p-4 text-white" data-testid="detalle-pago">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-oro">Capa Pago · {dias} días</p>
      <p className="font-display mt-1 text-lg font-semibold">{p.nombre}</p>
      <ul className="mt-3 space-y-1.5">
        {pasos.map(([t, n]) => (
          <li key={t}>
            <p className="flex justify-between text-xs"><span>{t}</span><b className="tabular-nums">{n}{t !== 'Entran' && p.visitas ? <span className="font-normal text-white/50"> · {pctDe(n, p.visitas)} %</span> : null}</b></p>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-oro transition-[width] duration-500" style={{ width: `${Math.max(2, pctDe(n, Math.max(1, p.visitas)))}%` }} /></div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-white/55">{p.salidas} se fueron sin pagar · {p.segundos} s de media en la página</p>
    </div>
  );
}

function DetallePanel({ p }: { p: CapaPanel }) {
  return (
    <div className="mb-5 rounded-2xl bg-noche p-4 text-white" data-testid="detalle-panel">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-oro">Capa Panel · pilotos en seguimiento</p>
      <p className="font-display mt-1 text-lg font-semibold">Pantalla «{p.pantalla}»</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {([['Vistas', p.vistas], ['Clics', p.clics], ['Errores', p.errores], ['Sesiones', p.sesiones], ['Locales', p.locales], ['Salidas', p.salidas]] as [string, number][]).map(([t, n]) => (
          <div key={t} className={`rounded-xl px-1 py-2 ${t === 'Errores' && n > 0 ? 'bg-[#E0607E]/25' : 'bg-white/[0.06]'}`}><b className="font-display block text-xl tabular-nums">{n}</b><span className="text-[10px] text-white/55">{t}</span></div>
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-white/75">
        {p.ms_medio > 0 && <li>Tiempo medio: <b>{Math.round(p.ms_medio / 1000)} s</b></li>}
        {p.top && <li>Lo más pulsado: <b>{p.top}</b></li>}
        {p.ultimo_error && <li className="text-[#FFD3DC]">Último error: {p.ultimo_error}</li>}
      </ul>
    </div>
  );
}

function Detalle({ nodo, entradas, salidas, enCompra, ir }: { nodo: NodoMapa; entradas: Mapa['aristas']; salidas: Mapa['aristas']; enCompra: boolean; ir: (u: string) => void }) {
  const propias = salidas.filter((a) => !a.g && a.d !== nodo.url);
  const globales = salidas.filter((a) => a.g).length;
  const desde = entradas.filter((a) => !a.g && a.o !== nodo.url);
  const desdeMenu = entradas.filter((a) => a.g).length;
  const Lista = ({ items, campo }: { items: Mapa['aristas']; campo: 'o' | 'd' }) => (
    <ul className="mt-2 space-y-1">
      {items.slice(0, 40).map((a) => (
        <li key={`${a.o}|${a.d}|${a.f}`}>
          <button onClick={() => ir(a[campo])} className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-crema">
            <span className="block truncate font-mono text-[12px]">{a[campo]}</span>
            {a.t && <span className="block truncate text-[11px] text-niebla">{a.f ? '📝 ' : ''}«{a.t}»</span>}
          </button>
        </li>
      ))}
      {items.length > 40 && <li className="px-2 text-[11px] text-niebla">… y {items.length - 40} más</li>}
    </ul>
  );
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-vino">{nodo.externo ? 'Destino externo' : `Zona ${nodo.zona}`}</p>
      <h3 className="mt-1 break-all font-mono text-sm font-semibold">{nodo.url}</h3>
      {nodo.titulo && <p className="mt-1 text-sm text-niebla">{nodo.titulo}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
        {nodo.roto && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-red-700">Roto · {nodo.estado_http ?? 'sin respuesta'}</span>}
        {nodo.callejon && <span className="rounded-full bg-oro/25 px-2.5 py-1 text-tinta">Callejón: sin salida propia</span>}
        {enCompra && <span className="rounded-full bg-vino/10 px-2.5 py-1 text-vino">En el flujo de compra</span>}
        {!nodo.externo && nodo.estado_http === null && !nodo.roto && <span className="rounded-full bg-crema px-2.5 py-1 text-niebla">Enlazada, no recorrida</span>}
        {nodo.estado_http && !nodo.roto && <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-green-700">{nodo.estado_http} · {nodo.ms} ms</span>}
      </div>
      {!nodo.externo && <a href={nodo.url} target="_blank" rel="noopener" className="mt-3 inline-block text-sm font-semibold text-vino underline">Abrir la página</a>}
      <div className="mt-5 border-t border-linea pt-4">
        <p className="text-sm font-semibold">Salidas propias ({propias.length}){globales ? <span className="font-normal text-niebla"> + {globales} del menú y el pie</span> : null}</p>
        {propias.length ? <Lista items={propias} campo="d" /> : <p className="mt-1 text-xs text-niebla">{nodo.externo ? 'Fuera de la web.' : 'Ninguna: añade un botón o un «volver».'}</p>}
      </div>
      <div className="mt-5 border-t border-linea pt-4">
        <p className="text-sm font-semibold">Se llega desde ({desde.length}){desdeMenu ? <span className="font-normal text-niebla"> + el menú y el pie</span> : null}</p>
        {desde.length ? <Lista items={desde} campo="o" /> : <p className="mt-1 text-xs text-niebla">Ninguna página la enlaza en su contenido.</p>}
      </div>
    </div>
  );
}
