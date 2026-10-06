'use client';

import HerramientasTexto from './HerramientasTexto';
import { mensajeError } from '@/lib/mensaje-error';
import { useState, useTransition } from 'react';
import type { Promocion, DatosPromocion } from '@/lib/promociones';
import type { SeccionPropia } from '@/lib/menu-propietario';
import { crearPromocionAction, editarPromocionAction, eliminarPromocionAction } from '@/app/panel/actions';
import SubirImagen from './SubirImagen';

const campo = 'w-full rounded-lg bg-white border border-linea px-3 py-2 text-carbon placeholder-ceniza';
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const VACIA: DatosPromocion = {
  titulo: '', texto: null, imagenUrl: null, botonTexto: null, botonSeccion: null, botonDestino: 'inicio', botonPlato: null, inicio: null, fin: null,
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
  promociones, secciones, plan, platos = [],
}: { promociones: Promocion[]; secciones: SeccionPropia[]; plan: string; platos?: { id: string; nombre: string }[] }) {
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
        setAviso({ ok: false, texto: mensajeError(e, 'No se pudo guardar.') });
      }
    });
  }

  function accion(fn: () => Promise<void>, ok: string) {
    setAviso(null);
    iniciar(async () => {
      try { await fn(); setAviso({ ok: true, texto: ok }); }
      catch (e) { setAviso({ ok: false, texto: mensajeError(e, 'No se pudo completar.') }); }
    });
  }

  const d = editando?.d;
  const set = <K extends keyof DatosPromocion>(k: K, v: DatosPromocion[K]) =>
    setEditando((prev) => (prev ? { ...prev, d: { ...prev.d, [k]: v } } : prev));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Banners</h2>
          <p className="text-sm text-niebla">
            Aparecen arriba del todo de tu carta: menú del día, ofertas, eventos… Sube tu banner ya diseñado (o solo texto).
            {ampliado
              ? ` Hasta 3 activos a la vez, rotando en carrusel, y programa cuándo se ve cada uno. (${activas}/3 activos)`
              : ` Tu plan incluye 1 banner activo. (${activas}/1 activo)`}
          </p>
        </div>
        {!editando && (
          <button
            onClick={() => setEditando({ id: null, d: { ...VACIA, activa: activas < (ampliado ? 3 : 1) } })}
            className="shrink-0 rounded-full bg-vino px-4 py-2 text-sm font-bold hover:bg-vino-hondo"
          >
            + Nuevo banner
          </button>
        )}
      </div>

      {aviso && <p className={`text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}

      {editando && d && (
        <section className="space-y-4 rounded-2xl border border-vino/40 bg-white p-6">
          <h3 className="text-lg font-semibold">{editando.id ? 'Editar banner' : 'Nuevo banner'}</h3>
          <div className="space-y-1">
            <SubirImagen valor={d.imagenUrl} onCambio={(url) => set('imagenUrl', url)} etiqueta="Imagen del banner" ia={{ modo: 'banner' }} />
            <p className="text-[11px] text-niebla">Formato horizontal 16:9 (recomendado 1200 × 675 px). Si tu banner ya lleva el texto, deja el título vacío.</p>
          </div>
          <div><input value={d.titulo ?? ''} onChange={(e) => set('titulo', e.target.value || null)} maxLength={60} spellCheck lang="es" placeholder="Título (opcional con imagen; ej: Menú del día 12,90 €)" className={campo} /><HerramientasTexto valor={d.titulo ?? ''} onCambio={(v) => set('titulo', v || null)} tipo="titulo" /></div>
          {!d.imagenUrl && (
            <div><textarea value={d.texto ?? ''} onChange={(e) => set('texto', e.target.value || null)} maxLength={160} rows={2} spellCheck lang="es" placeholder="Texto corto (para banners sin imagen)" className={campo} /><HerramientasTexto valor={d.texto ?? ''} onCambio={(v) => set('texto', v || null)} tipo="descripcion" contexto={d.titulo ?? ''} /></div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-grafito">Botón del banner</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="A dónde lleva el botón">
              {([['ninguno', 'Sin botón'], ['seccion', 'A una sección'], ['plato', 'A un plato'], ...(ampliado ? [['reservar', 'A reservar']] : []), ['inicio', 'Solo el banner']] as [DatosPromocion['botonDestino'], string][]).map(([v, t]) => (
                <button key={v} type="button" role="radio" aria-checked={d.botonDestino === v} onClick={() => set('botonDestino', v)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${d.botonDestino === v ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white'}`}>{t}</button>
              ))}
            </div>
            {d.botonDestino !== 'ninguno' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={d.botonTexto ?? ''} onChange={(e) => set('botonTexto', e.target.value || null)} maxLength={30} placeholder={d.botonDestino === 'reservar' ? 'Texto del botón (ej: Reserva tu mesa)' : 'Texto del botón (ej: Ver el menú)'} className={campo} />
                {d.botonDestino === 'seccion' && (
                  <select value={d.botonSeccion ?? ''} onChange={(e) => set('botonSeccion', e.target.value || null)} className={campo} aria-label="Sección a la que lleva el botón">
                    <option value="">Elige la sección…</option>
                    {secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                )}
                {d.botonDestino === 'plato' && (
                  <select value={d.botonPlato ?? ''} onChange={(e) => set('botonPlato', e.target.value || null)} className={campo} aria-label="Plato que abre el botón">
                    <option value="">Elige el plato…</option>
                    {platos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                )}
              </div>
            )}
            <p className="text-[11px] text-niebla">{({ ninguno: 'El banner solo informa: no lleva botón.', seccion: 'Al tocarlo, la carta baja hasta esa sección.', plato: 'Al tocarlo, se abre la ficha de ese plato con su foto y precio.', reservar: 'Al tocarlo, se abre el formulario de reserva.', inicio: 'El botón se muestra, pero el cliente se queda en la carta.' } as Record<string, string>)[d.botonDestino]}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className="text-xs text-niebla">Desde (opcional)</span>
              <input type="date" value={d.inicio ?? ''} onChange={(e) => set('inicio', e.target.value || null)} className={campo} /></label>
            <label className="space-y-1"><span className="text-xs text-niebla">Hasta (opcional)</span>
              <input type="date" value={d.fin ?? ''} onChange={(e) => set('fin', e.target.value || null)} className={campo} /></label>
          </div>

          {ampliado ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-niebla">Días (vacío = todos)</span>
                <div className="mt-1 flex gap-1.5">
                  {DIAS.map((l, i) => {
                    const n = i + 1; const on = d.dias?.includes(n) ?? false;
                    return (
                      <button key={l} type="button" aria-pressed={on}
                        onClick={() => set('dias', on ? (d.dias ?? []).filter((x) => x !== n) : [...(d.dias ?? []), n].sort())}
                        className={`h-9 w-9 rounded-lg text-sm font-bold ${on ? 'bg-vino' : 'bg-papel text-niebla'}`}>{l}</button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1"><span className="text-xs text-niebla">Desde las</span>
                  <input type="time" value={d.horaInicio ?? ''} onChange={(e) => set('horaInicio', e.target.value || null)} className={campo} /></label>
                <label className="space-y-1"><span className="text-xs text-niebla">Hasta las</span>
                  <input type="time" value={d.horaFin ?? ''} onChange={(e) => set('horaFin', e.target.value || null)} className={campo} /></label>
              </div>
              <label className="flex items-center gap-2 text-sm text-grafito">
                Prioridad
                <input type="number" min={0} max={9} value={d.prioridad} onChange={(e) => set('prioridad', Number(e.target.value))} className="w-16 rounded-lg bg-white border border-linea px-2 py-1" />
                <span className="text-xs text-niebla">(si coinciden varias, se ve la de mayor prioridad)</span>
              </label>
            </div>
          ) : (
            <p className="rounded-lg bg-[#F3F3F0] p-3 text-xs text-niebla">
              Programar por días y horas (ej. «menú del día de lunes a viernes de 12 a 16 h») y tener varias promociones está en el plan Ampliado.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.activa} onChange={(e) => set('activa', e.target.checked)} className="accent-vino" /> Activa
          </label>
          <div className="flex gap-3">
            <button onClick={guardar} disabled={pendiente || (!d.titulo?.trim() && !d.imagenUrl)} className="rounded-full bg-vino px-5 py-2 text-sm font-bold disabled:opacity-50">
              {pendiente ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setEditando(null)} className="text-sm text-niebla hover:text-carbon">Cancelar</button>
          </div>
        </section>
      )}

      {promociones.length === 0 && !editando ? (
        <p className="rounded-2xl border border-linea bg-white p-8 text-center text-sm text-niebla">
          Aún no tienes banners. Crea el primero: es lo primero que verán tus clientes al abrir la carta.
        </p>
      ) : (
        <ul className="space-y-3">
          {promociones.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-linea bg-white p-4">
              {p.imagenUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.imagenUrl} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-vino/20 text-[10px] font-bold text-vino">TEXTO</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {p.titulo ?? 'Banner con imagen'}{' '}
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] ${p.activa ? 'bg-green-500/15 text-green-700' : 'bg-papel text-niebla'}`}>
                    {p.activa ? 'Activa' : 'Pausada'}
                  </span>
                </p>
                <p className="text-xs text-niebla">{resumenProgramacion(p)} · {p.vistas} vistas · {p.clics} clics</p>
              </div>
              <button
                onClick={() => accion(() => editarPromocionAction(p.id, { ...p, activa: !p.activa }), p.activa ? 'Banner pausado.' : 'Banner activado.')}
                disabled={pendiente}
                className="text-sm text-niebla hover:text-carbon"
              >
                {p.activa ? 'Pausar' : 'Activar'}
              </button>
              <button onClick={() => setEditando({ id: p.id, d: { ...p } })} className="text-sm text-niebla hover:text-carbon">Editar</button>
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
