'use client';

import { useRef, useState, useTransition } from 'react';
import type { ElementoPlano, MesaPlano, Camarero, TipoElemento } from '@/lib/sala';
import { guardarPlanoAction } from '@/app/panel/actions';

type MesaE = MesaPlano & { clave: string };
type ElemE = ElementoPlano & { clave: string };
type Sel = { tipo: 'mesa' | 'elemento'; clave: string } | null;

const COLORES_ZONA = ['#D9531E', '#2F5D50', '#1F4E79', '#C58B2A', '#5B3E8A', '#B23A48'];
const HERRAMIENTAS: { tipo: TipoElemento | 'mesa'; nombre: string; icono: string }[] = [
  { tipo: 'mesa', nombre: 'Mesa', icono: '🪑' },
  { tipo: 'zona', nombre: 'Zona', icono: '🟧' },
  { tipo: 'pared', nombre: 'Pared', icono: '🧱' },
  { tipo: 'division', nombre: 'División', icono: '▭' },
  { tipo: 'barra', nombre: 'Barra', icono: '🍸' },
  { tipo: 'puerta', nombre: 'Puerta', icono: '🚪' },
];
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
    const x = Math.min(99, Math.max(0, p.x - a.dx)); const y = Math.min(99, Math.max(0, p.y - a.dy));
    if (a.tipo === 'mesa') setMesas((l) => l.map((m) => (m.clave === a.clave ? { ...m, x, y } : m)));
    else setElementos((l) => l.map((el) => (el.clave === a.clave ? { ...el, x, y } : el)));
    setCambios(true);
  }
  const soltar = () => { arrastre.current = null; };

  const mesaSel = sel?.tipo === 'mesa' ? mesas.find((m) => m.clave === sel.clave) : undefined;
  const elemSel = sel?.tipo === 'elemento' ? elementos.find((e) => e.clave === sel.clave) : undefined;
  const cambiarMesa = (c: Partial<MesaE>) => { marcar(); setMesas((l) => l.map((m) => (m.clave === mesaSel?.clave ? { ...m, ...c } : m))); };
  const cambiarElem = (c: Partial<ElemE>) => { marcar(); setElementos((l) => l.map((e) => (e.clave === elemSel?.clave ? { ...e, ...c } : e))); };
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
        await guardarPlanoAction(mesas.map(({ clave: _c, ...m }) => m), elementos.map(({ clave: _c, id: _i, ...e }) => e));
        setCambios(false); setAviso({ ok: true, texto: 'Plano guardado.' });
      } catch (e) { setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar.' }); }
    });
  }

  function cerrar() {
    if (cambios && !confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
    onCerrar();
  }

  const campo = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white';
  const nombreCam = (id: string | null) => camareros.find((c) => c.id === id)?.nombre;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#120d08] text-white" role="dialog" aria-modal="true" aria-label="Editor de sala">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <h2 className="mr-auto font-bold">Editor de sala</h2>
        {aviso && <span className={`text-sm ${aviso.ok ? 'text-green-400' : 'text-red-400'}`}>{aviso.texto}</span>}
        <button disabled={pendiente || !cambios} onClick={guardar} className="rounded-lg bg-[#D9531E] px-4 py-2 text-sm font-bold disabled:opacity-40">
          {pendiente ? 'Guardando…' : cambios ? 'Guardar plano' : 'Guardado'}
        </button>
        <button onClick={cerrar} className="rounded-lg bg-white/10 px-3 py-2 text-sm">Cerrar</button>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-2">
        {HERRAMIENTAS.map((h) => (
          <button key={h.tipo} onClick={() => anadir(h.tipo)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
            <span>{h.icono}</span> + {h.nombre}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div ref={lienzo} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onPointerDown={() => setSel(null)}
            className="relative mx-auto aspect-[4/3] w-full max-w-4xl touch-none select-none rounded-xl border border-white/15 bg-[#1c140b] bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:4%_5.33%]">
            {elementos.map((e) => {
              const s = sel?.clave === e.clave;
              const estilo = e.tipo === 'zona'
                ? { background: `${e.color ?? '#D9531E'}22`, border: `2px dashed ${e.color ?? '#D9531E'}` }
                : e.tipo === 'pared' ? { background: '#d6d0c8' }
                : e.tipo === 'division' ? { background: '#8c857d' }
                : e.tipo === 'barra' ? { background: '#6B4E2E' }
                : { background: '#3a6ea5' };
              return (
                <div key={e.clave} onPointerDown={(ev) => empezar(ev, 'elemento', e.clave, e.x, e.y)}
                  className={`absolute flex cursor-move items-start justify-start overflow-hidden rounded-sm p-1 text-[10px] font-bold ${s ? 'outline outline-2 outline-white' : ''}`}
                  style={{ left: `${e.x}%`, top: `${e.y}%`, width: `${e.ancho}%`, height: `${e.alto}%`, ...estilo, zIndex: e.tipo === 'zona' ? 1 : 2 }}>
                  {(e.etiqueta || (e.tipo === 'zona' && nombreCam(e.camareroId))) && (
                    <span className="rounded bg-black/40 px-1 text-white/90">{e.etiqueta}{e.camareroId ? ` · ${nombreCam(e.camareroId) ?? ''}` : ''}</span>
                  )}
                </div>
              );
            })}
            {mesas.map((m) => {
              const s = sel?.clave === m.clave;
              return (
                <div key={m.clave} onPointerDown={(ev) => empezar(ev, 'mesa', m.clave, m.x, m.y)}
                  className={`absolute z-10 flex cursor-move flex-col items-center justify-center text-[11px] font-black text-[#1A1714] shadow-md ${m.forma === 'redonda' ? 'rounded-full' : 'rounded-md'} ${s ? 'outline outline-2 outline-[#D9531E]' : ''}`}
                  style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.ancho}%`, height: `${m.alto}%`, background: m.camareroId ? '#fff' : '#e7e1d8' }}>
                  {m.numero}
                  <span className="text-[8px] font-medium opacity-60">{m.plazas}p{m.camareroId ? ` · ${nombreCam(m.camareroId)?.slice(0, 6) ?? ''}` : ''}</span>
                </div>
              );
            })}
            {mesas.length === 0 && elementos.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/40">Empieza añadiendo paredes y mesas con los botones de arriba. Arrástralos para colocarlos.</p>
            )}
          </div>
        </div>

        <aside className="max-h-[42vh] w-full shrink-0 overflow-y-auto border-t border-white/10 p-4 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          {mesaSel ? (
            <div className="space-y-3">
              <h3 className="font-bold">Mesa {mesaSel.numero}</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="text-xs text-white/50">Número</span><input value={mesaSel.numero} onChange={(e) => cambiarMesa({ numero: e.target.value.slice(0, 12) })} className={campo} /></label>
                <label className="space-y-1"><span className="text-xs text-white/50">Plazas</span><input type="number" min={1} max={30} value={mesaSel.plazas} onChange={(e) => cambiarMesa({ plazas: Number(e.target.value) })} className={campo} /></label>
              </div>
              <label className="block space-y-1"><span className="text-xs text-white/50">Forma</span>
                <select value={mesaSel.forma} onChange={(e) => { const f = e.target.value as MesaE['forma']; cambiarMesa({ forma: f, ancho: f === 'rectangular' ? 12 : 7, alto: f === 'rectangular' ? 8 : 10 }); }} className={campo}>
                  <option value="cuadrada">Cuadrada</option><option value="redonda">Redonda</option><option value="rectangular">Rectangular</option>
                </select></label>
              <label className="block space-y-1"><span className="text-xs text-white/50">Zona</span><input value={mesaSel.zona} onChange={(e) => cambiarMesa({ zona: e.target.value.slice(0, 30) })} className={campo} /></label>
              <label className="block space-y-1"><span className="text-xs text-white/50">Camarero</span>
                <select value={mesaSel.camareroId ?? ''} onChange={(e) => cambiarMesa({ camareroId: e.target.value || null })} className={campo}>
                  <option value="">Sin asignar (la toma quien atienda)</option>
                  {activos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select></label>
              <button onClick={borrar} className="text-sm text-red-400">Eliminar mesa</button>
            </div>
          ) : elemSel ? (
            <div className="space-y-3">
              <h3 className="font-bold capitalize">{elemSel.tipo}</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="text-xs text-white/50">Ancho</span><input type="range" min={0.5} max={100} step={0.5} value={elemSel.ancho} onChange={(e) => cambiarElem({ ancho: Number(e.target.value) })} className="w-full" /></label>
                <label className="space-y-1"><span className="text-xs text-white/50">Alto</span><input type="range" min={0.5} max={100} step={0.5} value={elemSel.alto} onChange={(e) => cambiarElem({ alto: Number(e.target.value) })} className="w-full" /></label>
              </div>
              {(elemSel.tipo === 'zona' || elemSel.tipo === 'barra') && (
                <label className="block space-y-1"><span className="text-xs text-white/50">Nombre</span><input value={elemSel.etiqueta ?? ''} onChange={(e) => cambiarElem({ etiqueta: e.target.value.slice(0, 30) || null })} placeholder="Terraza, Salón…" className={campo} /></label>
              )}
              {elemSel.tipo === 'zona' && (
                <>
                  <div className="flex gap-2">{COLORES_ZONA.map((c) => <button key={c} onClick={() => cambiarElem({ color: c })} aria-label={c} className={`h-7 w-7 rounded-full border-2 ${elemSel.color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}</div>
                  <label className="block space-y-1"><span className="text-xs text-white/50">Camarero de esta zona</span>
                    <select value={elemSel.camareroId ?? ''} onChange={(e) => cambiarElem({ camareroId: e.target.value || null })} className={campo}>
                      <option value="">Sin asignar</option>
                      {activos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select></label>
                  <button onClick={() => {
                    const e = elemSel; marcar();
                    setMesas((l) => l.map((m) => (m.x >= e.x && m.x <= e.x + e.ancho && m.y >= e.y && m.y <= e.y + e.alto ? { ...m, camareroId: e.camareroId, zona: e.etiqueta ?? m.zona } : m)));
                  }} className="w-full rounded-lg bg-white/10 py-2 text-sm font-semibold">Asignar a este camarero las mesas de la zona</button>
                </>
              )}
              <button onClick={borrar} className="text-sm text-red-400">Eliminar</button>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-white/55">
              <p className="font-bold text-white">Cómo funciona</p>
              <p>1. Añade paredes, barra y puertas para dibujar tu local.</p>
              <p>2. Añade las mesas y arrástralas a su sitio.</p>
              <p>3. Crea zonas (Terraza, Salón…) y asígnales un camarero: con un toque, todas sus mesas pasan a ser suyas.</p>
              <p>4. Pulsa <strong>Guardar plano</strong>. Tus camareros lo verán en su móvil.</p>
              <p className="pt-2 text-xs">{mesas.length} mesas · {elementos.length} elementos</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
