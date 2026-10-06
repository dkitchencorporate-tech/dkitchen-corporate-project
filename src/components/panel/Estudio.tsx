'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useMemo, useState, useTransition } from 'react';
import type { SeccionPropia, PlatoPropio } from '@/lib/menu-propietario';
import type { ExtraPlato, DatosLegal } from '@/lib/estudio';
import {
  crearSeccionAction, editarSeccionAction, eliminarSeccionAction, eliminarPlatoAction,
  guardarExtrasPlatoAction, guardarComboAction, guardarLegalAction, moverSeccionAction, guardarDescripcionSeccionAction, crearPlatoRapidoAction,
} from '@/app/panel/actions';
import SubirImagen from './SubirImagen';
import HerramientasTexto from './HerramientasTexto';

/**
 * Estudio de carta (30/09/2026, 0037): donde se construye la carta.
 * «Platos» queda para los cambios rápidos del día; aquí se organizan las
 * categorías, se marcan especiales y promociones, se crean combos con precio
 * cerrado y se publican las páginas legales del negocio.
 */
type Zona = 'categorias' | 'destacados' | 'combos' | 'legal';
const ZONAS: { id: Zona; nombre: string; ayuda: string }[] = [
  { id: 'categorias', nombre: 'Categorías', ayuda: 'Las secciones de tu carta: entrantes, principales, postres, bebidas…' },
  { id: 'destacados', nombre: 'Especiales y promociones', ayuda: 'Marca platos como Especial, Nuevo o Recomendado y pon precios de promoción con fechas.' },
  { id: 'combos', nombre: 'Combos', ayuda: 'Agrupa platos con un precio cerrado. La carta muestra lo que incluye y cuánto se ahorra.' },
  { id: 'legal', nombre: 'Páginas legales', ayuda: 'Aviso legal, privacidad y cookies de tu negocio, generados con tus datos.' },
];
const euros = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const campo = 'w-full rounded-xl border border-linea bg-white px-3 py-2.5 text-sm placeholder-ceniza focus:border-vino focus:outline-none';
const tarjeta = 'rounded-[22px] border border-linea bg-white p-5 sm:p-6';
const botonPrincipal = 'rounded-full bg-vino px-5 py-2.5 text-sm font-semibold text-white hover:bg-vino-hondo disabled:opacity-40';

export default function Estudio({
  secciones, platos, extras, legal, restaurante, demo = false, irAPlatos,
}: {
  secciones: SeccionPropia[];
  platos: PlatoPropio[];
  extras: ExtraPlato[];
  legal: DatosLegal;
  restaurante: { slug: string; nombre: string; direccion: string | null };
  /** Panel de demostración: nada se guarda. */
  demo?: boolean;
  /** Lleva a Carta → Platos (fotos y alérgenos). */
  irAPlatos?: () => void;
}) {
  const [zona, setZona] = useState<Zona>('categorias');
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const extra = useMemo(() => new Map(extras.map((e) => [e.id, e])), [extras]);
  const normales = platos.filter((p) => !extra.get(p.id)?.esCombo);
  const combos = platos.filter((p) => extra.get(p.id)?.esCombo);

  const ejecutar = (fn: () => Promise<unknown>, ok: string) => {
    if (demo) { setAviso({ ok: true, texto: 'Esto es una demostración: en tu panel real este cambio se guardaría y aparecería en tu carta al momento.' }); return; }
    setAviso(null);
    iniciar(async () => {
      try {
        const r = await fn();
        if (r && typeof r === 'object' && 'ok' in r && r.ok === false) throw new Error(String((r as { error?: string }).error ?? ''));
        setAviso({ ok: true, texto: ok });
      }
      catch (e) { setAviso({ ok: false, texto: mensajeError(e, 'No se pudo guardar.') }); }
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Estudio de carta</h2>
        <p className="mt-1 max-w-2xl text-sm text-niebla">Aquí construyes y organizas tu carta. Los cambios rápidos del día (precio, agotado, foto) siguen en <strong className="text-grafito">Platos</strong>.</p>
      </header>

      <nav className="flex gap-2 overflow-x-auto [scrollbar-width:none]" aria-label="Zonas del estudio">
        {ZONAS.map((z) => (
          <button key={z.id} onClick={() => { setZona(z.id); setAviso(null); }} aria-pressed={zona === z.id}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${zona === z.id ? 'border-vino bg-vino text-white' : 'border-linea bg-white text-grafito hover:border-linea-fuerte'}`}>
            {z.nombre}{z.id === 'combos' && combos.length > 0 ? ` · ${combos.length}` : ''}
          </button>
        ))}
      </nav>
      <p className="-mt-2 text-sm text-niebla">{ZONAS.find((z) => z.id === zona)?.ayuda}</p>

      {aviso && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${aviso.ok ? 'bg-exito/10 text-[#1F6B4F]' : 'bg-red-50 text-red-700'}`}>{aviso.texto}</p>}

      {zona === 'categorias' && <Categorias secciones={secciones} platos={platos} pendiente={pendiente} ejecutar={ejecutar} irAPlatos={irAPlatos} demo={demo} />}
      {zona === 'destacados' && <Destacados platos={normales} extra={extra} pendiente={pendiente} ejecutar={ejecutar} />}
      {zona === 'combos' && <Combos combos={combos} normales={normales} secciones={secciones} extra={extra} pendiente={pendiente} ejecutar={ejecutar} />}
      {zona === 'legal' && <Legal inicial={legal} restaurante={restaurante} pendiente={pendiente} ejecutar={ejecutar} />}
    </div>
  );
}

type Ejecutar = (fn: () => Promise<unknown>, ok: string) => void;

function Categorias({ secciones, platos, pendiente, ejecutar, irAPlatos, demo }: {
  secciones: SeccionPropia[]; platos: PlatoPropio[]; pendiente: boolean; ejecutar: Ejecutar; irAPlatos?: () => void; demo: boolean;
}) {
  const [nueva, setNueva] = useState('');
  const [abierta, setAbierta] = useState<string | null>(secciones[0]?.id ?? null);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [descs, setDescs] = useState<Record<string, string>>({});
  const [plato, setPlato] = useState<{ nombre: string; precio: string; descripcion: string }>({ nombre: '', precio: '', descripcion: '' });
  const [borrar, setBorrar] = useState<string | null>(null);
  const euros = (n: string) => Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  return (
    <div className="space-y-4">
      {/* Paso 1: crear categoría */}
      <div className={tarjeta}>
        <p className="font-semibold"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-vino text-xs text-white">1</span>Crea una categoría</p>
        <p className="mt-1 text-sm text-niebla">Por ejemplo «Entrantes», «Principales», «Postres» o «Bebidas». Después ábrela y añade sus platos ahí mismo.</p>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = nueva.trim(); if (!n) return; ejecutar(async () => { await crearSeccionAction(n.slice(0, 60)); setNueva(''); }, `Categoría «${n}» creada. Ábrela abajo para añadir platos.`); }}>
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={60} spellCheck lang="es" placeholder="Nombre de la categoría" className={campo} />
          <button disabled={pendiente || !nueva.trim()} className={botonPrincipal}>Crear</button>
        </form>
        <HerramientasTexto valor={nueva} onCambio={setNueva} tipo="titulo" demo={demo} />
      </div>

      {/* Paso 2: cada categoría, con sus platos dentro */}
      {secciones.length === 0 ? (
        <p className={`${tarjeta} text-center text-sm text-niebla`}>Todavía no tienes categorías. Crea la primera arriba.</p>
      ) : (
        <ul className="space-y-3">
          {secciones.map((s, i) => {
            const suyos = platos.filter((p) => p.seccionId === s.id);
            const valor = nombres[s.id] ?? s.nombre;
            const desc = descs[s.id] ?? s.descripcion ?? '';
            const abiertaEsta = abierta === s.id;
            return (
              <li key={s.id} className="overflow-hidden rounded-[22px] border border-linea bg-white">
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className="flex flex-col">
                    <button disabled={pendiente || i === 0} onClick={() => ejecutar(() => moverSeccionAction(s.id, -1), 'Orden guardado.')} aria-label={`Subir ${s.nombre}`} className="h-5 w-7 rounded-md text-xs text-niebla hover:bg-[#F3F1EE] disabled:opacity-25">▲</button>
                    <button disabled={pendiente || i === secciones.length - 1} onClick={() => ejecutar(() => moverSeccionAction(s.id, 1), 'Orden guardado.')} aria-label={`Bajar ${s.nombre}`} className="h-5 w-7 rounded-md text-xs text-niebla hover:bg-[#F3F1EE] disabled:opacity-25">▼</button>
                  </span>
                  <button onClick={() => { setAbierta(abiertaEsta ? null : s.id); setPlato({ nombre: '', precio: '', descripcion: '' }); }} aria-expanded={abiertaEsta} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                    <span className="min-w-0"><span className="block truncate font-semibold">{s.nombre}</span><span className="text-xs text-niebla">{suyos.length} {suyos.length === 1 ? 'plato' : 'platos'}{s.descripcion ? ' · con descripción' : ''}</span></span>
                    <span className="shrink-0 rounded-full bg-[#F3EDE6] px-3 py-1 text-xs font-semibold text-vino">{abiertaEsta ? 'Cerrar' : 'Abrir y añadir platos'}</span>
                  </button>
                </div>

                {abiertaEsta && (
                  <div className="space-y-5 border-t border-[#F1F0EC] bg-[#FCFBF9] px-4 py-4">
                    {/* Nombre y descripción */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs text-niebla">Nombre de la categoría
                        <input value={valor} onChange={(e) => setNombres({ ...nombres, [s.id]: e.target.value })} maxLength={60} spellCheck lang="es" className={`${campo} mt-1`} />
                        <HerramientasTexto valor={valor} onCambio={(v) => setNombres({ ...nombres, [s.id]: v })} tipo="titulo" demo={demo} />
                      </label>
                      <label className="block text-xs text-niebla">Descripción (opcional, se ve bajo el título en tu carta)
                        <input value={desc} onChange={(e) => setDescs({ ...descs, [s.id]: e.target.value })} maxLength={200} spellCheck lang="es" placeholder="Ej.: Para picar al centro, ideales para compartir" className={`${campo} mt-1`} />
                        <HerramientasTexto valor={desc} onCambio={(v) => setDescs({ ...descs, [s.id]: v })} tipo="descripcion" contexto={valor} demo={demo} />
                      </label>
                    </div>
                    {(valor.trim() !== s.nombre || desc !== (s.descripcion ?? '')) && valor.trim() && (
                      <button disabled={pendiente} className={botonPrincipal} onClick={() => ejecutar(async () => {
                        if (valor.trim() !== s.nombre) { const r = await editarSeccionAction(s.id, valor.trim()); void r; }
                        if (desc !== (s.descripcion ?? '')) return guardarDescripcionSeccionAction(s.id, desc);
                      }, 'Categoría guardada.')}>Guardar categoría</button>
                    )}

                    {/* Sus platos */}
                    <div>
                      <p className="text-sm font-semibold">Platos de «{s.nombre}»</p>
                      {suyos.length === 0 ? <p className="mt-1 text-sm text-niebla">Aún no tiene platos. Añade el primero aquí abajo.</p> : (
                        <ul className="mt-2 divide-y divide-[#EEECE8] rounded-xl border border-[#EEECE8] bg-white">
                          {suyos.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                              <span className="min-w-0 truncate">{p.nombre}{!p.fotoUrl && <span className="ml-2 text-xs text-ceniza">sin foto</span>}</span>
                              <span className="shrink-0 font-semibold">{euros(p.precio)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Añadir plato aquí */}
                    <form className="space-y-2 rounded-xl border border-dashed border-linea-cava bg-white p-3" onSubmit={(e) => { e.preventDefault(); ejecutar(async () => { const r = await crearPlatoRapidoAction({ seccionId: s.id, ...plato }); if (r.ok) setPlato({ nombre: '', precio: '', descripcion: '' }); return r; }, `«${plato.nombre}» añadido a ${s.nombre}. Añádele foto y alérgenos en Platos.`); }}>
                      <p className="text-sm font-semibold"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-vino text-xs text-white">2</span>Añadir un plato a «{s.nombre}»</p>
                      <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                        <div>
                          <input value={plato.nombre} onChange={(e) => setPlato({ ...plato, nombre: e.target.value })} maxLength={80} spellCheck lang="es" placeholder="Nombre del plato" className={campo} />
                          <HerramientasTexto valor={plato.nombre} onCambio={(v) => setPlato({ ...plato, nombre: v })} tipo="titulo" demo={demo} />
                        </div>
                        <input value={plato.precio} onChange={(e) => setPlato({ ...plato, precio: e.target.value })} inputMode="decimal" placeholder="Precio €" className={`${campo} h-fit`} />
                      </div>
                      <textarea value={plato.descripcion} onChange={(e) => setPlato({ ...plato, descripcion: e.target.value })} maxLength={300} rows={2} spellCheck lang="es" placeholder="Descripción (opcional): ingredientes, cómo se sirve…" className={campo} />
                      <HerramientasTexto valor={plato.descripcion} onCambio={(v) => setPlato({ ...plato, descripcion: v })} tipo="descripcion" contexto={plato.nombre} demo={demo} />
                      <div className="flex flex-wrap items-center gap-3">
                        <button disabled={pendiente || !plato.nombre.trim() || !plato.precio.trim()} className={botonPrincipal}>+ Añadir plato</button>
                        {irAPlatos && <button type="button" onClick={irAPlatos} className="text-sm font-semibold text-vino">Fotos y alérgenos: ir a Platos →</button>}
                      </div>
                    </form>

                    {/* Eliminar */}
                    <div className="text-right text-xs">
                      {borrar === s.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-niebla">{suyos.length ? 'Sus platos quedarán sin categoría.' : '¿Seguro?'}</span>
                          <button disabled={pendiente} onClick={() => ejecutar(() => eliminarSeccionAction(s.id), 'Categoría eliminada.')} className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white">Eliminar</button>
                          <button onClick={() => setBorrar(null)} className="px-2 py-1.5 text-niebla">No</button>
                        </span>
                      ) : <button onClick={() => setBorrar(s.id)} className="text-niebla hover:text-red-700">Eliminar esta categoría</button>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const ETIQUETAS: [string, string][] = [['', 'Sin etiqueta'], ['especial', 'Especial'], ['nuevo', 'Nuevo'], ['recomendado', 'Recomendado']];

function Destacados({ platos, extra, pendiente, ejecutar }: { platos: PlatoPropio[]; extra: Map<string, ExtraPlato>; pendiente: boolean; ejecutar: Ejecutar }) {
  const [edit, setEdit] = useState<Record<string, { etiqueta: string; precioPromo: string; promoDesde: string; promoHasta: string }>>({});
  const hoy = new Date().toISOString().slice(0, 10);
  if (platos.length === 0) return <p className={`${tarjeta} text-center text-sm text-niebla`}>Añade primero platos en la pestaña Platos.</p>;
  return (
    <ul className="space-y-3">
      {platos.map((p) => {
        const x = extra.get(p.id);
        const v = edit[p.id] ?? { etiqueta: x?.etiqueta ?? '', precioPromo: x?.precioPromo ?? '', promoDesde: x?.promoDesde ?? '', promoHasta: x?.promoHasta ?? '' };
        const set = (k: keyof typeof v, val: string) => setEdit({ ...edit, [p.id]: { ...v, [k]: val } });
        const cambiado = !!edit[p.id];
        const vigente = x?.precioPromo && (!x.promoDesde || x.promoDesde <= hoy) && (!x.promoHasta || x.promoHasta >= hoy);
        return (
          <li key={p.id} className={tarjeta}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{p.nombre} <span className="font-normal text-niebla">· {euros(Number(p.precio))}</span></p>
              {vigente && <span className="rounded-full bg-exito/10 px-2.5 py-1 text-xs font-semibold text-[#1F6B4F]">Promoción activa: {euros(Number(x!.precioPromo))}{x!.promoHasta ? ` hasta el ${x!.promoHasta.split('-').reverse().join('/')}` : ''}</span>}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
              <label className="space-y-1 text-xs text-niebla">Etiqueta
                <select value={v.etiqueta} onChange={(e) => set('etiqueta', e.target.value)} className={campo}>{ETIQUETAS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
              </label>
              <label className="space-y-1 text-xs text-niebla">Precio de promoción (€)
                <input inputMode="decimal" value={v.precioPromo} onChange={(e) => set('precioPromo', e.target.value)} placeholder="Vacío = sin promoción" className={campo} />
              </label>
              <label className="space-y-1 text-xs text-niebla">Desde
                <input type="date" value={v.promoDesde} onChange={(e) => set('promoDesde', e.target.value)} disabled={!v.precioPromo} className={campo} />
              </label>
              <label className="space-y-1 text-xs text-niebla">Hasta
                <input type="date" value={v.promoHasta} onChange={(e) => set('promoHasta', e.target.value)} disabled={!v.precioPromo} className={campo} />
              </label>
              <button disabled={pendiente || !cambiado} className={botonPrincipal}
                onClick={() => ejecutar(async () => {
                  await guardarExtrasPlatoAction(p.id, { etiqueta: v.etiqueta || null, precioPromo: v.precioPromo.trim() || null, promoDesde: v.promoDesde || null, promoHasta: v.promoHasta || null });
                  const resto = { ...edit }; delete resto[p.id]; setEdit(resto);
                }, `«${p.nombre}» actualizado.`)}>Guardar</button>
            </div>
            {v.precioPromo && <p className="mt-2 text-xs text-niebla">Tus clientes verán <s>{euros(Number(p.precio))}</s> <strong className="text-vino">{euros(Number(v.precioPromo.replace(',', '.')) || 0)}</strong>. Al terminar la fecha, vuelve solo al precio normal.</p>}
          </li>
        );
      })}
    </ul>
  );
}

type Borrador = { id: string | null; nombre: string; descripcion: string; precio: string; seccionId: string; fotoUrl: string | null; componentes: Record<string, number> };
const VACIO: Borrador = { id: null, nombre: '', descripcion: '', precio: '', seccionId: '', fotoUrl: null, componentes: {} };

function Combos({ combos, normales, secciones, extra, pendiente, ejecutar }: {
  combos: PlatoPropio[]; normales: PlatoPropio[]; secciones: SeccionPropia[]; extra: Map<string, ExtraPlato>; pendiente: boolean; ejecutar: Ejecutar;
}) {
  const [b, setB] = useState<Borrador | null>(null);
  const [borrar, setBorrar] = useState<string | null>(null);
  const nombre = (id: string) => normales.find((p) => p.id === id);
  const suelto = (comps: Record<string, number>) => Object.entries(comps).reduce((t, [id, n]) => t + Number(nombre(id)?.precio ?? 0) * n, 0);

  if (b) {
    const total = suelto(b.componentes);
    const precio = Number(b.precio.replace(',', '.')) || 0;
    const n = Object.keys(b.componentes).length;
    return (
      <div className={`${tarjeta} space-y-4`}>
        <p className="font-display text-xl font-semibold">{b.id ? 'Editar combo' : 'Nuevo combo'}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><input value={b.nombre} onChange={(e) => setB({ ...b, nombre: e.target.value })} maxLength={80} spellCheck lang="es" placeholder="Nombre (ej.: Menú Burger)" className={campo} /><HerramientasTexto valor={b.nombre} onCambio={(v) => setB({ ...b, nombre: v })} tipo="titulo" /></div>
          <select value={b.seccionId} onChange={(e) => setB({ ...b, seccionId: e.target.value })} className={campo} aria-label="Categoría del combo">
            <option value="">Sin categoría</option>{secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div><textarea value={b.descripcion} onChange={(e) => setB({ ...b, descripcion: e.target.value })} maxLength={300} rows={2} spellCheck lang="es" placeholder="Descripción corta (opcional)" className={campo} /><HerramientasTexto valor={b.descripcion} onCambio={(v) => setB({ ...b, descripcion: v })} tipo="descripcion" contexto={b.nombre} /></div>
        <div>
          <p className="text-sm font-semibold">Platos que incluye <span className="font-normal text-niebla">({n}, mínimo 2)</span></p>
          <ul className="mt-2 max-h-72 divide-y divide-[#EEECE8] overflow-y-auto rounded-xl border border-linea">
            {normales.map((p) => {
              const c = b.componentes[p.id] ?? 0;
              const poner = (v: number) => { const comps = { ...b.componentes }; if (v <= 0) delete comps[p.id]; else comps[p.id] = Math.min(20, v); setB({ ...b, componentes: comps }); };
              return (
                <li key={p.id} className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${c ? 'bg-[#FBF6F2]' : ''}`}>
                  <span className="min-w-0 truncate">{p.nombre} <span className="text-niebla">· {euros(Number(p.precio))}</span></span>
                  {c ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => poner(c - 1)} aria-label={`Quitar uno de ${p.nombre}`} className="h-7 w-7 rounded-full border border-linea">−</button>
                      <span className="w-6 text-center font-semibold tabular-nums">{c}</span>
                      <button type="button" onClick={() => poner(c + 1)} aria-label={`Añadir otro ${p.nombre}`} className="h-7 w-7 rounded-full border border-linea">+</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => poner(1)} className="shrink-0 rounded-full border border-linea px-3 py-1 text-xs font-semibold">Añadir</button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:items-center">
          <label className="space-y-1 text-xs text-niebla">Precio del combo (€)
            <input inputMode="decimal" value={b.precio} onChange={(e) => setB({ ...b, precio: e.target.value })} placeholder="12,90" className={campo} />
          </label>
          <p className="text-sm text-grafito">Por separado: <strong>{euros(total)}</strong>
            {precio > 0 && total > precio && <> · Tus clientes ahorran <strong className="text-exito">{euros(total - precio)}</strong></>}
            {precio > 0 && total > 0 && total <= precio && <span className="block text-xs text-amber-700">El combo no sale más barato que por separado: la carta no mostrará ahorro.</span>}
          </p>
        </div>
        <SubirImagen valor={b.fotoUrl} onCambio={(url) => setB({ ...b, fotoUrl: url })} etiqueta="Foto del combo (opcional)" formato="plato" ia={{ modo: 'plato', plato: { nombre: b.nombre, descripcion: b.descripcion } }} />
        <p className="text-xs text-niebla">Los alérgenos del combo se calculan solos a partir de sus platos.</p>
        <div className="flex flex-wrap gap-2">
          <button disabled={pendiente || !b.nombre.trim() || n < 2 || precio <= 0} className={botonPrincipal}
            onClick={() => ejecutar(async () => {
              await guardarComboAction(b.id, {
                nombre: b.nombre, descripcion: b.descripcion || null, precio, seccionId: b.seccionId || null, fotoUrl: b.fotoUrl,
                componentes: Object.entries(b.componentes).map(([itemId, cantidad]) => ({ itemId, cantidad })),
              });
              setB(null);
            }, 'Combo guardado. Ya aparece en tu carta.')}>{pendiente ? 'Guardando…' : 'Guardar combo'}</button>
          <button onClick={() => setB(null)} className="rounded-full border border-linea px-5 py-2.5 text-sm font-semibold">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setB(VACIO)} disabled={normales.length < 2} className={botonPrincipal}>+ Nuevo combo</button>
      {normales.length < 2 && <p className="text-sm text-niebla">Necesitas al menos 2 platos en tu carta para crear un combo.</p>}
      {combos.length === 0 ? (
        <div className={`${tarjeta} text-sm text-niebla`}>
          <p className="font-semibold text-carbon">Aún no tienes combos</p>
          <p className="mt-1">Ejemplos que funcionan: «Burger + patatas + bebida», «Menú infantil», «Para 2: 2 entrantes + postre». La carta los muestra con lo que incluyen y cuánto ahorra el cliente.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {combos.map((c) => {
            const x = extra.get(c.id);
            const comps = Object.fromEntries((x?.componentes ?? []).map((k) => [k.itemId, k.cantidad]));
            const total = suelto(comps);
            return (
              <li key={c.id} className={tarjeta}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{c.nombre}</p>
                  <p className="font-semibold text-vino">{euros(Number(c.precio))}</p>
                </div>
                <p className="mt-1 text-sm text-niebla">{Object.entries(comps).map(([id, n]) => `${n > 1 ? `${n} × ` : ''}${nombre(id)?.nombre ?? 'plato borrado'}`).join(' + ')}</p>
                {total > Number(c.precio) && <p className="mt-1 text-xs font-semibold text-exito">Ahorro para el cliente: {euros(total - Number(c.precio))}</p>}
                <div className="mt-3 flex gap-3 text-sm">
                  <button onClick={() => setB({ id: c.id, nombre: c.nombre, descripcion: c.descripcion ?? '', precio: String(c.precio).replace('.', ','), seccionId: c.seccionId ?? '', fotoUrl: c.fotoUrl, componentes: comps })} className="font-semibold">Editar</button>
                  {borrar === c.id ? (
                    <>
                      <button disabled={pendiente} onClick={() => ejecutar(() => eliminarPlatoAction(c.id), 'Combo eliminado.')} className="font-semibold text-red-700">Sí, eliminar</button>
                      <button onClick={() => setBorrar(null)} className="text-niebla">No</button>
                    </>
                  ) : <button onClick={() => setBorrar(c.id)} className="text-niebla hover:text-red-700">Eliminar</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Legal({ inicial, restaurante, pendiente, ejecutar }: { inicial: DatosLegal; restaurante: { slug: string; nombre: string; direccion: string | null }; pendiente: boolean; ejecutar: Ejecutar }) {
  const [d, setD] = useState<DatosLegal>({ ...inicial, domicilio: inicial.domicilio ?? restaurante.direccion });
  const listo = !!d.titular?.trim() && !!d.email?.trim();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className={`${tarjeta} space-y-4`}>
        <p className="text-sm text-grafito">Con estos datos generamos las páginas <strong>Aviso legal</strong>, <strong>Privacidad</strong> y <strong>Cookies</strong> de tu carta, y las enlazamos en su pie. Solo se publican cuando tú lo activas.</p>
        <label className="block space-y-1 text-xs text-niebla">Titular del negocio (nombre y apellidos o razón social) *
          <input value={d.titular ?? ''} onChange={(e) => setD({ ...d, titular: e.target.value })} maxLength={160} className={campo} placeholder="Ej.: Restauración Flores S.L." />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-xs text-niebla">NIF / CIF <span className="text-ceniza">(opcional)</span>
            <input value={d.nif ?? ''} onChange={(e) => setD({ ...d, nif: e.target.value.toUpperCase() })} maxLength={12} className={campo} placeholder="B12345678" />
          </label>
          <label className="block space-y-1 text-xs text-niebla">Correo de contacto legal *
            <input type="email" value={d.email ?? ''} onChange={(e) => setD({ ...d, email: e.target.value })} maxLength={160} className={campo} placeholder="hola@tulocal.es" />
          </label>
        </div>
        <label className="block space-y-1 text-xs text-niebla">Domicilio
          <input value={d.domicilio ?? ''} onChange={(e) => setD({ ...d, domicilio: e.target.value })} maxLength={240} className={campo} placeholder="Calle, número, ciudad" />
        </label>
        <label className="flex items-start gap-3 rounded-xl bg-crema p-3 text-sm">
          <input type="checkbox" checked={d.activo} onChange={(e) => setD({ ...d, activo: e.target.checked })} disabled={!listo} className="mt-0.5 h-4 w-4 accent-vino" />
          <span><strong>Publicar mis páginas legales en la carta.</strong> Autorizo que se muestren estos datos, incluido el NIF/CIF si lo he escrito.{!listo && <span className="block text-xs text-niebla">Rellena el titular y el correo para poder publicarlas.</span>}</span>
        </label>
        <button disabled={pendiente} onClick={() => ejecutar(() => guardarLegalAction(d), d.activo ? 'Páginas legales publicadas en tu carta.' : 'Datos guardados (sin publicar).')} className={botonPrincipal}>{pendiente ? 'Guardando…' : 'Guardar'}</button>
      </div>
      <aside className={`${tarjeta} space-y-3 text-sm`}>
        <p className="font-semibold">Así quedará</p>
        <p className="text-niebla">El pie de tu carta mostrará: <span className="text-carbon">Aviso legal · Privacidad · Cookies</span>.</p>
        {inicial.activo ? (
          <a href={`/m/${restaurante.slug}/legal`} target="_blank" rel="noopener" className="inline-block rounded-full border border-linea px-4 py-2 font-semibold">Ver mis páginas legales</a>
        ) : <p className="text-xs text-niebla">Cuando las publiques, aquí tendrás el enlace para revisarlas.</p>}
        <p className="text-xs text-ceniza">Es un texto modelo adaptado a una carta digital sin venta online. Si tu negocio tiene otras actividades (tienda, pedidos a domicilio), revísalo con tu asesor.</p>
      </aside>
    </div>
  );
}
