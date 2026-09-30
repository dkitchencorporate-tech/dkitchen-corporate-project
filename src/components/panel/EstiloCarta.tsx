'use client';

import { useState, useTransition } from 'react';
import { guardarEstiloAction } from '@/app/panel/actions';

/**
 * Selectores de estilo de la carta (0031): estilo, fondo, letra y color de
 * una paleta curada. Vista previa en vivo antes de guardar. Solo nivel
 * Esencial: en Carta de Autor el diseño es de DKitchen.
 */
export const ESTILOS = [
  { id: 'clasica', nombre: 'Clásico', para: 'Restaurante y menú del día. Lista ordenada, fácil de leer.', muestra: ['Foto pequeña junto al plato', 'Banners arriba'] },
  { id: 'editorial', nombre: 'Editorial', para: 'Cocina de autor y vinos. Tipografía protagonista, precios con línea de puntos.', muestra: ['Sin fotos en la lista (se ven al abrir el plato)', 'Banners arriba'] },
  { id: 'visual', nombre: 'Visual', para: 'Brunch, hamburguesas, gastro. La foto de cada plato vende.', muestra: ['Foto grande de portada', 'Foto grande en cada plato', 'Banners arriba'] },
  { id: 'express', nombre: 'Express', para: 'Bar, cafetería y terraza. Compacta y rápida.', muestra: ['Sin fotos en la lista (se ven al abrir el plato)', 'Banners arriba'] },
] as const;
export const FONDOS = [
  { id: 'papel', nombre: 'Papel', fondo: '#F7F3EA', tinta: '#221D17', tarjeta: '#FFFFFF' },
  { id: 'blanco', nombre: 'Blanco', fondo: '#FFFFFF', tinta: '#1B1D22', tarjeta: '#F7F5F2' },
  { id: 'oscuro', nombre: 'Oscuro', fondo: '#15161A', tinta: '#F3F1EC', tarjeta: '#1F2126' },
] as const;
export const COLORES = [
  { hex: '#E8592A', nombre: 'Naranja' }, { hex: '#B23A48', nombre: 'Burdeos' }, { hex: '#C58B2A', nombre: 'Mostaza' },
  { hex: '#2F5D50', nombre: 'Verde oliva' }, { hex: '#2F8F6B', nombre: 'Verde salvia' }, { hex: '#1F4E79', nombre: 'Azul marino' },
  { hex: '#3B6EA5', nombre: 'Azul' }, { hex: '#5B3E8A', nombre: 'Ciruela' }, { hex: '#17191E', nombre: 'Grafito' },
];

type Estilo = { plantilla: string; fondo: string; letra: string; color: string };

/** Fotos de ejemplo: solo se usan hasta que el cliente sube las suyas. */
const FOTOS_EJEMPLO = ['/images/demo/s5.png', '/images/demo/s18.png', '/images/demo/s22.png'];

function Vista({ e, nombre, fotos }: { e: Estilo; nombre: string; fotos: string[] }) {
  const img = (i: number) => fotos.length ? fotos[i % fotos.length] : FOTOS_EJEMPLO[i];
  const conFoto = e.plantilla === 'visual' || e.plantilla === 'clasica';
  const f = FONDOS.find((x) => x.id === e.fondo) ?? FONDOS[0];
  const serif = e.letra === 'serif' ? 'Georgia, "Times New Roman", serif' : 'inherit';
  const suave = f.id === 'oscuro' ? 'rgba(243,241,236,.55)' : 'rgba(0,0,0,.5)';
  const platos = [['Croquetas caseras', '9,50'], ['Arroz de la casa', '16'], ['Tarta de queso', '6,50']];
  return (
    <div className="mx-auto w-[230px] rounded-[34px] border border-[#E6E6E2] bg-[#17191E] p-2 shadow-xl">
      <div className="h-[400px] overflow-hidden rounded-[27px]" style={{ background: f.fondo, color: f.tinta }}>
        {e.plantilla === 'visual' ? (
          <div className="relative flex h-24 items-end overflow-hidden p-3" style={{ background: e.color }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(0)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <p style={{ fontFamily: serif }} className="relative text-lg font-bold text-white">{nombre}</p>
          </div>
        ) : e.plantilla === 'express' ? (
          <div className="px-3 py-3" style={{ borderTop: `4px solid ${e.color}` }}>
            <p style={{ fontFamily: serif }} className="font-bold">{nombre}</p>
          </div>
        ) : (
          <div className="px-3 pb-3 pt-6 text-center">
            {e.plantilla === 'editorial' && <p className="text-[8px] uppercase tracking-[0.3em]" style={{ color: e.color }}>La carta</p>}
            <p style={{ fontFamily: serif }} className={`mt-1 font-semibold ${e.plantilla === 'editorial' ? 'text-2xl' : 'text-lg'}`}>{nombre}</p>
          </div>
        )}
        <div className="mx-3 mt-2 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold text-white" style={{ background: e.color }}>Banner · Menú del día 12,90 €</div>
        <div className="px-3">
          <p style={{ fontFamily: serif, color: e.plantilla === 'editorial' ? e.color : undefined }}
            className={`mt-2 ${e.plantilla === 'express' ? 'text-[9px] font-bold uppercase tracking-widest' : e.plantilla === 'editorial' ? 'text-center text-base' : 'text-sm font-semibold'}`}>Para compartir</p>
          <div className={`mt-2 ${e.plantilla === 'clasica' ? 'rounded-xl p-2' : ''}`} style={e.plantilla === 'clasica' ? { background: f.tarjeta } : undefined}>
            {platos.map(([n, p], i) => (
              e.plantilla === 'visual' ? (
                <div key={n} className="mb-2 overflow-hidden rounded-lg" style={{ background: f.tarjeta }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(i)} alt="" className="h-12 w-full object-cover" style={{ background: `${e.color}33` }} />
                  <div className="flex justify-between px-2 py-1.5 text-[11px]"><span style={{ fontFamily: serif }} className="font-semibold">{n}</span><span style={{ color: e.color }} className="font-bold">{p}</span></div>
                </div>
              ) : (
                <div key={n} className="flex items-center gap-1.5 py-1.5 text-[11px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {conFoto && <img src={img(i)} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />}
                  <span style={{ fontFamily: serif }} className="font-semibold">{n}</span>
                  {e.plantilla === 'editorial' ? <span className="flex-1 border-b border-dotted" style={{ borderColor: suave }} /> : <span className="flex-1" />}
                  <span className="font-semibold">{p}</span>
                </div>
              )
            ))}
          </div>
          <p className="mt-3 text-[9px]" style={{ color: suave }}>Alérgenos: gluten · lácteos · huevos</p>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] leading-snug text-white/60">{fotos.length ? 'Con tus fotos reales' : 'Fotos de ejemplo: se cambian por las tuyas al subirlas'}</p>
    </div>
  );
}

export default function EstiloCarta({ inicial, nombre, bloqueado, fotos = [] }: { inicial: Estilo; nombre: string; bloqueado: boolean; fotos?: string[] }) {
  const [e, setE] = useState<Estilo>(inicial);
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const cambiado = JSON.stringify(e) !== JSON.stringify(inicial);
  const opcion = (activa: boolean) => `rounded-2xl border p-3 text-left transition ${activa ? 'border-[#17191E] bg-[#F7F5F2]' : 'border-[#E6E6E2] hover:border-[#D6D6D1]'}`;

  if (bloqueado) {
    return (
      <section className="rounded-[22px] border border-[#E6E6E2] bg-white p-6">
        <h3 className="text-lg font-semibold">Estilo de tu carta</h3>
        <p className="mt-1 text-sm text-[#6B7079]">Tu carta tiene un diseño de autor hecho por DKitchen. Si quieres cambiar algo, pídenoslo en Soporte.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-[#E6E6E2] bg-white p-5 sm:p-7">
      <h3 className="text-lg font-semibold">Estilo de tu carta</h3>
      <p className="mt-1 text-sm text-[#6B7079]">Elige cómo se ve tu carta. Todas las combinaciones están pensadas para leerse bien en cualquier móvil. Mira la vista previa antes de guardar.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold">1. Estilo</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ESTILOS.map((x) => (
                <button key={x.id} type="button" onClick={() => setE({ ...e, plantilla: x.id })} className={opcion(e.plantilla === x.id)} aria-pressed={e.plantilla === x.id}>
                  <span className="block font-semibold">{x.nombre}</span>
                  <span className="mt-0.5 block text-xs text-[#6B7079]">{x.para}</span>
                  <span className="mt-2 flex flex-wrap gap-1">{x.muestra.map((m) => <span key={m} className="rounded-full bg-[#F3EDE6] px-2 py-0.5 text-[10.5px] font-medium text-[#6E0C2B]">{m}</span>)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">2. Fondo</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {FONDOS.map((x) => (
                <button key={x.id} type="button" onClick={() => setE({ ...e, fondo: x.id })} className={opcion(e.fondo === x.id)} aria-pressed={e.fondo === x.id}>
                  <span className="block h-8 rounded-lg border border-[#E6E6E2]" style={{ background: x.fondo }} />
                  <span className="mt-1.5 block text-sm font-medium">{x.nombre}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">3. Letra</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[['sans', 'Moderna', 'inherit'], ['serif', 'Clásica', 'Georgia, serif']].map(([id, n, ff]) => (
                <button key={id} type="button" onClick={() => setE({ ...e, letra: id })} className={opcion(e.letra === id)} aria-pressed={e.letra === id}>
                  <span className="block text-2xl" style={{ fontFamily: ff }}>Aa</span>
                  <span className="block text-sm font-medium">{n}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">4. Color de acento</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Color de acento">
              {COLORES.map((c) => (
                <button key={c.hex} type="button" role="radio" aria-checked={e.color.toUpperCase() === c.hex} title={c.nombre} aria-label={c.nombre}
                  onClick={() => setE({ ...e, color: c.hex })}
                  className={`h-10 w-10 rounded-full ring-offset-2 ${e.color.toUpperCase() === c.hex ? 'ring-2 ring-[#17191E]' : ''}`} style={{ background: c.hex }} />
              ))}
            </div>
          </div>
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-[#9A9EA6]">Vista previa</p>
          <Vista e={e} nombre={nombre} fotos={fotos} />
        </div>
      </div>

      {aviso && <p className={`mt-5 text-sm ${aviso.ok ? 'text-[#2F8F6B]' : 'text-red-600'}`}>{aviso.texto}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button disabled={!cambiado || pendiente} onClick={() => { setAviso(null); iniciar(async () => { try { await guardarEstiloAction(e); setAviso({ ok: true, texto: 'Estilo guardado. Tu carta ya se ve así.' }); } catch (err) { setAviso({ ok: false, texto: err instanceof Error ? err.message : 'No se pudo guardar.' }); } }); }}
          className="rounded-full bg-[#17191E] px-6 py-3 text-sm font-semibold text-white disabled:opacity-35">{pendiente ? 'Guardando…' : 'Guardar estilo'}</button>
        {cambiado && <button onClick={() => setE(inicial)} className="rounded-full border border-[#E6E6E2] px-5 py-3 text-sm font-semibold">Deshacer cambios</button>}
      </div>
    </section>
  );
}
