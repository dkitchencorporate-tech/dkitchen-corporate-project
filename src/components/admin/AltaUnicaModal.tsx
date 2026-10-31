'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  altaUnica4PasosAction,
  type DatosAlta4Pasos,
  type ResultadoAlta4Pasos,
} from '@/app/admin-dkitchen/qr/actions';
import { QR_MENU, nombrePlan } from '@/lib/pricing-config';

const SUGERENCIAS = [
  { nombre: 'Taberna La Parra', ciudad: 'Baza (Granada)', dir: 'Calle Mayor 12', tel: '644123456' },
  { nombre: 'Asador El Roble', ciudad: 'Madrid', dir: 'Av. de la Albufera 45', tel: '611234567' },
  { nombre: 'Bistró Gourmet Baza', ciudad: 'Baza (Granada)', dir: 'Plaza Mayor 3', tel: '622345678' },
  { nombre: 'Restaurante Al-Andalus', ciudad: 'Sevilla', dir: 'Av. Constitución 8', tel: '633456789' },
];

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

  // Step 2 Services
  const [servicios, setServicios] = useState<string[]>(['qr']);
  const [planQr, setPlanQr] = useState<string>('ampliado');

  // Step 3 Pricing & Mode
  const [modoInicio, setModoInicio] = useState<'pago' | 'gratis' | 'demo'>('pago');
  const [modalidadTarifa, setModalidadTarifa] = useState<'1euro' | 'mensual' | 'fundador' | 'unico'>('1euro');
  const [diasPrueba, setDiasPrueba] = useState<number>(15);
  const [ofertaActiva, setOfertaActiva] = useState<boolean>(false);
  const [codigo, setCodigo] = useState('');
  const [descuentoComercialPct, setDescuentoComercialPct] = useState<number>(0);
  const [motivoDescuento, setMotivoDescuento] = useState('');
  const [montajeGratis, setMontajeGratis] = useState(true);

  if (!abierto) return null;

  const toggleServicio = (id: string) => {
    setServicios((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((s) => s !== id) : prev) : [...prev, id]
    );
  };

  const seleccionarSugerencia = (s: typeof SUGERENCIAS[0]) => {
    setLocal(s.nombre);
    setCiudad(s.ciudad);
    setDireccion(s.dir);
    setTelefono(s.tel);
    if (!contacto) setContacto('Marta Ruiz');
    if (!email) setEmail(`info@${s.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}.es`);
  };

  const validarPaso1 = () => {
    return local.trim().length >= 2 && contacto.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email);
  };

  // Tramitar el alta en el servidor
  const tramitarAlta = () => {
    setError(null);
    iniciar(async () => {
      const payload: DatosAlta4Pasos = {
        local,
        ciudad,
        direccion,
        cif,
        contacto,
        telefono,
        email,
        servicios,
        planQr,
        modoInicio,
        modalidadTarifa,
        diasPrueba,
        ofertaId: ofertaActiva ? 'halloween' : undefined,
        codigo: codigo.trim() || undefined,
        descuentoComercialPct,
        motivoDescuento: motivoDescuento.trim() || undefined,
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
        local,
        contacto,
        email,
        servicios,
        planQr,
        modoInicio: 'pago',
        modalidadTarifa,
        montajeGratis,
        descuentoComercialPct,
        motivoDescuento,
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
      <div className="relative w-full max-w-2xl rounded-[28px] border border-linea bg-crema p-5 sm:p-8 shadow-2xl text-carbon my-auto max-h-[92vh] overflow-y-auto">
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
                Escribe el nombre: selecciona una sugerencia para autocompletar o escribe sus datos reales.
              </p>
            </div>

            {/* Sugerencias de autocompletado */}
            <div className="flex flex-wrap gap-1.5">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s.nombre}
                  type="button"
                  onClick={() => seleccionarSugerencia(s)}
                  className="rounded-full border border-linea bg-white px-3 py-1 text-xs text-carbon hover:border-vino hover:bg-papel transition"
                >
                  🔎 {s.nombre} · {s.ciudad}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-carbon sm:col-span-2">
                Nombre comercial del local *
                <input
                  type="text"
                  required
                  placeholder="Ej.: Taberna La Parra"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
              </label>

              <label className="block text-xs font-semibold text-carbon">
                Ciudad / Población *
                <input
                  type="text"
                  placeholder="Ej.: Baza (Granada)"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
              </label>

              <label className="block text-xs font-semibold text-carbon">
                Dirección física
                <input
                  type="text"
                  placeholder="Ej.: Calle Mayor 12"
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
                  placeholder="Ej.: Marta Ruiz"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linea bg-white px-3.5 py-2.5 text-sm outline-none focus:border-vino"
                />
              </label>

              <label className="block text-xs font-semibold text-carbon">
                Teléfono móvil (WhatsApp)
                <input
                  type="tel"
                  placeholder="Ej.: 600 000 000"
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
                  placeholder="marta@tabernalaparra.es"
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
                className="rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo disabled:opacity-40"
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
                Marca uno o varios servicios según las necesidades del local. Los importes se calculan en el servidor.
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
                      <option value="ampliado">Plan Local · 29 €/mes (entra por 1 €)</option>
                      <option value="basico">Plan Carta · 9 €/mes</option>
                      <option value="sala">Plan Sala · 79 €/mes</option>
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
                  App propia instalable (PWA / iOS / Android) a medida.
                </p>
                <p className="mt-2 text-xs font-bold text-carbon">Desde 500 € Fundador o 1.650 €</p>
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
                  1.er evento gastronómico llave en mano con venta de entradas.
                </p>
                <p className="mt-2 text-xs font-bold text-carbon">
                  {servicios.includes('qr') ? '199 € (cliente QR)' : '299 €'}
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
                  Informe de canales externos + reunión 1 a 1 de diagnóstico.
                </p>
                <p className="mt-2 text-xs font-bold text-carbon">47 € oferta (ancla 297 €)</p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="rounded-full border border-linea bg-white px-5 py-2 text-xs font-bold text-carbon hover:bg-papel"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => setPaso(3)}
                className="rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo"
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
                  ['gratis', 'Prueba con fecha', 'Acceso completo durante los días elegidos'],
                  ['demo', 'Demo interna', 'Para vídeos o enseñar, sin cliente'],
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
                    <option value="1euro">1 € primer mes (palanca de entrada promocional)</option>
                    <option value="mensual">Mensual según catálogo</option>
                    <option value="fundador">Trimestral Fundador (147 €/trimestre sobre Sala)</option>
                    <option value="unico">Pago único / presupuesto cerrado</option>
                  </select>
                </label>

                {/* Oferta activa */}
                <div className="flex items-center justify-between rounded-xl bg-papel p-3">
                  <div>
                    <span className="text-xs font-bold text-carbon">Oferta activa Central</span>
                    <p className="text-[11px] text-niebla">Campaña de temporada: -20 % sobre base</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOfertaActiva(!ofertaActiva)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      ofertaActiva
                        ? 'bg-vino text-white'
                        : 'border border-linea bg-white text-carbon hover:bg-papel'
                    }`}
                  >
                    {ofertaActiva ? 'Aplicada (-20%)' : '+ Aplicar oferta'}
                  </button>
                </div>

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
                      placeholder="Ej.: Acuerdo local estratégico, compromiso 6 meses"
                      value={motivoDescuento}
                      onChange={(e) => setMotivoDescuento(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs outline-none focus:border-vino"
                    />
                  </label>
                )}

                <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-carbon cursor-pointer">
                  <input
                    type="checkbox"
                    checked={montajeGratis}
                    onChange={(e) => setMontajeGratis(e.target.checked)}
                    className="accent-vino"
                  />
                  Montaje gratis (regalo de puesta a punto y digitalización inicial)
                </label>
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

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setPaso(2)}
                className="rounded-full border border-linea bg-white px-5 py-2 text-xs font-bold text-carbon hover:bg-papel"
              >
                ← Atrás
              </button>
              <button
                type="button"
                disabled={pendiente || (descuentoComercialPct > 0 && motivoDescuento.trim().length < 4)}
                onClick={tramitarAlta}
                className="rounded-full bg-vino px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo disabled:opacity-40"
              >
                {pendiente ? 'Calculando en servidor…' : 'Revisar y generar propuesta →'}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 4: Revisa y envía ───────────────────────────────── */}
        {paso === 4 && resultado && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-carbon">4. Revisa y envía</h3>
              <p className="text-xs text-niebla">
                Propuesta validada por el servidor. Comparte el enlace de pago con el cliente.
              </p>
            </div>

            {/* Desglose de importes */}
            <div className="rounded-2xl border border-linea bg-white p-5 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-vino">
                Desglose para {local}
              </p>
              <div className="divide-y divide-linea text-xs">
                {resultado.desglose?.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2">
                    <span className={item.importeEuros < 0 ? 'text-exito font-semibold' : 'text-carbon'}>
                      {item.concepto}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {item.importeEuros >= 0 ? `${item.importeEuros} €` : `${item.importeEuros} €`}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 text-niebla">
                  <span>Base imponible</span>
                  <span className="font-semibold tabular-nums">{resultado.baseEuros} €</span>
                </div>
                <div className="flex justify-between py-2 text-niebla">
                  <span>IVA (21%)</span>
                  <span className="font-semibold tabular-nums">{resultado.ivaEuros} €</span>
                </div>
                <div className="flex justify-between pt-2.5 font-display text-base font-bold text-carbon">
                  <span>Total hoy</span>
                  <span className="text-vino">{resultado.totalHoyEuros} €</span>
                </div>
              </div>
            </div>

            {/* Enlace y acciones de envío */}
            {resultado.urlPago ? (
              <div className="rounded-2xl border border-linea bg-white p-4 space-y-3">
                <span className="text-xs font-bold text-carbon">Enlace de pago seguro (Stripe):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resultado.urlPago}
                    className="w-full rounded-xl border border-linea bg-papel px-3 py-2 text-xs font-mono text-carbon select-all"
                  />
                  <button
                    type="button"
                    onClick={copiarEnlace}
                    className="shrink-0 rounded-xl bg-tinta px-4 py-2 text-xs font-bold text-white hover:bg-black"
                  >
                    {copiado ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {telefono && (
                    <a
                      href={`https://wa.me/${telefono.replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1')}?text=${encodeURIComponent(
                        resultado.resumenWhatsapp || ''
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90"
                    >
                      Enviar por WhatsApp
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={enviarCorreoPropuesta}
                    disabled={correoEnviado || pendiente}
                    className="rounded-full bg-vino px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-hondo disabled:opacity-50"
                  >
                    {correoEnviado ? '✓ Correo enviado al cliente' : 'Enviar por correo'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-exito/10 p-4 text-xs font-semibold text-exito">
                ✓ Cliente creado con éxito en modo {modoInicio === 'demo' ? 'demo interna' : 'prueba gratuita'}.
              </div>
            )}

            <div className="rounded-xl bg-papel p-3 text-[11px] text-niebla">
              <b>Al pagar:</b> Se crea su cuenta de acceso, le llega el segundo correo para crear su contraseña y la ficha del local pasa automáticamente a «Activo». El comercial lo verá en su lista de «Mis clientes».
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  alCerrar();
                  if (resultado.restauranteId) {
                    router.push(`/admin-dkitchen/qr/${resultado.restauranteId}`);
                  }
                }}
                className="rounded-full bg-tinta px-6 py-2.5 text-xs font-bold text-white hover:bg-black"
              >
                Abrir ficha del cliente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
