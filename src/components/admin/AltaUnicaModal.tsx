'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  altaUnica4PasosAction,
  type DatosAlta4Pasos,
  type ResultadoAlta4Pasos,
} from '@/app/admin-dkitchen/qr/actions';
import { solicitarPalancaAction } from '@/app/admin-dkitchen/comerciales/actions';
import {
  QR_MENU,
  FUNDADOR,
  BASE_OPERATIVA,
  EXPERIENCE,
  AUDITORIA_CANALES,
  SERVICIOS_QR,
  formatPrecio,
  nombrePlan,
} from '@/lib/pricing-config';

/**
 * Alta única en 4 pasos (rediseño 01/11, decisiones 3 y 11 de karc0):
 * 1 ¿Qué local es? (a mano, 5 datos) · 2 ¿Qué contrata? · 3 ¿Cómo empieza? · 4 Revisa y envía.
 * Con `servicio`, el alta llega con ese servicio marcado y solo sus preguntas («+ Nuevo» de cada tablero).
 * Todos los importes salen de pricing-config y los recalcula el servidor.
 */
export type ServicioAlta = 'qr' | 'signature' | 'experience' | 'auditoria';
export type PrefijoAlta = { local?: string; ciudad?: string; contacto?: string; telefono?: string; email?: string };
type Modalidad = DatosAlta4Pasos['modalidadTarifa'];

const NOMBRES: Record<ServicioAlta, string> = { qr: 'Carta QR', signature: 'Signature', experience: 'Experience', auditoria: 'Auditoría' };

export default function AltaUnicaModal({
  abierto,
  alCerrar,
  esComercial = false,
  servicio,
  prefijo,
}: {
  abierto: boolean;
  alCerrar: () => void;
  esComercial?: boolean;
  servicio?: ServicioAlta;
  prefijo?: PrefijoAlta;
}) {
  const router = useRouter();
  const esDireccion = !esComercial;
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAlta4Pasos | null>(null);
  const [previa, setPrevia] = useState<ResultadoAlta4Pasos | null>(null);
  const eur = (n?: number) => (n ?? 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  const [copiado, setCopiado] = useState(false);

  // Paso 1: a mano y corto (decisión 11).
  const [local, setLocal] = useState(prefijo?.local ?? '');
  const [ciudad, setCiudad] = useState(prefijo?.ciudad ?? '');
  const [contacto, setContacto] = useState(prefijo?.contacto ?? '');
  const [telefono, setTelefono] = useState(prefijo?.telefono ?? '');
  const [email, setEmail] = useState(prefijo?.email ?? '');

  // Paso 2
  const [servicios, setServicios] = useState<ServicioAlta[]>([servicio ?? 'qr']);
  const [planQr, setPlanQr] = useState<'basico' | 'ampliado' | 'sala'>('ampliado');

  // Paso 3
  const [modoInicio, setModoInicio] = useState<'pago' | 'gratis' | 'demo'>('pago');
  const [modalidadElegida, setModalidad] = useState<Modalidad | null>(null);
  const [diasPrueba, setDiasPrueba] = useState<number>(15);
  const [codigo, setCodigo] = useState('');
  const [descuentoComercialPct, setDescuento] = useState<number>(0);
  const [motivoDescuento, setMotivo] = useState('');
  const [puestaAPunto, setPuestaAPunto] = useState(false);
  const [montajeGratis, setMontajeGratis] = useState(false);
  const [origenMontaje, setOrigenMontaje] = useState<'flyer' | 'visita'>('flyer');
  const [prueba, setPrueba] = useState(false);
  const [pilotoPct, setPilotoPct] = useState(0);
  const [cuotasSig, setCuotasSig] = useState(0);
  const [okPedido, setOkPedido] = useState<Record<string, string>>({});

  const tiene = (s: ServicioAlta) => servicios.includes(s);

  // Modalidades que tienen sentido para lo que contrata (y la primera, por defecto).
  const modalidades = useMemo(() => {
    const m: { k: Modalidad; t: string; d: string }[] = [];
    const qr = servicios.includes('qr');
    const sig = servicios.includes('signature');
    if (qr && planQr === 'ampliado') m.push({ k: '1euro', t: `Entra por ${formatPrecio(QR_MENU.primerMes)}`, d: `1.er mes a ${formatPrecio(QR_MENU.primerMes)}, después ${formatPrecio(QR_MENU.planes.ampliado.mensual)}/mes` });
    if (qr) m.push({ k: 'mensual', t: 'Mensual', d: `${formatPrecio(QR_MENU.planes[planQr].mensual)}/mes desde hoy` });
    if ((qr && planQr === 'sala') || sig) m.push({ k: 'fundador', t: 'Fundador', d: qr ? `${formatPrecio(FUNDADOR.trimestre)}/trimestre · Plan Sala` : `Entrada ${formatPrecio(FUNDADOR.signature.entrada)}` });
    if (sig) m.push({ k: 'cuotas', t: `En ${BASE_OPERATIVA.fraccionado.cuotas} cuotas`, d: `${BASE_OPERATIVA.fraccionado.cuotas} × ${formatPrecio(BASE_OPERATIVA.fraccionado.importeCuota)}` });
    if (!qr) m.push({ k: 'unico', t: 'Pago único', d: sig ? `Entrada ${formatPrecio(BASE_OPERATIVA.pagoUnico)}` : 'Según catálogo' });
    return m;
  }, [servicios, planQr]);
  const modalidad: Modalidad = modalidades.some((x) => x.k === modalidadElegida) ? (modalidadElegida as Modalidad) : modalidades[0]?.k ?? 'unico';

  if (!abierto) return null;

  const alternar = (s: ServicioAlta) => {
    if (tiene(s)) { if (servicios.length > 1) setServicios(servicios.filter((x) => x !== s)); }
    else setServicios([...servicios, s]);
    setPrevia(null);
  };

  const paso1Ok = local.trim().length >= 2 && contacto.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim());
  const paso3Ok = !(descuentoComercialPct > 0 && motivoDescuento.trim().length < 4);
  // 0112: el comercial pide el OK de dirección sin salir del alta; al aprobarse, repite «Revisar» y se aplica.
  const pedirOk = (tipo: string, detalle: Record<string, unknown>) => iniciar(async () => {
    const r = await solicitarPalancaAction(tipo, local.trim(), detalle);
    setOkPedido((o) => ({ ...o, [tipo]: r.ok ? 'Pedido: te avisamos cuando dirección responda. Luego pulsa «Revisar».' : r.error ?? 'No se pudo pedir.' }));
  });
  const BotonOk = ({ tipo, detalle }: { tipo: string; detalle: Record<string, unknown> }) => !esComercial ? null : (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => pedirOk(tipo, detalle)} className="min-h-[40px] rounded-full border-2 border-oro bg-white px-4 text-xs font-bold" data-testid={`pedir-ok-${tipo}`}>Pedir OK a dirección</button>
      {okPedido[tipo] && <span className="text-xs text-niebla">{okPedido[tipo]}</span>}
    </span>
  );

  const tramitar = (modo: 'previa' | 'crear') => {
    setError(null);
    iniciar(async () => {
      const payload: DatosAlta4Pasos = {
        local: local.trim(), ciudad: ciudad.trim() || undefined, contacto: contacto.trim(),
        telefono: telefono.trim() || undefined, email: email.trim(), servicios, planQr,
        modoInicio: prueba ? 'pago' : modoInicio, modalidadTarifa: modalidad, diasPrueba,
        codigo: codigo.trim() || undefined, descuentoComercialPct, motivoDescuento: motivoDescuento.trim() || undefined,
        origenMontaje, puestaAPunto, montajeGratis,
        enviarCorreo: (prueba || modoInicio === 'pago') && enviarCorreo,
        prueba: esDireccion && prueba ? true : undefined,
        pilotoPct: servicios.includes('experience') && !prueba ? pilotoPct : 0,
        cuotasSignature: servicios.includes('signature') && modalidad === 'unico' && !prueba ? cuotasSig : 0,
      };
      const res = await altaUnica4PasosAction(payload, modo);
      if (!res.ok) { setError(res.error || 'No se pudo tramitar el alta.'); return; }
      if (modo === 'previa') setPrevia(res); else setResultado(res);
      setPaso(4);
    });
  };

  const copiar = () => {
    if (!resultado?.urlPago) return;
    navigator.clipboard.writeText(resultado.urlPago).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const titulo = servicio ? `+ Nuevo ${NOMBRES[servicio]}` : '+ Nuevo cliente';
  const conPago = prueba || modoInicio === 'pago';
  const campo = 'mt-1.5 w-full rounded-2xl border border-linea bg-white px-4 py-3 text-base outline-none transition focus:border-vino focus:ring-2 focus:ring-vino/15';
  const tarjeta = (on: boolean) => `dk-tarjeta relative cursor-pointer rounded-[20px] border-[1.5px] p-4 text-left transition ${on ? 'dk-tarjeta-on border-vino bg-[#FBF1F1]' : 'border-linea bg-white hover:border-linea-fuerte'}`;
  const boton = 'dk-btn min-h-[48px] w-full rounded-full bg-vino px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-vino-hondo disabled:opacity-40 sm:w-auto';
  const botonSec = 'min-h-[48px] w-full rounded-full border border-linea bg-white px-5 py-3 text-sm font-bold text-tinta transition hover:bg-papel sm:w-auto';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-noche/60 p-3 backdrop-blur-sm sm:p-4" data-testid="alta-modal">
      <div className="relative my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-linea bg-crema text-tinta shadow-2xl" style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))' }}>
        {/* Barra superior (boceto: banda noche con el paso en oro) */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-noche px-5 py-3.5 text-white sm:px-7">
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-oro">Alta en 4 pasos</span>
            <h2 className="truncate font-display text-lg font-bold">{titulo}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <b className="text-xs text-oro">Paso {paso} de 4</b>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">✕</button>
          </div>
        </div>
        <div className="flex gap-1.5 px-5 pt-4 sm:px-7">
          {[1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= paso ? 'bg-vino' : 'bg-linea'}`} />)}
        </div>

        <div className="px-5 sm:px-7">
          {error && <div role="alert" data-testid="alta-error" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {/* ── 1 · ¿Qué local es? ── */}
          {paso === 1 && (
            <div key="p1" className="dk-paso mt-5 space-y-4">
              <div>
                <h3 className="font-display text-2xl font-bold">¿Qué local es?</h3>
                <p className="text-sm text-niebla">Cinco datos y listo. El resto se completa después en su ficha.</p>
              </div>
              <label className="block text-sm font-semibold">Nombre del local
                <input data-testid="alta-local" autoFocus value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Taberna La Parra" className={campo} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Ciudad
                  <input data-testid="alta-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Granada" className={campo} />
                </label>
                <label className="block text-sm font-semibold">Persona de contacto
                  <input data-testid="alta-contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Marta Ruiz" className={campo} />
                </label>
                <label className="block text-sm font-semibold">Correo del dueño
                  <input data-testid="alta-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="marta@laparra.es" className={campo} />
                </label>
                <label className="block text-sm font-semibold">Teléfono (WhatsApp)
                  <input data-testid="alta-telefono" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 000 000" className={campo} />
                </label>
              </div>
              <div className="flex justify-end pt-2">
                <button type="button" data-testid="alta-siguiente" disabled={!paso1Ok} onClick={() => setPaso(2)} className={boton}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* ── 2 · ¿Qué contrata? ── */}
          {paso === 2 && (
            <div key="p2" className="dk-paso mt-5 space-y-4">
              <div>
                <h3 className="font-display text-2xl font-bold">¿Qué contrata?</h3>
                <p className="text-sm text-niebla">{servicio ? `${NOMBRES[servicio]} ya va marcado. Puedes añadir otro servicio si lo quiere.` : 'Marca uno o varios. El precio sale del catálogo.'}</p>
              </div>

              {tiene('qr') && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Carta QR · plan</p>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {(['basico', 'ampliado', 'sala'] as const).map((p) => (
                      <button key={p} type="button" data-testid={`alta-plan-${p}`} onClick={() => { setPlanQr(p); setPrevia(null); }} className={tarjeta(planQr === p)}>
                        <b className="block font-display text-lg">{nombrePlan(p)}</b>
                        <span className="text-sm text-niebla">{formatPrecio(QR_MENU.planes[p].mensual)}/mes{p === 'ampliado' ? ` · entra por ${formatPrecio(QR_MENU.primerMes)}` : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">{servicio ? '¿Añade algo más?' : 'Servicios'}</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {(['qr', 'signature', 'experience', 'auditoria'] as ServicioAlta[]).map((s) => (
                    <button key={s} type="button" data-testid={`alta-servicio-${s}`} onClick={() => alternar(s)} className={tarjeta(tiene(s))} aria-pressed={tiene(s)}>
                      <b className="block font-display text-lg">{NOMBRES[s]}</b>
                      <span className="text-sm text-niebla">
                        {s === 'qr' && `Carta digital · desde ${formatPrecio(QR_MENU.planes.basico.mensual)}/mes`}
                        {s === 'signature' && `App propia · entrada ${formatPrecio(BASE_OPERATIVA.pagoUnico)}`}
                        {s === 'experience' && `1.er evento llave en mano · ${formatPrecio(tiene('qr') ? EXPERIENCE.tarifas.primeraParaClienteQr.precio : EXPERIENCE.tarifas.primeraVez.precio)}`}
                        {s === 'auditoria' && `Informe + reunión · ${formatPrecio(AUDITORIA_CANALES.precioOferta)}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => setPaso(1)} className={botonSec}>← Atrás</button>
                <button type="button" data-testid="alta-siguiente" onClick={() => setPaso(3)} className={boton}>Siguiente →</button>
              </div>
            </div>
          )}

          {/* ── 3 · ¿Cómo empieza? ── */}
          {paso === 3 && (
            <div key="p3" className="dk-paso mt-5 space-y-5">
              <div>
                <h3 className="font-display text-2xl font-bold">¿Cómo empieza?</h3>
                <p className="text-sm text-niebla">Lo normal es enviarle el enlace de pago: paga y se activa todo solo.</p>
              </div>

              {esDireccion && (
                <button type="button" data-testid="alta-prueba" onClick={() => { setPrueba(!prueba); setPrevia(null); }} className={`${tarjeta(prueba)} w-full`} aria-pressed={prueba}>
                  <b className="block font-display text-base">Cliente de prueba (solo dirección)</b>
                  <span className="text-sm text-niebla">Se llama «PRUEBA · …», paga 0 € con el cupón interno del 100 % y se archiva al terminar.</span>
                </button>
              )}

              {!prueba && (
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {([
                    ['pago', 'Enlace de pago', 'Paga y se activa solo'],
                    ...(esDireccion ? [['gratis', 'Prueba con fecha', 'Hasta el día que elijas'], ['demo', 'Demo interna', 'Para enseñarla, sin cliente']] : []),
                  ] as [typeof modoInicio, string, string][]).map(([k, t, d]) => (
                    <button key={k} type="button" data-testid={`alta-modo-${k}`} onClick={() => { setModoInicio(k); setPrevia(null); }} className={tarjeta(modoInicio === k)}>
                      <b className="block font-display text-base">{t}</b>
                      <span className="text-sm text-niebla">{d}</span>
                    </button>
                  ))}
                </div>
              )}

              {conPago && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Cómo paga</p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {modalidades.map((m) => (
                        <button key={m.k} type="button" data-testid={`alta-modalidad-${m.k}`} onClick={() => { setModalidad(m.k); setPrevia(null); }} className={tarjeta(modalidad === m.k)}>
                          <b className="block font-display text-base">{m.t}</b>
                          <span className="text-sm text-niebla">{m.d}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {!prueba && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Descuento del comercial</p>
                      <div className="flex flex-wrap gap-2">
                        {[0, 5, 8, 10].map((p) => (
                          <button key={p} type="button" onClick={() => { setDescuento(p); setPrevia(null); }} className={`min-h-[44px] rounded-full border px-5 text-sm font-bold transition ${descuentoComercialPct === p ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white text-tinta hover:bg-papel'}`}>
                            {p === 0 ? 'Sin descuento' : `−${p} %`}{p > 5 && esComercial ? ' · OK' : ''}
                          </button>
                        ))}
                      </div>
                      {descuentoComercialPct > 5 && <BotonOk tipo="descuento" detalle={{ pct: descuentoComercialPct, motivo: motivoDescuento }} />}
                      {descuentoComercialPct > 0 && (
                        <input value={motivoDescuento} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo del descuento (obligatorio)" className={campo} />
                      )}
                      <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código de oferta (opcional): FUNDADOR, socio…" className={`${campo} uppercase`} />
                    </div>
                  )}

                  {tiene('experience') && !prueba && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Evento piloto (último recurso)</p>
                      <div className="flex flex-wrap gap-2">
                        {[0, 20, 30, 40, 50].map((p) => (
                          <button key={p} type="button" onClick={() => { setPilotoPct(p); setPrevia(null); }} className={`min-h-[44px] rounded-full border px-4 text-sm font-bold transition ${pilotoPct === p ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white hover:bg-papel'}`} data-testid={`piloto-${p}`}>{p ? `−${p} %` : 'Precio normal'}</button>
                        ))}
                      </div>
                      {pilotoPct > 0 && <BotonOk tipo="experience_piloto" detalle={{ pct: pilotoPct }} />}
                    </div>
                  )}

                  {tiene('signature') && modalidad === 'unico' && !prueba && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Signature: facilidad de pago</p>
                      <div className="flex flex-wrap gap-2">
                        {[0, 2, 3, 4, 6, 9, 12].map((n) => (
                          <button key={n} type="button" onClick={() => { setCuotasSig(n); setPrevia(null); }} className={`min-h-[44px] rounded-full border px-4 text-sm font-bold transition ${cuotasSig === n ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white hover:bg-papel'}`}>{n ? `${n} pagos` : 'Al contado'}</button>
                        ))}
                      </div>
                      {cuotasSig > 0 && <BotonOk tipo="signature_fraccionado" detalle={{ cuotas: cuotasSig }} />}
                    </div>
                  )}

                  {tiene('qr') && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-vino">Montaje de la carta</p>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <button type="button" onClick={() => { setPuestaAPunto(false); setMontajeGratis(false); setPrevia(null); }} className={tarjeta(!puestaAPunto)}>
                          <b className="block font-display text-base">La sube el dueño</b>
                          <span className="text-sm text-niebla">Alta incluida (valor {formatPrecio(QR_MENU.setup.precio)}, 0 €)</span>
                        </button>
                        <button type="button" onClick={() => { setPuestaAPunto(true); setPrevia(null); }} className={tarjeta(puestaAPunto)}>
                          <b className="block font-display text-base">Se la montamos</b>
                          <span className="text-sm text-niebla">Puesta a punto +{formatPrecio(SERVICIOS_QR.puestaAPunto)}</span>
                        </button>
                      </div>
                      {puestaAPunto && !prueba && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => { setMontajeGratis(!montajeGratis); setPrevia(null); }} className={`min-h-[44px] rounded-full border px-5 text-sm font-bold transition ${montajeGratis ? 'border-exito bg-exito text-white' : 'border-linea bg-white hover:bg-papel'}`}>
                            {montajeGratis ? '✓ Montaje gratis (cupo)' : 'Regalar el montaje (cupo)'}
                          </button>
                          {montajeGratis && <BotonOk tipo="montaje_gratis" detalle={{ origen: origenMontaje }} />}
                          {montajeGratis && (['flyer', 'visita'] as const).map((o) => (
                            <button key={o} type="button" onClick={() => setOrigenMontaje(o)} className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${origenMontaje === o ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white'}`}>
                              {o === 'flyer' ? 'Vino por flyer' : 'Visita comercial'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {!prueba && modoInicio === 'gratis' && (
                <div className="flex flex-wrap gap-2">
                  {[7, 15, 30].map((n) => (
                    <button key={n} type="button" onClick={() => setDiasPrueba(n)} className={`min-h-[48px] rounded-full border px-6 text-sm font-bold ${diasPrueba === n ? 'border-tinta bg-tinta text-white' : 'border-linea bg-white'}`}>{n} días</button>
                  ))}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => setPaso(2)} className={botonSec}>← Atrás</button>
                <button type="button" data-testid="alta-revisar" disabled={pendiente || !paso3Ok} onClick={() => { setPrevia(null); tramitar('previa'); }} className={boton}>
                  {pendiente ? 'Calculando…' : 'Revisar →'}
                </button>
              </div>
            </div>
          )}

          {/* ── 4 · Revisa y envía (sin crear todavía) ── */}
          {paso === 4 && !resultado && previa && (
            <div key="p4" className="dk-paso mt-5 space-y-4">
              <h3 className="font-display text-2xl font-bold">Revisa y envía</h3>
              <div className="rounded-[20px] bg-noche p-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="min-w-0">
                    <b className="block truncate font-display text-lg">{prueba ? `PRUEBA · ${local.trim()}` : local.trim()}</b>
                    <span className="text-xs text-white/60">{contacto} · {email}</span>
                  </div>
                  <span className="rounded-full bg-oro/20 px-3 py-0.5 text-xs font-bold text-oro">Sin crear</span>
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {(previa.desglose ?? []).map((x, i) => (
                    <li key={i} className="flex justify-between gap-3"><span className="text-white/80">{x.concepto}</span><span className="shrink-0 tabular-nums">{eur(x.importeEuros)}</span></li>
                  ))}
                  {prueba && <li className="flex justify-between gap-3"><span className="text-white/80">Cupón interno de pruebas</span><span className="tabular-nums">−100 %</span></li>}
                </ul>
                <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
                  <p className="flex justify-between text-white/60"><span>Base hoy · IVA 21 %</span><span className="tabular-nums">{eur(previa.baseEuros)} · {eur(previa.ivaEuros)}</span></p>
                  <p className="flex justify-between font-display text-xl font-bold text-oro"><span>Paga hoy</span><span className="tabular-nums" data-testid="alta-total">{eur(prueba ? 0 : previa.totalHoyEuros)}</span></p>
                  {!!previa.recurrenteEuros && (
                    <p className="flex justify-between text-white/60"><span>Después</span><span className="tabular-nums">{eur(previa.recurrenteEuros)} + IVA {previa.intervaloMeses === 3 ? 'cada trimestre' : 'al mes'}</span></p>
                  )}
                </div>
              </div>
              {conPago && (
                <button type="button" onClick={() => setEnviarCorreo(!enviarCorreo)} className={`${tarjeta(enviarCorreo)} w-full`} aria-pressed={enviarCorreo}>
                  <b className="block text-sm">Enviarle también la propuesta por correo</b>
                  <span className="text-xs text-niebla">{email.trim()}</span>
                </button>
              )}
              <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => setPaso(3)} className={botonSec}>← Cambiar</button>
                <button type="button" data-testid="alta-crear" disabled={pendiente} onClick={() => tramitar('crear')} className={boton}>
                  {pendiente ? 'Creando…' : conPago ? 'Crear y generar el enlace' : 'Crear cliente'}
                </button>
              </div>
            </div>
          )}

          {/* ── Hecho ── */}
          {paso === 4 && resultado && (
            <div key="p5" className="dk-paso mt-5 space-y-4" data-testid="alta-hecha">
              <div className="flex items-center gap-3">
                <span className="dk-check grid h-12 w-12 shrink-0 place-items-center rounded-full bg-exito text-xl text-white">✓</span>
                <div>
                  <h3 className="font-display text-2xl font-bold">{conPago ? 'Enlace listo' : 'Cliente creado'}</h3>
                  <p className="text-sm text-niebla">{conPago ? 'Al pagar se activa todo solo y la ficha pasa a «Activo».' : modoInicio === 'demo' ? 'Demo interna activada.' : 'Prueba gratuita activada.'}</p>
                </div>
              </div>
              {resultado.urlPago && (
                <>
                  <a data-testid="alta-url" href={resultado.urlPago} target="_blank" rel="noreferrer" className="block truncate rounded-2xl border border-linea bg-white px-4 py-3 text-sm text-vino underline-offset-2 hover:underline">{resultado.urlPago}</a>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <a href={`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(resultado.resumenWhatsapp || '')}`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center justify-center rounded-full bg-exito px-4 text-sm font-bold text-white hover:opacity-90">Enviar por WhatsApp</a>
                    <button type="button" onClick={copiar} className="min-h-[48px] rounded-full border border-linea bg-white px-4 text-sm font-bold hover:bg-papel">{copiado ? '✓ Copiado' : 'Copiar enlace'}</button>
                  </div>
                  <p className="text-xs text-niebla">{resultado.correoEnviado ? `✓ Propuesta enviada a ${email.trim()}.` : enviarCorreo ? 'El correo no salió: compártelo por WhatsApp.' : 'Sin correo: compártelo por WhatsApp o copia el enlace.'}</p>
                </>
              )}
              <div className="flex justify-end pt-2">
                <button type="button" data-testid="alta-ver-ficha" onClick={() => { alCerrar(); if (resultado.restauranteId) router.push(`/admin-dkitchen/qr/${resultado.restauranteId}`); }} className={boton}>Ver su ficha →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
