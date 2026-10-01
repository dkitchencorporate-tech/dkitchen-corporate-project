'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import type { ElementoPlano, MesaPlano, Camarero, FilaInforme } from '@/lib/sala';
import { crearCamareroAction, desactivarCamareroAction } from '@/app/panel/actions';

// El editor solo se descarga y renderiza al abrirlo (no pesa en el panel).
const EditorSala = dynamic(() => import('./EditorSala'), { ssr: false });

type Tpv = { proveedor: string; activa: boolean; ultimoEnvio: string | null; ultimoError: string | null } | null;

const duracion = (s: number | null) => (s === null ? '—' : s < 60 ? `${s} s` : `${Math.round(s / 60)} min`);

/** Módulos de Sala: resumen, editor de plano (modal), camareros e informes, estado TPV. */
export default function Sala({
  mesas, elementos, camareros, tpv, modulos, informe,
}: {
  mesas: (MesaPlano & { id: string })[]; elementos: ElementoPlano[]; camareros: Camarero[]; tpv: Tpv;
  modulos: { plano: boolean; app: boolean; tpv: boolean }; informe: FilaInforme[];
}) {
  const [editor, setEditor] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [nombreCam, setNombreCam] = useState('');
  const accion = (fn: () => Promise<unknown>, ok: string) => {
    setAviso(null);
    iniciar(async () => {
      try { await fn(); setAviso({ ok: true, texto: ok }); }
      catch (e) { setAviso({ ok: false, texto: mensajeError(e, 'No se pudo completar.') }); }
    });
  };
  const zonas = elementos.filter((e) => e.tipo === 'zona');
  const campo = 'rounded-lg bg-white border border-[#E6E6E2] px-3 py-2 text-[#1B1D22] placeholder-[#9A9EA6]';

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Sala</h2>
        <p className="text-sm text-[#6B7079]">Tu local, tu equipo y su trabajo. La carta sigue siendo solo para mirar: aquí se organiza el servicio.</p>
        {aviso && <p className={`mt-2 text-sm ${aviso.ok ? 'text-green-700' : 'text-red-600'}`}>{aviso.texto}</p>}
      </header>

      {modulos.plano && (
        <section className="rounded-2xl border border-[#E6E6E2] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Plano de tu local</h3>
              <p className="text-sm text-[#6B7079]">{mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'} · {zonas.length} {zonas.length === 1 ? 'zona' : 'zonas'} · {mesas.filter((m) => m.camareroId).length} con camarero asignado</p>
            </div>
            <button onClick={() => setEditor(true)} className="rounded-full bg-[#6E0C2B] px-4 py-2 text-sm font-bold">{mesas.length ? 'Abrir editor de sala' : 'Dibujar mi sala'}</button>
          </div>
          {zonas.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              {zonas.map((z, i) => (
                <li key={i} className="rounded-full px-3 py-1" style={{ background: `${z.color ?? '#D9531E'}33` }}>
                  {z.etiqueta ?? 'Zona'} · {camareros.find((c) => c.id === z.camareroId)?.nombre ?? 'sin camarero'}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editor && <EditorSala mesasIniciales={mesas} elementosIniciales={elementos} camareros={camareros} onCerrar={() => setEditor(false)} />}

      {modulos.app && (
        <section className="space-y-4 rounded-2xl border border-[#E6E6E2] bg-white p-5">
          <h3 className="text-lg font-semibold">Camareros</h3>
          <p className="text-sm text-[#6B7079]">Cada camarero entra desde su móvil con su enlace personal, sin contraseña. Si deja el equipo, desactívalo y el enlace deja de funcionar.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={nombreCam} onChange={(e) => setNombreCam(e.target.value)} maxLength={40} placeholder="Nombre del camarero" className={`flex-1 ${campo}`} />
            <button disabled={pendiente || !nombreCam.trim()} onClick={() => accion(async () => { const r = await crearCamareroAction(nombreCam); setEnlace(r.enlace); setNombreCam(''); }, 'Acceso creado.')}
              className="rounded-full bg-[#6E0C2B] px-4 py-2 text-sm font-bold disabled:opacity-50">Crear acceso</button>
          </div>
          {enlace && (
            <div className="space-y-2 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
              <p className="font-semibold text-green-700">Enlace personal (solo se muestra ahora: envíalo o guárdalo):</p>
              <code className="block break-all rounded bg-white p-2 text-xs select-all">{enlace}</code>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigator.clipboard?.writeText(enlace)} className="rounded-lg bg-[#EDEDEA] px-3 py-1.5 font-semibold">Copiar</button>
                <a href={`https://wa.me/?text=${encodeURIComponent('Tu acceso a la sala: ' + enlace)}`} target="_blank" rel="noopener" className="rounded-lg bg-[#25D366] px-3 py-1.5 font-semibold text-white">Enviar por WhatsApp</a>
              </div>
            </div>
          )}
          <ul className="divide-y divide-[#ECECE8]">
            {camareros.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className={c.activo ? '' : 'text-[#9A9EA6] line-through'}>
                  {c.nombre} <span className="text-xs text-[#9A9EA6]">· {mesas.filter((m) => m.camareroId === c.id).length} mesas · {c.ultimoAcceso ? `última vez ${new Date(c.ultimoAcceso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'sin usar'}</span>
                </span>
                {c.activo && <button onClick={() => accion(() => desactivarCamareroAction(c.id), 'Acceso desactivado.')} className="text-xs text-red-600">Desactivar</button>}
              </li>
            ))}
          </ul>

          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-bold">Informe del equipo · últimos 30 días</h4>
            {informe.length === 0 ? (
              <p className="text-sm text-[#6B7079]">Aún no hay actividad registrada.</p>
            ) : (
              <>
              <ul className="space-y-2 sm:hidden">
                {informe.map((f) => (
                  <li key={f.camareroId} className="rounded-xl border border-[#E6E6E2] p-3">
                    <p className="font-semibold">{f.nombre}</p>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                      {([['Comandas', f.comandas], ['Productos', f.lineas], ['Mesas', f.mesas], ['Llamadas', f.llamadas], ['Respuesta', duracion(f.respuestaMediaSeg)]] as const).map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-[#F3F3F0] py-2"><dt className="text-[10px] uppercase tracking-wide text-[#6B7079]">{k}</dt><dd className="font-bold">{v}</dd></div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="hidden rounded-xl border border-[#E6E6E2] sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-[#F3F3F0] text-left text-xs text-[#6B7079]">
                    <tr><th className="p-2.5">Camarero</th><th className="p-2.5 text-right">Comandas</th><th className="p-2.5 text-right">Productos</th><th className="p-2.5 text-right">Mesas</th><th className="p-2.5 text-right">Llamadas</th><th className="p-2.5 text-right">Respuesta media</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECE8]">
                    {informe.map((f) => (
                      <tr key={f.camareroId}><td className="p-2.5 font-medium">{f.nombre}</td><td className="p-2.5 text-right">{f.comandas}</td><td className="p-2.5 text-right">{f.lineas}</td><td className="p-2.5 text-right">{f.mesas}</td><td className="p-2.5 text-right">{f.llamadas}</td><td className="p-2.5 text-right">{duracion(f.respuestaMediaSeg)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
            <p className="text-[11px] text-[#9A9EA6]">Todo lo que registra cada camarero queda guardado 6 meses (sin importes: la facturación la lleva tu TPV).</p>
          </div>
        </section>
      )}

      {modulos.tpv && (
        <section className="space-y-2 rounded-2xl border border-[#E6E6E2] bg-white p-5">
          <h3 className="text-lg font-semibold">Conexión con tu TPV</h3>
          {tpv ? (
            <p className="text-sm text-[#3F434B]">
              Conectado con <strong>{tpv.proveedor}</strong> · {tpv.activa ? '🟢 activa' : '⚪ pausada'}
              {tpv.ultimoEnvio && <> · último envío {new Date(tpv.ultimoEnvio).toLocaleString('es-ES')}</>}
              {tpv.ultimoError && <span className="block text-red-600">Último error: {tpv.ultimoError}</span>}
            </p>
          ) : (
            <p className="text-sm text-[#6B7079]">DKitchen está configurando la conexión con tu TPV. <a href="/panel?pestana=soporte&asunto=Conexi%C3%B3n%20TPV" className="text-[#6E0C2B] underline">Dinos qué TPV usas</a>.</p>
          )}
        </section>
      )}
    </div>
  );
}
