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
import { Icono } from './Iconos';
import { QR_MENU, SERVICIOS_QR } from '@/lib/pricing-config';

// Ampliado + Pack Sala + Comandero Pro: lo que paga un cliente QR con todos los módulos.
const QR_CON_TODO = QR_MENU.planes.ampliado.mensual + SERVICIOS_QR.packSala + SERVICIOS_QR.comanderoPro;

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

const tarjeta = 'rounded-[22px] border border-linea bg-white p-5 transition-colors hover:border-linea-fuerte';

export default function Inicio({ restaurante, qrPedido = false, escaneosMes, escaneos30d, reservas, platos, servicios, ir }: {
  restaurante: MiRestaurante; qrPedido?: boolean; escaneosMes: number; escaneos30d: EscaneosPorDia[]; reservas: Reserva[];
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

  const pasos: { t: string; hecho: boolean; ir: Parameters<Ir>[0] }[] = [
    { t: 'Sube el logo de tu local', hecho: Boolean(restaurante.logoUrl), ir: 'local' },
    { t: 'Pon foto a todos tus platos', hecho: platos.length > 0 && sinFoto === 0, ir: 'carta' },
    { t: 'Completa horario y dirección', hecho: Boolean(restaurante.horario && restaurante.direccion), ir: 'local' },
    { t: 'Pide tu QR impreso para las mesas', hecho: qrPedido, ir: 'qr' },
    ...(ampliado ? [{ t: 'Añade tu enlace de reseñas de Google', hecho: Boolean(restaurante.urlResenas), ir: 'local' as const }] : []),
  ];
  const hechos = pasos.filter((p) => p.hecho).length;

  const entra = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05, duration: 0.4 } });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-niebla" suppressHydrationWarning>{saludo}</p>
        <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{restaurante.nombre}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.button {...entra(0)} onClick={() => ir('escaneos')} className={`${tarjeta} col-span-2 text-left lg:col-span-2`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-niebla">Escaneos este mes <span className="text-ceniza">(el día 1 vuelve a 0)</span></p>
              <p className="font-display mt-2 text-5xl font-semibold tabular-nums tracking-tight"><Contador hasta={escaneosMes} /></p>
              <p className="mt-1 text-xs text-niebla">{semana} en los últimos 7 días</p>
            </div>
            <Mini datos={serie.length ? serie : [0, 0]} />
          </div>
        </motion.button>
        {ampliado ? (
          <motion.button {...entra(1)} onClick={() => ir('reservas')} className={`${tarjeta} text-left`}>
            <p className="text-xs text-niebla">Reservas por confirmar</p>
            <p className={`mt-2 font-display text-4xl font-semibold tabular-nums ${pendientes ? 'text-vino' : ''}`}><Contador hasta={pendientes} /></p>
            <p className="mt-1 text-xs text-niebla">{deHoy.length} para hoy</p>
          </motion.button>
        ) : (
          <motion.button {...entra(1)} onClick={() => ir('qr')} className={`${tarjeta} text-left`}>
            <p className="text-xs text-niebla">Tu QR</p>
            <p className="mt-2 text-lg font-semibold">Descargar e imprimir</p>
            <p className="mt-1 text-xs text-niebla">Nunca cambia</p>
          </motion.button>
        )}
        <motion.button {...entra(2)} onClick={() => ir('carta')} className={`${tarjeta} text-left`}>
          <p className="text-xs text-niebla">Platos en tu carta</p>
          <p className="font-display mt-2 text-4xl font-semibold tabular-nums"><Contador hasta={activos} /></p>
          <p className="mt-1 text-xs text-niebla">{sinFoto ? `${sinFoto} sin foto` : 'Todos con foto'}</p>
        </motion.button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <motion.section {...entra(3)} className={`${tarjeta} lg:col-span-2`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs text-niebla">{hechos === pasos.length ? 'Tu carta está completa' : 'Primeros pasos'}</p>
            <p className="text-xs tabular-nums text-niebla">{hechos} de {pasos.length}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-papel">
            <motion.div className="h-full rounded-full bg-vino" initial={{ width: 0 }} animate={{ width: `${(hechos / pasos.length) * 100}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <ul className="mt-4 divide-y divide-linea">
            {pasos.map((p) => (
              <li key={p.t}>
                <button onClick={() => ir(p.ir)} className="flex w-full items-center gap-3 py-3 text-left text-sm">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${p.hecho ? 'bg-exito text-white' : 'border border-[#D6D1CA] text-transparent'}`}><Icono n="check" className="h-3.5 w-3.5" /></span>
                  <span className={`flex-1 ${p.hecho ? 'text-ceniza line-through decoration-[#D6D1CA]' : 'font-medium'}`}>{p.t}</span>
                  {!p.hecho && <Icono n="flecha" className="h-4 w-4 text-ceniza" />}
                </button>
              </li>
            ))}
          </ul>
          <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="mt-3 block rounded-2xl bg-tinta px-4 py-3.5 text-center text-sm font-semibold text-white">
            Ver mi carta como la ven mis clientes
          </a>
        </motion.section>

        {oferta && TEXTOS_OFERTA[oferta] ? (
          <motion.section {...entra(4)} className="relative overflow-hidden rounded-[22px] bg-vino p-5 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
            <p className="relative text-xs font-medium uppercase tracking-[0.18em] text-white/75">Para tu local</p>
            <p className="relative mt-3 text-lg font-semibold leading-snug">{TEXTOS_OFERTA[oferta]}</p>
            <button onClick={() => { registrarOfertaAction(oferta, 'aceptada').catch(() => {}); ir(['setup_experto', 'setup_esencial'].includes(oferta) ? 'diseno' : 'modulos'); }}
              className="relative mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-tinta">
              Ver cómo funciona
            </button>
          </motion.section>
        ) : (
          <motion.section {...entra(4)} className={tarjeta}>
            <p className="text-xs text-niebla">Tu cuenta</p>
            <p className="mt-3 text-lg font-semibold">Plan {ampliado ? 'Ampliado' : 'Básico'}</p>
            <p className="mt-1 text-sm text-niebla">Todo al día.</p>
            <button onClick={() => ir('plan')} className="mt-5 rounded-full border border-linea-fuerte px-5 py-2.5 text-sm font-semibold">Ver mi plan</button>
          </motion.section>
        )}
      </div>

      {ampliado && deHoy.length > 0 && (
        <motion.section {...entra(5)} className={tarjeta}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-niebla">Reservas de hoy</p>
            <button onClick={() => ir('reservas')} className="text-xs text-niebla underline">Ver todas</button>
          </div>
          <ul className="mt-3 divide-y divide-linea">
            {deHoy.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium tabular-nums">{r.hora}</span>
                <span className="flex-1 truncate">{r.nombre}</span>
                <span className="text-niebla">{r.personas} pers.</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.estado === 'pendiente' ? 'bg-amber-500/15 text-amber-700' : 'bg-green-500/15 text-green-700'}`}>{r.estado}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}
      <motion.section {...entra(6)} className="relative overflow-hidden rounded-[26px] bg-noche p-6 text-white md:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(163,24,74,.55),transparent)]" />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="etiqueta-dk text-oro">Tu siguiente paso</p>
            <p className="font-display mt-3 text-3xl font-semibold leading-tight md:text-4xl">Tu propia app, con tu marca. <span className="acento-serif">Y en propiedad.</span></p>
            <p className="mt-3 max-w-lg text-[15px] text-white/65">Con DKitchen Signature tus clientes piden y pagan en tu app, acumulan puntos y vuelven. Pedidos, sala y carta en un solo panel, y el código de tu app es tuyo.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex justify-between text-sm"><span className="text-white/60">Carta QR con todos los módulos</span><span className="tabular-nums">{QR_CON_TODO} €/mes · alquiler</span></div>
            <div className="mt-2 flex justify-between text-sm"><span className="text-white/60">Signature</span><span className="tabular-nums text-oro">desde 99 €/mes · tu app</span></div>
            <p className="mt-3 text-xs text-white/45">Signature: entrada de 700 € y 2 meses de mantenimiento incluidos. Precios + IVA.</p>
            <a href="/pagar/signature" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-vino px-5 py-3 text-sm font-semibold">Ver Signature <Icono n="flecha" className="h-4 w-4" /></a>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
