'use client';

import { useState, useTransition } from 'react';
import type { Promocion, DatosPromocion } from '@/lib/promociones';
import type { SeccionPropia } from '@/lib/menu-propietario';
import { crearPromocionAction, editarPromocionAction, eliminarPromocionAction } from '@/app/panel/actions';
import SubirImagen from './SubirImagen';

const campo = 'w-full rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-[#1B1D22] placeholder-[#9A9EA6]';
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
        setAviso({ ok: true, texto: 'Banner guardado. Aparecerá en tu carta en menos de un minuto.' });
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
          <h2 className="text-xl font-bold">Banners</h2>
          <p className="text-sm text-[#6B7079]">
            Aparecen arriba del todo de tu carta: menú del día, ofertas, eventos… Sube tu banner ya diseñado (o solo texto).
            {ampliado
              ? ` Hasta 3 activos a la vez, rotando en carrusel, y programa cuándo se ve cada uno. (${activas}/3 activos)`
              : ` Tu plan incluye 1 banner activo. (${activas}/1 activo)`}
          </p>
        </div>
        {!editando && (
          <button
            onClick={() => setEditando({ id: null, d: { ...VACIA, activa: activas < (ampliado ? 3 : 1) } })}
            className="shrink-0 rounded-lg bg-[#E8592A] px-4 py-2 text-sm font-bold hover:bg-[#CF4A1F]"
          >
            + Nuevo banner
          </button>
        )}
      </div>

      {aviso && <p className={`text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}

      {editando && d && (
        <section className="space-y-4 rounded-2xl border border-[#E8592A]/40 bg-white p-6">
          <h3 className="font-bold">{editando.id ? 'Editar banner' : 'Nuevo banner'}</h3>
          <div className="space-y-1">
            <SubirImagen valor={d.imagenUrl} onCambio={(url) => set('imagenUrl', url)} etiqueta="Imagen del banner" />
            <p className="text-[11px] text-[#6B7079]">Formato horizontal 16:9 (recomendado 1200 × 675 px). Si tu banner ya lleva el texto, deja el título vacío.</p>
          </div>
          <input value={d.titulo ?? ''} onChange={(e) => set('titulo', e.target.value || null)} maxLength={60} placeholder="Título (opcional con imagen; ej: Menú del día 12,90 €)" className={campo} />
          {!d.imagenUrl && (
            <textarea value={d.texto ?? ''} onChange={(e) => set('texto', e.target.value || null)} maxLength={160} rows={2} placeholder="Texto corto (para banners sin imagen)" className={campo} />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={d.botonTexto ?? ''} onChange={(e) => set('botonTexto', e.target.value || null)} maxLength={30} placeholder="Texto del botón (ej: Ver el menú)" className={campo} />
            <select value={d.botonSeccion ?? ''} onChange={(e) => set('botonSeccion', e.target.value || null)} className={campo} aria-label="Sección a la que lleva el botón">
              <option value="">El botón lleva a… (inicio de la carta)</option>
              {secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className="text-xs text-[#6B7079]">Desde (opcional)</span>
              <input type="date" value={d.inicio ?? ''} onChange={(e) => set('inicio', e.target.value || null)} className={campo} /></label>
            <label className="space-y-1"><span className="text-xs text-[#6B7079]">Hasta (opcional)</span>
              <input type="date" value={d.fin ?? ''} onChange={(e) => set('fin', e.target.value || null)} className={campo} /></label>
          </div>

          {ampliado ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-[#6B7079]">Días (vacío = todos)</span>
                <div className="mt-1 flex gap-1.5">
                  {DIAS.map((l, i) => {
                    const n = i + 1; const on = d.dias?.includes(n) ?? false;
                    return (
                      <button key={l} type="button" aria-pressed={on}
                        onClick={() => set('dias', on ? (d.dias ?? []).filter((x) => x !== n) : [...(d.dias ?? []), n].sort())}
                        className={`h-9 w-9 rounded-lg text-sm font-bold ${on ? 'bg-[#E8592A]' : 'bg-[#EDEDEA] text-[#6B7079]'}`}>{l}</button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1"><span className="text-xs text-[#6B7079]">Desde las</span>
                  <input type="time" value={d.horaInicio ?? ''} onChange={(e) => set('horaInicio', e.target.value || null)} className={campo} /></label>
                <label className="space-y-1"><span className="text-xs text-[#6B7079]">Hasta las</span>
                  <input type="time" value={d.horaFin ?? ''} onChange={(e) => set('horaFin', e.target.value || null)} className={campo} /></label>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#3F434B]">
                Prioridad
                <input type="number" min={0} max={9} value={d.prioridad} onChange={(e) => set('prioridad', Number(e.target.value))} className="w-16 rounded-lg bg-white border border-[#E6E6E2] px-2 py-1" />
                <span className="text-xs text-[#6B7079]">(si coinciden varias, se ve la de mayor prioridad)</span>
              </label>
            </div>
          ) : (
            <p className="rounded-lg bg-[#F3F3F0] p-3 text-xs text-[#6B7079]">
              Programar por días y horas (ej. «menú del día de lunes a viernes de 12 a 16 h») y tener varias promociones está en el plan Ampliado.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.activa} onChange={(e) => set('activa', e.target.checked)} className="accent-[#D9531E]" /> Activa
          </label>
          <div className="flex gap-3">
            <button onClick={guardar} disabled={pendiente || (!d.titulo?.trim() && !d.imagenUrl)} className="rounded-lg bg-[#E8592A] px-5 py-2 text-sm font-bold disabled:opacity-50">
              {pendiente ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setEditando(null)} className="text-sm text-[#6B7079] hover:text-[#1B1D22]">Cancelar</button>
          </div>
        </section>
      )}

      {promociones.length === 0 && !editando ? (
        <p className="rounded-2xl border border-[#E6E6E2] bg-white p-8 text-center text-sm text-[#6B7079]">
          Aún no tienes banners. Crea el primero: es lo primero que verán tus clientes al abrir la carta.
        </p>
      ) : (
        <ul className="space-y-3">
          {promociones.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E6E6E2] bg-white p-4">
              {p.imagenUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.imagenUrl} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-[#E8592A]/20 text-[10px] font-bold text-[#E8592A]">TEXTO</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {p.titulo ?? 'Banner con imagen'}{' '}
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] ${p.activa ? 'bg-green-500/15 text-green-700' : 'bg-[#EDEDEA] text-[#6B7079]'}`}>
                    {p.activa ? 'Activa' : 'Pausada'}
                  </span>
                </p>
                <p className="text-xs text-[#6B7079]">{resumenProgramacion(p)} · {p.vistas} vistas · {p.clics} clics</p>
              </div>
              <button
                onClick={() => accion(() => editarPromocionAction(p.id, { ...p, activa: !p.activa }), p.activa ? 'Banner pausado.' : 'Banner activado.')}
                disabled={pendiente}
                className="text-sm text-[#6B7079] hover:text-[#1B1D22]"
              >
                {p.activa ? 'Pausar' : 'Activar'}
              </button>
              <button onClick={() => setEditando({ id: p.id, d: { ...p } })} className="text-sm text-[#6B7079] hover:text-[#1B1D22]">Editar</button>
              <button
                onClick={() => confirm('¿Eliminar este banner?') && accion(() => eliminarPromocionAction(p.id), 'Banner eliminado.')}
                disabled={pendiente}
                className="text-sm text-red-400/80 hover:text-red-600"
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
