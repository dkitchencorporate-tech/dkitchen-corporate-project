'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import type { EscaneosPorDia } from '@/lib/escaneos-cliente';
import type { Reserva } from '@/lib/reservas';
import type { EstadoServicios } from '@/lib/servicios';
import { registrarOfertaAction } from '@/app/panel/actions';
import { TEXTOS_OFERTA } from './OfertaFranja';
import { Contador } from '@/components/dk/Movimiento';

/**
 * Inicio del panel (rediseño 29/09/2026, ref. REFERENCIAS_DASHBOARD_Y_WEB):
 * saludo, cifras con micrográfico, accesos directos y UNA mejora integrada
 * (la oferta inteligente de la base) como tarjeta, no como anuncio.
 */
type Ir = (p: 'carta' | 'qr' | 'reservas' | 'escaneos' | 'diseno' | 'modulos' | 'plan' | 'soporte' | 'local' | 'promociones') => void;

function Mini({ datos }: { datos: number[] }) {
  const max = Math.max(1, ...datos);
  const w = 120, h = 36;
  const pts = datos.map((v, i) => `${(i / Math.max(1, datos.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-28" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#6E0C2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const tarjeta = 'rounded-[22px] border border-[#E6E6E2] bg-white p-5 transition-colors hover:border-[#D6D6D1]';

export default function Inicio({ restaurante, escaneosMes, escaneos30d, reservas, platos, servicios, ir }: {
  restaurante: MiRestaurante; escaneosMes: number; escaneos30d: EscaneosPorDia[]; reservas: Reserva[];
  platos: { disponible: boolean; fotoUrl: string | null }[]; servicios: EstadoServicios; ir: Ir;
}) {
  const hora = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const hoy = new Date().toISOString().slice(0, 10);
  const pendientes = reservas.filter((r) => r.estado === 'pendiente').length;
  const deHoy = reservas.filter((r) => r.fecha === hoy && r.estado !== 'cancelada');
  const activos = platos.filter((p) => p.disponible).length;
  const sinFoto = platos.filter((p) => !p.fotoUrl).length;
  const serie = escaneos30d.map((d) => d.total);
  const semana = serie.slice(-7).reduce((a, b) => a + b, 0);
  const oferta = servicios.oferta?.oferta;
  const ampliado = restaurante.plan === 'ampliado';
  useEffect(() => { if (oferta) registrarOfertaAction(oferta, 'mostrada').catch(() => {}); }, [oferta]);

  const entra = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05, duration: 0.4 } });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-[#6B7079]">{saludo}</p>
        <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{restaurante.nombre}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.button {...entra(0)} onClick={() => ir('escaneos')} className={`${tarjeta} col-span-2 text-left lg:col-span-2`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#6B7079]">Escaneos este mes</p>
              <p className="font-display mt-2 text-5xl font-semibold tabular-nums tracking-tight"><Contador hasta={escaneosMes} /></p>
              <p className="mt-1 text-xs text-[#6B7079]">{semana} en los últimos 7 días</p>
            </div>
            <Mini datos={serie.length ? serie : [0, 0]} />
          </div>
        </motion.button>
        {ampliado ? (
          <motion.button {...entra(1)} onClick={() => ir('reservas')} className={`${tarjeta} text-left`}>
            <p className="text-xs text-[#6B7079]">Reservas por confirmar</p>
            <p className={`mt-2 font-display text-4xl font-semibold tabular-nums ${pendientes ? 'text-[#6E0C2B]' : ''}`}><Contador hasta={pendientes} /></p>
            <p className="mt-1 text-xs text-[#6B7079]">{deHoy.length} para hoy</p>
          </motion.button>
        ) : (
          <motion.button {...entra(1)} onClick={() => ir('qr')} className={`${tarjeta} text-left`}>
            <p className="text-xs text-[#6B7079]">Tu QR</p>
            <p className="mt-2 text-lg font-semibold">Descargar e imprimir</p>
            <p className="mt-1 text-xs text-[#6B7079]">Nunca cambia</p>
          </motion.button>
        )}
        <motion.button {...entra(2)} onClick={() => ir('carta')} className={`${tarjeta} text-left`}>
          <p className="text-xs text-[#6B7079]">Platos en tu carta</p>
          <p className="font-display mt-2 text-4xl font-semibold tabular-nums"><Contador hasta={activos} /></p>
          <p className="mt-1 text-xs text-[#6B7079]">{sinFoto ? `${sinFoto} sin foto` : 'Todos con foto'}</p>
        </motion.button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <motion.section {...entra(3)} className={`${tarjeta} lg:col-span-2`}>
          <p className="text-xs text-[#6B7079]">Accesos rápidos</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([
              ['Editar la carta', 'carta'], ['Mi QR', 'qr'], ['Banners', 'promociones'],
              ['Datos del local', 'local'], ['Mi plan', 'plan'], ['Soporte', 'soporte'],
            ] as const).map(([t, p]) => (
              <button key={p} onClick={() => ir(p)} className="rounded-2xl border border-[#E6E6E2] bg-[#F3F3F0] px-4 py-3.5 text-left text-sm font-medium transition hover:bg-[#EDEDEA]">
                {t}
              </button>
            ))}
            <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="col-span-2 rounded-2xl bg-[#17191E] px-4 py-3.5 text-center text-sm font-semibold text-white sm:col-span-3">
              Ver mi carta como la ven mis clientes
            </a>
          </div>
        </motion.section>

        {oferta && TEXTOS_OFERTA[oferta] ? (
          <motion.section {...entra(4)} className="relative overflow-hidden rounded-[22px] bg-[#6E0C2B] p-5 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
            <p className="relative text-xs font-medium uppercase tracking-[0.18em] text-white/75">Para tu local</p>
            <p className="relative mt-3 text-lg font-semibold leading-snug">{TEXTOS_OFERTA[oferta]}</p>
            <button onClick={() => { registrarOfertaAction(oferta, 'aceptada').catch(() => {}); ir(['setup_experto', 'setup_esencial'].includes(oferta) ? 'diseno' : 'modulos'); }}
              className="relative mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#17191E]">
              Ver cómo funciona
            </button>
          </motion.section>
        ) : (
          <motion.section {...entra(4)} className={tarjeta}>
            <p className="text-xs text-[#6B7079]">Tu cuenta</p>
            <p className="mt-3 text-lg font-semibold">Plan {ampliado ? 'Ampliado' : 'Básico'}</p>
            <p className="mt-1 text-sm text-[#6B7079]">Todo al día.</p>
            <button onClick={() => ir('plan')} className="mt-5 rounded-full border border-[#D6D6D1] px-5 py-2.5 text-sm font-semibold">Ver mi plan</button>
          </motion.section>
        )}
      </div>

      {ampliado && deHoy.length > 0 && (
        <motion.section {...entra(5)} className={tarjeta}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6B7079]">Reservas de hoy</p>
            <button onClick={() => ir('reservas')} className="text-xs text-[#6B7079] underline">Ver todas</button>
          </div>
          <ul className="mt-3 divide-y divide-[#ECECE8]">
            {deHoy.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium tabular-nums">{r.hora}</span>
                <span className="flex-1 truncate">{r.nombre}</span>
                <span className="text-[#6B7079]">{r.personas} pers.</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.estado === 'pendiente' ? 'bg-amber-500/15 text-amber-700' : 'bg-green-500/15 text-green-700'}`}>{r.estado}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}
    </div>
  );
}
