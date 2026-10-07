import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CheckoutStripe from '@/components/pago/CheckoutStripe';
import CodigoPromocional from '@/components/pago/CodigoPromocional';
import PasosPago from '@/components/pago/PasosPago';
import { IVA_PORCENTAJE, leerRefPago, modoPruebaStripe, resumenPago } from '@/lib/payments/stripe';
import { TERMINOS_VERSION } from '@/lib/terminos';

export const metadata: Metadata = { title: 'Pago seguro · DKitchen', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const euros = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const fecha = (s: number) => new Date(s * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

/**
 * Checkout nativo, paso 2 de 3 (08/10/2026): resumen con el IVA desglosado y
 * el Payment Element de Stripe. Los datos (paso 1) ya se pidieron antes de
 * llegar aquí; el importe lo fijó el servidor al crear el cobro en Stripe.
 */
export default async function Pago({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const r = String((await searchParams).r ?? '');
  const id = leerRefPago(r);
  const resumen = id ? await resumenPago(id) : null;
  const clavePublica = process.env.STRIPE_PUBLISHABLE_KEY ?? '';

  if (!resumen || !clavePublica) {
    return (
      <section className="bg-crema px-6 pb-24 pt-36 text-tinta md:pt-44">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-display text-3xl font-semibold">Este enlace de pago no es válido</h1>
          <p className="mt-4 text-pizarra">Puede que haya caducado o esté incompleto. Vuelve a empezar desde la página del producto o escríbenos y te ayudamos.</p>
          <Link href="/" className="mt-8 inline-block rounded-full bg-vino px-7 py-3.5 text-sm font-semibold text-white">Volver a la web</Link>
        </div>
      </section>
    );
  }
  if (resumen.estado === 'pagado') redirect(`/pago/listo?r=${encodeURIComponent(r)}`);

  const hoy = resumen.totalCentimos;
  const rec = resumen.recurrente;
  const boton = resumen.tipo === 'tarjeta' ? 'Guardar tarjeta y activar' : `Pagar ${euros(hoy)}`;

  return (
    <div className="bg-crema text-tinta">
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 md:pt-36">
        <PasosPago actual={2} />
        {modoPruebaStripe() && (
          <p className="mx-auto mt-6 max-w-xl rounded-xl border border-oro/60 bg-oro/10 px-4 py-2.5 text-center text-xs text-tinta">
            MODO DE PRUEBA de Stripe: no se cobra nada. Tarjeta de prueba 4242 4242 4242 4242, cualquier fecha futura y CVC.
          </p>
        )}

        {resumen.estado === 'caducado' ? (
          <div className="mx-auto mt-12 max-w-lg text-center">
            <h1 className="font-display text-3xl font-semibold">Este pago ha caducado</h1>
            <p className="mt-4 text-pizarra">Por seguridad, los pagos sin terminar caducan. Vuelve a empezar y tardarás un minuto.</p>
            <Link href="/" className="mt-8 inline-block rounded-full bg-vino px-7 py-3.5 text-sm font-semibold text-white">Volver a la web</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1.1fr] md:gap-12">
            <aside className="h-fit rounded-[24px] border border-linea bg-white p-6 md:sticky md:top-28 md:p-8">
              <p className="etiqueta-dk text-vino">Tu pedido</p>
              <ul className="mt-5 divide-y divide-linea">
                {resumen.lineas.map((l, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-4 py-3 text-[15px]">
                    <span>{l.nombre}</span><span className="tabular-nums">{euros(l.centimos)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-2 border-t border-linea pt-4 text-[15px]">
                {resumen.descuento && resumen.descuento.centimos > 0 && (
                  <div className="flex justify-between gap-4 text-vino">
                    <dt>Descuento <span className="text-[13px]">({resumen.descuento.codigo}{resumen.descuento.texto ? `, ${resumen.descuento.texto}` : ''})</span></dt>
                    <dd className="shrink-0 tabular-nums">−{euros(resumen.descuento.centimos)}</dd>
                  </div>
                )}
                <div className="flex justify-between"><dt className="text-pizarra">Base imponible</dt><dd className="tabular-nums">{euros(resumen.baseCentimos)}</dd></div>
                <div className="flex justify-between"><dt className="text-pizarra">IVA ({IVA_PORCENTAJE} %)</dt><dd className="tabular-nums">{euros(resumen.ivaCentimos)}</dd></div>
                <div className="flex items-baseline justify-between border-t border-linea pt-3"><dt className="font-semibold">Total hoy</dt><dd className="font-display text-3xl font-semibold tabular-nums">{euros(hoy)}</dd></div>
              </dl>
              {rec && rec.cuotaCentimos > 0 && (
                <p className="mt-5 rounded-xl bg-papel px-4 py-3 text-[13px] leading-relaxed text-pizarra">
                  Después, <strong className="text-tinta">{euros(rec.cuotaCentimos)} + IVA ({euros(Math.round(rec.cuotaCentimos * (1 + IVA_PORCENTAJE / 100)))}) {rec.meses === 3 ? 'cada trimestre' : 'al mes'}</strong>
                  {rec.desde ? <>, con el primer cobro el <strong className="text-tinta">{fecha(rec.desde)}</strong> y después {rec.meses === 3 ? 'cada 3 meses' : 'cada mes'} ese mismo día</> : null}.
                  Sin permanencia: das de baja la renovación desde tu panel cuando quieras.
                </p>
              )}
              {resumen.admiteCodigo && <CodigoPromocional r={r} aplicado={resumen.descuento?.codigo || null} />}
              <p className="mt-4 text-[13px] text-pizarra">Recibirás la factura con el IVA desglosado en {resumen.email ?? 'tu correo'}.</p>
            </aside>

            <div className="rounded-[24px] border border-linea bg-white p-6 md:p-8">
              <h1 className="font-display text-2xl font-semibold">{resumen.tipo === 'tarjeta' ? 'Añade tu tarjeta' : 'Pago seguro'}</h1>
              <p className="mt-1.5 text-sm text-pizarra">
                {resumen.tipo === 'tarjeta' ? 'Hoy no se cobra nada: guardamos la tarjeta para los próximos cobros.' : 'Paga con tarjeta, Apple Pay o Google Pay.'}
              </p>
              <div className="mt-6">
                {resumen.secreto ? (
                  <CheckoutStripe clavePublica={clavePublica} secreto={resumen.secreto} r={r} tipo={resumen.tipo} boton={boton} terminosVersion={TERMINOS_VERSION} email={resumen.email} />
                ) : (
                  <p className="text-sm text-vino">No se pudo preparar el pago. Recarga la página en unos segundos.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
