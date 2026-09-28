'use client';

import { useRef, useState, useTransition } from 'react';
import type { Mesa, Camarero } from '@/lib/sala';
import { guardarMesaAction, eliminarMesaAction, crearCamareroAction, desactivarCamareroAction } from '@/app/panel/actions';

const campo = 'rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/30';

type Tpv = { proveedor: string; activa: boolean; ultimoEnvio: string | null; ultimoError: string | null } | null;

/** Módulos de Sala (0027): plano de mesas, camareros y estado del TPV. */
export default function Sala({
  mesas, camareros, tpv, modulos, llamadasPendientes,
}: {
  mesas: Mesa[]; camareros: Camarero[]; tpv: Tpv;
  modulos: { plano: boolean; app: boolean; tpv: boolean }; llamadasPendientes: string[];
}) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [editando, setEditando] = useState<(Omit<Mesa, 'id'> & { id?: string }) | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [nombreCam, setNombreCam] = useState('');
  const [posiciones, setPosiciones] = useState<Record<string, { x: number; y: number }>>({});
  const plano = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ id: string } | null>(null);

  const accion = (fn: () => Promise<unknown>, ok: string) => {
    setAviso(null);
    iniciar(async () => {
      try { await fn(); setAviso({ ok: true, texto: ok }); }
      catch (e) { setAviso({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo completar.' }); }
    });
  };

  const pos = (m: Mesa) => posiciones[m.id] ?? { x: m.x, y: m.y };
  const zonas = [...new Set(mesas.map((m) => m.zona))];

  function mover(e: React.PointerEvent) {
    if (!arrastre.current || !plano.current) return;
    const r = plano.current.getBoundingClientRect();
    const x = Math.min(95, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(92, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    setPosiciones((p) => ({ ...p, [arrastre.current!.id]: { x, y } }));
  }
  function soltar() {
    const a = arrastre.current; arrastre.current = null;
    if (!a) return;
    const m = mesas.find((x) => x.id === a.id); const p = posiciones[a.id];
    if (m && p) accion(() => guardarMesaAction({ ...m, x: p.x, y: p.y }), `Mesa ${m.numero} colocada.`);
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold">Sala</h2>
        <p className="text-sm text-white/40">Tu local, tus mesas y tu equipo. La carta sigue siendo solo para mirar: aquí trabaja tu equipo de sala.</p>
        {aviso && <p className={`mt-2 text-sm ${aviso.ok ? 'text-green-400' : 'text-red-400'}`}>{aviso.texto}</p>}
      </header>

      {modulos.plano && (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#1c140b] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">🗺️ Plano de mesas</h3>
            <button onClick={() => setEditando({ numero: String(mesas.length + 1), zona: zonas[0] ?? 'Sala', forma: 'cuadrada', plazas: 4, x: 45, y: 45, camareroId: null })}
              className="rounded-lg bg-[#D9531E] px-3 py-1.5 text-sm font-bold">+ Mesa</button>
          </div>
          <p className="text-xs text-white/40">Arrastra las mesas para dibujar tu local. En rojo, las que están llamando ahora.</p>
          <div ref={plano} onPointerMove={mover} onPointerUp={soltar} onPointerLeave={soltar}
            className="relative aspect-[16/10] w-full touch-none overflow-hidden rounded-xl border border-white/10 bg-[repeating-linear-gradient(0deg,transparent,transparent_23px,rgba(255,255,255,.04)_24px),repeating-linear-gradient(90deg,transparent,transparent_23px,rgba(255,255,255,.04)_24px)]">
            {mesas.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/35">Añade tu primera mesa</p>}
            {mesas.map((m) => {
              const p = pos(m); const llama = llamadasPendientes.includes(m.numero);
              const tam = m.forma === 'rectangular' ? 'h-10 w-16' : 'h-12 w-12';
              return (
                <button key={m.id} onPointerDown={(e) => { arrastre.current = { id: m.id }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
                  onDoubleClick={() => setEditando(m)}
                  className={`absolute flex ${tam} cursor-grab flex-col items-center justify-center text-xs font-bold shadow-lg ${m.forma === 'redonda' ? 'rounded-full' : 'rounded-lg'} ${llama ? 'animate-pulse bg-red-500' : 'bg-white/90 text-[#1A1714]'}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }} title={`Mesa ${m.numero} · ${m.zona} (doble clic para editar)`}>
                  {m.numero}<span className="text-[9px] font-normal opacity-60">{m.plazas}p</span>
                </button>
              );
            })}
          </div>
          <ul className="flex flex-wrap gap-2 text-xs">
            {mesas.map((m) => (
              <li key={m.id}><button onClick={() => setEditando(m)} className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/15">
                Mesa {m.numero} · {m.zona}{m.camareroId ? ` · ${camareros.find((c) => c.id === m.camareroId)?.nombre ?? ''}` : ''}
              </button></li>
            ))}
          </ul>
        </section>
      )}

      {editando && (
        <section className="space-y-3 rounded-2xl border border-[#D9531E]/40 bg-[#1c140b] p-5">
          <h3 className="font-bold">{editando.id ? `Mesa ${editando.numero}` : 'Nueva mesa'}</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1"><span className="text-xs text-white/50">Número</span>
              <input value={editando.numero} onChange={(e) => setEditando({ ...editando, numero: e.target.value.slice(0, 12) })} className={`w-full ${campo}`} /></label>
            <label className="space-y-1"><span className="text-xs text-white/50">Zona</span>
              <input value={editando.zona} onChange={(e) => setEditando({ ...editando, zona: e.target.value.slice(0, 30) })} placeholder="Sala, Terraza…" className={`w-full ${campo}`} /></label>
            <label className="space-y-1"><span className="text-xs text-white/50">Forma</span>
              <select value={editando.forma} onChange={(e) => setEditando({ ...editando, forma: e.target.value as Mesa['forma'] })} className={`w-full ${campo}`}>
                <option value="cuadrada">Cuadrada</option><option value="redonda">Redonda</option><option value="rectangular">Rectangular</option>
              </select></label>
            <label className="space-y-1"><span className="text-xs text-white/50">Plazas</span>
              <input type="number" min={1} max={30} value={editando.plazas} onChange={(e) => setEditando({ ...editando, plazas: Number(e.target.value) })} className={`w-full ${campo}`} /></label>
          </div>
          {modulos.app && (
            <label className="block space-y-1"><span className="text-xs text-white/50">Camarero asignado</span>
              <select value={editando.camareroId ?? ''} onChange={(e) => setEditando({ ...editando, camareroId: e.target.value || null })} className={`w-full ${campo}`}>
                <option value="">Sin asignar</option>
                {camareros.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select></label>
          )}
          <div className="flex flex-wrap gap-3">
            <button disabled={pendiente} onClick={() => accion(async () => { await guardarMesaAction(editando); setEditando(null); }, 'Mesa guardada.')}
              className="rounded-lg bg-[#D9531E] px-5 py-2 text-sm font-bold disabled:opacity-50">Guardar</button>
            {editando.id && (
              <button disabled={pendiente} onClick={() => confirm(`¿Eliminar la mesa ${editando.numero}?`) && accion(async () => { await eliminarMesaAction(editando.id!); setEditando(null); }, 'Mesa eliminada.')}
                className="text-sm text-red-400">Eliminar</button>
            )}
            <button onClick={() => setEditando(null)} className="text-sm text-white/50">Cancelar</button>
          </div>
        </section>
      )}

      {modulos.app && (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#1c140b] p-5">
          <h3 className="font-bold">📱 Camareros</h3>
          <p className="text-xs text-white/40">Cada camarero entra con su enlace personal desde su móvil, sin contraseña. Si alguien deja el equipo, desactívalo y su enlace deja de funcionar.</p>
          <div className="flex gap-2">
            <input value={nombreCam} onChange={(e) => setNombreCam(e.target.value)} maxLength={40} placeholder="Nombre del camarero" className={`flex-1 ${campo}`} />
            <button disabled={pendiente || !nombreCam.trim()} onClick={() => accion(async () => { const r = await crearCamareroAction(nombreCam); setEnlace(r.enlace); setNombreCam(''); }, 'Acceso creado.')}
              className="rounded-lg bg-[#D9531E] px-4 text-sm font-bold disabled:opacity-50">Crear acceso</button>
          </div>
          {enlace && (
            <div className="space-y-2 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
              <p className="font-semibold text-green-300">Enlace personal (solo se muestra ahora, guárdalo o envíalo):</p>
              <code className="block break-all rounded bg-black/30 p-2 text-xs select-all">{enlace}</code>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard?.writeText(enlace)} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold">Copiar</button>
                <a href={`https://wa.me/?text=${encodeURIComponent('Tu acceso a la sala: ' + enlace)}`} target="_blank" rel="noopener" className="rounded-lg bg-[#25D366] px-3 py-1.5 font-semibold text-white">Enviar por WhatsApp</a>
              </div>
            </div>
          )}
          <ul className="divide-y divide-white/5">
            {camareros.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className={c.activo ? '' : 'text-white/30 line-through'}>{c.nombre}
                  <span className="ml-2 text-xs text-white/35">{c.ultimoAcceso ? `última vez ${new Date(c.ultimoAcceso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'sin usar'}</span>
                </span>
                {c.activo && <button onClick={() => accion(() => desactivarCamareroAction(c.id), 'Acceso desactivado.')} className="text-xs text-red-400">Desactivar</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {modulos.tpv && (
        <section className="space-y-2 rounded-2xl border border-white/10 bg-[#1c140b] p-5">
          <h3 className="font-bold">🔌 Conexión con tu TPV</h3>
          {tpv ? (
            <p className="text-sm text-white/70">
              Conectado con <strong>{tpv.proveedor}</strong> · {tpv.activa ? '🟢 activa' : '⚪ pausada'}
              {tpv.ultimoEnvio && <> · último envío {new Date(tpv.ultimoEnvio).toLocaleString('es-ES')}</>}
              {tpv.ultimoError && <span className="block text-red-300">Último error: {tpv.ultimoError}</span>}
            </p>
          ) : (
            <p className="text-sm text-white/60">DKitchen está configurando la conexión con tu TPV. Te avisaremos al terminar. <a href="/panel?pestana=soporte&asunto=Conexi%C3%B3n%20TPV" className="text-[#D9531E] underline">Dinos qué TPV usas</a>.</p>
          )}
        </section>
      )}
    </div>
  );
}
