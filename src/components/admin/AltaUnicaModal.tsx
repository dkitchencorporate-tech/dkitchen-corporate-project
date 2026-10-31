'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  altaUnica4PasosAction,
  type DatosAlta4Pasos,
  type ResultadoAlta4Pasos,
} from '@/app/admin-dkitchen/qr/actions';
import {
  QR_MENU,
  FUNDADOR,
  BASE_OPERATIVA,
  EXPERIENCE,
  AUDITORIA_CANALES,
  formatPrecio,
  nombrePlan,
} from '@/lib/pricing-config';

export default function AltaUnicaModal({
  abierto,
  alCerrar,
}: {
  abierto: boolean;
  alCerrar: () => void;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAlta4Pasos | null>(null);
  const [correoEnviado, setCorreoEnviado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Form State
  const [local, setLocal] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cif, setCif] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  // Servicios
  const [servicios, setServicios] = useState<string[]>(['qr']);
  const [planQr, setPlanQr] = useState<string>('ampliado');

  // Condiciones
  const [modoInicio, setModoInicio] = useState<'pago' | 'gratis' | 'demo'>('pago');
  const [modalidadTarifa, setModalidadTarifa] = useState<'1euro' | 'mensual' | 'fundador' | 'unico' | 'cuotas'>('1euro');
  const [diasPrueba, setDiasPrueba] = useState<number>(15);
  const [codigo, setCodigo] = useState('');
  const [descuentoComercialPct, setDescuentoComercialPct] = useState<number>(0);
  const [motivoDescuento, setMotivoDescuento] = useState('');
  const [puestaAPunto, setPuestaAPunto] = useState(false);
  const [montajeGratis, setMontajeGratis] = useState(false);
  const [aprobacionDireccionDescuento, setAprobacionDireccionDescuento] = useState(false);
  const [aprobacionDireccionMontaje, setAprobacionDireccionMontaje] = useState(false);
  const [origenMontaje, setOrigenMontaje] = useState<'flyer' | 'visita'>('flyer');

  if (!abierto) return null;

  const toggleServicio = (s: string) => {
    if (servicios.includes(s)) {
      if (servicios.length > 1) {
        setServicios(servicios.filter((x) => x !== s));
      }
    } else {
      setServicios([...servicios, s]);
    }
  };

  const validarPaso1 = () => {
    return local.trim().length >= 2 && contacto.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email);
  };

  // Tramitar el alta en el servidor
  const tramitarAlta = () => {
    setError(null);
    iniciar(async () => {
      const payload: DatosAlta4Pasos = {
        local: local.trim(),
        ciudad: ciudad.trim() || undefined,
        direccion: direccion.trim() || undefined,
        cif: cif.trim() || undefined,
        contacto: contacto.trim(),
        telefono: telefono.trim() || undefined,
        email: email.trim(),
        servicios,
        planQr,
        modoInicio,
        modalidadTarifa,
        diasPrueba,
        codigo: codigo.trim() || undefined,
        descuentoComercialPct,
        motivoDescuento: motivoDescuento.trim() || undefined,
        aprobacionDireccionDescuento,
        aprobacionDireccionMontaje,
        origenMontaje,
        puestaAPunto,
        montajeGratis,
        enviarCorreo: false,
      };

      const res = await altaUnica4PasosAction(payload);
      if (!res.ok) {
        setError(res.error || 'No se pudo tramitar el alta.');
      } else {
        setResultado(res);
        setPaso(4);
      }
    });
  };

  const enviarCorreoPropuesta = () => {
    if (!resultado?.urlPago) return;
    iniciar(async () => {
      await altaUnica4PasosAction({
        local: local.trim(),
        contacto: contacto.trim(),
        email: email.trim(),
        servicios,
        planQr,
        modoInicio: 'pago',
        modalidadTarifa,
        puestaAPunto,
        montajeGratis,
        descuentoComercialPct,
        motivoDescuento: motivoDescuento.trim() || undefined,
        enviarCorreo: true,
      });
      setCorreoEnviado(true);
    });
  };

  const copiarEnlace = () => {
    if (resultado?.urlPago) {
      navigator.clipboard.writeText(resultado.urlPago);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-noche/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-[28px] border border-linea bg-crema p-5 sm:p-8 pb-32 sm:pb-8 shadow-2xl text-carbon my-auto max-h-[92vh] overflow-y-auto" style={{ paddingBottom: 'max(6.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem))' }}>
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-linea pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">
              Alta Única Central
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-carbon">
              + Nuevo cliente
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-niebla">Paso {paso} de 4</span>
            <button
              onClick={alCerrar}
              className="ml-4 rounded-full p-1.5 text-niebla hover:bg-papel hover:text-carbon"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Indicador de progreso de los 4 pasos */}
        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= paso ? 'bg-vino' : 'bg-linea'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* ── PASO 1: ¿Qué local es? ───────────────────────────────── */}
        {paso === 1 && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-carbon">1. ¿Qué local es?</h3>
              <p className="text-xs text-niebla">
                Introduce los datos identificativos y de contacto reales del establecimiento.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-carbon sm:col-span-2">
                Nombre comercial del local *
                <input
                  type="text"
                  required
                  placeholder="Nombre oficial del restaurante o bar"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
              </label>

              <label className="block text-xs font-semibold text-carbon">
                Ciudad / Población *
                <input
                  type="text"
                  placeholder="Ciudad o municipio"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
              </label>

              <label className="block text-xs font-semibold text-carbon">
                Dirección física
                <input
                  type="text"
                  placeholder="Calle, número, código postal"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
              </label>

              <label className="block text-xs font-semibold text-carbon">
                Persona de contacto *
                <input
                  type="text"
                  required
                  placeholder="Nombre y apellidos del responsable"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
              </label>

              <label className="block text-xs font-semibold text-carbon">
                Teléfono móvil (WhatsApp)
                <input
                  type="tel"
                  placeholder="Número de contacto para envío del enlace"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
              </label>

              <label className="block text-xs font-semibold text-carbon sm:col-span-2">
                Correo electrónico del dueño *
                <input
                  type="email"
                  required
                  placeholder="correo@restaurante.es"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
                <span className="mt-1 block text-[11px] text-niebla">
                  A este correo se vinculará la cuenta y le llegará el acceso para crear su contraseña.
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={!validarPaso1()}
                onClick={() => setPaso(2)}
                className="w-full sm:w-auto min-h-[44px] rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo disabled:opacity-40"
              >
                Siguiente: ¿Qué contrata? →
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: ¿Qué contrata? ───────────────────────────────── */}
        {paso === 2 && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-carbon">2. ¿Qué contrata?</h3>
              <p className="text-xs text-niebla">
                Marca uno o varios servicios según las necesidades del local. Todos los importes se validan y calculan en el servidor desde pricing-config.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Carta QR */}
              <div
                onClick={() => toggleServicio('qr')}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  servicios.includes('qr')
                    ? 'border-vino bg-white ring-1 ring-vino shadow-sm'
                    : 'border-linea bg-white hover:border-linea-fuerte'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-display text-base font-bold text-carbon">Carta QR</span>
                  <input
                    type="checkbox"
                    checked={servicios.includes('qr')}
                    onChange={() => toggleServicio('qr')}
                    className="accent-vino"
                  />
                </div>
                <p className="mt-1 text-xs text-niebla">
                  Menú digital interactivo, comandero, alérgenos y TPV.
                </p>

                {servicios.includes('qr') && (
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <label className="text-[11px] font-semibold text-carbon">Elegir plan:</label>
                    <select
                      value={planQr}
                      onChange={(e) => setPlanQr(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-linea bg-papel px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-vino"
                    >
                      <option value="ampliado">
                        Plan {nombrePlan('ampliado')} · {formatPrecio(QR_MENU.planes.ampliado.mensual)}/mes (entra por {formatPrecio(QR_MENU.primerMes)})
                      </option>
                      <option value="basico">
                        Plan {nombrePlan('basico')} · {formatPrecio(QR_MENU.planes.basico.mensual)}/mes
                      </option>
                      <option value="sala">
                        Plan {nombrePlan('sala')} · {formatPrecio(QR_MENU.planes.sala.mensual)}/mes
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* Signature */}
              <div
                onClick={() => toggleServicio('signature')}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  servicios.includes('signature')
                    ? 'border-vino bg-white ring-1 ring-vino shadow-sm'
                    : 'border-linea bg-white hover:border-linea-fuerte'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-display text-base font-bold text-carbon">Signature</span>
                  <input
                    type="checkbox"
                    checked={servicios.includes('signature')}
                    onChange={() => toggleServicio('signature')}
                    className="accent-vino"
                  />
                </div>
                <p className="mt-1 text-xs text-niebla">
                  App propia instalable para siempre (carrito propio y asistente IA).
                </p>
                <p className="mt-2 text-xs font-bold text-carbon">
                  Entrada {formatPrecio(BASE_OPERATIVA.pagoUnico)} (o {BASE_OPERATIVA.fraccionado.cuotas} cuotas de {formatPrecio(BASE_OPERATIVA.fraccionado.importeCuota)}) · Fundador: {formatPrecio(FUNDADOR.signature.entrada)}
                </p>
              </div>

              {/* Experience */}
              <div
                onClick={() => toggleServicio('experience')}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  servicios.includes('experience')
                    ? 'border-vino bg-white ring-1 ring-vino shadow-sm'
                    : 'border-linea bg-white hover:border-linea-fuerte'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-display text-base font-bold text-carbon">Experience</span>
                  <input
                    type="checkbox"
                    checked={servicios.includes('experience')}
                    onChange={() => toggleServicio('experience')}
                    className="accent-vino"
                  />
                </div>
                <p className="mt-1 text-xs text-niebla">
                  1.er evento gastronómico llave en mano con venta de entradas. Cero comisión.
                </p>
                <p className="mt-2 text-xs font-bold text-carbon">
                  {servicios.includes('qr') ? `${formatPrecio(EXPERIENCE.tarifas.primeraParaClienteQr.precio)} (cliente QR)` : `${formatPrecio(EXPERIENCE.tarifas.primeraVez.precio)} (nuevo)`}
                </p>
              </div>

              {/* Auditoría */}
              <div
                onClick={() => toggleServicio('auditoria')}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  servicios.includes('auditoria')
                    ? 'border-vino bg-white ring-1 ring-vino shadow-sm'
                    : 'border-linea bg-white hover:border-linea-fuerte'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-display text-base font-bold text-carbon">Auditoría</span>
                  <input
                    type="checkbox"
                    checked={servicios.includes('auditoria')}
                    onChange={() => toggleServicio('auditoria')}
                    className="accent-vino"
                  />
                </div>
                <p className="mt-1 text-xs text-niebla">
                  Informe de canales externos + reunión de diagnóstico 1 a 1.
                </p>
                <p className="mt-2 text-xs font-bold text-carbon">
                  {formatPrecio(AUDITORIA_CANALES.precioOferta)} oferta (ancla {formatPrecio(AUDITORIA_CANALES.precioAncla)})
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between w-full pt-4">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="w-full sm:w-auto min-h-[44px] rounded-full border border-linea bg-white px-5 py-2.5 text-xs font-bold text-carbon hover:bg-papel"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => setPaso(3)}
                className="w-full sm:w-auto min-h-[44px] rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo"
              >
                Siguiente: ¿Cómo empieza? →
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: ¿Cómo empieza y cómo paga? ───────────────────── */}
        {paso === 3 && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-carbon">
                3. ¿Cómo empieza y cómo paga?
              </h3>
              <p className="text-xs text-niebla">
                Configura la modalidad de cobro. Los importes exactos y topes se validan en el servidor.
              </p>
            </div>

            {/* Modo de inicio */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-carbon">Modo de inicio:</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ['pago', 'Enlace de pago', 'Paga en Stripe y se activa todo solo'],
                  ['gratis', 'Prueba con fecha', 'Acceso completo durante los días elegidos (Solo Dirección)'],
                  ['demo', 'Demo interna', 'Para vídeos o enseñar, sin cliente (Solo Dirección)'],
                ].map(([k, tit, sub]) => (
                  <label
                    key={k}
                    className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                      modoInicio === k
                        ? 'border-vino bg-white ring-1 ring-vino shadow-sm'
                        : 'border-linea bg-white hover:bg-papel'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modoInicio"
                      checked={modoInicio === k}
                      onChange={() => setModoInicio(k as any)}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-carbon">{tit}</span>
                    <span className="mt-1 text-[11px] text-niebla">{sub}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modalidad de precio (solo si modo es pago) */}
            {modoInicio === 'pago' && (
              <div className="rounded-2xl border border-linea bg-white p-4 space-y-3">
                <label className="block text-xs font-semibold text-carbon">
                  Modalidad de tarifa / entrada:
                  <select
                    value={modalidadTarifa}
                    onChange={(e) => setModalidadTarifa(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-semibold outline-none focus:border-vino"
                  >
                    <option value="1euro">1 € primer mes (palanca de entrada promocional en Plan Local)</option>
                    <option value="mensual">Mensual regular según catálogo</option>
                    <option value="fundador">
                      Trimestral Fundador ({formatPrecio(FUNDADOR.trimestre)}/trimestre sobre Sala · 100 plazas)
                    </option>
                    <option value="cuotas">
                      Signature financiado ({BASE_OPERATIVA.fraccionado.cuotas} cuotas de {formatPrecio(BASE_OPERATIVA.fraccionado.importeCuota)})
                    </option>
                    <option value="unico">Pago único / presupuesto cerrado</option>
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-carbon">
                    Código de oferta opcional
                    <input
                      type="text"
                      placeholder="Ej.: FUNDADOR"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs uppercase outline-none focus:border-vino"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-carbon">
                    Descuento manual del comercial (Tope 10%)
                    <select
                      value={descuentoComercialPct}
                      onChange={(e) => setDescuentoComercialPct(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-semibold outline-none focus:border-vino"
                    >
                      <option value={0}>Sin descuento manual (0%)</option>
                      <option value={5}>5 % de cortesía comercial</option>
                      <option value={10}>10 % (Tope máximo autorizado)</option>
                    </select>
                  </label>
                </div>

                {descuentoComercialPct > 0 && (
                  <label className="block text-xs font-semibold text-carbon">
                    Motivo obligatorio del descuento comercial *
                    <input
                      type="text"
                      required
                      placeholder="Ej.: Local emblemático en zona comercial prioritaria"
                      value={motivoDescuento}
                      onChange={(e) => setMotivoDescuento(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs outline-none focus:border-vino"
                    />
                  </label>
                )}

                {descuentoComercialPct > 5 && (
                  <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-carbon cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aprobacionDireccionDescuento}
                      onChange={(e) => setAprobacionDireccionDescuento(e.target.checked)}
                      className="accent-vino"
                    />
                    Aprobación de Dirección para descuento del {descuentoComercialPct} % confirmada
                  </label>
                )}

                {servicios.includes('qr') && (
                  <div className="rounded-xl border border-linea bg-papel p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-carbon">Alta de servicio (159 €):</span>
                      <span className="font-bold text-emerald-700">Incluida siempre (0 €)</span>
                    </div>
                    <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-carbon cursor-pointer">
                      <input
                        type="checkbox"
                        checked={puestaAPunto}
                        onChange={(e) => {
                          setPuestaAPunto(e.target.checked);
                          if (!e.target.checked) {
                            setMontajeGratis(false);
                            setAprobacionDireccionMontaje(false);
                          }
                        }}
                        className="accent-vino"
                      />
                      Añadir Puesta a punto (+{formatPrecio(QR_MENU.setup.precio)} · te cargamos y digitalizamos la carta)
                    </label>
                    {puestaAPunto && (
                      <div className="space-y-2 pt-1 border-t border-linea">
                        <label className="flex items-center gap-2 text-xs font-semibold text-carbon cursor-pointer">
                          <input
                            type="checkbox"
                            checked={montajeGratis}
                            onChange={(e) => setMontajeGratis(e.target.checked)}
                            className="accent-vino"
                          />
                          Montaje gratis flyer/visita (0 € · bonificación contra cupo de 20)
                        </label>
                        {montajeGratis && (
                          <div className="ml-5 space-y-2 bg-white/80 p-2.5 rounded-lg border border-linea text-xs">
                            <label className="block text-[11px] font-semibold text-carbon">
                              Origen del cliente (solo flyer o visita):
                              <select
                                value={origenMontaje}
                                onChange={(e) => setOrigenMontaje(e.target.value as 'flyer' | 'visita')}
                                className="mt-1 w-full rounded border border-linea bg-papel px-2 py-1 text-xs outline-none focus:border-vino"
                              >
                                <option value="flyer">Flyer de calle (v6)</option>
                                <option value="visita">Visita comercial presencial</option>
                              </select>
                            </label>
                            <label className="flex items-center gap-2 font-semibold text-carbon cursor-pointer">
                              <input
                                type="checkbox"
                                checked={aprobacionDireccionMontaje}
                                onChange={(e) => setAprobacionDireccionMontaje(e.target.checked)}
                                className="accent-vino"
                              />
                              Aprobación de Dirección para montaje gratis confirmada
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Duración si es prueba gratuita */}
            {modoInicio === 'gratis' && (
              <label className="block rounded-2xl border border-linea bg-white p-4 text-xs font-semibold text-carbon">
                Días de prueba gratuita:
                <select
                  value={diasPrueba}
                  onChange={(e) => setDiasPrueba(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-semibold outline-none focus:border-vino"
                >
                  <option value={7}>7 días de prueba</option>
                  <option value={15}>15 días de prueba</option>
                  <option value={30}>30 días de prueba</option>
                </select>
              </label>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between w-full pt-4">
              <button
                type="button"
                onClick={() => setPaso(2)}
                className="w-full sm:w-auto min-h-[44px] rounded-full border border-linea bg-white px-5 py-2.5 text-xs font-bold text-carbon hover:bg-papel"
              >
                ← Atrás
              </button>
              <button
                type="button"
                disabled={
                  pendiente ||
                  (descuentoComercialPct > 0 && motivoDescuento.trim().length < 4) ||
                  (descuentoComercialPct > 5 && !aprobacionDireccionDescuento) ||
                  (montajeGratis && !aprobacionDireccionMontaje)
                }
                onClick={tramitarAlta}
                className="w-full sm:w-auto min-h-[44px] rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo disabled:opacity-40"
              >
                {pendiente ? 'Calculando en servidor…' : 'Revisar y generar propuesta →'}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 4: Resumen y Enlaces ───────────────────────────── */}
        {paso === 4 && resultado && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-linea bg-white p-5 space-y-3">
              <div className="flex items-start justify-between border-b border-linea pb-3">
                <div>
                  <h4 className="font-display text-base font-bold text-carbon">{local}</h4>
                  <p className="text-xs text-niebla">{contacto} · {email}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                  {modoInicio === 'pago' ? 'Listo para pago' : 'Activado'}
                </span>
              </div>

              {/* Desglose de partidas */}
              <div className="space-y-1.5 text-xs">
                {resultado.desglose?.map((x, i) => (
                  <div key={i} className="flex justify-between text-carbon">
                    <span>{x.concepto}</span>
                    <span className={`font-mono font-semibold whitespace-nowrap tabular-nums ${x.importeEuros < 0 ? 'text-emerald-700' : ''}`}>
                      {x.importeEuros} €
                    </span>
                  </div>
                ))}

                <div className="border-t border-linea pt-2 space-y-1 text-niebla">
                  <div className="flex justify-between">
                    <span>Base imponible:</span>
                    <span className="font-mono whitespace-nowrap tabular-nums">{resultado.baseEuros} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (21 %):</span>
                    <span className="font-mono whitespace-nowrap tabular-nums">{resultado.ivaEuros} €</span>
                  </div>
                  <div className="flex justify-between border-t border-linea pt-1.5 text-base font-bold text-vino">
                    <span>Total a pagar hoy:</span>
                    <span className="font-mono text-xl whitespace-nowrap tabular-nums">{resultado.totalHoyEuros} €</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enlace y WhatsApp */}
            {resultado.urlPago ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href={`https://wa.me/${telefono ? telefono.replace(/\D/g, '') : ''}?text=${encodeURIComponent(
                      resultado.resumenWhatsapp || ''
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow hover:bg-emerald-700 text-center"
                  >
                    <span>💬</span> Enviar resumen por WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={copiarEnlace}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-linea bg-white px-4 py-3 text-xs font-bold text-carbon hover:bg-papel shadow-sm"
                  >
                    <span>{copiado ? '✓' : '📋'}</span> {copiado ? '¡Enlace copiado!' : 'Copiar enlace de pago'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-papel p-3 text-xs">
                  <span className="text-niebla">Enviar propuesta formal por correo electrónico:</span>
                  <button
                    type="button"
                    disabled={correoEnviado || pendiente}
                    onClick={enviarCorreoPropuesta}
                    className="min-h-[44px] rounded-lg bg-vino px-3 py-1.5 font-bold text-white hover:bg-hondo disabled:opacity-50"
                  >
                    {correoEnviado ? '✓ Correo enviado' : 'Enviar por correo'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-linea bg-papel p-4 text-xs text-carbon">
                El cliente ha sido dado de alta correctamente en modo {modoInicio === 'demo' ? 'demo interna' : 'prueba gratuita'}.
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between w-full pt-4 border-t border-linea">
              <button
                type="button"
                onClick={() => setPaso(3)}
                className="w-full sm:w-auto min-h-[44px] rounded-full border border-linea bg-white px-5 py-2.5 text-xs font-bold text-carbon hover:bg-papel"
              >
                ← Volver a condiciones
              </button>
              <button
                type="button"
                onClick={() => {
                  alCerrar();
                  if (resultado.restauranteId) {
                    router.push(`/admin-dkitchen/qr/${resultado.restauranteId}`);
                  }
                }}
                className="w-full sm:w-auto min-h-[44px] rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo"
              >
                Finalizar y ver ficha →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
