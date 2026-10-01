'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useRef, useState, useTransition } from 'react';
import type { ElementoPlano, MesaPlano, Camarero, TipoElemento } from '@/lib/sala';
import { guardarPlanoAction } from '@/app/panel/actions';

type MesaE = MesaPlano & { clave: string };
type ElemE = ElementoPlano & { clave: string };
type Sel = { tipo: 'mesa' | 'elemento'; clave: string } | null;

const COLORES_ZONA = ['#D9531E', '#2F5D50', '#1F4E79', '#C58B2A', '#5B3E8A', '#B23A48'];
const HERRAMIENTAS: { tipo: TipoElemento | 'mesa'; nombre: string }[] = [
  { tipo: 'mesa', nombre: 'Mesa' },
  { tipo: 'zona', nombre: 'Zona' },
  { tipo: 'pared', nombre: 'Pared' },
  { tipo: 'division', nombre: 'División' },
  { tipo: 'barra', nombre: 'Barra' },
  { tipo: 'puerta', nombre: 'Puerta' },
];
/** El lienzo es 4:3: un % de ancho equivale a 4/3 de % de alto. */
const girar = <T extends { ancho: number; alto: number }>(e: T): T => ({ ...e, ancho: e.alto * 0.75, alto: e.ancho * (4 / 3) });
/** Nada puede salir del lienzo: se recorta tamaño y posición. */
const dentro = <T extends { x: number; y: number; ancho: number; alto: number }>(e: T): T => {
  const ancho = Math.min(100, Math.max(0.5, e.ancho)), alto = Math.min(100, Math.max(0.5, e.alto));
  return { ...e, ancho, alto, x: Math.min(100 - ancho, Math.max(0, e.x)), y: Math.min(100 - alto, Math.max(0, e.y)) };
};
const contiene = (z: { x: number; y: number; ancho: number; alto: number }, m: { x: number; y: number; ancho: number; alto: number }) => {
  const cx = m.x + m.ancho / 2, cy = m.y + m.alto / 2;
  return cx >= z.x && cx <= z.x + z.ancho && cy >= z.y && cy <= z.y + z.alto;
};
let contador = 0;
const nueva = () => `n${Date.now()}${contador++}`;

/**
 * Editor de sala a pantalla completa (0028). Todo se edita en memoria y se
 * guarda UNA vez con «Guardar plano» (sin recargar el panel en cada arrastre).
 * Mesas + paredes, divisiones, barra, puertas y zonas (con camarero y color)
 * para que cada camarero tenga su área si el local lo necesita.
 */
export default function EditorSala({
  mesasIniciales, elementosIniciales, camareros, onCerrar,
}: { mesasIniciales: (MesaPlano & { id?: string })[]; elementosIniciales: ElementoPlano[]; camareros: Camarero[]; onCerrar: () => void }) {
  const [mesas, setMesas] = useState<MesaE[]>(mesasIniciales.map((m) => ({ ...m, clave: m.id ?? nueva() })));
  const [elementos, setElementos] = useState<ElemE[]>(elementosIniciales.map((e) => ({ ...e, clave: nueva() })));
  const [sel, setSel] = useState<Sel>(null);
  const [cambios, setCambios] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  // Móvil (informe del probador, 30/09): lienzo más grande, ayuda plegable y zoom para colocar con precisión.
  const [ayuda, setAyuda] = useState(false);
  const [zoom, setZoom] = useState(1);
  const lienzo = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ tipo: 'mesa' | 'elemento'; clave: string; dx: number; dy: number } | null>(null);
  const activos = camareros.filter((c) => c.activo);

  const marcar = () => { setCambios(true); setAviso(null); };
  const pct = (e: React.PointerEvent) => {
    const r = lienzo.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  function anadir(tipo: TipoElemento | 'mesa') {
    marcar();
    if (tipo === 'mesa') {
      const usados = new Set(mesas.map((m) => m.numero));
      let n = mesas.length + 1; while (usados.has(String(n))) n++;
      const m: MesaE = { clave: nueva(), numero: String(n), zona: 'Sala', forma: 'cuadrada', plazas: 4, x: 45, y: 45, ancho: 7, alto: 10, camareroId: null };
      setMesas((l) => [...l, m]); setSel({ tipo: 'mesa', clave: m.clave });
    } else {
      const base = { pared: [5, 5, 60, 1.5], division: [30, 30, 1, 25], barra: [10, 80, 30, 6], puerta: [45, 97, 8, 2], zona: [10, 10, 40, 40] }[tipo];
      const e: ElemE = { clave: nueva(), tipo, x: base[0], y: base[1], ancho: base[2], alto: base[3], etiqueta: tipo === 'zona' ? 'Zona' : tipo === 'barra' ? 'Barra' : null,
        color: tipo === 'zona' ? COLORES_ZONA[elementos.filter((x) => x.tipo === 'zona').length % COLORES_ZONA.length] : null, camareroId: null };
      setElementos((l) => [...l, e]); setSel({ tipo: 'elemento', clave: e.clave });
    }
  }

  function empezar(e: React.PointerEvent, tipo: 'mesa' | 'elemento', clave: string, x: number, y: number) {
    e.stopPropagation();
    const p = pct(e);
    arrastre.current = { tipo, clave, dx: p.x - x, dy: p.y - y };
    setSel({ tipo, clave });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function mover(e: React.PointerEvent) {
    const a = arrastre.current; if (!a) return;
    const p = pct(e);
    const x = p.x - a.dx, y = p.y - a.dy;
    if (a.tipo === 'mesa') setMesas((l) => l.map((m) => (m.clave === a.clave ? dentro({ ...m, x, y }) : m)));
    else setElementos((l) => l.map((el) => (el.clave === a.clave ? dentro({ ...el, x, y }) : el)));
    setCambios(true);
  }
  const soltar = () => { arrastre.current = null; };

  const mesaSel = sel?.tipo === 'mesa' ? mesas.find((m) => m.clave === sel.clave) : undefined;
  const elemSel = sel?.tipo === 'elemento' ? elementos.find((e) => e.clave === sel.clave) : undefined;
  const cambiarMesa = (c: Partial<MesaE>) => { marcar(); setMesas((l) => l.map((m) => (m.clave === mesaSel?.clave ? dentro({ ...m, ...c }) : m))); };
  const cambiarElem = (c: Partial<ElemE>) => { marcar(); setElementos((l) => l.map((e) => (e.clave === elemSel?.clave ? dentro({ ...e, ...c }) : e))); };
  const escalar = (factor: number) => {
    marcar();
    const cambia = <T extends { x: number; y: number; ancho: number; alto: number }>(e: T): T => {
      const ancho = e.ancho * factor, alto = e.alto * factor;
      return dentro({ ...e, ancho, alto, x: e.x - (ancho - e.ancho) / 2, y: e.y - (alto - e.alto) / 2 });
    };
    if (mesaSel) setMesas((l) => l.map((m) => (m.clave === mesaSel.clave ? cambia(m) : m)));
    if (elemSel) setElementos((l) => l.map((e) => (e.clave === elemSel.clave ? cambia(e) : e)));
  };
  const Tamano = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#6B7079]">Tamaño</span>
      <button onClick={() => escalar(1 / 1.15)} aria-label="Hacer más pequeño" className="h-9 w-9 rounded-lg border border-[#D6D6D1] text-lg font-bold">−</button>
      <button onClick={() => escalar(1.15)} aria-label="Hacer más grande" className="h-9 w-9 rounded-lg border border-[#D6D6D1] text-lg font-bold">+</button>
    </div>
  );
  const girarSel = () => {
    marcar();
    if (mesaSel) setMesas((l) => l.map((m) => (m.clave === mesaSel.clave ? dentro(girar(m)) : m)));
    if (elemSel) setElementos((l) => l.map((e) => (e.clave === elemSel.clave ? dentro(girar(e)) : e)));
  };
  const borrar = () => {
    marcar();
    if (mesaSel) setMesas((l) => l.filter((m) => m.clave !== mesaSel.clave));
    if (elemSel) setElementos((l) => l.filter((e) => e.clave !== elemSel.clave));
    setSel(null);
  };

  function guardar() {
    setAviso(null);
    iniciar(async () => {
      try {
        const zonas = elementos.filter((e) => e.tipo === 'zona' && e.camareroId);
        const finales = mesas.map((m) => {
          if (m.camareroId) return m;
          const z = zonas.find((zz) => contiene(zz, m));
          return z ? { ...m, camareroId: z.camareroId } : m;
        });
        setMesas(finales);
        await guardarPlanoAction(finales.map(({ clave: _c, ...m }) => m), elementos.map(({ clave: _c, id: _i, ...e }) => e));
        setCambios(false); setAviso({ ok: true, texto: 'Plano guardado.' });
      } catch (e) { setAviso({ ok: false, texto: mensajeError(e, 'No se pudo guardar.') }); }
    });
  }

  function cerrar() {
    if (cambios && !confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
    onCerrar();
  }

  const campo = 'w-full rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-sm text-[#1B1D22]';
  const nombreCam = (id: string | null) => camareros.find((c) => c.id === id)?.nombre;

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-[#F7F5F2] text-[#1B1D22]" role="dialog" aria-modal="true" aria-label="Editor de sala">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#E6E6E2] px-4 py-3">
        <h2 className="mr-auto font-bold">Editor de sala</h2>
        <div className="flex items-center rounded-lg border border-[#E6E6E2] bg-white" role="group" aria-label="Zoom del plano">
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} aria-label="Alejar" className="h-9 w-9 text-lg font-bold disabled:opacity-30">−</button>
          <span className="w-11 text-center text-xs tabular-nums text-[#6B7079]">{Math.round(zoom * 100)} %</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3} aria-label="Acercar" className="h-9 w-9 text-lg font-bold disabled:opacity-30">+</button>
        </div>
        <button onClick={() => setAyuda((a) => !a)} aria-expanded={ayuda} aria-label="Cómo funciona" className="h-9 w-9 rounded-lg border border-[#E6E6E2] bg-white text-sm font-bold lg:hidden">?</button>
        {aviso && <span className={`text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</span>}
        <button disabled={pendiente || !cambios} onClick={guardar} className="rounded-lg bg-[#6E0C2B] px-4 py-2 text-sm font-bold disabled:opacity-40">
          {pendiente ? 'Guardando…' : cambios ? 'Guardar plano' : 'Guardado'}
        </button>
        <button onClick={cerrar} className="rounded-lg bg-[#EDEDEA] px-3 py-2 text-sm">Cerrar</button>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-[#E6E6E2] px-4 py-2">
        {HERRAMIENTAS.map((h) => (
          <button key={h.tipo} onClick={() => anadir(h.tipo)} className="shrink-0 rounded-lg border border-[#E6E6E2] px-3 py-2 text-sm text-[#3F434B] hover:border-[#D6D6D1]">
            + {h.nombre}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">
          <div ref={lienzo} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onPointerDown={() => { setSel(null); setAyuda(false); }}
            style={zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: 'none' } : undefined}
            className="relative mx-auto aspect-[4/3] w-full max-w-[min(56rem,calc((100dvh-12rem)*4/3))] touch-pan-x touch-pan-y select-none overflow-hidden rounded-xl border border-[#D6D6D1] bg-white bg-[linear-gradient(rgba(23,25,30,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(23,25,30,.06)_1px,transparent_1px)] bg-[size:4%_5.33%]">
            {elementos.map((e) => {
              const s = sel?.clave === e.clave;
              const estilo = e.tipo === 'zona'
                ? { background: `${e.color ?? '#D9531E'}22`, border: `2px dashed ${e.color ?? '#D9531E'}` }
                : e.tipo === 'pared' ? { background: '#3F434B' }
                : e.tipo === 'division' ? { background: '#9A9EA6' }
                : e.tipo === 'barra' ? { background: '#6B4E2E' }
                : { background: '#3a6ea5' };
              return (
                <div key={e.clave} onPointerDown={(ev) => empezar(ev, 'elemento', e.clave, e.x, e.y)}
                  className={`absolute flex cursor-move touch-none items-start justify-start overflow-hidden rounded-sm p-1 text-[10px] font-bold ${s ? 'outline outline-2 outline-[#1B1D22]' : ''}`}
                  style={{ left: `${e.x}%`, top: `${e.y}%`, width: `${e.ancho}%`, height: `${e.alto}%`, ...estilo, zIndex: e.tipo === 'zona' ? 1 : 2 }}>
                  {(e.etiqueta || (e.tipo === 'zona' && nombreCam(e.camareroId))) && (
                    <span className="rounded bg-black/40 px-1 text-[#3F434B]">{e.etiqueta}{e.camareroId ? ` · ${nombreCam(e.camareroId) ?? ''}` : ''}</span>
                  )}
                </div>
              );
            })}
            {mesas.map((m) => {
              const s = sel?.clave === m.clave;
              return (
                <div key={m.clave} onPointerDown={(ev) => empezar(ev, 'mesa', m.clave, m.x, m.y)}
                  className={`absolute z-10 flex cursor-move touch-none flex-col items-center justify-center text-[11px] font-black text-[#1A1714] shadow-md ${m.forma === 'redonda' ? 'rounded-full' : 'rounded-md'} ${s ? 'outline outline-2 outline-[#6E0C2B]' : ''}`}
                  style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.ancho}%`, height: `${m.alto}%`, background: m.camareroId ? '#fff' : '#e7e1d8' }}>
                  {m.numero}
                  <span className="text-[8px] font-medium opacity-60">{m.plazas}p{m.camareroId ? ` · ${nombreCam(m.camareroId)?.slice(0, 6) ?? ''}` : ''}</span>
                </div>
              );
            })}
            {mesas.length === 0 && elementos.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[#6B7079]">Empieza añadiendo paredes y mesas con los botones de arriba. Arrástralos para colocarlos. Pulsa «?» para ver cómo funciona.</p>
            )}
          </div>
        </div>

        <aside className={`max-h-[38vh] w-full shrink-0 overflow-y-auto border-t border-[#E6E6E2] p-4 lg:block lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 ${mesaSel || elemSel || ayuda ? '' : 'hidden'}`}>
          {mesaSel ? (
            <div className="space-y-3">
              <h3 className="font-bold">Mesa {mesaSel.numero}</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="text-xs text-[#6B7079]">Número</span><input value={mesaSel.numero} onChange={(e) => cambiarMesa({ numero: e.target.value.slice(0, 12) })} className={campo} /></label>
                <label className="space-y-1"><span className="text-xs text-[#6B7079]">Plazas</span><input type="number" min={1} max={30} value={mesaSel.plazas} onChange={(e) => cambiarMesa({ plazas: Number(e.target.value) })} className={campo} /></label>
              </div>
              <label className="block space-y-1"><span className="text-xs text-[#6B7079]">Forma</span>
                <select value={mesaSel.forma} onChange={(e) => { const f = e.target.value as MesaE['forma']; cambiarMesa({ forma: f, ancho: f === 'rectangular' ? 12 : 7, alto: f === 'rectangular' ? 8 : 10 }); }} className={campo}>
                  <option value="cuadrada">Cuadrada</option><option value="redonda">Redonda</option><option value="rectangular">Rectangular</option>
                </select></label>
              <label className="block space-y-1"><span className="text-xs text-[#6B7079]">Zona</span><input value={mesaSel.zona} onChange={(e) => cambiarMesa({ zona: e.target.value.slice(0, 30) })} className={campo} /></label>
              <label className="block space-y-1"><span className="text-xs text-[#6B7079]">Camarero</span>
                <select value={mesaSel.camareroId ?? ''} onChange={(e) => cambiarMesa({ camareroId: e.target.value || null })} className={campo}>
                  <option value="">Sin asignar (la toma quien atienda)</option>
                  {activos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select></label>
              <Tamano />
              <div className="flex gap-4"><button onClick={girarSel} className="text-sm text-[#3F434B] underline">Girar 90°</button><button onClick={borrar} className="text-sm text-red-600">Eliminar mesa</button></div>
            </div>
          ) : elemSel ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{{ pared: 'Pared', division: 'División', barra: 'Barra', puerta: 'Puerta', zona: 'Zona' }[elemSel.tipo]}</h3>
                <button onClick={girarSel} className="rounded-lg border border-[#D6D6D1] px-3 py-1.5 text-sm">Girar 90° {elemSel.ancho >= elemSel.alto * 0.75 ? '(ponerla vertical)' : '(ponerla horizontal)'}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="text-xs text-[#6B7079]">Ancho</span><input type="range" min={0.5} max={100} step={0.5} value={elemSel.ancho} onChange={(e) => cambiarElem({ ancho: Number(e.target.value) })} className="w-full" /></label>
                <label className="space-y-1"><span className="text-xs text-[#6B7079]">Alto</span><input type="range" min={0.5} max={100} step={0.5} value={elemSel.alto} onChange={(e) => cambiarElem({ alto: Number(e.target.value) })} className="w-full" /></label>
              </div>
              <Tamano />
              {(elemSel.tipo === 'zona' || elemSel.tipo === 'barra') && (
                <label className="block space-y-1"><span className="text-xs text-[#6B7079]">Nombre</span><input value={elemSel.etiqueta ?? ''} onChange={(e) => cambiarElem({ etiqueta: e.target.value.slice(0, 30) || null })} placeholder="Terraza, Salón…" className={campo} /></label>
              )}
              {elemSel.tipo === 'zona' && (
                <>
                  <div className="flex gap-2">{COLORES_ZONA.map((c) => <button key={c} onClick={() => cambiarElem({ color: c })} aria-label={c} className={`h-7 w-7 rounded-full border-2 ${elemSel.color === c ? 'border-[#D6D6D1]' : 'border-transparent'}`} style={{ background: c }} />)}</div>
                  <label className="block space-y-1"><span className="text-xs text-[#6B7079]">Camarero de esta zona</span>
                    <select value={elemSel.camareroId ?? ''} onChange={(e) => cambiarElem({ camareroId: e.target.value || null })} className={campo}>
                      <option value="">Sin asignar</option>
                      {activos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select></label>
                  <button onClick={() => {
                    const e = elemSel; marcar();
                    setMesas((l) => l.map((m) => (m.x >= e.x && m.x <= e.x + e.ancho && m.y >= e.y && m.y <= e.y + e.alto ? { ...m, camareroId: e.camareroId, zona: e.etiqueta ?? m.zona } : m)));
                  }} className="w-full rounded-lg bg-[#EDEDEA] py-2 text-sm font-semibold">Asignar a este camarero las mesas de la zona</button>
                </>
              )}
              <button onClick={borrar} className="text-sm text-red-600">Eliminar</button>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-[#6B7079]">
              <p className="font-bold text-[#1B1D22]">Cómo funciona</p>
              <p>1. Añade paredes, barra y puertas para dibujar tu local.</p>
              <p>2. Añade las mesas y arrástralas a su sitio.</p>
              <p>3. Crea zonas (Terraza, Salón…) y asígnales un camarero: al guardar, las mesas de la zona sin camarero pasan a ser suyas.</p>
              <p>Paredes, divisiones y barras se ponen en vertical u horizontal con «Girar 90°».</p>
              <p>4. Pulsa <strong>Guardar plano</strong>. Tus camareros lo verán en su móvil.</p>
              <p>En el móvil: usa el zoom (− / +) para acercarte y desliza el fondo con el dedo para moverte por el plano. Con una mesa seleccionada, cambia su tamaño con − / +.</p>
              <p className="pt-2 text-xs">{mesas.length} mesas · {elementos.length} elementos</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
