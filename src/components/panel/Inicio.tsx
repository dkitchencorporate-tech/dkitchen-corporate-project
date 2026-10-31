'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import type { EscaneosPorDia } from '@/lib/escaneos-cliente';
import type { Reserva } from '@/lib/reservas';
import type { EstadoServicios } from '@/lib/servicios';
import { registrarOfertaAction } from '@/app/panel/actions';
import { TEXTOS_OFERTA } from './OfertaFranja';
import TarjetaSignature from './TarjetaSignature';
import OfertaPuestaAPunto from '@/components/pago/OfertaPuestaAPunto';
import { Contador } from '@/components/dk/Movimiento';
import { Icono } from './Iconos';
import { BASE_OPERATIVA, formatPrecio, nombrePlan } from '@/lib/pricing-config';

/**
 * «Hoy» del dueño (decisión 13 de karc0, 01/11): VISUAL, sin listas. Escaneos en gráfica, reservas en anillo,
 * sus servicios contratados (Signature, Experience, Auditoría) dentro del mismo panel, avisos y 4 accesos
 * grandes. Una acción principal por tarjeta. Precios siempre de pricing-config.
 */
type Ir = (p: 'carta' | 'qr' | 'reservas' | 'escaneos' | 'diseno' | 'modulos' | 'plan' | 'soporte' | 'local' | 'promociones') => void;
type MiServicio = { id: string; producto: 'signature' | 'experience' | 'auditoria'; fase: string; negocio: string | null; datosEnviados: boolean };

const FASES: Record<string, string[]> = {
  signature: ['solicitud', 'pagado', 'contrato_enviado', 'contrato_firmado', 'datos_recibidos', 'en_construccion', 'primera_version', 'publicado', 'mantenimiento'],
  experience: ['solicitud', 'llamada', 'contrato_pago', 'concepto', 'evento_montado', 'venta_abierta', 'celebrado', 'cerrado'],
  auditoria: ['solicitud', 'pagada', 'reunion_fijada', 'informe_entregado', 'cerrada'],
};
const NOMBRE: Record<MiServicio['producto'], string> = { signature: 'Tu app Signature', experience: 'Tu evento Experience', auditoria: 'Tu auditoría' };

function Grafica({ serie }: { serie: number[] }) {
  const W = 300, H = 80, max = Math.max(1, ...serie);
  const pts = (serie.length > 1 ? serie : [0, 0]).map((v, i, a) => [(i / (a.length - 1)) * W, H - (v / max) * (H - 6) - 3] as const);
  const linea = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="pnArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6E0C2B" stopOpacity=".25" /><stop offset="1" stopColor="#6E0C2B" stopOpacity="0" /></linearGradient></defs>
      <motion.path d={`${linea} L${W},${H} L0,${H} Z`} fill="url(#pnArea)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
      <motion.path d={linea} fill="none" stroke="#6E0C2B" strokeWidth="2.4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, ease: 'easeOut' }} />
    </svg>
  );
}

function Anillo({ parte, total, color = '#6E0C2B' }: { parte: number; total: number; color?: string }) {
  const C = 2 * Math.PI * 30, p = total ? Math.min(1, parte / total) : 0;
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90" aria-hidden="true">
      <circle cx="36" cy="36" r="30" fill="none" stroke="#EDEDEA" strokeWidth="8" />
      <motion.circle cx="36" cy="36" r="30" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - p) }} transition={{ duration: 0.55, ease: 'easeOut' }} />
    </svg>
  );
}

const tarjeta = 'rounded-[24px] border border-linea bg-white p-5 text-left shadow-[0_20px_60px_-44px_rgba(62,5,21,.5)] transition hover:border-linea-fuerte active:scale-[.99]';

export default function Inicio({ restaurante, qrPedido = false, escaneosMes, escaneos30d, reservas, platos, servicios, misServicios = [], ir }: {
  restaurante: MiRestaurante; qrPedido?: boolean; escaneosMes: number; escaneos30d: EscaneosPorDia[]; reservas: Reserva[];
  platos: { disponible: boolean; fotoUrl: string | null }[]; servicios: EstadoServicios; misServicios?: MiServicio[]; ir: Ir;
}) {
  const hora = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const hoy = new Date().toISOString().slice(0, 10);
  const pendientes = reservas.filter((r) => r.estado === 'pendiente').length;
  const deHoy = reservas.filter((r) => r.fecha === hoy && r.estado !== 'cancelada');
  const proxima = deHoy.filter((r) => r.estado !== 'pendiente').sort((a, b) => a.hora.localeCompare(b.hora))[0];
  const activos = platos.filter((p) => p.disponible).length;
  const sinFoto = platos.filter((p) => !p.fotoUrl).length;
  const serie = escaneos30d.map((d) => d.total);
  const semana = serie.slice(-7).reduce((a, b) => a + b, 0);
  const oferta = servicios.oferta?.oferta;
  const ampliado = restaurante.plan !== 'basico';
  useEffect(() => { if (oferta) registrarOfertaAction(oferta, 'mostrada').catch(() => {}); }, [oferta]);

  // Montaje: un solo «siguiente paso» (no una lista).
  const pasos: { t: string; hecho: boolean; ir: Parameters<Ir>[0] }[] = [
    { t: 'Sube el logo de tu local', hecho: Boolean(restaurante.logoUrl), ir: 'local' },
    { t: 'Pon foto a todos tus platos', hecho: platos.length > 0 && sinFoto === 0, ir: 'carta' },
    { t: 'Completa horario y dirección', hecho: Boolean(restaurante.horario && restaurante.direccion), ir: 'local' },
    { t: 'Pide tu QR impreso para las mesas', hecho: qrPedido, ir: 'qr' },
    ...(ampliado ? [{ t: 'Añade tu enlace de reseñas de Google', hecho: Boolean(restaurante.urlResenas), ir: 'local' as const }] : []),
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  const siguiente = pasos.find((p) => !p.hecho);
  const avisos: { t: string; ir: Parameters<Ir>[0] }[] = [
    ...(pendientes ? [{ t: `${pendientes} reserva${pendientes > 1 ? 's' : ''} por confirmar`, ir: 'reservas' as const }] : []),
    ...(sinFoto ? [{ t: `${sinFoto} plato${sinFoto > 1 ? 's' : ''} sin foto`, ir: 'carta' as const }] : []),
    ...(platos.length === 0 ? [{ t: 'Tu carta está vacía', ir: 'carta' as const }] : []),
  ];
  const entra = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05, duration: 0.35 } });

  return (
    <div className="space-y-5" data-testid="panel-hoy">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-niebla" suppressHydrationWarning>{saludo} · hoy</p>
          <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{restaurante.nombre}</h1>
        </div>
        <a href={`/m/${restaurante.slug}`} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-tinta px-5 text-sm font-semibold text-white">Ver mi carta <Icono n="flecha" className="h-4 w-4" /></a>
      </header>
      {servicios.puestaBienvenida && <OfertaPuestaAPunto />}

      {avisos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {avisos.map((a) => <button key={a.t} type="button" onClick={() => ir(a.ir)} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border-2 border-oro bg-white px-4 text-sm font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-oro" />{a.t}</button>)}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <motion.button {...entra(0)} onClick={() => ir('escaneos')} className={`${tarjeta} lg:col-span-2`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">Escaneos de tu carta</p>
            <p className="text-xs text-niebla">{semana} en 7 días</p>
          </div>
          <p className="font-display mt-1 text-5xl font-semibold tabular-nums"><Contador hasta={escaneosMes} /> <span className="text-base font-normal text-niebla">este mes</span></p>
          <Grafica serie={serie} />
        </motion.button>
        <motion.button {...entra(1)} onClick={() => ir('reservas')} className={tarjeta}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">Reservas de hoy</p>
          <div className="mt-2 flex items-center gap-4">
            <Anillo parte={deHoy.length - pendientes} total={Math.max(1, deHoy.length)} color="#2F8F6B" />
            <div><p className="font-display text-4xl font-semibold tabular-nums"><Contador hasta={deHoy.length} /></p><p className="text-xs text-niebla">{pendientes ? `${pendientes} por confirmar` : 'todas confirmadas'}</p></div>
          </div>
          <p className="mt-3 text-sm">{proxima ? <>La próxima: <b>{proxima.hora}</b> · {proxima.personas} pers.</> : 'Sin reservas confirmadas para hoy.'}</p>
        </motion.button>
      </div>

      {misServicios.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {misServicios.map((s, i) => {
            const lista = FASES[s.producto] ?? [];
            const k = Math.max(0, lista.indexOf(s.fase));
            const falta = s.producto !== 'experience' && !s.datosEnviados;
            return (
              <motion.a key={s.id} {...entra(2 + i)} href={s.producto === 'experience' ? '/mi-experience' : '/mis-servicios'} className="relative overflow-hidden rounded-[24px] bg-noche p-5 text-white" data-testid="mi-servicio">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oro">{NOMBRE[s.producto]}</p>
                <p className="font-display mt-1 text-xl font-semibold">{falta ? 'Necesitamos tus datos' : `Paso ${k + 1} de ${lista.length}`}</p>
                <div className="mt-3 flex gap-1">{lista.map((f, j) => <span key={f} className={`h-1.5 flex-1 rounded-full ${j <= k ? 'bg-oro' : 'bg-white/15'}`} />)}</div>
                <span className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-tinta">{falta ? 'Enviar mis datos' : s.producto === 'experience' ? 'Ver mi evento' : 'Ver cómo va'} <Icono n="flecha" className="h-4 w-4" /></span>
              </motion.a>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([['carta', 'Mi carta', `${activos} platos`], ['reservas', 'Reservas', `${pendientes} por confirmar`], ['qr', 'QR y kit', qrPedido ? 'QR pedido' : 'Imprime tu QR'], ['soporte', 'Ayuda', 'Chat y tickets']] as [Parameters<Ir>[0], string, string][]).map(([p, t, d], i) => (
          <motion.button key={p} {...entra(4 + i)} onClick={() => ir(p)} className={`${tarjeta} flex min-h-[112px] flex-col justify-between`}>
            <Icono n="flecha" className="h-5 w-5 -rotate-45 text-vino" />
            <span><b className="block font-display text-lg">{t}</b><span className="text-xs text-niebla">{d}</span></span>
          </motion.button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <motion.section {...entra(8)} className={tarjeta}>
          <div className="flex items-center gap-4">
            <Anillo parte={hechos} total={pasos.length} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">Tu carta, al {Math.round((hechos / pasos.length) * 100)} %</p>
              <p className="font-display text-lg font-semibold">{siguiente ? siguiente.t : 'Lista y completa'}</p>
            </div>
          </div>
          {siguiente && <button type="button" onClick={() => ir(siguiente.ir)} className="mt-4 min-h-[44px] w-full rounded-full bg-vino text-sm font-semibold text-white">Hacerlo ahora</button>}
        </motion.section>

        {oferta && TEXTOS_OFERTA[oferta] ? (
          <motion.section {...entra(9)} className="relative overflow-hidden rounded-[24px] bg-vino p-5 text-white">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/75">Para tu local</p>
            <p className="mt-2 text-lg font-semibold leading-snug">{TEXTOS_OFERTA[oferta]}</p>
            <button onClick={() => { registrarOfertaAction(oferta, 'aceptada').catch(() => {}); ir('modulos'); }} className="mt-4 min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-tinta">Ver cómo funciona</button>
          </motion.section>
        ) : !misServicios.some((s) => s.producto === 'signature') ? (
          <motion.section {...entra(9)} className="relative overflow-hidden rounded-[24px] bg-noche p-5 text-white">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-oro">Tu siguiente paso</p>
            <p className="font-display mt-2 text-xl font-semibold leading-snug">Tu propia app, con tu marca. Y en propiedad.</p>
            <p className="mt-1 text-sm text-white/65">Entrada {formatPrecio(BASE_OPERATIVA.pagoUnico)} y {BASE_OPERATIVA.mantenimiento.mesesGratis} meses de mantenimiento incluidos; después desde {formatPrecio(BASE_OPERATIVA.mantenimiento.mensual)}/mes. + IVA.</p>
            <a href="/pagar/signature" className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-vino px-5 text-sm font-semibold">Ver Signature <Icono n="flecha" className="h-4 w-4" /></a>
          </motion.section>
        ) : (
          <motion.section {...entra(9)} className={tarjeta}>
            <p className="text-xs text-niebla">Tu cuenta</p>
            <p className="mt-2 text-lg font-semibold">Plan {nombrePlan(restaurante.plan)}{restaurante.fundador ? ' · Fundador' : ''}</p>
            <button onClick={() => ir('plan')} className="mt-4 min-h-[44px] rounded-full border border-linea-fuerte px-5 text-sm font-semibold">Ver mi plan</button>
          </motion.section>
        )}
      </div>

      {servicios.signature?.mostrar && <TarjetaSignature senal={servicios.signature} telefono={restaurante.telefono} demo={restaurante.id === 'demo'} />}
    </div>
  );
}
