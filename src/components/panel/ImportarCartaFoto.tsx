'use client';

import { useState, useTransition } from 'react';
import SubirImagen from './SubirImagen';
import { leerCartaFotoAction, anadirCartaLeidaAction } from '@/app/panel/actions';
import { ALERGENOS } from '@/lib/alergenos';
import { avisarEstudio } from './EstudioMarco';

type Plato = { nombre: string; descripcion: string; precio: number | null; alergenos: string[]; si: boolean };
type Seccion = { nombre: string; platos: Plato[] };

/**
 * CARTA DESDE FOTO (13/10): el dueño sube 1–4 fotos de su carta en papel, la IA
 * propone secciones, platos, precios y alérgenos probables, y él revisa antes de
 * añadir. 1 crédito de IA por lectura (el alta trae créditos de regalo).
 */
export default function ImportarCartaFoto({ abiertoInicial = false, demo = false }: { abiertoInicial?: boolean; demo?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [fotos, setFotos] = useState<string[]>([]);
  const [secciones, setSecciones] = useState<Seccion[] | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [fase, setFase] = useState<'leer' | 'anadir' | null>(null);
  const marcados = secciones?.reduce((n, s) => n + s.platos.filter((p) => p.si && p.precio).length, 0) ?? 0;

  const leer = () => {
    if (demo) { setAviso({ ok: true, texto: 'Demostración: en tu panel real la IA leería tu carta aquí.' }); return; }
    setAviso(null); setFase('leer');
    iniciar(async () => {
      const r = await leerCartaFotoAction(fotos);
      setFase(null);
      if (!r.ok) { setAviso({ ok: false, texto: r.error }); return; }
      setSecciones(r.secciones.map((s) => ({ ...s, platos: s.platos.map((p) => ({ ...p, si: true })) })));
      setAviso({ ok: true, texto: `Leída. Revisa nombres y precios antes de añadir.${r.restantes != null ? ` Te quedan ${r.restantes} créditos de IA.` : ''}` });
    });
  };

  const anadir = () => {
    if (!secciones) return;
    setAviso(null); setFase('anadir');
    iniciar(async () => {
      const r = await anadirCartaLeidaAction(secciones.map((s) => ({ nombre: s.nombre, platos: s.platos.filter((p) => p.si && p.precio).map((p) => ({ nombre: p.nombre, descripcion: p.descripcion, precio: p.precio!, alergenos: p.alergenos })) })).filter((s) => s.platos.length));
      setFase(null);
      if (!r.ok) { setAviso({ ok: false, texto: r.error }); return; }
      setAviso({ ok: !r.aviso, texto: r.aviso ? `Añadidos ${r.creados}. Se paró aquí: ${r.aviso}` : `¡Hecho! ${r.creados} platos añadidos a tu carta.` });
      if (!r.aviso) { setSecciones(null); setFotos([]); }
      avisarEstudio({ recargar: true });
    });
  };

  const editar = (si: number, pi: number, cambio: Partial<Plato>) =>
    setSecciones((x) => x && x.map((s, i) => (i !== si ? s : { ...s, platos: s.platos.map((p, k) => (k === pi ? { ...p, ...cambio } : p)) })));

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="group flex w-full items-center gap-4 rounded-[26px] bg-[#0D090F] p-5 text-left text-white transition hover:shadow-xl"
        style={{ backgroundImage: 'radial-gradient(120% 90% at 0% 0%, rgba(140,13,55,.55), transparent 60%)' }}>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#F2C14E] text-xl text-[#0D090F]">✦</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl italic text-[#F2C14E]">Monta tu carta desde una foto</span>
          <span className="block text-sm text-white/70">Sube la foto de tu carta en papel y la IA crea secciones, platos, precios y alérgenos. Tú solo revisas.</span>
        </span>
        <span className="hidden rounded-full bg-white/10 px-4 py-2 text-xs font-bold sm:block">Empezar →</span>
      </button>
    );
  }

  return (
    <section className="space-y-5 rounded-[28px] bg-[#0D090F] p-5 text-white sm:p-7" style={{ backgroundImage: 'radial-gradient(120% 70% at 0% 0%, rgba(140,13,55,.5), transparent 60%)' }}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">Carta desde foto · 1 crédito de IA</p>
          <h3 className="mt-1 font-display text-3xl italic text-[#F2C14E]">Tu carta en papel, en un minuto</h3>
        </div>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full bg-white/10">✕</button>
      </header>

      {!secciones && (
        <>
          <p className="text-sm text-white/70">Hasta 4 fotos (una por página). De frente, con buena luz y que se lean los precios.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {fotos.map((u, i) => (
              <div key={u} className="relative h-40 overflow-hidden rounded-2xl ring-1 ring-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Página ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFotos(fotos.filter((_, k) => k !== i))} aria-label="Quitar foto" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70">✕</button>
              </div>
            ))}
            {fotos.length < 4 && (
              <div className="rounded-2xl bg-white p-3 text-tinta">
                <SubirImagen key={fotos.length} valor={null} etiqueta={fotos.length ? 'Otra página' : 'Foto de tu carta'} onCambio={(u) => { if (u) setFotos((f) => [...f, u].slice(0, 4)); }} />
              </div>
            )}
          </div>
          <button type="button" disabled={fotos.length === 0 || pendiente} onClick={leer}
            className="w-full rounded-2xl bg-[#F2C14E] py-4 text-sm font-bold text-[#0D090F] disabled:opacity-40">
            {fase === 'leer' ? 'Leyendo tu carta… (puede tardar un minuto)' : `Leer con IA ${fotos.length ? `(${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'})` : ''}`}
          </button>
        </>
      )}

      {secciones && (
        <div className="space-y-4">
          {secciones.map((s, si) => (
            <div key={si} className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
              <input value={s.nombre} onChange={(e) => setSecciones(secciones.map((x, i) => (i === si ? { ...x, nombre: e.target.value } : x)))}
                className="w-full bg-transparent font-display text-xl italic text-[#F2C14E] focus:outline-none" aria-label="Nombre de la sección" />
              <ul className="mt-2 divide-y divide-white/10">
                {s.platos.map((p, pi) => (
                  <li key={pi} className={`grid grid-cols-[auto_1fr_90px] items-start gap-3 py-2.5 ${p.si ? '' : 'opacity-40'}`}>
                    <input type="checkbox" checked={p.si} onChange={(e) => editar(si, pi, { si: e.target.checked })} className="mt-2 h-4 w-4 accent-[#F2C14E]" aria-label={`Incluir ${p.nombre}`} />
                    <span className="min-w-0">
                      <input value={p.nombre} onChange={(e) => editar(si, pi, { nombre: e.target.value })} className="w-full bg-transparent text-sm font-semibold focus:outline-none" aria-label="Nombre del plato" />
                      {p.descripcion && <span className="block truncate text-xs text-white/55">{p.descripcion}</span>}
                      {p.alergenos.length > 0 && <span className="block text-[11px] text-white/45">{p.alergenos.map((a) => ALERGENOS[a] ?? a).join(' · ')} <em className="not-italic text-white/35">(revísalos)</em></span>}
                    </span>
                    <input inputMode="decimal" value={p.precio ?? ''} placeholder="Precio"
                      onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); editar(si, pi, { precio: e.target.value === '' ? null : Number.isFinite(n) ? n : p.precio }); }}
                      className={`rounded-lg bg-white/10 px-2 py-1.5 text-right text-sm ${p.precio ? 'text-[#F2C14E]' : 'ring-1 ring-red-400'}`} aria-label="Precio" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-white/55">Los alérgenos son una propuesta de la IA: revísalos con tu cocina (la ley te hace responsable de la información). Los platos sin precio no se añaden.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={marcados === 0 || pendiente} onClick={anadir} className="flex-1 rounded-2xl bg-[#F2C14E] py-4 text-sm font-bold text-[#0D090F] disabled:opacity-40">
              {fase === 'anadir' ? 'Añadiendo…' : `Añadir ${marcados} platos a mi carta`}
            </button>
            <button type="button" onClick={() => setSecciones(null)} className="rounded-2xl px-5 py-4 text-sm font-semibold ring-1 ring-white/20">Volver a las fotos</button>
          </div>
        </div>
      )}

      {aviso && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${aviso.ok ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-100'}`}>{aviso.texto}</p>}
    </section>
  );
}
