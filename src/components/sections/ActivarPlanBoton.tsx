'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { QR_MENU, FUNDADOR, type PlanQr } from '@/lib/pricing-config';
import { codigoDeLaUrl, codigoGuardado } from '@/components/CapturaVendedor';
import { anotarEmbudo } from '@/components/EmbudoVista';

/**
 * Alta de QR Menú: pide local, nombre y correo y abre el checkout nativo (/pago).
 * Rediseño 29/09/2026: se monta en un portal sobre <body> (antes quedaba
 * atrapado dentro de la tarjeta inclinada de precios y se veía roto), como
 * hoja inferior en móvil y ventana centrada en escritorio.
 */
const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }) + ' €';
type Opcion = PlanQr | 'fundador';
const PLANES: Record<Opcion, { nombre: string; resumen: string; cuando: string; hoy: string; despues: string }> = {
  ...(Object.fromEntries((['basico', 'ampliado', 'sala'] as const).map((id) => {
    const p = QR_MENU.planes[id];
    return [id, {
      nombre: p.nombre, resumen: p.resumen, cuando: 'Primer mes',
      hoy: eur(p.primerMesSimbolico ? QR_MENU.primerMes : p.mensual),
      despues: `Después ${eur(p.mensual)}/mes · sin permanencia`,
    }];
  })) as Record<PlanQr, { nombre: string; resumen: string; cuando: string; hoy: string; despues: string }>),
  fundador: {
    nombre: 'Sala · Fundador', resumen: QR_MENU.planes.sala.resumen, cuando: 'Primer trimestre',
    hoy: eur(FUNDADOR.trimestre),
    despues: `Después ${eur(FUNDADOR.trimestre)} cada trimestre · 40 % de por vida`,
  },
};

export default function ActivarPlanBoton({
  plan, etiqueta, className,
}: { plan: Opcion; etiqueta: string; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [nombreContacto, setNombreContacto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cp, setCp] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [errorVendedor, setErrorVendedor] = useState<string | null>(null);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  // Código del socio (0052): del enlace o QR, de una visita anterior o escrito a mano.
  const [vendedor, setVendedor] = useState('');
  const [vendedorEnlace, setVendedorEnlace] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = PLANES[plan];

  useEffect(() => {
    setMontado(true);
    const v = codigoDeLaUrl() ?? codigoGuardado();
    if (v) { setVendedor(v); setVendedorEnlace(v); }
    // Volver atrás desde /pago: el navegador restaura la página tal cual (bfcache)
    // con el botón en «Abriendo el pago seguro…» y bloqueado. Se reactiva (08/10).
    const alVolver = (e: PageTransitionEvent) => { if (e.persisted) setCargando(false); };
    window.addEventListener('pageshow', alVolver);
    return () => window.removeEventListener('pageshow', alVolver);
  }, []);
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !cargando && setAbierto(false);
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = previo; window.removeEventListener('keydown', esc); };
  }, [abierto, cargando]);

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorVendedor(null);
    setErrorEmail(null);
    setCargando(true);
    try {
      const respuesta = await fetch(plan === 'fundador' ? '/api/checkout/fundador' : '/api/checkout/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, restauranteNombre: nombre, nombreContacto, email, telefono, direccion, cp, localidad, vendedor, vendedorDelEnlace: !!vendedorEnlace && vendedor === vendedorEnlace }),
      });
      const datos = await respuesta.json();
      if (datos?.campo === 'vendedor') { setErrorVendedor(datos.error); setCargando(false); return; }
      // Correo ya registrado (08/10, fallo 1 de la entrada 122): se avisa en el campo ANTES de pagar.
      if (datos?.campo === 'email') { setErrorEmail(datos.error); setCargando(false); return; }
      if (!respuesta.ok || !datos.url) throw new Error(datos?.error ?? 'No se pudo iniciar el pago.');
      // Embudo (0032): va al pago; al salir de la página ya no cuenta como «se fue sin pagar».
      const producto = plan === 'fundador' ? 'fundador' : 'qr';
      anotarEmbudo(producto, 'checkout');
      try { sessionStorage.setItem('dk-embudo-pago', producto); } catch {}
      window.location.href = datos.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago.');
      setCargando(false);
    }
  }

  const campo = 'mt-1.5 w-full rounded-xl border border-acero bg-white px-4 py-3 text-[15px] text-[#1A1714] outline-none transition focus:border-[#1A1714]';

  return (
    <>
      <button type="button" onClick={() => { setAbierto(true); anotarEmbudo(plan === 'fundador' ? 'fundador' : 'qr', 'interes'); }} className={className}>{etiqueta}</button>
      {montado && createPortal(
        <AnimatePresence>
          {abierto && (
            <motion.div key="fondo" className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F0B08]/70 p-3 backdrop-blur-sm sm:p-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !cargando && setAbierto(false)}>
              <motion.form role="dialog" aria-modal="true" aria-labelledby={`alta-${plan}`} onSubmit={activar} onClick={(e) => e.stopPropagation()}
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="max-h-[94dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[28px] bg-crema text-[#1A1714] shadow-2xl">
                <div className="flex items-start justify-between gap-4 px-7 pt-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-vino">QR Menú · Plan {p.nombre}</p>
                    <h3 id={`alta-${plan}`} className="mt-2 text-2xl font-bold tracking-tight">Activa tu carta</h3>
                    <p className="mt-1 text-sm text-black/55">{p.resumen}</p>
                  </div>
                  <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="rounded-full p-2 text-black/40 hover:bg-black/5 hover:text-black">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>

                <div className="mx-7 mt-5 flex items-baseline justify-between rounded-2xl border border-linea bg-white px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold">{p.cuando}</p>
                    <p className="text-xs text-black/45">{p.despues}</p>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{p.hoy}</p>
                </div>

                <div className="space-y-4 px-7 pt-5">
                  <label className="block text-sm font-medium">Nombre del restaurante
                    <input type="text" required maxLength={80} autoComplete="organization" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
                  </label>
                  <label className="block text-sm font-medium">Tu nombre
                    <input type="text" required maxLength={80} autoComplete="name" value={nombreContacto} onChange={(e) => setNombreContacto(e.target.value)} className={campo} />
                  </label>
                  <label className="block text-sm font-medium">Tu correo <span className="font-normal text-black/45">(aquí recibes el acceso y las facturas)</span>
                    <input type="email" required autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrorEmail(null); }}
                      aria-invalid={!!errorEmail} className={`${campo} ${errorEmail ? 'border-red-600' : ''}`} />
                  </label>
                  {errorEmail && (
                    <p role="alert" className="-mt-2 text-sm text-red-700">
                      {errorEmail} <a href="/panel/iniciar-sesion" className="font-semibold underline">Entrar en mi panel</a>
                    </p>
                  )}
                  <label className="block text-sm font-medium">Teléfono de contacto
                    <input type="tel" required inputMode="tel" maxLength={16} autoComplete="tel" pattern="[0-9+ ]{9,16}" value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^0-9+ ]/g, ''))} placeholder="600 000 000" className={campo} />
                  </label>
                  <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">Dirección del local</p>
                  <label className="block text-sm font-medium">Calle y número
                    <input type="text" required minLength={4} maxLength={160} autoComplete="street-address" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={campo} />
                  </label>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-3">
                    <label className="block text-sm font-medium">C. postal
                      <input type="text" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="postal-code" value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, ''))} className={campo} />
                    </label>
                    <label className="block text-sm font-medium">Localidad
                      <input type="text" required maxLength={80} autoComplete="address-level2" value={localidad} onChange={(e) => setLocalidad(e.target.value)} className={campo} />
                    </label>
                  </div>
                  <label className="block text-sm font-medium">Código de tu asesor <span className="font-normal text-black/45">(opcional)</span>
                    <input type="text" maxLength={12} autoComplete="off" autoCapitalize="characters" spellCheck={false} value={vendedor}
                      onChange={(e) => setVendedor(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Si te ha visitado alguien de DKitchen"
                      className={`${campo} uppercase tracking-[0.12em] placeholder:normal-case placeholder:tracking-normal ${errorVendedor ? 'border-red-600' : ''}`} />
                  </label>
                  {errorVendedor && <p role="alert" className="-mt-2 text-sm text-red-700">{errorVendedor}</p>}
                  <p className="text-xs text-black/50">¿Tienes un código de descuento? Lo pones en el siguiente paso, junto al total.</p>
                </div>

                {error && <p className="px-7 pt-3 text-sm text-red-700">{error}</p>}

                <div className="px-7 pb-7 pt-6">
                  <button type="submit" disabled={cargando}
                    className="w-full rounded-full bg-[#1A1714] py-4 text-[15px] font-semibold text-white transition hover:bg-black disabled:opacity-50">
                    {cargando ? 'Abriendo el pago seguro…' : 'Continuar al pago seguro'}
                  </button>
                  <p className="mt-3 text-center text-xs text-black/45">Pago seguro gestionado por Stripe. Cancelas cuando quieras desde tu panel.</p>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
