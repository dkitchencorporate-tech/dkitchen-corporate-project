'use client';

import { useState } from 'react';
import type { Equipo, MiembroEquipo, RolSala } from '@/lib/equipo-tipos';

export type RespEquipo = { ok: true; enlace?: string } | { ok: false; error: string };
export interface OpsEquipo {
  crear: (nombre: string, rol: RolSala) => Promise<RespEquipo>;
  editar: (id: string, cambios: { nombre?: string; rol?: RolSala; activo?: boolean }) => Promise<RespEquipo>;
  regenerar: (id: string) => Promise<RespEquipo>;
  zona: (zona: string, camareroId: string | null) => Promise<RespEquipo>;
}

const TOPE = 20;
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null);

/**
 * Gestión del equipo de sala (0047, B3), la misma en el panel del dueño y en la
 * app del encargado. El dueño lo hace todo (incluido el rol); el encargado solo
 * gestiona camareros: los encargados le salen en modo lectura.
 */
export default function EquipoGestion({ equipo, modo, yoId, ops, onCambio }: {
  equipo: Equipo; modo: 'dueno' | 'encargado'; yoId?: string; ops: OpsEquipo; onCambio: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<RolSala>('camarero');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enlace, setEnlace] = useState<{ nombre: string; url: string } | null>(null);
  const [verBajas, setVerBajas] = useState(false);

  const activos = equipo.camareros.filter((c) => c.activo);
  const bajas = equipo.camareros.filter((c) => !c.activo);
  const puedeTocar = (c: MiembroEquipo) => modo === 'dueno' || (c.rol === 'camarero' && c.id !== yoId);

  async function hacer(fn: () => Promise<RespEquipo>, ok: string, nombreEnlace?: string): Promise<boolean> {
    setOcupado(true); setAviso(null);
    try {
      const r = await fn();
      if (!r.ok) { setAviso({ ok: false, texto: r.error }); return false; }
      if (r.enlace && nombreEnlace) setEnlace({ nombre: nombreEnlace, url: r.enlace });
      setAviso({ ok: true, texto: ok });
      onCambio();
      return true;
    } catch {
      setAviso({ ok: false, texto: 'No se pudo completar. Revisa la conexión e inténtalo de nuevo.' });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-6">
      {aviso && <p role="status" className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${aviso.ok ? 'bg-green-600/10 text-green-800' : 'bg-red-600/10 text-red-700'}`}>{aviso.texto}</p>}

      {enlace && (
        <div className="space-y-2 rounded-2xl border-2 border-green-600/40 bg-green-600/10 p-4 text-sm">
          <p className="font-bold text-green-800">Enlace personal de {enlace.nombre}</p>
          <p className="text-green-900/80">Solo se muestra ahora: envíaselo y que lo guarde en la pantalla de inicio del móvil. Si lo pierde, crea uno nuevo.</p>
          <code className="block select-all break-all rounded-lg bg-white p-2 text-xs">{enlace.url}</code>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigator.clipboard?.writeText(enlace.url).then(() => setAviso({ ok: true, texto: 'Enlace copiado.' }))} className="rounded-full bg-white px-4 py-2 font-semibold">Copiar</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Tu acceso a la sala: ${enlace.url}`)}`} target="_blank" rel="noopener" className="rounded-full bg-[#25D366] px-4 py-2 font-semibold text-white">Enviar por WhatsApp</a>
            <button onClick={() => setEnlace(null)} className="px-2 py-2 text-xs text-black/50 underline">Ya lo he guardado</button>
          </div>
        </div>
      )}

      {/* Alta */}
      <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold">Añadir al equipo</h3>
          <span className="text-xs text-black/50">{activos.length} de {TOPE} accesos activos</span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const n = nombre.trim(); if (n) hacer(() => ops.crear(n, modo === 'dueno' ? rol : 'camarero'), `Acceso creado para ${n}.`, n).then((ok) => { if (ok) setNombre(''); }); }}
          className="flex flex-col gap-2 sm:flex-row">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Nombre (p. ej. Lucía)" aria-label="Nombre"
            className="min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm" />
          {modo === 'dueno' && (
            <select value={rol} onChange={(e) => setRol(e.target.value as RolSala)} aria-label="Rol" className="rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm">
              <option value="camarero">Camarero</option>
              <option value="encargado">Encargado</option>
            </select>
          )}
          <button disabled={ocupado || !nombre.trim() || activos.length >= TOPE} className="rounded-full bg-vino px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">Crear acceso</button>
        </form>
        <p className="text-xs text-black/50">
          {modo === 'dueno'
            ? 'Cada persona entra desde su móvil con su enlace, sin contraseña. El encargado ve todas las mesas, anula con motivo, mueve o junta mesas y gestiona a los camareros.'
            : 'Cada camarero entra desde su móvil con su enlace, sin contraseña. Si deja el equipo, dale de baja y el enlace deja de funcionar.'}
        </p>
      </section>

      {/* Personas */}
      <section className="space-y-2">
        <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-black/50">Equipo activo ({activos.length})</h3>
        {activos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/55">Aún no hay nadie. Crea el primer acceso arriba.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {activos.map((c) => (
              <Persona key={c.id} c={c} modo={modo} yo={c.id === yoId} editable={puedeTocar(c)} ocupado={ocupado}
                renombrar={(n) => hacer(() => ops.editar(c.id, { nombre: n }), 'Nombre cambiado.')}
                cambiarRol={() => hacer(() => ops.editar(c.id, { rol: c.rol === 'encargado' ? 'camarero' : 'encargado' }), c.rol === 'encargado' ? `${c.nombre} pasa a camarero.` : `${c.nombre} ahora es encargado.`)}
                regenerar={() => hacer(() => ops.regenerar(c.id), `Enlace nuevo para ${c.nombre}: el anterior ya no funciona.`, c.nombre)}
                baja={() => hacer(() => ops.editar(c.id, { activo: false }), `${c.nombre} dado de baja: su enlace ya no funciona y sus mesas quedan libres.`)} />
            ))}
          </ul>
        )}
        {bajas.length > 0 && (
          <div className="pt-1">
            <button onClick={() => setVerBajas((v) => !v)} className="px-1 text-xs font-semibold text-black/55 underline">{verBajas ? 'Ocultar' : 'Ver'} dados de baja ({bajas.length})</button>
            {verBajas && (
              <ul className="mt-2 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white">
                {bajas.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="text-black/50">{c.nombre} · {c.rol}</span>
                    {puedeTocar(c) && (
                      <button disabled={ocupado} onClick={() => hacer(() => ops.editar(c.id, { activo: true }), `${c.nombre} reactivado. Crea un enlace nuevo si no conserva el suyo.`)} className="text-xs font-bold text-vino">Reactivar</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Zonas */}
      <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <div>
          <h3 className="text-lg font-bold">Zonas y mesas</h3>
          <p className="text-xs text-black/50">Asigna cada zona a una persona: todas sus mesas pasan a ser suyas y las verá primero en su móvil. Las llamadas de cualquier mesa las oye todo el equipo.</p>
        </div>
        {equipo.zonas.length === 0 ? (
          <p className="rounded-xl bg-black/5 p-4 text-sm text-black/60">
            Aún no hay mesas. {modo === 'dueno' ? <>Dibuja tu local en <a href="/panel?pestana=sala" className="font-semibold text-vino underline">Servicio → Sala</a> y vuelve aquí para repartir las zonas.</> : 'El dueño tiene que dibujar el plano del local desde su panel.'}
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {equipo.zonas.map((z) => {
              const actual = z.camareros.length === 1 ? z.camareros[0] : z.camareros.length === 0 ? '' : 'varios';
              return (
                <li key={z.nombre} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold">{z.nombre}</p>
                    <p className="text-xs text-black/50">{z.mesas} {z.mesas === 1 ? 'mesa' : 'mesas'}{actual === 'varios' ? ' · repartida entre varios' : ''}</p>
                  </div>
                  <select value={actual} disabled={ocupado} aria-label={`Responsable de ${z.nombre}`}
                    onChange={(e) => { const v = e.target.value; if (v !== 'varios') hacer(() => ops.zona(z.nombre, v || null), v ? `${z.nombre} asignada a ${activos.find((a) => a.id === v)?.nombre ?? ''}.` : `${z.nombre} queda sin asignar.`); }}
                    className="max-w-[60%] rounded-xl border border-black/15 bg-white px-3 py-2 text-sm">
                    {actual === 'varios' && <option value="varios">Varios</option>}
                    <option value="">Sin asignar</option>
                    {activos.map((a) => <option key={a.id} value={a.id}>{a.nombre}{a.rol === 'encargado' ? ' (encargado)' : ''}</option>)}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Persona({ c, modo, yo, editable, ocupado, renombrar, cambiarRol, regenerar, baja }: {
  c: MiembroEquipo; modo: 'dueno' | 'encargado'; yo: boolean; editable: boolean; ocupado: boolean;
  renombrar: (n: string) => void; cambiarRol: () => void; regenerar: () => void; baja: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(c.nombre);
  const [confirmar, setConfirmar] = useState<'baja' | 'enlace' | null>(null);
  const acceso = fecha(c.ultimo_acceso);
  const encargado = c.rol === 'encargado';

  return (
    <li className={`space-y-3 rounded-2xl border bg-white p-4 ${encargado ? 'border-amber-500/50' : 'border-black/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editando ? (
            <form onSubmit={(e) => { e.preventDefault(); const n = nombre.trim(); if (n && n !== c.nombre) renombrar(n); setEditando(false); }} className="flex gap-2">
              <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} aria-label="Nombre" className="min-w-0 flex-1 rounded-lg border border-black/15 px-2 py-1 text-sm" />
              <button className="rounded-lg bg-black/5 px-3 text-xs font-bold">Guardar</button>
            </form>
          ) : (
            <p className="truncate text-base font-bold">{c.nombre}{yo && <span className="font-normal text-black/45"> (tú)</span>}</p>
          )}
          <p className="text-xs text-black/50">{acceso ? `Última vez: ${acceso}` : 'Aún no ha entrado'}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${encargado ? 'bg-amber-400 text-black' : 'bg-black/5 text-black/60'}`}>{encargado ? 'Encargado' : 'Camarero'}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {c.zonas.length === 0 && c.mesas.length === 0 ? (
          <span className="text-black/45">Sin zona asignada</span>
        ) : (
          <>
            {c.zonas.map((z) => <span key={z} className="rounded-full bg-vino/10 px-2.5 py-1 font-semibold text-vino">{z}</span>)}
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-black/60">{c.mesas.length} {c.mesas.length === 1 ? 'mesa' : 'mesas'}{c.mesas.length > 0 && c.mesas.length <= 8 ? `: ${c.mesas.join(', ')}` : ''}</span>
          </>
        )}
      </div>

      {editable ? (
        confirmar ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-black/5 p-2 text-xs">
            <span className="flex-1">{confirmar === 'baja' ? `¿Dar de baja a ${c.nombre}? Su enlace dejará de funcionar.` : `¿Crear un enlace nuevo? El actual de ${c.nombre} dejará de funcionar.`}</span>
            <button disabled={ocupado} onClick={() => { setConfirmar(null); (confirmar === 'baja' ? baja : regenerar)(); }} className={`rounded-full px-3 py-1.5 font-bold text-white ${confirmar === 'baja' ? 'bg-red-600' : 'bg-tinta'}`}>Sí</button>
            <button onClick={() => setConfirmar(null)} className="px-2 py-1.5 font-semibold">No</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
            <button onClick={() => { setNombre(c.nombre); setEditando((v) => !v); }} className="text-black/65 underline">Cambiar nombre</button>
            {modo === 'dueno' && <button disabled={ocupado} onClick={cambiarRol} className="text-black/65 underline">{encargado ? 'Pasar a camarero' : 'Hacer encargado'}</button>}
            <button onClick={() => setConfirmar('enlace')} className="text-black/65 underline">Enlace nuevo</button>
            <button onClick={() => setConfirmar('baja')} className="text-red-600 underline">Dar de baja</button>
          </div>
        )
      ) : (
        <p className="text-[11px] text-black/45">{yo ? 'Tu acceso lo gestiona el dueño.' : 'Los encargados los gestiona el dueño.'}</p>
      )}
    </li>
  );
}
