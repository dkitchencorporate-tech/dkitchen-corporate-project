'use client';

import { useEffect, useMemo, useState } from 'react';
import { seguimientoAction } from '@/app/admin-dkitchen/qr/seguimiento-actions';
import type { EventoSeguimiento } from '@/lib/admin-seguimiento';

/**
 * Seguimiento en vivo del piloto (0078, 14/10/2026) en la ficha de Central: qué pantallas
 * ha visto, cuánto tarda en cada una, dónde se atasca, qué errores le saltan y cada clic.
 * Se refresca solo cada 8 segundos.
 */
const PANTALLAS: [string, string][] = [
  ['inicio', 'Inicio'], ['carta', 'Carta'], ['estudio', 'Estudio'], ['local', 'Mi local'], ['promociones', 'Promociones'],
  ['reservas', 'Reservas'], ['sala', 'Sala'], ['equipo', 'Equipo'], ['pedidos', 'Pedidos'], ['camarero', 'Camarero'],
  ['idiomas', 'Idiomas'], ['diseno', 'Diseño'], ['modulos', 'Mejoras'], ['qr', 'QR'], ['escaneos', 'Escaneos'], ['plan', 'Mi plan'], ['soporte', 'Soporte'],
];
const nombre = (p: string | null) => PANTALLAS.find(([id]) => id === p)?.[1] ?? p ?? '—';
const hora = (iso: string, tz: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz });
const dia = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Caracas' });
const dur = (ms: number) => (ms < 60_000 ? `${Math.round(ms / 1000)} s` : ms < 3_600_000 ? `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s` : `${Math.floor(ms / 3_600_000)} h ${Math.round((ms % 3_600_000) / 60_000)} min`);
const COLOR: Record<string, string> = { clic: 'bg-tinta', vista: 'bg-vino', error: 'bg-red-600', tiempo: 'bg-ceniza', inicio: 'bg-emerald-600', salida: 'bg-amber-500' };

export default function SeguimientoEnVivo({ restauranteId, inicial, hasta }: { restauranteId: string; inicial: EventoSeguimiento[]; hasta: string | null }) {
  const [ev, setEv] = useState(inicial);
  const [filtro, setFiltro] = useState<'todo' | 'clic' | 'error' | 'vista'>('todo');
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => { seguimientoAction(restauranteId).then(setEv).catch(() => {}); setAhora(Date.now()); }, 8000);
    return () => clearInterval(t);
  }, [restauranteId]);

  const r = useMemo(() => {
    const asc = [...ev].reverse();
    const tiempos = new Map<string, number>();
    const clicsPor = new Map<string, number>();
    const visitadas = new Set<string>();
    const atascos: string[] = [];
    const sesiones = new Set<string>();
    const dispositivos = new Set<string>();
    let clics = 0;
    asc.forEach((e, i) => {
      sesiones.add(e.sesion);
      if (e.tipo === 'inicio' && e.detalle) dispositivos.add(e.detalle.split(' · ').slice(0, 4).join(' · '));
      if (e.tipo === 'vista' && e.objetivo) visitadas.add(e.objetivo);
      if (e.tipo === 'tiempo' && e.objetivo && e.ms) tiempos.set(e.objetivo, (tiempos.get(e.objetivo) ?? 0) + e.ms);
      if (e.tipo === 'clic') {
        clics++;
        if (e.pantalla) clicsPor.set(e.pantalla, (clicsPor.get(e.pantalla) ?? 0) + 1);
        if (e.detalle?.includes('DESACTIVADO')) atascos.push(`Pulsó «${e.objetivo}» (desactivado) en ${nombre(e.pantalla)} · ${hora(e.creadoEn, 'Europe/Madrid')}`);
        const previos = asc.slice(Math.max(0, i - 4), i).filter((x) => x.tipo === 'clic' && x.objetivo === e.objetivo && new Date(e.creadoEn).getTime() - new Date(x.creadoEn).getTime() < 10_000);
        if (previos.length >= 2) atascos.push(`Pulsó «${e.objetivo}» ${previos.length + 1} veces seguidas en ${nombre(e.pantalla)} (no le respondía) · ${hora(e.creadoEn, 'Europe/Madrid')}`);
      }
    });
    tiempos.forEach((ms, p) => { if (ms > 4 * 60_000 && (clicsPor.get(p) ?? 0) < 3) atascos.push(`${dur(ms)} en ${nombre(p)} con solo ${clicsPor.get(p) ?? 0} clics: posible bloqueo o duda`); });
    const errores = ev.filter((e) => e.tipo === 'error');
    const total = [...tiempos.values()].reduce((a, b) => a + b, 0);
    const ultimo = ev[0] ? new Date(ev[0].creadoEn).getTime() : 0;
    return { tiempos: [...tiempos.entries()].sort((a, b) => b[1] - a[1]), visitadas, atascos: [...new Set(atascos)].slice(-15).reverse(), errores, total, clics, sesiones: sesiones.size, dispositivos: [...dispositivos], ultimo, ultimaPantalla: ev.find((e) => e.pantalla)?.pantalla ?? null };
  }, [ev]);

  const enVivo = r.ultimo && ahora - r.ultimo < 2 * 60_000;
  const lista = ev.filter((e) => filtro === 'todo' ? e.tipo !== 'tiempo' : e.tipo === filtro).slice(0, 300);
  const maxT = r.tiempos[0]?.[1] ?? 1;

  return (
    <section id="seguimiento" className="scroll-mt-20 rounded-[22px] border border-vino/25 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vino">Piloto · seguimiento en vivo</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">Qué hace, dónde tarda y dónde se atasca</h2>
          <p className="mt-1 text-xs text-niebla">Se actualiza cada 8 s. Nunca se guarda lo que escribe. Activo {hasta ? `hasta el ${new Date(hasta).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` : 'sin fecha'}.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${enVivo ? 'bg-emerald-50 text-emerald-700' : 'bg-papel text-niebla'}`}>
          <span className={`h-2 w-2 rounded-full ${enVivo ? 'animate-pulse bg-emerald-500' : 'bg-ceniza'}`} />
          {enVivo ? `En el panel ahora · ${nombre(r.ultimaPantalla)}` : r.ultimo ? `Última actividad ${dia(new Date(r.ultimo).toISOString())} ${hora(new Date(r.ultimo).toISOString(), 'America/Caracas')} (Caracas)` : 'Aún no ha entrado'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[['Sesiones', String(r.sesiones)], ['Tiempo en el panel', r.total ? dur(r.total) : '—'], ['Clics', String(r.clics)], ['Pantallas vistas', `${r.visitadas.size}/${PANTALLAS.length}`], ['Errores', String(r.errores.length)]].map(([t, v]) => (
          <div key={t} className={`rounded-2xl border p-3 ${t === 'Errores' && r.errores.length ? 'border-red-200 bg-red-50' : 'border-linea bg-crema/40'}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-niebla">{t}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
      {r.dispositivos.length > 0 && <p className="mt-3 text-xs text-niebla">Dispositivo: {r.dispositivos.join(' | ')}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold">Avance por pantallas</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PANTALLAS.map(([id, n]) => (
              <span key={id} className={`rounded-full px-2.5 py-1 text-xs ${r.visitadas.has(id) ? 'bg-tinta text-white' : 'border border-linea text-ceniza'}`}>{r.visitadas.has(id) ? '✓ ' : ''}{n}</span>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-bold">Dónde tarda más</h3>
          <div className="mt-2 space-y-1.5">
            {r.tiempos.length === 0 && <p className="text-sm text-niebla">Sin datos todavía.</p>}
            {r.tiempos.slice(0, 8).map(([p, ms]) => (
              <div key={p} className="text-sm">
                <div className="flex justify-between"><span>{nombre(p)}</span><span className="text-niebla">{dur(ms)}</span></div>
                <div className="mt-0.5 h-1.5 rounded-full bg-papel"><div className="h-1.5 rounded-full bg-vino" style={{ width: `${Math.max(4, (ms / maxT) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold">Dónde se atasca</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {r.atascos.length === 0 ? <li className="text-niebla">Nada por ahora.</li> : r.atascos.map((a) => <li key={a} className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">{a}</li>)}
          </ul>
          <h3 className="mt-5 text-sm font-bold">Errores que le saltan</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {r.errores.length === 0 ? <li className="text-niebla">Ninguno.</li> : r.errores.slice(0, 12).map((e) => (
              <li key={e.id} className="rounded-xl bg-red-50 px-3 py-2 text-red-900"><strong>{e.objetivo}</strong> en {nombre(e.pantalla)} · {hora(e.creadoEn, 'Europe/Madrid')}<br /><span className="break-words text-xs">{e.detalle}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Cada paso (más reciente arriba)</h3>
          <div className="flex gap-1 text-xs">
            {([['todo', 'Todo'], ['clic', 'Clics'], ['vista', 'Pantallas'], ['error', 'Errores']] as const).map(([id, n]) => (
              <button key={id} onClick={() => setFiltro(id)} className={`rounded-full px-3 py-1.5 ${filtro === id ? 'bg-tinta text-white' : 'border border-linea'}`}>{n}</button>
            ))}
          </div>
        </div>
        <ol className="mt-3 max-h-[520px] space-y-1 overflow-y-auto pr-1 text-sm">
          {lista.length === 0 && <li className="text-niebla">Sin actividad todavía.</li>}
          {lista.map((e) => (
            <li key={e.id} className="grid grid-cols-[auto_1fr] gap-3 rounded-xl px-2 py-1.5 hover:bg-crema/60">
              <span className="pt-1.5"><span className={`block h-2 w-2 rounded-full ${COLOR[e.tipo] ?? 'bg-ceniza'}`} /></span>
              <span className="min-w-0">
                <span className="text-xs text-niebla">{dia(e.creadoEn)} · {hora(e.creadoEn, 'America/Caracas')} Caracas · {hora(e.creadoEn, 'Europe/Madrid')} España · {nombre(e.pantalla)}</span><br />
                <span className="font-medium">{e.tipo === 'clic' ? 'Clic: ' : e.tipo === 'vista' ? 'Abre: ' : e.tipo === 'error' ? 'Error: ' : e.tipo === 'inicio' ? 'Entra en el panel' : e.tipo === 'salida' ? 'Sale' : ''}{e.tipo === 'vista' ? nombre(e.objetivo) : e.tipo === 'inicio' ? '' : e.objetivo}</span>
                {e.detalle && <span className="block break-words text-xs text-niebla">{e.detalle}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
