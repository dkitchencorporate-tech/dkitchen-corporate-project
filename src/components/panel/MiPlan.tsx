'use client';

import { mensajeError } from '@/lib/mensaje-error';
import { useState, useTransition } from 'react';
import type { MiRestaurante } from '@/lib/mi-restaurante';
import type { EstadoServicios } from '@/lib/servicios';
import { QR_MENU, FUNDADOR, PLANES_QR, esPlanQr, puntosPlanQr, type PlanQr } from '@/lib/pricing-config';
import SaltoSignature from './SaltoSignature';
import { iniciarCambioPlanAction, solicitarBajaAction } from '@/app/panel/actions';

/** Qué trae cada plan (0068). Cifras de pricing-config; los topes reales los aplica la base. */
const FUNCIONES: Record<PlanQr, string[]> = (() => {
  const { ampliado: l, sala: s } = QR_MENU.planes;
  return {
    basico: [...puntosPlanQr('basico'), '1 banner en la carta'],
    ampliado: [...puntosPlanQr('ampliado'), `${l.topes.banners} banners y promociones programadas`, 'Botón de reseñas de Google'],
    sala: [...puntosPlanQr('sala'), 'Encargados en el equipo', `${s.topes.banners} banners y promociones programadas`, 'Botón de reseñas de Google'],
  };
})();

const ESTADOS: Record<string, { texto: string; color: string }> = {
  activo: { texto: 'Activa', color: 'text-green-700' },
  gracia: { texto: 'Pago pendiente (periodo de gracia)', color: 'text-amber-700' },
  suspendido: { texto: 'Suspendida por impago', color: 'text-red-600' },
};

export default function MiPlan({ restaurante, servicios }: { restaurante: MiRestaurante; servicios: EstadoServicios }) {
  const planId: PlanQr = esPlanQr(restaurante.plan) ? restaurante.plan : 'basico';
  const nivel = PLANES_QR.indexOf(planId);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actual = QR_MENU.planes[planId];
  const fundador = restaurante.fundador === true && planId === 'sala';
  const precioActual = fundador ? FUNDADOR.mensual : actual.mensual;
  const estado = ESTADOS[restaurante.estadoAcceso] ?? { texto: restaurante.estadoAcceso, color: 'text-niebla' };

  function mejorar(destino: 'ampliado' | 'sala') {
    setError(null);
    iniciar(async () => {
      try {
        const { url } = await iniciarCambioPlanAction(destino);
        window.location.href = url;
      } catch (e) {
        setError(mensajeError(e, 'No se pudo iniciar el pago.'));
      }
    });
  }

  return (
    <div className="space-y-8">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Mi Plan</h2>

      <ResumenCuenta restaurante={restaurante} servicios={servicios} precioPlan={precioActual} nombrePlan={fundador ? `${actual.nombre} · Fundador` : actual.nombre} />

      <div className="bg-white border border-linea rounded-2xl p-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-niebla text-sm">Plan actual</p>
          <p className="text-3xl font-black mt-1">{actual.nombre}{fundador && <span className="ml-2 align-middle rounded-full bg-vino/10 px-2.5 py-1 text-xs font-bold text-vino">Fundador</span>}</p>
          <p className="text-niebla text-sm mt-1">
            {fundador
              ? `${FUNDADOR.trimestre.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € + IVA cada trimestre (40 % de por vida mientras sigas en Sala)`
              : `${actual.mensual} € + IVA al mes · sin permanencia`}
          </p>
        </div>
        <p className="text-sm">
          Cuenta: <span className={`font-semibold ${estado.color}`}>{estado.texto}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANES_QR.map((id, i) => {
          const p = QR_MENU.planes[id];
          const esActual = planId === id;
          return (
            <div key={id} className={`rounded-2xl p-6 border ${id === 'ampliado' ? 'border-vino/60 bg-vino/5' : 'border-linea bg-white'}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{p.nombre}</h3>
                <p className="font-black text-xl">
                  {p.mensual} €<span className="text-sm font-normal text-niebla">/mes</span>
                </p>
              </div>
              <ul className="mt-4 space-y-2">
                {FUNCIONES[id].map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-grafito">
                    <span className="text-vino">✓</span> {f}
                  </li>
                ))}
              </ul>
              {esActual ? (
                <p className="mt-5 text-center text-sm font-semibold text-niebla">Tu plan actual</p>
              ) : i > nivel && id !== 'basico' ? (
                <button
                  onClick={() => mejorar(id as 'ampliado' | 'sala')}
                  disabled={pendiente}
                  className="mt-5 w-full bg-vino hover:bg-vino-hondo disabled:opacity-50 text-white font-bold py-2.5 rounded-full"
                >
                  {pendiente ? 'Abriendo pago seguro…' : `Pasar a ${p.nombre}`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {planId !== 'sala' && (
        <p className="text-xs text-ceniza">
          El cambio se activa en cuanto se confirma el pago. Tu suscripción anterior se cancela para que no pagues las dos. Para bajar de plan, escríbenos desde Soporte.
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
  idiomas: 'Pack de idiomas (antiguo): 3 idiomas traducidos por DKitchen',
  idioma_extra: 'Un idioma más, traducido por DKitchen',
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
      precio: c.origen === 'plan' ? 'Incluido en tu plan' : c.origen === 'regalo' ? 'Incluido por DKitchen' : c.origen === 'demo' ? 'Prueba' : `${eur(pagas)}${mensual ? '/mes' : ' · pago único'}`,
      cuota: mensual ? pagas : 0,
      estado: c.estado === 'entregado' ? 'Entregado' : 'Activo',
    };
  });
  const cuotaMensual = Math.round(precioPlan * 100) + filas.reduce((t, x) => t + x.cuota, 0);
  return (
    <section className="rounded-2xl border border-linea bg-white">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-linea p-6">
        <div>
          <p className="text-sm text-niebla">Pagas cada mes</p>
          <p className="mt-1 text-4xl font-black">{eur(cuotaMensual)}</p>
          <p className="mt-1 text-sm text-niebla">Se renueva el día {alta.getDate()} de cada mes · sin permanencia</p>
        </div>
        <p className="text-sm text-niebla">Cliente desde el {fechaLarga.format(alta)}</p>
      </div>
      <ul className="divide-y divide-linea">
        <li className="flex flex-wrap items-start justify-between gap-2 p-5">
          <div>
            <p className="font-semibold">Plan {nombrePlan}</p>
            <p className="text-sm text-niebla">{esPlanQr(restaurante.plan) ? QR_MENU.planes[restaurante.plan].resumen : 'Tu carta QR'}</p>
          </div>
          <p className="text-sm font-semibold">{precioPlan.toLocaleString('es-ES')} €/mes</p>
        </li>
        {filas.map((x) => (
          <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 p-5">
            <div>
              <p className="font-semibold">{x.nombre} <span className="ml-1 text-xs font-normal text-green-700">{x.estado}</span></p>
              <p className="text-sm text-niebla">{QUE_ES[x.id] ?? ''}</p>
              <p className="text-xs text-ceniza">Desde el {fechaLarga.format(new Date(x.desde))}</p>
            </div>
            <p className="text-sm font-semibold">{x.precio}</p>
          </li>
        ))}
      </ul>
      {filas.length === 0 && <p className="px-5 pb-5 text-sm text-niebla">Aún no tienes servicios añadidos. Los encontrarás en las pestañas Diseño y Módulos.</p>}
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
  if (hecho) return <p className="rounded-2xl border border-linea bg-white p-5 text-sm text-grafito">Hemos recibido tu baja. No se te volverá a cobrar y tu carta sigue activa hasta el final del periodo pagado. Te hemos enviado la confirmación por correo.</p>;
  return (
    <div className="pt-4 text-sm">
      {!abierto ? (
        <button onClick={() => setAbierto(true)} className="text-ceniza underline hover:text-niebla">Darme de baja</button>
      ) : (
        <div className="rounded-2xl border border-linea bg-white p-5">
          <p className="font-semibold">¿Seguro que quieres darte de baja?</p>
          <p className="mt-1 text-niebla">No se te volverá a cobrar. Tu carta sigue activa hasta el final del periodo pagado y la guardamos 60 días por si vuelves. Lo ya pagado no se devuelve.</p>
          <textarea id="baja-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={1000} rows={3} placeholder="¿Nos cuentas por qué? (opcional)" className="mt-3 w-full rounded-xl border border-acero px-3 py-2.5 outline-none focus:border-vino" />
          {error && <p role="alert" className="mt-2 text-vino">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={pendiente} onClick={() => empezar(async () => { try { await solicitarBajaAction(motivo); setHecho(true); } catch { setError('No se pudo registrar. Inténtalo de nuevo o escríbenos desde Soporte.'); } })}
              className="rounded-full border border-vino px-5 py-2.5 font-semibold text-vino disabled:opacity-60">{pendiente ? 'Enviando…' : 'Confirmar la baja'}</button>
            <button onClick={() => setAbierto(false)} className="rounded-full bg-tinta px-5 py-2.5 font-semibold text-white">Seguir con DKitchen</button>
          </div>
        </div>
      )}
      <SaltoSignature />
    </div>
  );
}
