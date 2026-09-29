'use client';

import { useState, useTransition } from 'react';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import type { EstadoServicios } from '@/lib/servicios';
import { iniciarUpgradeAmpliadoAction, solicitarBajaAction } from '@/app/panel/actions';

const PLANES = {
  basico: {
    nombre: 'Básico',
    precio: 9,
    funciones: ['Carta digital ilimitada con fotos y alérgenos', 'QR descargable y QR físico', 'Estadísticas de escaneos', 'Soporte por ticket'],
  },
  ampliado: {
    nombre: 'Ampliado',
    precio: 25,
    funciones: [
      'Todo lo del plan Básico',
      'Llamar al camarero desde la mesa, con alarma en barra',
      'Pedir la cuenta desde la mesa',
      'Botón de reseñas de Google en la carta',
      'QR individual por mesa',
    ],
  },
} as const;

const ESTADOS: Record<string, { texto: string; color: string }> = {
  activo: { texto: 'Activa', color: 'text-green-700' },
  gracia: { texto: 'Pago pendiente (periodo de gracia)', color: 'text-amber-700' },
  suspendido: { texto: 'Suspendida por impago', color: 'text-red-600' },
};

export default function MiPlan({ restaurante, servicios }: { restaurante: MiRestaurante; servicios: EstadoServicios }) {
  const esAmpliado = restaurante.plan === 'ampliado';
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actual = esAmpliado ? PLANES.ampliado : PLANES.basico;
  const estado = ESTADOS[restaurante.estadoAcceso] ?? { texto: restaurante.estadoAcceso, color: 'text-[#6B7079]' };

  function mejorar() {
    setError(null);
    iniciar(async () => {
      try {
        const { url } = await iniciarUpgradeAmpliadoAction();
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo iniciar el pago.');
      }
    });
  }

  return (
    <div className="space-y-8">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Mi Plan</h2>

      <ResumenCuenta restaurante={restaurante} servicios={servicios} precioPlan={actual.precio} nombrePlan={actual.nombre} />

      <div className="bg-white border border-[#E6E6E2] rounded-2xl p-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[#6B7079] text-sm">Plan actual</p>
          <p className="text-3xl font-black mt-1">{actual.nombre}</p>
          <p className="text-[#6B7079] text-sm mt-1">{actual.precio} €/mes · sin permanencia</p>
        </div>
        <p className="text-sm">
          Cuenta: <span className={`font-semibold ${estado.color}`}>{estado.texto}</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {(['basico', 'ampliado'] as const).map((id) => {
          const p = PLANES[id];
          const esActual = restaurante.plan === id;
          return (
            <div
              key={id}
              className={`rounded-2xl p-6 border ${id === 'ampliado' ? 'border-[#6E0C2B]/60 bg-[#6E0C2B]/5' : 'border-[#E6E6E2] bg-white'}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{p.nombre}</h3>
                <p className="font-black text-xl">
                  {p.precio} €<span className="text-sm font-normal text-[#6B7079]">/mes</span>
                </p>
              </div>
              <ul className="mt-4 space-y-2">
                {p.funciones.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-[#3F434B]">
                    <span className="text-[#6E0C2B]">✓</span> {f}
                  </li>
                ))}
              </ul>
              {esActual ? (
                <p className="mt-5 text-center text-sm font-semibold text-[#6B7079]">Tu plan actual</p>
              ) : id === 'ampliado' ? (
                <button
                  onClick={mejorar}
                  disabled={pendiente}
                  className="mt-5 w-full bg-[#6E0C2B] hover:bg-[#4A0819] disabled:opacity-50 text-white font-bold py-2.5 rounded-full"
                >
                  {pendiente ? 'Abriendo pago seguro…' : 'Pasar a Ampliado'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!esAmpliado && (
        <p className="text-xs text-[#9A9EA6]">
          El cambio se activa en cuanto se confirma el pago. Tu suscripción Básica se cancela para que no pagues las dos.
        </p>
      )}
      <DarseDeBaja />
    </div>
  );
}

const fechaLarga = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const eur = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
const QUE_ES: Record<string, string> = {
  setup_esencial: 'Revisión y configuración de tu carta por un experto',
  setup_experto: 'Diseño de autor de tu carta, flyers, QR físicos y formación',
  idiomas: 'Tu carta traducida por DKitchen a hasta 3 idiomas',
  plano_mesas: 'Plano de tu local con zonas y mesas por camarero',
  app_sala: 'Tus camareros con sus mesas y comandas en el móvil',
  conexion_tpv: 'Lo que anota el camarero llega solo a tu TPV',
  pack_sala: 'Plano de mesas + App de sala + Conexión TPV',
};

/** Todo lo contratado en una sola vista: qué es, cuánto cuesta, desde cuándo y cuánto pagas al mes. */
function ResumenCuenta({ restaurante, servicios, precioPlan, nombrePlan }: {
  restaurante: MiRestaurante; servicios: EstadoServicios; precioPlan: number; nombrePlan: string;
}) {
  const alta = new Date(restaurante.creadoEn);
  const filas = servicios.contratados.map((c) => {
    const cat = servicios.catalogo.find((x) => x.servicio === c.servicio);
    const mensual = cat?.tipo === 'mensual';
    const pagas = c.origen === 'pago' ? cat?.precioCentimos ?? 0 : 0;
    return {
      id: c.servicio, nombre: cat?.nombre ?? c.servicio, desde: c.contratadoEn, mensual,
      precio: c.origen === 'regalo' ? 'Incluido por DKitchen' : c.origen === 'demo' ? 'Prueba' : `${eur(pagas)}${mensual ? '/mes' : ' · pago único'}`,
      cuota: mensual ? pagas : 0,
      estado: c.estado === 'entregado' ? 'Entregado' : 'Activo',
    };
  });
  const cuotaMensual = precioPlan * 100 + filas.reduce((t, x) => t + x.cuota, 0);
  return (
    <section className="rounded-2xl border border-[#E6E6E2] bg-white">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E6E2] p-6">
        <div>
          <p className="text-sm text-[#6B7079]">Pagas cada mes</p>
          <p className="mt-1 text-4xl font-black">{eur(cuotaMensual)}</p>
          <p className="mt-1 text-sm text-[#6B7079]">Se renueva el día {alta.getDate()} de cada mes · sin permanencia</p>
        </div>
        <p className="text-sm text-[#6B7079]">Cliente desde el {fechaLarga.format(alta)}</p>
      </div>
      <ul className="divide-y divide-[#ECECE8]">
        <li className="flex flex-wrap items-start justify-between gap-2 p-5">
          <div>
            <p className="font-semibold">Plan {nombrePlan}</p>
            <p className="text-sm text-[#6B7079]">Tu carta QR{restaurante.plan === 'ampliado' ? ' con reservas, llamada al camarero y banners' : ''}</p>
          </div>
          <p className="text-sm font-semibold">{precioPlan} €/mes</p>
        </li>
        {filas.map((x) => (
          <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 p-5">
            <div>
              <p className="font-semibold">{x.nombre} <span className="ml-1 text-xs font-normal text-green-700">{x.estado}</span></p>
              <p className="text-sm text-[#6B7079]">{QUE_ES[x.id] ?? ''}</p>
              <p className="text-xs text-[#9A9EA6]">Desde el {fechaLarga.format(new Date(x.desde))}</p>
            </div>
            <p className="text-sm font-semibold">{x.precio}</p>
          </li>
        ))}
      </ul>
      {filas.length === 0 && <p className="px-5 pb-5 text-sm text-[#6B7079]">Aún no tienes servicios añadidos. Los encontrarás en las pestañas Diseño y Módulos.</p>}
    </section>
  );
}


/** Baja desde el panel (condiciones §4): discreta, con confirmación en la misma pantalla. */
function DarseDeBaja() {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState('');
  const [pendiente, empezar] = useTransition();
  if (hecho) return <p className="rounded-2xl border border-[#E6E2DC] bg-white p-5 text-sm text-[#3F434B]">Hemos recibido tu baja. No se te volverá a cobrar y tu carta sigue activa hasta el final del periodo pagado. Te hemos enviado la confirmación por correo.</p>;
  return (
    <div className="pt-4 text-sm">
      {!abierto ? (
        <button onClick={() => setAbierto(true)} className="text-[#9A9EA6] underline hover:text-[#6B7079]">Darme de baja</button>
      ) : (
        <div className="rounded-2xl border border-[#E6E2DC] bg-white p-5">
          <p className="font-semibold">¿Seguro que quieres darte de baja?</p>
          <p className="mt-1 text-[#6B7079]">No se te volverá a cobrar. Tu carta sigue activa hasta el final del periodo pagado y la guardamos 60 días por si vuelves. Lo ya pagado no se devuelve.</p>
          <textarea id="baja-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={1000} rows={3} placeholder="¿Nos cuentas por qué? (opcional)" className="mt-3 w-full rounded-xl border border-[#E6E2DC] px-3 py-2.5 outline-none focus:border-[#6E0C2B]" />
          {error && <p role="alert" className="mt-2 text-[#6E0C2B]">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={pendiente} onClick={() => empezar(async () => { try { await solicitarBajaAction(motivo); setHecho(true); } catch { setError('No se pudo registrar. Inténtalo de nuevo o escríbenos desde Soporte.'); } })}
              className="rounded-full border border-[#6E0C2B] px-5 py-2.5 font-semibold text-[#6E0C2B] disabled:opacity-60">{pendiente ? 'Enviando…' : 'Confirmar la baja'}</button>
            <button onClick={() => setAbierto(false)} className="rounded-full bg-[#17191E] px-5 py-2.5 font-semibold text-white">Seguir con DKitchen</button>
          </div>
        </div>
      )}
    </div>
  );
}
