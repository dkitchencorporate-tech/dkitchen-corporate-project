import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PasosPago from '@/components/pago/PasosPago';
import Reconsultar from '@/components/pago/Reconsultar';
import { leerRefPago, resumenPago } from '@/lib/payments/stripe';

export const metadata: Metadata = { title: 'Confirmando el pago · DKitchen Corporate', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Vuelta de Stripe tras pagar (paso 3, «Acceso»). Si el cobro ya consta como
 * pagado, se pasa a la página de bienvenida del producto (`destino` en la
 * metadata, siempre una ruta propia). Si Stripe aún lo está procesando, la
 * página se vuelve a consultar sola cada pocos segundos.
 */
export default async function PagoListo({ searchParams }: { searchParams: Promise<{ r?: string; redirect_status?: string }> }) {
  const q = await searchParams;
  const r = String(q.r ?? '');
  const id = leerRefPago(r);
  const resumen = id ? await resumenPago(id) : null;
  if (!resumen) redirect('/');

  const destino = String(resumen.metadata.destino ?? '');
  if (resumen.estado === 'pagado') {
    if (!destino.startsWith('/') || destino.startsWith('//')) redirect('/pagar/gracias');
    // La bienvenida del alta QR recibe la referencia firmada del pago: con ella ofrece la puesta a punto (upsell, 08/10).
    redirect(destino.startsWith('/qr/bienvenida?email=') ? `${destino}&r=${encodeURIComponent(r)}` : destino);
  }

  const fallido = q.redirect_status === 'failed';
  return (
    <section className="bg-crema px-4 pb-24 pt-28 text-tinta sm:px-6 md:pt-36">
      <PasosPago actual={fallido ? 2 : 3} />
      <div className="mx-auto mt-14 max-w-lg text-center">
        {fallido ? (
          <>
            <h1 className="font-display text-3xl font-semibold">El pago no se ha completado</h1>
            <p className="mt-4 text-pizarra">Tu banco no lo ha autorizado o se canceló la verificación. No se te ha cobrado nada.</p>
            <Link href={`/pago?r=${encodeURIComponent(r)}`} className="mt-8 inline-block rounded-full bg-vino px-7 py-3.5 text-sm font-semibold text-white">Intentarlo de nuevo</Link>
          </>
        ) : (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-vino border-t-transparent" aria-hidden="true" />
            <h1 className="font-display mt-6 text-3xl font-semibold">Confirmando tu pago…</h1>
            <p className="mt-4 text-pizarra">Tarda unos segundos. No cierres esta página: en cuanto el banco lo confirme, te llevamos a tu acceso.</p>
            <Reconsultar />
          </>
        )}
      </div>
    </section>
  );
}
