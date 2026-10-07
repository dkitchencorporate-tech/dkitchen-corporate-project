'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ElementoPlano, MesaPlano, Camarero } from '@/lib/sala';
import InformesComandero from './InformesComandero';

// El editor solo se descarga y renderiza al abrirlo (no pesa en el panel).
const EditorSala = dynamic(() => import('./EditorSala'), { ssr: false });

type Tpv = { proveedor: string; activa: boolean; ultimoEnvio: string | null; ultimoError: string | null } | null;

/** Módulos de Sala: resumen de sala (comandero, 0045; los pedidos en vivo están en Pedidos.tsx), editor de plano (modal) y estado TPV. El equipo está en Equipo.tsx (0047). */
export default function Sala({
  mesas, elementos, camareros, tpv, modulos,
}: {
  mesas: (MesaPlano & { id: string })[]; elementos: ElementoPlano[]; camareros: Camarero[]; tpv: Tpv;
  modulos: { plano: boolean; app: boolean; tpv: boolean };
}) {
  const [editor, setEditor] = useState(false);
  const zonas = elementos.filter((e) => e.tipo === 'zona');

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Sala</h2>
        <p className="text-sm text-niebla">Tu local, tu equipo y su trabajo. La carta sigue siendo solo para mirar: aquí se organiza el servicio.</p>
      </header>

      {modulos.app && (
        <a href="/panel?pestana=pedidos" className="block rounded-2xl border-2 border-vino bg-vino/10 p-4 text-sm font-semibold text-vino">Las mesas en vivo y los pedidos están ahora en <strong>Servicio → Pedidos</strong> →</a>
      )}
      {modulos.app && <InformesComandero camareros={camareros.map((c) => ({ id: c.id, nombre: c.nombre }))} mesas={mesas.map((m) => m.numero)} />}

      {modulos.plano && (
        <section className="rounded-2xl border border-linea bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Plano de tu local</h3>
              <p className="text-sm text-niebla">{mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'} · {zonas.length} {zonas.length === 1 ? 'zona' : 'zonas'} · {mesas.filter((m) => m.camareroId).length} con camarero asignado</p>
            </div>
            <button onClick={() => setEditor(true)} className="rounded-full bg-vino px-4 py-2 text-sm font-bold">{mesas.length ? 'Abrir editor de sala' : 'Dibujar mi sala'}</button>
          </div>
          {zonas.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              {zonas.map((z, i) => (
                <li key={i} className="rounded-full px-3 py-1" style={{ background: `${z.color ?? '#6E0C2B'}33` }}>
                  {z.etiqueta ?? 'Zona'} · {camareros.find((c) => c.id === z.camareroId)?.nombre ?? 'sin camarero'}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editor && <EditorSala mesasIniciales={mesas} elementosIniciales={elementos} camareros={camareros} onCerrar={() => setEditor(false)} />}

      {modulos.app && (
        <a href="/panel?pestana=equipo" className="block rounded-2xl border border-linea bg-white p-4 text-sm">
          <span className="font-semibold">Camareros y encargados</span> · {camareros.filter((c) => c.activo).length} activos. Altas, roles, zonas y bajas están en <strong className="text-vino">Servicio → Equipo →</strong>
        </a>
      )}

      {modulos.tpv && (
        <section className="space-y-2 rounded-2xl border border-linea bg-white p-5">
          <h3 className="text-lg font-semibold">Conexión con tu TPV</h3>
          {tpv ? (
            <p className="text-sm text-grafito">
              Conectado con <strong>{tpv.proveedor}</strong> · {tpv.activa ? '🟢 activa' : '⚪ pausada'}
              {tpv.ultimoEnvio && <> · último envío {new Date(tpv.ultimoEnvio).toLocaleString('es-ES')}</>}
              {tpv.ultimoError && <span className="block text-red-600">Último error: {tpv.ultimoError}</span>}
            </p>
          ) : (
            <p className="text-sm text-niebla">DKitchen está configurando la conexión con tu TPV. <a href="/panel?pestana=soporte&asunto=Conexi%C3%B3n%20TPV" className="text-vino underline">Dinos qué TPV usas</a>.</p>
          )}
        </section>
      )}
    </div>
  );
}
