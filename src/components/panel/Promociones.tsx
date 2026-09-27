'use client';

import { useState, useTransition } from 'react';
import type { Promocion, DatosPromocion } from '@/lib/promociones';
import type { SeccionPropia } from '@/lib/menu-propietario';
import { crearPromocionAction, editarPromocionAction, eliminarPromocionAction } from '@/app/panel/actions';
import SubirImagen from './SubirImagen';

const campo = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/30';
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const VACIA: DatosPromocion = {
  titulo: '', texto: null, imagenUrl: null, botonTexto: null, botonSeccion: null, inicio: null, fin: null,
  dias: null, horaInicio: null, horaFin: null, prioridad: 0, activa: true,
};

function resumenProgramacion(p: DatosPromocion): string {
  const partes: string[] = [];
  if (p.inicio || p.fin) partes.push(`${p.inicio ?? '…'} → ${p.fin ?? '…'}`);
  if (p.dias?.length) partes.push(p.dias.map((d) => DIAS[d - 1]).join(' '));
  if (p.horaInicio || p.horaFin) partes.push(`${p.horaInicio ?? '00:00'}–${p.horaFin ?? '23:59'}`);
  return partes.length ? partes.join(' · ') : 'Siempre';
}

export default function Promociones({
  promociones, secciones, plan,
}: { promociones: Promocion[]; secciones: SeccionPropia[]; plan: string }) {
  const ampliado = plan === 'ampliado';
  const [editando, setEditando] = useState<{ id: string | null; d: DatosPromocion } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const activas = promociones.filter((p) => p.activa).length;

  function guardar() {
    if (!editando) return;
    setAviso(null);
    iniciar(async () => {
      try {
        if (editando.id) await editarPromocionAction(editando.id, editando.d);
        else await crearPromocionAction(editando.d);
        setEditando(null);
        setAviso({ ok: true, texto: 'Promoción guardada. Ya aparece en tu carta según su programación.' });
      } catch (e) {
        setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar.' });
      }
    });
  }

  function accion(fn: () => Promise<void>, ok: string) {
    setAviso(null);
    iniciar(async () => {
      try { await fn(); setAviso({ ok: true, texto: ok }); }
      catch (e) { setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo completar.' }); }
    });
  }

  const d = editando?.d;
  const set = <K extends keyof DatosPromocion>(k: K, v: DatosPromocion[K]) =>
    setEditando((prev) => (prev ? { ...prev, d: { ...prev.d, [k]: v } } : prev));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Promociones</h2>
          <p className="text-sm text-white/40">
            Una tarjeta que aparece al abrir tu carta: menú del día, oferta, plato especial…
            {ampliado ? ' Programa cuándo se ve cada una.' : ' Tu plan incluye 1 promoción activa.'}
          </p>
        </div>
        {!editando && (
          <button
            onClick={() => setEditando({ id: null, d: { ...VACIA, activa: ampliado || activas === 0 } })}
            className="shrink-0 rounded-lg bg-[#D9531E] px-4 py-2 text-sm font-bold hover:bg-[#B8451A]"
          >
            + Nueva
          </button>
        )}
      </div>

      {aviso && <p className={`text-sm ${aviso.ok ? 'text-green-400' : 'text-red-400'}`}>{aviso.texto}</p>}

      {editando && d && (
        <section className="space-y-4 rounded-2xl border border-[#D9531E]/40 bg-[#1c140b] p-6">
          <h3 className="font-bold">{editando.id ? 'Editar promoción' : 'Nueva promoción'}</h3>
          <input value={d.titulo} onChange={(e) => set('titulo', e.target.value)} maxLength={60} placeholder="Título (ej: Menú del día 12,90 €)" className={campo} />
          <textarea value={d.texto ?? ''} onChange={(e) => set('texto', e.target.value || null)} maxLength={160} rows={2} placeholder="Texto corto (opcional)" className={campo} />
          <SubirImagen valor={d.imagenUrl} onCambio={(url) => set('imagenUrl', url)} etiqueta="Imagen (opcional)" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={d.botonTexto ?? ''} onChange={(e) => set('botonTexto', e.target.value || null)} maxLength={30} placeholder="Texto del botón (ej: Ver el menú)" className={campo} />
            <select value={d.botonSeccion ?? ''} onChange={(e) => set('botonSeccion', e.target.value || null)} className={campo} aria-label="Sección a la que lleva el botón">
              <option value="">El botón lleva a… (inicio de la carta)</option>
              {secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className="text-xs text-white/50">Desde (opcional)</span>
              <input type="date" value={d.inicio ?? ''} onChange={(e) => set('inicio', e.target.value || null)} className={campo} /></label>
            <label className="space-y-1"><span className="text-xs text-white/50">Hasta (opcional)</span>
              <input type="date" value={d.fin ?? ''} onChange={(e) => set('fin', e.target.value || null)} className={campo} /></label>
          </div>

          {ampliado ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-white/50">Días (vacío = todos)</span>
                <div className="mt-1 flex gap-1.5">
                  {DIAS.map((l, i) => {
                    const n = i + 1; const on = d.dias?.includes(n) ?? false;
                    return (
                      <button key={l} type="button" aria-pressed={on}
                        onClick={() => set('dias', on ? (d.dias ?? []).filter((x) => x !== n) : [...(d.dias ?? []), n].sort())}
                        className={`h-9 w-9 rounded-lg text-sm font-bold ${on ? 'bg-[#D9531E]' : 'bg-white/10 text-white/60'}`}>{l}</button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1"><span className="text-xs text-white/50">Desde las</span>
                  <input type="time" value={d.horaInicio ?? ''} onChange={(e) => set('horaInicio', e.target.value || null)} className={campo} /></label>
                <label className="space-y-1"><span className="text-xs text-white/50">Hasta las</span>
                  <input type="time" value={d.horaFin ?? ''} onChange={(e) => set('horaFin', e.target.value || null)} className={campo} /></label>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/70">
                Prioridad
                <input type="number" min={0} max={9} value={d.prioridad} onChange={(e) => set('prioridad', Number(e.target.value))} className="w-16 rounded-lg bg-black/30 border border-white/10 px-2 py-1" />
                <span className="text-xs text-white/40">(si coinciden varias, se ve la de mayor prioridad)</span>
              </label>
            </div>
          ) : (
            <p className="rounded-lg bg-white/5 p-3 text-xs text-white/50">
              Programar por días y horas (ej. «menú del día de lunes a viernes de 12 a 16 h») y tener varias promociones está en el plan Ampliado.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.activa} onChange={(e) => set('activa', e.target.checked)} className="accent-[#D9531E]" /> Activa
          </label>
          <div className="flex gap-3">
            <button onClick={guardar} disabled={pendiente || !d.titulo.trim()} className="rounded-lg bg-[#D9531E] px-5 py-2 text-sm font-bold disabled:opacity-50">
              {pendiente ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setEditando(null)} className="text-sm text-white/50 hover:text-white">Cancelar</button>
          </div>
        </section>
      )}

      {promociones.length === 0 && !editando ? (
        <p className="rounded-2xl border border-white/10 bg-[#1c140b] p-8 text-center text-sm text-white/40">
          Aún no tienes promociones. Crea la primera: es lo primero que verán tus clientes al abrir la carta.
        </p>
      ) : (
        <ul className="space-y-3">
          {promociones.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#1c140b] p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {p.titulo}{' '}
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] ${p.activa ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-white/40'}`}>
                    {p.activa ? 'Activa' : 'Pausada'}
                  </span>
                </p>
                <p className="text-xs text-white/40">{resumenProgramacion(p)} · {p.vistas} vistas · {p.clics} clics</p>
              </div>
              <button
                onClick={() => accion(() => editarPromocionAction(p.id, { ...p, activa: !p.activa }), p.activa ? 'Promoción pausada.' : 'Promoción activada.')}
                disabled={pendiente}
                className="text-sm text-white/60 hover:text-white"
              >
                {p.activa ? 'Pausar' : 'Activar'}
              </button>
              <button onClick={() => setEditando({ id: p.id, d: { ...p } })} className="text-sm text-white/60 hover:text-white">Editar</button>
              <button
                onClick={() => confirm('¿Eliminar esta promoción?') && accion(() => eliminarPromocionAction(p.id), 'Promoción eliminada.')}
                disabled={pendiente}
                className="text-sm text-red-400/80 hover:text-red-300"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
