'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Equipo as DatosEquipo } from '@/lib/equipo-tipos';
import type { FilaInforme } from '@/lib/sala';
import { equipoAction, crearMiembroAction, editarMiembroAction, regenerarEnlaceAction, asignarZonaAction } from '@/app/panel/actions';
import EquipoGestion, { type OpsEquipo, type RespEquipo } from '@/components/sala/EquipoGestion';

/** Datos de ejemplo para la demo pública del panel (sin sesión no hay base). */
const EJEMPLO: DatosEquipo = {
  camareros: [
    { id: 'e1', nombre: 'Marta', rol: 'encargado', activo: true, creado_en: '2026-10-01T10:00:00Z', ultimo_acceso: new Date(Date.now() - 4 * 60000).toISOString(), mesas: ['B1', 'B2'], zonas: ['Barra'] },
    { id: 'e2', nombre: 'Lucía', rol: 'camarero', activo: true, creado_en: '2026-10-01T10:00:00Z', ultimo_acceso: new Date(Date.now() - 2 * 60000).toISOString(), mesas: ['1', '2', '3', '4', '5', '6'], zonas: ['Salón'] },
    { id: 'e3', nombre: 'Javi', rol: 'camarero', activo: true, creado_en: '2026-10-02T10:00:00Z', ultimo_acceso: new Date(Date.now() - 30 * 60000).toISOString(), mesas: ['T1', 'T2', 'T3', 'T4'], zonas: ['Terraza'] },
    { id: 'e4', nombre: 'Pablo', rol: 'camarero', activo: false, creado_en: '2026-09-20T10:00:00Z', ultimo_acceso: null, mesas: [], zonas: [] },
  ],
  zonas: [
    { nombre: 'Barra', mesas: 2, camareros: ['e1'] },
    { nombre: 'Salón', mesas: 6, camareros: ['e2'] },
    { nombre: 'Terraza', mesas: 4, camareros: ['e3'] },
  ],
};

const duracion = (s: number | null) => (s === null ? '—' : s < 60 ? `${s} s` : `${Math.round(s / 60)} min`);
const res = (r: { ok: true; datos: unknown } | { ok: false; error: string }, enlace?: string): RespEquipo => (r.ok ? { ok: true, enlace } : r);

/** Servicio → Equipo (B3): quién trabaja, con qué rol, en qué zona, y su actividad. */
export default function Equipo({ informe, demo = false }: { informe: FilaInforme[]; demo?: boolean }) {
  const [datos, setDatos] = useState<DatosEquipo | null>(demo ? EJEMPLO : null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (demo) return;
    const r = await equipoAction().catch(() => null);
    if (r?.ok) { setDatos(r.datos); setError(null); } else setError(r?.error ?? 'No se pudo cargar el equipo.');
  }, [demo]);
  useEffect(() => { cargar(); }, [cargar]);

  const enDemo: RespEquipo = { ok: false, error: 'Esto es una demo: en tu panel real se guarda al momento.' };
  const ops: OpsEquipo = demo
    ? { crear: async () => enDemo, editar: async () => enDemo, regenerar: async () => enDemo, zona: async () => enDemo }
    : {
        crear: async (n, rol) => { const r = await crearMiembroAction(n, rol); return res(r, r.ok ? r.datos.enlace : undefined); },
        editar: async (id, c) => res(await editarMiembroAction(id, c)),
        regenerar: async (id) => { const r = await regenerarEnlaceAction(id); return res(r, r.ok ? r.datos.enlace : undefined); },
        zona: async (z, id) => res(await asignarZonaAction(z, id)),
      };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Equipo</h2>
        <p className="text-sm text-niebla">Tus camareros y encargados: quién entra, con qué rol y qué zona lleva cada uno.</p>
      </header>
      {demo && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ejemplo de un equipo de bar. En tu panel real, desde aquí das de alta, cambias el rol, repartes las zonas y das de baja.</p>}
      {error && <p className="rounded-xl bg-red-600/10 p-3 text-sm text-red-700">{error} <button onClick={cargar} className="font-semibold underline">Reintentar</button></p>}
      {!datos ? (
        !error && <p className="rounded-2xl border border-linea bg-white p-8 text-center text-sm text-niebla">Cargando equipo…</p>
      ) : (
        <EquipoGestion equipo={datos} modo="dueno" ops={ops} onCambio={cargar} />
      )}

      <section className="space-y-2 rounded-2xl border border-linea bg-white p-5">
        <h3 className="text-lg font-semibold">Actividad del equipo · últimos 30 días</h3>
        {informe.length === 0 ? (
          <p className="text-sm text-niebla">Aún no hay actividad registrada.</p>
        ) : (
          <>
            <ul className="space-y-2 sm:hidden">
              {informe.map((f) => (
                <li key={f.camareroId} className="rounded-xl border border-linea p-3">
                  <p className="font-semibold">{f.nombre}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                    {([['Comandas', f.comandas], ['Productos', f.lineas], ['Mesas', f.mesas], ['Llamadas', f.llamadas], ['Respuesta', duracion(f.respuestaMediaSeg)]] as const).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-papel py-2"><dt className="text-[10px] uppercase tracking-wide text-niebla">{k}</dt><dd className="font-bold">{v}</dd></div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
            <div className="hidden rounded-xl border border-linea sm:block">
              <table className="w-full text-sm">
                <thead className="bg-papel text-left text-xs text-niebla">
                  <tr><th className="p-2.5">Persona</th><th className="p-2.5 text-right">Comandas</th><th className="p-2.5 text-right">Productos</th><th className="p-2.5 text-right">Mesas</th><th className="p-2.5 text-right">Llamadas</th><th className="p-2.5 text-right">Respuesta media</th></tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {informe.map((f) => (
                    <tr key={f.camareroId}><td className="p-2.5 font-medium">{f.nombre}</td><td className="p-2.5 text-right">{f.comandas}</td><td className="p-2.5 text-right">{f.lineas}</td><td className="p-2.5 text-right">{f.mesas}</td><td className="p-2.5 text-right">{f.llamadas}</td><td className="p-2.5 text-right">{duracion(f.respuestaMediaSeg)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="text-[11px] text-ceniza">Las cuentas de mesa y sus rondas se guardan para tus informes. La facturación y el ticket los lleva siempre tu TPV.</p>
      </section>
    </div>
  );
}
