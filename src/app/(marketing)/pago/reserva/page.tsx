import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Solicitud recibida · DKitchen Corporate', robots: { index: false, follow: false } };

/** Destino de cualquier checkout mientras no haya pasarela de pago conectada. No se cobra nada. */
export default function PagoReserva() {
  return (
    <section className="bg-crema px-4 pb-24 pt-28 text-tinta sm:px-6 md:pt-36">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vino">Solicitud recibida</p>
        <h1 className="font-display mt-3 text-3xl font-semibold">Tenemos tu solicitud</h1>
        <p className="mt-4 text-pizarra">No se te ha cobrado nada. Te escribimos en menos de 24 horas para darte de alta, confirmar tu plan y empezar a montar tu carta. Si lo prefieres, escríbenos a dkitchen@dkitchencorporate.es.</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-vino px-7 py-3.5 text-sm font-semibold text-white">Volver a la portada</Link>
      </div>
    </section>
  );
}
