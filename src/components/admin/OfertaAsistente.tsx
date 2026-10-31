'use client';

import { useState } from 'react';

/**
 * Ofertas en 3 pasos (decisión 6 de karc0, 01/11): ¿qué? → ¿cuánto? (con el resultado en €) → ¿cuándo y para quién?
 * + vista previa de lo que ve el dueño. El precio de partida sale SIEMPRE del catálogo (pricing-config);
 * aquí solo se elige el descuento. El servidor vuelve a validar (dk.admin_oferta_fecha_guardar).
 */
export type ProductoOferta = { clave: string; nombre: string; frase: string; precio: number; incluye: string[] };
export type OfertaInicial = { id: string; tema: string; titulo: string; descripcion: string; incluye: string[]; precio: number; ancla: number | null; desde: string; hasta: string; activa: boolean };

const TEMAS: [string, string][] = [['halloween', '🎃 Halloween'], ['navidad', '🎄 Navidad'], ['san_valentin', '💘 San Valentín'], ['carnaval', '🎭 Carnaval'], ['otra', '⭐ Otra fecha']];
const DESCUENTOS = [0, 10, 20, 30, 40, 50];
const eur = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 });
const hoyMas = (d: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(Date.now() + d * 864e5));

export default function OfertaAsistente({ productos, accion, inicial, cerrar }: {
  productos: ProductoOferta[]; accion: (f: FormData) => void | Promise<void>; inicial?: OfertaInicial; cerrar?: string;
}) {
  const base = inicial ? productos.find((p) => p.precio === (inicial.ancla ?? inicial.precio)) ?? null : null;
  const [paso, setPaso] = useState<1 | 2 | 3>(inicial ? 2 : 1);
  const [prod, setProd] = useState<ProductoOferta | null>(base ?? (inicial ? { clave: 'actual', nombre: inicial.titulo, frase: inicial.descripcion, precio: (inicial.ancla ?? inicial.precio) / 100, incluye: inicial.incluye } : null));
  const precioBase = prod?.precio ?? 0;
  const descInicial = inicial && inicial.ancla ? Math.round((1 - inicial.precio / inicial.ancla) * 100) : 0;
  const [desc, setDesc] = useState(DESCUENTOS.includes(descInicial) ? descInicial : 0);
  const [tema, setTema] = useState(inicial?.tema ?? 'otra');
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [desde, setDesde] = useState(inicial?.desde ?? hoyMas(0));
  const [hasta, setHasta] = useState(inicial?.hasta ?? hoyMas(14));
  const [activa, setActiva] = useState(inicial?.activa ?? true);
  const final = Math.max(1, Math.round(precioBase * (1 - desc / 100) * 100) / 100);
  const tarjeta = (on: boolean) => `dk-tarjeta relative cursor-pointer rounded-[20px] border-[1.5px] p-4 text-left transition ${on ? 'dk-tarjeta-on border-vino bg-[#FBF1F1]' : 'border-linea bg-white hover:border-linea-fuerte'}`;
  const elegir = (p: ProductoOferta) => { setProd(p); if (!titulo) setTitulo(p.nombre); setPaso(2); };

  return (
    <div className="space-y-5" data-testid="oferta-asistente">
      <div className="flex gap-1.5">{[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= paso ? 'bg-vino' : 'bg-linea'}`} />)}</div>

      {paso === 1 && (
        <div key="1" className="dk-paso space-y-3">
          <h3 className="font-display text-2xl font-bold">¿Qué ofreces?</h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {productos.map((p) => (
              <button key={p.clave} type="button" onClick={() => elegir(p)} className={tarjeta(prod?.clave === p.clave)} data-testid={`oferta-prod-${p.clave}`}>
                <b className="block font-display text-lg">{p.nombre}</b>
                <span className="block text-sm text-niebla">{p.frase}</span>
                <span className="mt-1 block text-sm font-bold">{eur(p.precio)} + IVA</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {paso === 2 && prod && (
        <div key="2" className="dk-paso space-y-4">
          <h3 className="font-display text-2xl font-bold">¿Cuánto?</h3>
          <p className="text-sm text-niebla">{prod.nombre} cuesta <b className="text-tinta">{eur(precioBase)}</b> en el catálogo. Elige el descuento:</p>
          <div className="flex flex-wrap gap-2">
            {DESCUENTOS.map((d) => (
              <button key={d} type="button" onClick={() => setDesc(d)} className={`min-h-[48px] rounded-full border px-5 text-sm font-bold transition ${desc === d ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white hover:bg-papel'}`}>{d ? `−${d} %` : 'Sin descuento'}</button>
            ))}
          </div>
          <div className="rounded-[20px] bg-noche p-5 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">El dueño paga</p>
            <p className="font-display text-4xl font-bold text-oro"><span className="cv-cifra" data-testid="oferta-final">{eur(final)}</span> <span className="text-base font-normal text-white/60">+ IVA</span></p>
            {desc > 0 && <p className="text-sm text-white/60">antes <s>{eur(precioBase)}</s> · ahorra {eur(precioBase - final)}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setPaso(1)} className="min-h-[48px] rounded-full border border-linea bg-white px-5 text-sm font-bold">← Otro producto</button>
            <button type="button" onClick={() => setPaso(3)} className="dk-btn min-h-[48px] rounded-full bg-vino px-6 text-sm font-bold text-white" data-testid="oferta-siguiente">Siguiente →</button>
          </div>
        </div>
      )}

      {paso === 3 && prod && (
        <div key="3" className="dk-paso grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-display text-2xl font-bold">¿Cuándo y para quién?</h3>
            <div className="flex flex-wrap gap-2">
              {TEMAS.map(([k, t]) => <button key={k} type="button" onClick={() => setTema(k)} className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${tema === k ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white'}`}>{t}</button>)}
            </div>
            <label className="block text-sm font-semibold">Título que verá el dueño
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} className="mt-1.5 w-full rounded-2xl border border-linea bg-white px-4 py-3 text-base outline-none focus:border-vino" data-testid="oferta-titulo" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-linea bg-white px-3 py-3" /></label>
              <label className="text-sm font-semibold">Hasta<input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-linea bg-white px-3 py-3" /></label>
            </div>
            <p className="rounded-2xl bg-papel px-4 py-3 text-sm">Para: <b>todos los locales clientes</b>, en su panel → Negocio → Mejoras, solo entre esas fechas.</p>
            <button type="button" onClick={() => setActiva(!activa)} className={`${tarjeta(activa)} w-full`}><b className="text-sm">{activa ? 'Encendida' : 'Apagada'}</b> <span className="text-xs text-niebla">· toca para cambiar</span></button>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Así la ve el dueño</p>
            <div className="overflow-hidden rounded-[24px] border border-linea bg-white shadow-[0_24px_60px_-36px_rgba(62,5,21,.5)]">
              <div className="bg-noche px-5 py-4 text-white"><p className="text-[11px] uppercase tracking-[0.2em] text-oro">{TEMAS.find(([k]) => k === tema)?.[1]}</p><p className="font-display text-xl font-bold">{titulo || prod.nombre}</p></div>
              <div className="space-y-2 p-5 text-sm">
                <p className="text-niebla">{prod.frase}</p>
                <ul className="space-y-1">{prod.incluye.slice(0, 6).map((x) => <li key={x}>✓ {x}</li>)}</ul>
                <p className="pt-2 font-display text-2xl font-bold">{eur(final)} <span className="text-sm font-normal text-niebla">+ IVA</span> {desc > 0 && <s className="ml-1 text-base font-normal text-ceniza">{eur(precioBase)}</s>}</p>
                <span className="block rounded-full bg-vino py-2.5 text-center text-sm font-bold text-white">La quiero</span>
              </div>
            </div>
            <form action={accion} className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
              {inicial && <input type="hidden" name="id" value={inicial.id} />}
              <input type="hidden" name="tema" value={tema} />
              <input type="hidden" name="titulo" value={(titulo || prod.nombre).slice(0, 80)} />
              <input type="hidden" name="descripcion" value={prod.frase.slice(0, 400)} />
              <input type="hidden" name="incluye" value={prod.incluye.slice(0, 6).join('\n')} />
              <input type="hidden" name="precio" value={String(final)} />
              <input type="hidden" name="ancla" value={desc > 0 ? String(precioBase) : ''} />
              <input type="hidden" name="desde" value={desde} />
              <input type="hidden" name="hasta" value={hasta} />
              {activa && <input type="hidden" name="activa" value="si" />}
              <button type="button" onClick={() => setPaso(2)} className="min-h-[48px] rounded-full border border-linea bg-white px-5 text-sm font-bold">← Cambiar precio</button>
              <button disabled={!titulo.trim() || hasta < desde} className="dk-btn min-h-[48px] rounded-full bg-vino px-6 text-sm font-bold text-white disabled:opacity-40" data-testid="oferta-guardar">{inicial ? 'Guardar cambios' : 'Publicar oferta'}</button>
            </form>
            {cerrar && <a href={cerrar} className="block text-center text-sm text-niebla">Cancelar</a>}
          </div>
        </div>
      )}
    </div>
  );
}
